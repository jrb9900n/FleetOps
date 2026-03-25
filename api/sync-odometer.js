// api/sync-odometer.js
// FleetSharp -> Supabase Odometer Sync
// Manual: /api/sync-odometer?secret=YOUR_CRON_SECRET
// Diagnostic: /api/sync-odometer?secret=YOUR_CRON_SECRET&diagnose=1

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

  // Diagnostic mode: compare FleetSharp trackers vs FleetOps VINs
  if (req.query.diagnose === '1') {
    const [trackersResp, assetsResp] = await Promise.all([
      fetch(`${FLEETSHARP_API}/tracker`, { headers: { Authorization: `Bearer ${FLEETSHARP_TOKEN}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/assets?select=id,name,vin&vin=not.is.null`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      })
    ]);
    const trackers = await trackersResp.json();
    const assets = await assetsResp.json();
    const vinMap = {};
    for (const a of assets) { if (a.vin) vinMap[a.vin.toUpperCase().trim()] = a.id; }
    const trackerArr = Array.isArray(trackers) ? trackers : trackers.trackers ?? trackers.data ?? [];
    const report = trackerArr.map(t => {
      const imei = String(t.imei || t.uuid || '');
      const vin = (t.vin || t.VIN || '').toUpperCase().trim();
      const name = t.name || t.label || t.vehicleName || t.deviceName || null;
      return { name, vin: vin || null, imei, matched: !!vin && !!vinMap[vin], fleetOpsId: vinMap[vin] || null };
    });
    return res.status(200).json({ trackerCount: report.length, matched: report.filter(r => r.matched).length, unmatched: report.filter(r => !r.matched).length, report });
  }

  const result = { ranAt: new Date().toISOString(), assetsMatched: 0, assetsSkipped: 0, readingsWritten: 0, errors: [] };

  try {
    const assetsResp = await fetch(`${SUPABASE_URL}/rest/v1/assets?select=id,name,vin&vin=not.is.null`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!assetsResp.ok) throw new Error(`Supabase assets fetch failed: ${assetsResp.status}`);
    const assets = await assetsResp.json();
    const vinMap = {};
    for (const asset of assets) {
      if (asset.vin) vinMap[asset.vin.toUpperCase().trim()] = asset;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tripsResp = await fetch(`${FLEETSHARP_API}/advancedTrips`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FLEETSHARP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: yesterday.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] }),
    });
    if (!tripsResp.ok) throw new Error(`FleetSharp failed: ${tripsResp.status}`);

    const tripsData = await tripsResp.json();
    let devices = [];
    if (Array.isArray(tripsData)) {
      devices = tripsData;
    } else if (tripsData && typeof tripsData === 'object') {
      const arrayKey = Object.keys(tripsData).find(k => Array.isArray(tripsData[k]));
      devices = arrayKey ? tripsData[arrayKey] : [tripsData];
    }
    console.log(`[odometer-sync] ${devices.length} devices from FleetSharp`);

    const readingsToInsert = [];
    for (const device of devices) {
      const vin = (device.vin || device.VIN || device.vehicleVin || device.vehicle_vin || '').toUpperCase().trim();
      const deviceId = device.imei || device.uuid || device.serialNumber || device.id;
      if (!vin) { result.assetsSkipped++; continue; }
      const asset = vinMap[vin];
      if (!asset) {
        console.log(`[odometer-sync] No asset for VIN ${vin} (device: ${deviceId})`);
        result.assetsSkipped++;
        continue;
      }
      const trips = device.trips ?? device.Trips ?? device.tripList ?? [];
      let maxOdometer = null, latestTimestamp = null;
      for (const trip of trips) {
        const odo = parseFloat(trip.endOdometerMiles ?? trip.odometerEnd ?? trip.endOdometer ?? trip.odometer ?? trip.endMileage ?? trip.mileage ?? null);
        const ts = trip.endTime ?? trip.endDate ?? trip.timestamp ?? null;
        if (!isNaN(odo) && odo > 0 && (maxOdometer === null || odo > maxOdometer)) { maxOdometer = odo; latestTimestamp = ts; }
      }
      if (maxOdometer === null) {
        const topOdo = parseFloat(device.odometer ?? device.currentOdometer ?? device.odometerMiles ?? device.totalMiles ?? null);
        if (!isNaN(topOdo) && topOdo > 0) { maxOdometer = topOdo; latestTimestamp = device.lastUpdate ?? device.lastSeen ?? new Date().toISOString(); }
      }
      if (maxOdometer === null) { console.log(`[odometer-sync] No odometer for ${asset.id}`); result.assetsSkipped++; continue; }
      result.assetsMatched++;
      readingsToInsert.push({ asset_id: asset.id, reading_miles: maxOdometer, recorded_at: latestTimestamp ?? yesterday.toISOString(), source: 'fleetsharp', fleetsharp_device_id: String(deviceId ?? '') });
    }

    if (readingsToInsert.length > 0) {
      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/odometer_readings`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(readingsToInsert),
      });
      if (!insertResp.ok) throw new Error(`Supabase insert failed: ${insertResp.status} - ${await insertResp.text()}`);
      result.readingsWritten = readingsToInsert.length;
    }

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
