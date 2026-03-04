import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { today, fmtDate, fmtCurrency, PM_INTERVALS, Icon, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

const TYPE_COLORS = { preventive:'#22c55e', corrective:'#ef4444', inspection:'#3b82f6', damage_repair:'#f59e0b', other:'#64748b' };

// ── HISTORY ───────────────────────────────────────────────────────────────────
export function History() {
  const { can } = useAuth();
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dmg, setDmg] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetFilter, setAssetFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Detail / edit state
  const [detailLog, setDetailLog] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { toast, show } = useToast();

  useEffect(()=>{
    Promise.all([
      supabase.from('assets').select('id,name,make,model,year').order('id'),
      supabase.from('maintenance_logs').select('*,assets(name)').order('date',{ascending:false}),
      supabase.from('invoices').select('*').order('date',{ascending:false}),
      supabase.from('damage_reports').select('*').order('created_at',{ascending:false}),
    ]).then(([a,l,i,d])=>{
      setAssets(a.data||[]); setLogs(l.data||[]); setInvoices(i.data||[]); setDmg(d.data||[]);
      setLoading(false);
    });
  },[]);

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this maintenance log? This cannot be undone.')) return;
    const { error } = await supabase.from('maintenance_logs').delete().eq('id',id);
    if (error) return show(error.message,'error');
    show('Log deleted');
    setLogs(prev=>prev.filter(l=>l.id!==id));
    setDetailLog(null);
  };

  const openEditLog = (log) => {
    setEditForm({
      title:log.title||'', date:log.date||'', type:log.type||'preventive',
      performed_by:log.performed_by||'', vendor:log.vendor||'',
      internal_hours:log.internal_hours||'', external_cost:log.external_cost||'',
      odometer:log.odometer||'', description:log.description||'', notes:log.notes||'',
    });
    setEditLog(log);
  };

  const saveEditLog = async () => {
    if (!editForm.title) return show('Title is required','error');
    const { error } = await supabase.from('maintenance_logs').update({
      ...editForm,
      internal_hours: editForm.internal_hours ? Number(editForm.internal_hours) : 0,
      external_cost: editForm.external_cost ? Number(editForm.external_cost) : 0,
    }).eq('id', editLog.id);
    if (error) return show(error.message,'error');
    show('Log updated');
    const updated = {
      ...editLog, ...editForm,
      internal_hours: editForm.internal_hours ? Number(editForm.internal_hours) : 0,
      external_cost: editForm.external_cost ? Number(editForm.external_cost) : 0,
    };
    setLogs(prev=>prev.map(l=>l.id===editLog.id ? updated : l));
    setEditLog(null); setDetailLog(null);
  };

  const ef = (k) => ({ value:editForm[k]||'', onChange:e=>setEditForm(p=>({...p,[k]:e.target.value})) });

  const filtered = logs.filter(l=>
    (assetFilter==='all'||l.asset_id===assetFilter) &&
    (typeFilter==='all'||l.type===typeFilter) &&
    ((l.title||l.description||'').toLowerCase().includes(search.toLowerCase())||(l.asset_id||'').toLowerCase().includes(search.toLowerCase()))
  );

  const selAsset = assets.find(a=>a.id===assetFilter);
  const aInvoices = assetFilter!=='all' ? invoices.filter(i=>i.asset_id===assetFilter) : [];
  const aDmg = assetFilter!=='all' ? dmg.filter(d=>d.asset_id===assetFilter) : [];

  if (loading) return <LoadingPage/>;

  return (
    <div style={{padding:32}}>
      <PageHeader title="Maintenance History" subtitle="Full audit trail per asset"/>
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 200px'}}>
          <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#475569'}}><Icon name="search" size={15}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title or asset ID…" style={{...inputStyle,paddingLeft:36}}/>
        </div>
        <select value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Assets</option>
          {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Types</option>
          <option value="inspection">Inspection</option>
          <option value="preventive">Preventative Maintenance</option>
          <option value="corrective">Corrective Repair</option>
          <option value="damage_repair">Damage Repair</option>
          <option value="other">Other</option>
        </select>
      </div>

      {selAsset && (
        <div style={{background:'#0f1218',border:'1px solid #f97316',borderRadius:12,padding:20,marginBottom:20,display:'flex',gap:24,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#475569',marginBottom:4}}>Selected Asset</div>
            <div style={{fontSize:18,fontWeight:700}}>{selAsset.name}</div>
            <div style={{fontSize:12,color:'#64748b'}}>{selAsset.id} · {[selAsset.make,selAsset.model,selAsset.year].filter(Boolean).join(' ')}</div>
          </div>
          <div style={{width:1,background:'#1e2530',alignSelf:'stretch'}}/>
          {[
            ['Maintenance Logs', filtered.length],
            ['Total Ext. Cost', fmtCurrency(filtered.reduce((s,l)=>s+(Number(l.external_cost)||0),0)+aInvoices.reduce((s,i)=>s+(Number(i.amount)||0),0))],
            ['Internal Hours', `${filtered.reduce((s,l)=>s+(Number(l.internal_hours)||0),0).toFixed(1)} hrs`],
            ['Damage Reports', aDmg.length],
            ['Invoices', aInvoices.length],
          ].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#475569',marginBottom:2}}>{l}</div>
              <div style={{fontSize:18,fontWeight:700}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{background:'#0f1218',borderRadius:12,border:'1px solid #1e2530',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1e2530'}}>
              {['Date','Asset','Task','Type','Performed By','Int. Hrs','Ext. Cost','Notes'].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#475569'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'#475569'}}>No records found</td></tr>}
            {filtered.map(l=>(
              <tr key={l.id}
                onClick={()=>setDetailLog(l)}
                style={{borderBottom:'1px solid #1e2530', cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#111827'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{padding:'12px 16px',color:'#94a3b8',whiteSpace:'nowrap'}}>{fmtDate(l.date)}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316'}}>{l.asset_id}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{l.assets?.name}</div>
                </td>
                <td style={{padding:'12px 16px',fontWeight:500,maxWidth:180,color:'#f3f4f6'}}>{l.title||(l.description?<span style={{color:'#9ca3af',fontSize:12}}>{l.description.slice(0,60)}{l.description.length>60?'…':''}</span>:<span style={{color:'#6b7280',fontStyle:'italic',fontSize:12}}>—</span>)}</td>
                <td style={{padding:'12px 16px'}}><Badge text={l.type} color={TYPE_COLORS[l.type]||'#64748b'}/></td>
                <td style={{padding:'12px 16px',color:'#94a3b8'}}>{l.performed_by||'—'}</td>
                <td style={{padding:'12px 16px',color:'#94a3b8'}}>{l.internal_hours>0?`${l.internal_hours}h`:'—'}</td>
                <td style={{padding:'12px 16px',fontWeight:l.external_cost>0?600:400,color:l.external_cost>0?'#f97316':'#64748b'}}>{l.external_cost>0?fmtCurrency(l.external_cost):'—'}</td>
                <td style={{padding:'12px 16px',color:'#64748b',fontSize:12,maxWidth:160}}>{l.notes||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log detail modal */}
      {detailLog && !editLog && (
        <Modal title="Maintenance Log Detail" onClose={()=>setDetailLog(null)} width={560}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <Badge text={detailLog.type} color={TYPE_COLORS[detailLog.type]||'#64748b'}/>
              <span style={{fontWeight:700,fontSize:16,color:'#111827'}}>{detailLog.title}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#9ca3af'}}>
              <span style={{fontFamily:"'DM Mono',monospace",color:'#f97316',fontWeight:600}}>{detailLog.asset_id}</span>
              <span>·</span>
              <span>{detailLog.assets?.name}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                ['Date', fmtDate(detailLog.date)],
                ['Performed By', detailLog.performed_by||'—'],
                ['Vendor / Shop', detailLog.vendor||'—'],
                ['Odometer / Hrs', detailLog.odometer||'—'],
                ['Internal Hours', detailLog.internal_hours>0?`${detailLog.internal_hours} hrs`:'—'],
                ['External Cost', detailLog.external_cost>0?fmtCurrency(detailLog.external_cost):'—'],
              ].map(([label,val])=>(
                <div key={label}>
                  <div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13.5,color:'#111827'}}>{val}</div>
                </div>
              ))}
              {detailLog.description && (
                <div style={{gridColumn:'1/-1'}}>
                  <div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>DESCRIPTION</div>
                  <div style={{fontSize:13.5,color:'#374151',lineHeight:1.6,background:'#f9fafb',borderRadius:8,padding:'10px 14px'}}>{detailLog.description}</div>
                </div>
              )}
              {detailLog.notes && (
                <div style={{gridColumn:'1/-1'}}>
                  <div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>NOTES / PARTS</div>
                  <div style={{fontSize:13.5,color:'#374151'}}>{detailLog.notes}</div>
                </div>
              )}
              {detailLog.receipt_name && (
                <div style={{gridColumn:'1/-1'}}>
                  <div style={{fontSize:10.5,fontWeight:600,color:'#9ca3af',letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>RECEIPT</div>
                  <a href={supabase.storage.from('maintenance-files').getPublicUrl(detailLog.receipt_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:'#3b82f6',textDecoration:'none'}}>
                    📎 {detailLog.receipt_name}
                  </a>
                </div>
              )}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,borderTop:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',gap:8}}>
                {can('history') && (
                  <>
                    <Btn icon="edit" onClick={()=>openEditLog(detailLog)} style={{background:'#3b82f6'}}>Edit Log</Btn>
                    <Btn icon="trash" onClick={()=>deleteLog(detailLog.id)} style={{background:'#ef4444'}}>Delete</Btn>
                  </>
                )}
              </div>
              <GhostBtn onClick={()=>setDetailLog(null)}>Close</GhostBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit log modal */}
      {editLog && (
        <Modal title="Edit Maintenance Log" onClose={()=>setEditLog(null)} width={600}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Task Title *" fullWidth><input style={inputStyle} {...ef('title')}/></Field>
            <Field label="Date"><input type="date" style={inputStyle} {...ef('date')}/></Field>
            <Field label="Type">
              <select style={selectStyle} {...ef('type')}>
                <option value="inspection">Inspection</option>
                <option value="preventive">Preventative Maintenance</option>
                <option value="corrective">Corrective Repair</option>
                <option value="damage_repair">Damage Repair</option>
                <option value="other">Other</option>
              </select>
            </Field>
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
        </Modal>
      )}

      <Toast toast={toast}/>
    </div>
  );
}

// ── COSTS ─────────────────────────────────────────────────────────────────────
export function Costs() {
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [groupBy, setGroupBy] = useState('asset');
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([
      supabase.from('assets').select('id,name,category').order('id'),
      supabase.from('maintenance_logs').select('asset_id,date,internal_hours,external_cost,type,vendor'),
      supabase.from('invoices').select('asset_id,date,amount,vendor'),
    ]).then(([a,l,i])=>{ setAssets(a.data||[]); setLogs(l.data||[]); setInvoices(i.data||[]); setLoading(false); });
  },[]);

  const now = new Date();
  const inPeriod = (date) => {
    if (period==='all') return true;
    const d=new Date(date), diff=(now-d)/86400000;
    if (period==='ytd') return d.getFullYear()===now.getFullYear();
    if (period==='90d') return diff<=90;
    if (period==='30d') return diff<=30;
    return true;
  };

  const fLogs=logs.filter(l=>inPeriod(l.date));
  const fInvoices=invoices.filter(i=>inPeriod(i.date));

  const buildGroups = () => {
    const g = {};
    const key = (r) => {
      if (groupBy==='asset') return r.asset_id;
      if (groupBy==='category') return assets.find(a=>a.id===r.asset_id)?.category||'unknown';
      if (groupBy==='type') return r.type||'unknown';
      if (groupBy==='vendor') return r.vendor||'In-house';
      return r.asset_id;
    };
    fLogs.forEach(l=>{ const k=key(l); if(!g[k])g[k]={label:k,cost:0,hours:0,count:0}; g[k].cost+=Number(l.external_cost)||0; g[k].hours+=Number(l.internal_hours)||0; g[k].count++; });
    fInvoices.forEach(i=>{ const k=groupBy==='vendor'?(i.vendor||'Unknown vendor'):key(i); if(!g[k])g[k]={label:k,cost:0,hours:0,count:0}; g[k].cost+=Number(i.amount)||0; });
    return Object.values(g).sort((a,b)=>b.cost-a.cost);
  };

  if (loading) return <LoadingPage/>;
  const groups=buildGroups();
  const totalCost=groups.reduce((s,g)=>s+g.cost,0);
  const totalHours=groups.reduce((s,g)=>s+g.hours,0);
  const maxCost=Math.max(...groups.map(g=>g.cost),1);

  return (
    <div style={{padding:32}}>
      <PageHeader title="Cost Analysis" subtitle="External spend and internal labor breakdown"/>
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:2,background:'#0f1218',border:'1px solid #1e2530',borderRadius:8,padding:3}}>
          {[['asset','By Asset'],['category','By Category'],['type','By Type'],['vendor','By Vendor']].map(([v,l])=>(
            <button key={v} onClick={()=>setGroupBy(v)} style={{padding:'6px 14px',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:500,background:groupBy===v?'#f97316':'transparent',color:groupBy===v?'#fff':'#64748b'}}>{l}</button>
          ))}
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={selectStyle}>
          <option value="all">All Time</option>
          <option value="ytd">Year to Date</option>
          <option value="90d">Last 90 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:28}}>
        {[
          ['Total Spend',fmtCurrency(totalCost),'#f97316'],
          ['Internal Hours',`${totalHours.toFixed(1)} hrs`,'#3b82f6'],
          ['Avg Cost / Log',fLogs.length>0?fmtCurrency(totalCost/fLogs.length):'—','#22c55e'],
          ['Records',fLogs.length+fInvoices.length,'#8b5cf6'],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:'#0f1218',border:'1px solid #1e2530',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#475569',marginBottom:6}}>{l}</div>
            <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      {groups.length===0 ? <Empty text="No cost data for selected filters"/> : (
        <div style={{background:'#0f1218',border:'1px solid #1e2530',borderRadius:12,padding:24}}>
          <div style={{fontWeight:600,marginBottom:20,fontSize:15}}>Spend by {groupBy}</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {groups.slice(0,25).map(g=>{
              const pct=(g.cost/maxCost)*100;
              const asset=groupBy==='asset'?assets.find(a=>a.id===g.label):null;
              return (
                <div key={g.label} style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:150,fontSize:12,color:'#94a3b8',textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#f97316'}}>{g.label}</div>
                    {asset&&<div style={{fontSize:11,color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{asset.name}</div>}
                  </div>
                  <div style={{flex:1,height:28,background:'#1e2530',borderRadius:4,overflow:'hidden',position:'relative'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#f97316,#fb923c)',borderRadius:4,minWidth:4,display:'flex',alignItems:'center',paddingLeft:8}}>
                      {pct>15&&<span style={{fontSize:11,fontWeight:600,color:'#fff',whiteSpace:'nowrap'}}>{fmtCurrency(g.cost)}</span>}
                    </div>
                    {pct<=15&&<span style={{position:'absolute',left:`${pct+1}%`,top:'50%',transform:'translateY(-50%)',fontSize:11,fontWeight:600,color:'#94a3b8',whiteSpace:'nowrap',paddingLeft:4}}>{fmtCurrency(g.cost)}</span>}
                  </div>
                  <div style={{width:60,textAlign:'right',fontSize:12,color:'#64748b',flexShrink:0}}>{g.hours>0?`${g.hours}h`:'—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PM SCHEDULES ──────────────────────────────────────────────────────────────
export function PMSchedules() {
  const { user, can } = useAuth();
  const [assets, setAssets] = useState([]);
  const [pms, setPms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast, show } = useToast();
  const blank = { asset_id:'', task:'', interval:'monthly', last_performed:'', next_due:'', notes:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
    load();
  },[]);

  const load = async () => {
    const { data } = await supabase.from('pm_schedules').select('*,assets(name)').order('next_due',{ascending:true});
    setPms(data||[]); setLoading(false);
  };

  const save = async () => {
    if (!form.asset_id||!form.task) return show('Asset and task required','error');
    const { error } = await supabase.from('pm_schedules').insert({...form,created_by:user.id});
    if (error) return show(error.message,'error');
    show('PM schedule added'); setForm(blank); setShowForm(false); load();
  };

  const markDone = async (pm) => {
    const todayStr = today();
    const intervalDays = { weekly:7,monthly:30,quarterly:90,'semi-annual':180,annual:365 };
    let nextDue = pm.next_due;
    if (intervalDays[pm.interval]) {
      const nd = new Date(); nd.setDate(nd.getDate()+intervalDays[pm.interval]);
      nextDue = nd.toISOString().split('T')[0];
    }
    await supabase.from('pm_schedules').update({ last_performed:todayStr, next_due:nextDue }).eq('id',pm.id);
    show('PM marked complete — next due date updated'); load();
  };

  const remove = async (id) => {
    await supabase.from('pm_schedules').delete().eq('id',id);
    show('PM schedule removed'); load();
  };

  const getStatus = (pm) => {
    if (!pm.next_due) return 'scheduled';
    const diff=(new Date(pm.next_due)-new Date())/86400000;
    if (diff<0) return 'overdue';
    if (diff<=30) return 'due_soon';
    return 'ok';
  };

  const STATUS_META = {
    overdue:{label:'OVERDUE',color:'#ef4444'},
    due_soon:{label:'DUE SOON',color:'#f59e0b'},
    ok:{label:'ON TRACK',color:'#22c55e'},
    scheduled:{label:'SCHEDULED',color:'#3b82f6'},
  };

  const filtered = pms.filter(p=>filterStatus==='all'||getStatus(p)===filterStatus);
  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  if (loading) return <LoadingPage/>;

  return (
    <div style={{padding:32}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,marginBottom:2}}>PM Schedules</h1>
          <p style={{color:'#64748b',fontSize:14,margin:0}}>Preventive maintenance milestones · {pms.filter(p=>getStatus(p)==='overdue').length} overdue · {pms.filter(p=>getStatus(p)==='due_soon').length} due soon</p>
        </div>
        {can('pm') && <Btn icon="plus" onClick={()=>setShowForm(true)}>Add PM Schedule</Btn>}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All'],['overdue','Overdue'],['due_soon','Due Soon'],['ok','On Track'],['scheduled','Scheduled']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterStatus(v)} style={{padding:'6px 14px',border:'1px solid',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:500,background:filterStatus===v?'#f97316':'transparent',color:filterStatus===v?'#fff':'#64748b',borderColor:filterStatus===v?'#f97316':'#1e2530'}}>{l}</button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length===0 && <Empty text="No PM schedules found."/>}
        {[...filtered].sort((a,b)=>{ const o={overdue:0,due_soon:1,scheduled:2,ok:3}; return (o[getStatus(a)]||3)-(o[getStatus(b)]||3); }).map(p=>{
          const meta=STATUS_META[getStatus(p)];
          return (
            <div key={p.id} style={{background:'#0f1218',border:'1px solid #1e2530',borderLeft:`3px solid ${meta.color}`,borderRadius:10,padding:'16px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316',fontWeight:600}}>{p.asset_id}</span>
                    <span style={{fontWeight:600,fontSize:14}}>{p.task}</span>
                    <Badge text={meta.label} color={meta.color}/>
                    <Badge text={p.interval} color="#3b82f6"/>
                  </div>
                  <div style={{fontSize:12,color:'#64748b'}}>{p.assets?.name}</div>
                  <div style={{display:'flex',gap:20,marginTop:6,fontSize:12,color:'#64748b'}}>
                    {p.last_performed&&<span>Last: <strong style={{color:'#94a3b8'}}>{fmtDate(p.last_performed)}</strong></span>}
                    {p.next_due&&<span>Next: <strong style={{color:meta.color}}>{fmtDate(p.next_due)}</strong></span>}
                  </div>
                  {p.notes&&<div style={{fontSize:12,color:'#64748b',marginTop:4}}>{p.notes}</div>}
                </div>
                {can('pm') && (
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <GhostBtn onClick={()=>markDone(p)}>Mark Done</GhostBtn>
                    <IconBtn icon="trash" title="Remove" color="#ef4444" onClick={()=>remove(p.id)}/>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && (
        <Modal title="Add PM Schedule" onClose={()=>setShowForm(false)}>
          <div style={{background:'#1e2530',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#64748b',marginBottom:16}}>
            💡 After marking a time-based PM as done, the system automatically advances the next due date.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Asset *">
              <select style={selectStyle} {...f('asset_id')}>
                <option value="">— Select Asset —</option>
                {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
              </select>
            </Field>
            <Field label="Interval">
              <select style={selectStyle} {...f('interval')}>
                {PM_INTERVALS.map(i=><option key={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Task *" fullWidth><input style={inputStyle} {...f('task')} placeholder="e.g. Engine oil change, hydraulic fluid check…"/></Field>
            <Field label="Last Performed"><input type="date" style={inputStyle} {...f('last_performed')}/></Field>
            <Field label="Next Due"><input type="date" style={inputStyle} {...f('next_due')}/></Field>
            <Field label="Notes" fullWidth><textarea style={{...inputStyle,height:64,resize:'vertical'}} {...f('notes')}/></Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
            <GhostBtn onClick={()=>setShowForm(false)}>Cancel</GhostBtn>
            <Btn onClick={save}>Save Schedule</Btn>
          </div>
        </Modal>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
