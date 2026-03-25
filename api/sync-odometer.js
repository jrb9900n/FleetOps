// api/sync-odometer.js
// ------------------------------------------------------------
// Vercel Serverless Function — FleetSharp → Supabase Odometer Sync
// Called daily at 6:00 AM via Vercel cron (vercel.json)
// Manual trigger: /api/sync-odometer?secret=YOUR_CRON_SECRET
// ------------------------------------------------------------

const FLEETSHARP_API   = 'https://app02.fleetsharp.com/ibis/rest/api/v2';
const FLEETSHARP_TOKEN = process.env.FLEETSHARP_API_TOKEN;
const SUPABASE_URL     = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET      = process.env.CRON_SECRET;

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isManual = req.query.secret === CRON_SECRET;

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[odometer-sync] Starting sync at', new Date().toISOString());

  const result = {
    ranAt: new Date().toISOString(),
    assetsMatched: 0,
    assetsSkipped: 0,
    readingsWritten: 0,
    errors: [],
  };

  try {
    // Step 1: Fetch all assets with VINs from Supabase
    const assetsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/assets?select=id,name,vin&vin=not.is.null`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!assetsResp.ok) throw new Error(`Supabase assets fetch failed: ${assetsResp.status}`);

    const assets = await assetsResp.json();
    console.log(`[odometer-sync] Found ${assets.length} assets with VINs`);

    const vinMap = {};
    for (const asset of assets) {
      if (asset.vin) vinMap[asset.vin.toUpperCase().trim()] = asset;
    }

    // Step 2: Fetch yesterday's trips from FleetSharp
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const datePayload = {
      startDate: yesterday.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };

    console.log('[odometer-sync] Fetching FleetSharp trips for', datePayload);

    const tripsResp = await fetch(`${FLEETSHARP_API}/advancedTrips`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLEETSHARP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datePayload),
    });
    if (!tripsResp.ok) throw new Error(`FleetSharp advancedTrips failed: ${tripsResp.status}`);

    const tripsData = await tripsResp.json();
    const devices = Array.isArray(tripsData)
      ? tripsData
      : tripsData.devices ?? tripsData.data ?? [];

    console.log(`[odometer-sync] FleetSharp returned ${devices.length} devices`);

    // Step 3: Match by VIN and extract highest odometer
    const readingsToInsert = [];

    for (const device of devices) {
      const vin = (device.vin || device.VIN || '').toUpperCase().trim();
      const deviceId = device.imei || device.uuid || device.serialNumber || device.id;

      if (!vin) { result.assetsSkipped++; continue; }

      const asset = vinMap[vin];
      if (!asset) {
        console.log(`[odometer-sync] No FleetOps asset for VIN ${vin} — skipping`);
        result.assetsSkipped++;
        continue;
      }

      const trips = device.trips ?? device.Trips ?? [];
      let maxOdometer = null;
      let latestTimestamp = null;

      for (const trip of trips) {
        const odo = parseFloat(
          trip.endOdometerMiles ?? trip.odometerEnd ?? trip.endOdometer ??
          trip.odometer ?? trip.endMileage ?? null
        );
        const ts = trip.endTime ?? trip.endDate ?? trip.timestamp ?? null;
        if (!isNaN(odo) && odo > 0 && (maxOdometer === null || odo > maxOdometer)) {
          maxOdometer = odo;
          latestTimestamp = ts;
        }
      }

      if (maxOdometer === null) {
        const topLevelOdo = parseFloat(
          device.odometer ?? device.currentOdometer ?? device.odometerMiles ?? null
        );
        if (!isNaN(topLevelOdo) && topLevelOdo > 0) {
          maxOdometer = topLevelOdo;
          latestTimestamp = device.lastUpdate ?? device.lastSeen ?? new Date().toISOString();
        }
      }

      if (maxOdometer === null) {
        console.log(`[odometer-sync] No odometer data for ${asset.id} (VIN: ${vin})`);
        result.assetsSkipped++;
        continue;
      }

      result.assetsMatched++;
      readingsToInsert.push({
        asset_id: asset.id,
        reading_miles: maxOdometer,
        recorded_at: latestTimestamp ?? yesterday.toISOString(),
        source: 'fleetsharp',
        fleetsharp_device_id: String(deviceId ?? ''),
      });
    }

    // Step 4: Batch insert into Supabase
    if (readingsToInsert.length > 0) {
      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/odometer_readings`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(readingsToInsert),
      });
      if (!insertResp.ok) {
        const errText = await insertResp.text();
        throw new Error(`Supabase insert failed: ${insertResp.status} — ${errText}`);
      }
      result.readingsWritten = readingsToInsert.length;
      console.log(`[odometer-sync] Wrote ${result.readingsWritten} readings`);
    }

    // Step 5: Log the sync run
    await fetch(`${SUPABASE_URL}/rest/v1/odometer_sync_log`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        assets_synced: result.assetsMatched,
        assets_skipped: result.assetsSkipped,
        readings_written: result.readingsWritten,
      }),
    });

    return res.status(200).json({ success: true, ...result });

  } catch (err) {
    console.error('[odometer-sync] Fatal error:', err.message);
    await fetch(`${SUPABASE_URL}/rest/v1/odometer_sync_log`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        assets_synced: result.assetsMatched,
        assets_skipped: result.assetsSkipped,
        readings_written: result.readingsWritten,
        error_message: err.message,
      }),
    }).catch(() => {});
    return res.status(500).json({ success: false, error: err.message, ...result });
  }
}
