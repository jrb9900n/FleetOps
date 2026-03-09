import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { CAT_COLORS, fmtDate, Icon, Badge, Btn, GhostBtn, Modal, Empty, PageHeader, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

const CONDITION_COLORS = {
  'Excellent':'#16a34a','Good':'#65a30d','Fair':'#d97706','Poor':'#ea580c','Out of Service':'#dc2626',
};
const getConditionColor = (c) => {
  if (!c) return '#64748b';
  const match = Object.keys(CONDITION_COLORS).find(k => k.toLowerCase() === c.toLowerCase());
  return match ? CONDITION_COLORS[match] : '#64748b';
};
const normalizeCondition = (c) => {
  if (!c) return null;
  const match = Object.keys(CONDITION_COLORS).find(k => k.toLowerCase() === c.toLowerCase());
  return match || c;
};

function AuditSnapshot({ entries }) {
  if (!entries || entries.length === 0) return <p style={{ color: '#9ca3af', fontSize: 13 }}>No audit history recorded.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 320, overflowY: 'auto' }}>
      {entries.map((entry, i) => (
        <div key={entry.id || i} style={{ display: 'flex', gap: 10, paddingBottom: 12, paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Icon name="edit" size={11} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#111827', fontWeight: 500, marginBottom: 2 }}>{entry.summary}</div>
            <div style={{ fontSize: 11.5, color: '#9ca3af' }}>
              {new Date(entry.changed_at).toLocaleString()} · {entry.changed_by}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchivedDetail({ asset, onClose, onRestore }) {
  const auditEntries = Array.isArray(asset.audit_snapshot) ? asset.audit_snapshot : [];

  return (
    <Modal title={`Archived: ${asset.id} — ${asset.name}`} onClose={onClose} width={700}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Deletion info banner */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="trash" size={14} />
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>
            Archived {asset.deleted_at ? new Date(asset.deleted_at).toLocaleString() : '—'}{asset.deleted_by ? ` by ${asset.deleted_by}` : ''}
          </div>
        </div>

        {/* Asset details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, background: '#f9fafb', borderRadius: 10, padding: '14px 18px', border: '1px solid #e5e7eb' }}>
          {[
            ['Category', asset.category ? <Badge text={asset.category} color={CAT_COLORS[asset.category] || '#64748b'} /> : '—'],
            ['Type', <span style={{ fontSize: 13, color: '#6b7280', textTransform: 'capitalize' }}>{asset.type || '—'}</span>],
            ['Year / Make / Model', <span style={{ fontSize: 13, color: '#6b7280' }}>{[asset.year, asset.make, asset.model].filter(Boolean).join(' ') || '—'}</span>],
            ['Condition', asset.condition ? <Badge text={normalizeCondition(asset.condition)} color={getConditionColor(asset.condition)} /> : <span style={{ color: '#d1d5db' }}>—</span>],
            ['Status', <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{asset.status || '—'}</span>],
            ['Odometer / Hours', <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#6b7280' }}>{asset.odometer || '—'}</span>],
            ['Serial / VIN', <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#6b7280' }}>{asset.vin || '—'}</span>],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              {value}
            </div>
          ))}
        </div>

        {asset.comments && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
            📝 {asset.comments}
          </div>
        )}

        {/* Audit trail snapshot */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
            Audit Trail at Time of Deletion ({auditEntries.length} entries)
          </div>
          <AuditSnapshot entries={auditEntries} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <Btn onClick={() => onRestore(asset)} style={{ background: '#16a34a' }} icon="plus">Restore Asset</Btn>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
    </Modal>
  );
}

export default function ArchivedAssets() {
  const { profile } = useAuth();
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const { toast, show } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('deleted_assets').select('*').order('deleted_at', { ascending: false });
    if (error) show(error.message, 'error');
    setArchived(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const restore = async (asset) => {
    if (!window.confirm(`Restore asset ${asset.id} — ${asset.name}? It will be added back to the active asset list.`)) return;

    // Check if asset ID already exists in active assets
    const { data: existing } = await supabase.from('assets').select('id').eq('id', asset.id).single();
    if (existing) {
      return show(`Asset ID "${asset.id}" already exists in the active list. Rename it first before restoring.`, 'error');
    }

    // Reinsert into assets table (without the archive-only fields)
    const { audit_snapshot, deleted_at, deleted_by, ...assetData } = asset;
    const { error: insertErr } = await supabase.from('assets').insert(assetData);
    if (insertErr) return show('Restore failed: ' + insertErr.message, 'error');

    // Restore audit entries
    if (Array.isArray(audit_snapshot) && audit_snapshot.length > 0) {
      const auditRows = audit_snapshot.map(({ id, ...rest }) => rest); // strip old UUIDs, let DB generate new ones
      await supabase.from('asset_audit').insert(auditRows);
    }

    // Log a new audit entry for the restoration
    await supabase.from('asset_audit').insert({
      asset_id: asset.id,
      event_type: 'asset_edit',
      changed_by: profile?.full_name || 'Admin',
      summary: `Asset restored from archive by ${profile?.full_name || 'Admin'}`,
      fields: { deleted_by: asset.deleted_by, deleted_at: asset.deleted_at },
    });

    // Remove from archive
    await supabase.from('deleted_assets').delete().eq('id', asset.id);

    show(`Asset ${asset.id} restored successfully`);
    setSelected(null);
    load();
  };

  const filtered = archived.filter(a =>
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.make || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.deleted_by || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  return (
    <div style={{ padding: 32, background: '#f9fafb', minHeight: '100vh' }}>
      <PageHeader
        title="Archived Assets"
        subtitle={`${archived.length} archived asset${archived.length !== 1 ? 's' : ''} — admin view only`}
      />

      {archived.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, name, make, or deleted by…"
            style={{ padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', width: '100%', maxWidth: 380, outline: 'none', background: '#fff' }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty text={archived.length === 0 ? 'No assets have been archived yet' : 'No archived assets match your search'} />
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead style={{ background: '#fef2f2' }}>
              <tr style={{ borderBottom: '1px solid #fecaca' }}>
                {['Asset ID', 'Name', 'Category', 'Year / Make / Model', 'Condition', 'Archived At', 'Archived By', ''].map(label => (
                  <th key={label} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: '#b91c1c', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelected(a)}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{a.id}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>{a.name}</td>
                  <td style={{ padding: '12px 16px' }}>{a.category ? <Badge text={a.category} color={CAT_COLORS[a.category] || '#64748b'} /> : '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{[a.year, a.make, a.model].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.condition ? <Badge text={normalizeCondition(a.condition)} color={getConditionColor(a.condition)} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{a.deleted_at ? new Date(a.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{a.deleted_by || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Btn onClick={e => { e.stopPropagation(); restore(a); }} style={{ background: '#16a34a', padding: '5px 12px', fontSize: 12 }}>Restore</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ArchivedDetail
          asset={selected}
          onClose={() => setSelected(null)}
          onRestore={restore}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
