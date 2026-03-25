// api/sync-odometer.js
// FleetSharp -> Supabase Odometer Sync
// Manual: /api/sync-odometer?secret=YOUR_CRON_SECRET

const FLEETSHARP_API   = 'https://app02.fleetsharp.com/ibis/rest/api/v2';
const FLEETSHARP_TOKEN = process.env.FLEETSHARP_API_TOKEN;
const SUPABASE_URL     = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET      = process.env.CRON_SECRET;

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isManual = req.query.secret === CRON_SECRET;
  if (!isVercelCron && !isManual) return res.status(401).json({ error: 'Unauthorized' });

  const result = { ranAt: new Date().toISOString(), assetsMatched: 0, assetsSkipped: 0, readingsWritten: 0, errors: [] };

  try {
    // Step 1: Assets with VINs from Supabase
    const assetsResp = await fetch(`${SUPABASE_URL}/rest/v1/assets?select=id,name,vin&vin=not.is.null`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!assetsResp.ok) throw new Error(`Supabase assets fetch failed: ${assetsResp.status}`);
    const assets = await assetsResp.json();
    console.log(`[odometer-sync] ${assets.length} assets with VINs`);

    const vinMap = {};
    for (const asset of assets) {
      if (asset.vin) vinMap[asset.vin.toUpperCase().trim()] = asset;
    }

    // Step 2: Yesterday's trips from FleetSharp
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
      headers: { Authorization: `Bearer ${FLEETSHARP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(datePayload),
    });
    if (!tripsResp.ok) throw new Error(`FleetSharp failed: ${tripsResp.status}`);

    const tripsData = await tripsResp.json();
    console.log('[odometer-sync] FleetSharp raw response type:', typeof tripsData, 'isArray:', Array.isArray(tripsData));
    console.log('[odometer-sync] FleetSharp top-level keys:', tripsData && typeof tripsData === 'object' ? Object.keys(tripsData).join(', ') : 'n/a');
    console.log('[odometer-sync] FleetSharp preview:', JSON.stringify(tripsData).substring(0, 500));

    // Normalize: handle array, { devices: [...] }, { data: [...] }, { trips: [...] }, or single object
    let devices = [];
    if (Array.isArray(tripsData)) {
      devices = tripsData;
    } else if (tripsData && typeof tripsData === 'object') {
      const keys = Object.keys(tripsData);
      // Find first array value
      const arrayKey = keys.find(k => Array.isArray(tripsData[k]));
      if (arrayKey) {
        devices = tripsData[arrayKey];
        console.log(`[odometer-sync] Using array from key: ${arrayKey}, length: ${devices.length}`);
      } else if (keys.length > 0) {
        // Single device object — wrap it
        devices = [tripsData];
        console.log('[odometer-sync] Treating response as single device object');
      }
    }

    console.log(`[odometer-sync] ${devices.length} devices to process`);

    // Step 3: Match by VIN and extract odometer
    const readingsToInsert = [];

    for (const device of devices) {
      const vin = (device.vin || device.VIN || device.vehicleVin || device.vehicle_vin || '').toUpperCase().trim();
      const deviceId = device.imei || device.uuid || device.serialNumber || device.id;

      if (!vin) { result.assetsSkipped++; continue; }
      const asset = vinMap[vin];
      if (!asset) {
        console.log(`[odometer-sync] No asset for VIN ${vin}`);
        result.assetsSkipped++;
        continue;
      }

      // Extract highest odometer from trips array
      const trips = device.trips ?? device.Trips ?? device.tripList ?? [];
      let maxOdometer = null;
      let latestTimestamp = null;

      for (const trip of trips) {
        const odo = parseFloat(
          trip.endOdometerMiles ?? trip.odometerEnd ?? trip.endOdometer ??
          trip.odometer ?? trip.endMileage ?? trip.mileage ?? null
        );
        const ts = trip.endTime ?? trip.endDate ?? trip.timestamp ?? null;
        if (!isNaN(odo) && odo > 0 && (maxOdometer === null || odo > maxOdometer)) {
          maxOdometer = odo;
          latestTimestamp = ts;
        }
      }

      // Fallback to top-level device odometer
      if (maxOdometer === null) {
        const topOdo = parseFloat(device.odometer ?? device.currentOdometer ?? device.odometerMiles ?? device.totalMiles ?? null);
        if (!isNaN(topOdo) && topOdo > 0) {
          maxOdometer = topOdo;
          latestTimestamp = device.lastUpdate ?? device.lastSeen ?? new Date().toISOString();
        }
      }

      if (maxOdometer === null) {
        console.log(`[odometer-sync] No odometer for ${asset.id} (VIN: ${vin}). Device keys: ${Object.keys(device).join(', ')}`);
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

    // Step 4: Insert into Supabase
    if (readingsToInsert.length > 0) {
      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/odometer_readings`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(readingsToInsert),
      });
      if (!insertResp.ok) throw new Error(`Supabase insert failed: ${insertResp.status} — ${await insertResp.text()}`);
      result.readingsWritten = readingsToInsert.length;
    }

    // Step 5: Log
    await fetch(`${SUPABASE_URL}/rest/v1/odometer_sync_log`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ assets_synced: result.assetsMatched, assets_skipped: result.assetsSkipped, readings_written: result.readingsWritten }),
    });

    return res.status(200).json({ success: true, ...result });

  } catch (err) {
    console.error('[odometer-sync] Error:', err.message);
    await fetch(`${SUPABASE_URL}/rest/v1/odometer_sync_log`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ assets_synced: result.assetsMatched, assets_skipped: result.assetsSkipped, readings_written: result.readingsWritten, error_message: err.message }),
    }).catch(() => {});
    return res.status(500).json({ success: false, error: err.message, ...result });
  }
}
