import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, ASSET_TYPES, CONDITIONS, CAT_COLORS, STATUS_COLORS, fmtDate, fmtCurrency, Icon, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

const CONDITION_COLORS = {
  'Excellent':'#16a34a','Good':'#65a30d','Fair':'#d97706','Poor':'#ea580c','Out of Service':'#dc2626',
};
const TYPE_COLORS = { preventive:'#22c55e', corrective:'#ef4444', inspection:'#3b82f6', damage_repair:'#f59e0b', other:'#64748b' };
const SEV_COLORS = { minor:'#22c55e', moderate:'#f59e0b', major:'#ef4444', critical:'#dc2626' };

function AssetDetail({ asset, onClose, onEdit, canEdit }) {
  const [logs, setLogs] = useState([]);
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { toast, show } = useToast();

  useEffect(()=>{
    Promise.all([
      supabase.from('maintenance_logs').select('*').eq('asset_id',asset.id).order('date',{ascending:false}),
      supabase.from('damage_reports').select('*').eq('asset_id',asset.id).eq('status','open').order('created_at',{ascending:false}),
    ]).then(([l,d])=>{ setLogs(l.data||[]); setDamages(d.data||[]); setLoading(false); });
  },[asset.id]);

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this maintenance log?')) return;
    const { error } = await supabase.from('maintenance_logs').delete().eq('id',id);
    if (error) return show(error.message,'error');
    show('Log deleted'); setLogs(prev=>prev.filter(l=>l.id!==id)); setDetailLog(null);
  };

  const openEditLog = (log) => {
    setEditForm({ title:log.title||'', date:log.date||'', type:log.type||'preventive', performed_by:log.performed_by||'', vendor:log.vendor||'', internal_hours:log.internal_hours||'', external_cost:log.external_cost||'', odometer:log.odometer||'', description:log.description||'', notes:log.notes||'' });
    setEditLog(log);
  };

  const saveEditLog = async () => {
    if (!editForm.title) return show('Title is required','error');
    const { error } = await supabase.from('maintenance_logs').update({ ...editForm, internal_hours:editForm.internal_hours?Number(editForm.internal_hours):0, external_cost:editForm.external_cost?Number(editForm.external_cost):0 }).eq('id',editLog.id);
    if (error) return show(error.message,'error');
    show('Log updated');
    const updated = { ...editLog, ...editForm, internal_hours:editForm.internal_hours?Number(editForm.internal_hours):0, external_cost:editForm.external_cost?Number(editForm.external_cost):0 };
    setLogs(prev=>prev.map(l=>l.id===editLog.id?updated:l));
    setEditLog(null); setDetailLog(null);
  };

  const ef = (k) => ({ value:editForm[k]||'', onChange:e=>setEditForm(p=>({...p,[k]:e.target.value})) });
  const totalHours = logs.reduce((s,l)=>s+(Number(l.internal_hours)||0),0);
  const totalCost = logs.reduce((s,l)=>s+(Number(l.external_cost)||0),0);

  return (
    <Modal title={`${asset.id} — ${asset.name}`} onClose={onClose} width={760}>
      <div style={{display:'flex', flexDirection:'column', gap:20}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, background:'#f9fafb', borderRadius:10, padding:'14px 18px', border:'1px solid #e5e7eb'}}>
          {[
            ['Category', <Badge text={asset.category} color={CAT_COLORS[asset.category]||'#64748b'}/>],
            ['Type', <span style={{fontSize:13,color:'#374151',textTransform:'capitalize'}}>{asset.type||'—'}</span>],
            ['Year / Make / Model', <span style={{fontSize:13,color:'#374151'}}>{[asset.year,asset.make,asset.model].filter(Boolean).join(' ')||'—'}</span>],
            ['Condition', asset.condition?<Badge text={asset.condition} color={CONDITION_COLORS[asset.condition]||'#64748b'}/>:<span style={{color:'#d1d5db'}}>—</span>],
            ['Status', <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:500,color:STATUS_COLORS[asset.status||'active']}}><span style={{width:6,height:6,borderRadius:'50%',background:STATUS_COLORS[asset.status||'active'],display:'inline-block'}}/>{(asset.status||'active').toUpperCase()}</span>],
            ['Odometer / Hours', <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#374151'}}>{asset.odometer||'—'}</span>],
            ['Serial / VIN', <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#374151'}}>{asset.vin||'—'}</span>],
          ].map(([label,value])=>(
            <div key={label}>
              <div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>{label}</div>
              {value}
            </div>
          ))}
        </div>
        {asset.comments && <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#92400e'}}>📝 {asset.comments}</div>}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10}}>
          {[['Maintenance Logs',logs.length,'#3b82f6'],['Total Internal Hours',`${totalHours.toFixed(1)} hrs`,'#f97316'],['Total External Cost',fmtCurrency(totalCost),'#ef4444']].map(([label,value,color])=>(
            <div key={label} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'12px 16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>{label}</div>
              <div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
            </div>
          ))}
        </div>
        {damages.length>0 && (
          <div>
            <div style={{fontWeight:600,fontSize:14,color:'#111827',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#ef4444',display:'inline-block'}}/>
              Open Damage Reports ({damages.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {damages.map(d=>(
                <div key={d.id} style={{background:'#fff5f5',border:'1px solid #fecaca',borderLeft:`3px solid ${SEV_COLORS[d.severity]||'#ef4444'}`,borderRadius:8,padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                    <Badge text={d.severity?.toUpperCase()} color={SEV_COLORS[d.severity]||'#ef4444'}/>
                    <span style={{fontSize:13,fontWeight:500,color:'#111827'}}>{d.description}</span>
                  </div>
                  {d.location && <div style={{fontSize:12,color:'#9ca3af'}}>📍 {d.location}</div>}
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Reported by {d.reported_by||'unknown'} · {fmtDate(d.date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <div style={{fontWeight:600,fontSize:14,color:'#111827',marginBottom:10}}>Maintenance History</div>
          {loading ? <div style={{padding:'20px 0',textAlign:'center',color:'#9ca3af',fontSize:13}}>Loading…</div>
          : logs.length===0 ? <Empty text="No maintenance logs for this asset yet"/>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {logs.map(l=>(
              <div key={l.id} onClick={()=>setDetailLog(l)} style={{background:'#fff',border:'1px solid #e5e7eb',borderLeft:`3px solid ${TYPE_COLORS[l.type]||'#64748b'}`,borderRadius:8,padding:'12px 16px',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                      <span style={{fontWeight:600,fontSize:13.5,color:'#111827'}}>{l.title}</span>
                      <Badge text={l.type} color={TYPE_COLORS[l.type]||'#64748b'}/>
                    </div>
                    <div style={{display:'flex',gap:16,fontSize:12,color:'#9ca3af',flexWrap:'wrap'}}>
                      <span>{fmtDate(l.date)}</span>
                      {l.performed_by && <span>By: {l.performed_by}</span>}
                      {l.internal_hours>0 && <span>{l.internal_hours}h internal</span>}
                      {l.external_cost>0 && <span style={{color:'#f97316',fontWeight:600}}>{fmtCurrency(l.external_cost)}</span>}
                    </div>
                  </div>
                  <div style={{color:'#d1d5db',flexShrink:0}}><Icon name="eye" size={14}/></div>
                </div>
              </div>
            ))}
          </div>}
        </div>
        {canEdit && <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid #e5e7eb'}}><Btn icon="edit" onClick={onEdit}>Edit Asset</Btn></div>}
      </div>

      {detailLog && !editLog && (
        <Modal title="Maintenance Log Detail" onClose={()=>setDetailLog(null)} width={560}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <Badge text={detailLog.type} color={TYPE_COLORS[detailLog.type]||'#64748b'}/>
              <span style={{fontWeight:700,fontSize:16,color:'#111827'}}>{detailLog.title}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['Date',fmtDate(detailLog.date)],['Performed By',detailLog.performed_by||'—'],['Vendor / Shop',detailLog.vendor||'—'],['Odometer / Hrs',detailLog.odometer||'—'],['Internal Hours',detailLog.internal_hours>0?`${detailLog.internal_hours} hrs`:'—'],['External Cost',detailLog.external_cost>0?fmtCurrency(detailLog.external_cost):'—']].map(([label,val])=>(
                <div key={label}><div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>{label}</div><div style={{fontSize:13.5,color:'#111827'}}>{val}</div></div>
              ))}
              {detailLog.description && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>DESCRIPTION</div><div style={{fontSize:13.5,color:'#374151',lineHeight:1.6,background:'#f9fafb',borderRadius:8,padding:'10px 14px'}}>{detailLog.description}</div></div>}
              {detailLog.notes && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>NOTES / PARTS</div><div style={{fontSize:13.5,color:'#374151'}}>{detailLog.notes}</div></div>}
              {detailLog.receipt_name && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>RECEIPT</div><a href={supabase.storage.from('maintenance-files').getPublicUrl(detailLog.receipt_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:'#3b82f6',textDecoration:'none'}}>📎 {detailLog.receipt_name}</a></div>}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,borderTop:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',gap:8}}>
                {canEdit && <>
                  <Btn icon="edit" onClick={()=>openEditLog(detailLog)} style={{background:'#3b82f6'}}>Edit Log</Btn>
                  <Btn icon="trash" onClick={()=>deleteLog(detailLog.id)} style={{background:'#ef4444'}}>Delete</Btn>
                </>}
              </div>
              <GhostBtn onClick={()=>setDetailLog(null)}>Close</GhostBtn>
            </div>
          </div>
          <Toast toast={toast}/>
        </Modal>
      )}

      {editLog && (
        <Modal title="Edit Maintenance Log" onClose={()=>setEditLog(null)} width={600}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Task Title *" fullWidth><input style={inputStyle} {...ef('title')}/></Field>
            <Field label="Date"><input type="date" style={inputStyle} {...ef('date')}/></Field>
            <Field label="Type"><select style={selectStyle} {...ef('type')}><option value="inspection">Inspection</option><option value="preventive">Preventative Maintenance</option><option value="corrective">Corrective Repair</option><option value="damage_repair">Damage Repair</option><option value="other">Other</option></select></Field>
            <Field label="Performed By"><input style={inputStyle} {...ef('performed_by')}/></Field>
            <Field label="Vendor / Shop"><input style={inputStyle} {...ef('vendor')}/></Field>
            <Field label="Odometer / Hours"><input style={inputStyle} {...ef('odometer')}/></Field>
            <Field label="Internal Hours"><input type="number" style={inputStyle} {...ef('internal_hours')} min="0" step="0.5"/></Field>
            <Field label="External Cost ($)"><input type="number" style={inputStyle} {...ef('external_cost')} min="0" step="0.01"/></Field>
            <Field label="Description" fullWidth><textarea style={{...inputStyle,height:80,resize:'vertical'}} {...ef('description')}/></Field>
            <Field label="Notes / Parts Used" fullWidth><textarea style={{...inputStyle,height:60,resize:'vertical'}} {...ef('notes')}/></Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
            <GhostBtn onClick={()=>setEditLog(null)}>Cancel</GhostBtn>
            <Btn onClick={saveEditLog}>Save Changes</Btn>
          </div>
          <Toast toast={toast}/>
        </Modal>
      )}
      <Toast toast={toast}/>
    </Modal>
  );
}

export default function Assets() {
  const { can } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { toast, show } = useToast();
  const blank = { id:'', name:'', category:'asphalt', type:'Vehicle', year:'', make:'', model:'', status:'active', condition:'Good', odometer:'', odometer_date:'', vin:'', comments:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{ load(); },[]);
  const load = async () => { const { data } = await supabase.from('assets').select('*').order('id'); setAssets(data||[]); setLoading(false); };
  const openNew = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (a) => { setForm({ ...blank, ...a, comments:a.comments||a.notes||'', odometer_date:a.odometer_date||'', vin:a.vin||'' }); setEditId(a.id); setShowForm(true); setSelectedAsset(null); };
  const save = async () => {
    if (!form.id||!form.name) return show('Asset ID and Name are required','error');
    const payload = { id:form.id, name:form.name, category:form.category, type:form.type, year:form.year, make:form.make, model:form.model, status:form.status, condition:form.condition, odometer:form.odometer, odometer_date:form.odometer_date||null, vin:form.vin||null, comments:form.comments };
    if (editId) { const { error } = await supabase.from('assets').update(payload).eq('id',editId); if (error) return show(error.message,'error'); show('Asset updated'); }
    else { const { error } = await supabase.from('assets').insert(payload); if (error) return show(error.message,'error'); show('Asset added'); }
    setShowForm(false); load();
  };
  const remove = async (id) => { if (!window.confirm('Delete this asset? This cannot be undone.')) return; await supabase.from('assets').delete().eq('id',id); show('Asset removed'); load(); };
  const handleSort = (col) => { if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const filtered = assets.filter(a=>(filterCat==='all'||a.category===filterCat)&&(a.id.toLowerCase().includes(search.toLowerCase())||a.name.toLowerCase().includes(search.toLowerCase())||(a.make||'').toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>{ let av=(a[sortCol]||'').toString().toLowerCase(),bv=(b[sortCol]||'').toString().toLowerCase(); if(av<bv)return sortDir==='asc'?-1:1; if(av>bv)return sortDir==='asc'?1:-1; return 0; });
  const SortIcon = ({col}) => { if (sortCol!==col) return <Icon name="sort" size={12}/>; return <Icon name={sortDir==='asc'?'sort':'sortdown'} size={12}/>; };
  const thStyle = (col) => ({ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:'#6b7280', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', background:sortCol===col?'#fafafa':'transparent' });
  if (loading) return <LoadingPage/>;

  return (
    <div style={{padding:32, background:'#f9fafb', minHeight:'100vh'}}>
      <PageHeader title="Assets" subtitle={`${assets.length} assets registered`} action={can('assets')&&<Btn icon="plus" onClick={openNew}>Add Asset</Btn>}/>
      <div style={{display:'flex', gap:12, marginBottom:20, flexWrap:'wrap'}}>
        <div style={{position:'relative', flex:'1 1 200px'}}>
          <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af'}}><Icon name="search" size={15}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, name, or make…" style={{...inputStyle,paddingLeft:36}}/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...selectStyle,flex:'0 0 180px'}}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>
      <div style={{background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13.5}}>
          <thead style={{background:'#f9fafb'}}>
            <tr style={{borderBottom:'1px solid #e5e7eb'}}>
              {[['id','Asset ID'],['name','Name'],['category','Category'],['type','Type'],['year','Year / Make / Model'],['condition','Condition'],['odometer','Odometer / Hours'],['vin','Serial / VIN'],['status','Status']].map(([col,label])=>(
                <th key={col} style={thStyle(col)} onClick={()=>handleSort(col)}><span style={{display:'inline-flex',alignItems:'center',gap:4}}>{label}<SortIcon col={col}/></span></th>
              ))}
              {can('assets') && <th style={{...thStyle('actions'),cursor:'default'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={10} style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No assets found</td></tr>}
            {filtered.map(a=>(
              <tr key={a.id} style={{borderBottom:'1px solid #f3f4f6',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'12px 16px'}} onClick={()=>setSelectedAsset(a)}><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316',fontWeight:600}}>{a.id}</span></td>
                <td style={{padding:'12px 16px',fontWeight:500,color:'#111827'}} onClick={()=>setSelectedAsset(a)}><span style={{textDecoration:'underline',textDecorationColor:'#d1d5db',textUnderlineOffset:2}}>{a.name}</span></td>
                <td style={{padding:'12px 16px'}} onClick={()=>setSelectedAsset(a)}><Badge text={a.category} color={CAT_COLORS[a.category]||'#64748b'}/></td>
                <td style={{padding:'12px 16px',color:'#6b7280',textTransform:'capitalize'}} onClick={()=>setSelectedAsset(a)}>{a.type}</td>
                <td style={{padding:'12px 16px',color:'#6b7280'}} onClick={()=>setSelectedAsset(a)}>{[a.year,a.make,a.model].filter(Boolean).join(' · ')||'—'}</td>
                <td style={{padding:'12px 16px'}} onClick={()=>setSelectedAsset(a)}>{a.condition?<Badge text={a.condition} color={CONDITION_COLORS[a.condition]||'#64748b'}/>:<span style={{color:'#d1d5db'}}>—</span>}</td>
                <td style={{padding:'12px 16px',color:'#6b7280'}} onClick={()=>setSelectedAsset(a)}><div style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{a.odometer||'—'}</div>{a.odometer_date&&<div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>as of {fmtDate(a.odometer_date)}</div>}</td>
                <td style={{padding:'12px 16px',color:'#6b7280',fontFamily:"'DM Mono',monospace",fontSize:12}} onClick={()=>setSelectedAsset(a)}>{a.vin||'—'}</td>
                <td style={{padding:'12px 16px'}} onClick={()=>setSelectedAsset(a)}><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:500,color:STATUS_COLORS[a.status||'active']||'#16a34a'}}><span style={{width:6,height:6,borderRadius:'50%',background:STATUS_COLORS[a.status||'active'],display:'inline-block'}}/>{(a.status||'active').toUpperCase()}</span></td>
                {can('assets') && <td style={{padding:'12px 16px'}}><div style={{display:'flex',gap:6}}><IconBtn icon="edit" title="Edit" onClick={(e)=>{e.stopPropagation();openEdit(a);}}/><IconBtn icon="trash" title="Delete" color="#ef4444" onClick={(e)=>{e.stopPropagation();remove(a.id);}}/></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedAsset && <AssetDetail asset={selectedAsset} onClose={()=>setSelectedAsset(null)} onEdit={()=>openEdit(selectedAsset)} canEdit={can('assets')}/>}

      {showForm && (
        <Modal title={editId?'Edit Asset':'Add New Asset'} onClose={()=>setShowForm(false)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Asset ID *"><input style={inputStyle} value={form.id} onChange={e=>setForm(p=>({...p,id:e.target.value}))} placeholder="e.g. FLV004" disabled={!!editId}/></Field>
            <Field label="Name *"><input style={inputStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></Field>
            <Field label="Category"><select style={selectStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></Field>
            <Field label="Type"><select style={selectStyle} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>{ASSET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Year"><input style={inputStyle} value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} placeholder="2022"/></Field>
            <Field label="Make"><input style={inputStyle} value={form.make} onChange={e=>setForm(p=>({...p,make:e.target.value}))}/></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}/></Field>
            <Field label="Status"><select style={selectStyle} value={form.status||'active'} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="active">Active</option><option value="out of service">Out of Service</option><option value="maintenance">In Maintenance</option><option value="retired">Retired</option></select></Field>
            <Field label="Condition"><select style={selectStyle} value={form.condition||'Good'} onChange={e=>setForm(p=>({...p,condition:e.target.value}))}>{CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Odometer / Engine Hours"><input style={inputStyle} value={form.odometer||''} onChange={e=>setForm(p=>({...p,odometer:e.target.value}))} placeholder="e.g. 45,200 mi or 1,340 hrs"/></Field>
            <Field label="Reading As-Of Date"><input type="date" style={inputStyle} value={form.odometer_date||''} onChange={e=>setForm(p=>({...p,odometer_date:e.target.value}))}/></Field>
            <Field label="Serial Number / VIN" fullWidth><input style={inputStyle} value={form.vin||''} onChange={e=>setForm(p=>({...p,vin:e.target.value}))} placeholder="e.g. 1FTZX1722XKA76091"/></Field>
            <Field label="Comments" fullWidth><textarea style={{...inputStyle,height:80,resize:'vertical'}} value={form.comments||''} onChange={e=>setForm(p=>({...p,comments:e.target.value}))} placeholder="Known issues, notes, follow-up needed…"/></Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
            <GhostBtn onClick={()=>setShowForm(false)}>Cancel</GhostBtn>
            <Btn onClick={save}>Save Asset</Btn>
          </div>
        </Modal>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
