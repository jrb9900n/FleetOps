import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { today, fmtDate, fmtCurrency, Icon, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

// ── LOG MAINTENANCE ──────────────────────────────────────────────────────────
export function LogMaintenance() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const { toast, show } = useToast();
  const blank = { asset_id:'', date:today(), title:'', type:'preventive', description:'', performed_by:'', internal_hours:'', external_cost:'', vendor:'', odometer:'', notes:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
  },[]);

  const submit = async () => {
    if (!form.asset_id||!form.title) return show('Asset and title are required','error');
    const { error } = await supabase.from('maintenance_logs').insert({
      ...form,
      internal_hours: form.internal_hours ? Number(form.internal_hours) : 0,
      external_cost:  form.external_cost  ? Number(form.external_cost)  : 0,
      created_by: user.id,
    });
    if (error) return show(error.message,'error');
    show('Maintenance log saved');
    setForm(blank);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false),2500);
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32,maxWidth:820}}>
      <PageHeader title="Log Maintenance" subtitle="Record completed maintenance or repair work"/>
      <div style={{background:'#0f1218',border:'1px solid #1e2530',borderRadius:12,padding:28}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <Field label="Asset *">
            <select style={selectStyle} {...f('asset_id')}>
              <option value="">— Select Asset —</option>
              {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
            </select>
          </Field>
          <Field label="Date *"><input type="date" style={inputStyle} {...f('date')}/></Field>
          <Field label="Task Title *" fullWidth><input style={inputStyle} {...f('title')} placeholder="e.g. Oil change, tire rotation, hydraulic repair…"/></Field>
          <Field label="Type">
            <select style={selectStyle} {...f('type')}>
              <option value="preventive">Preventive Maintenance</option>
              <option value="corrective">Corrective Repair</option>
              <option value="inspection">Inspection</option>
              <option value="damage_repair">Damage Repair</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Performed By"><input style={inputStyle} {...f('performed_by')} placeholder="Name or company"/></Field>
          <Field label="Vendor / Shop"><input style={inputStyle} {...f('vendor')} placeholder="If outsourced"/></Field>
          <Field label="Internal Hours"><input type="number" style={inputStyle} {...f('internal_hours')} placeholder="0.0" min="0" step="0.5"/></Field>
          <Field label="External Cost ($)"><input type="number" style={inputStyle} {...f('external_cost')} placeholder="0.00" min="0" step="0.01"/></Field>
          <Field label="Odometer / Engine Hours"><input style={inputStyle} {...f('odometer')} placeholder="miles or engine hours"/></Field>
          <Field label="Description" fullWidth><textarea style={{...inputStyle,height:80,resize:'vertical'}} {...f('description')} placeholder="Detailed description of work performed…"/></Field>
          <Field label="Notes / Parts Used" fullWidth><textarea style={{...inputStyle,height:60,resize:'vertical'}} {...f('notes')} placeholder="Parts replaced, follow-up needed, etc."/></Field>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
          <Btn icon={submitted?'check':'wrench'} onClick={submit} disabled={submitted}>
            {submitted?'Saved!':'Submit Log'}
          </Btn>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );
}


// ── REPORT DAMAGE ────────────────────────────────────────────────────────────
export function ReportDamage() {
  const { user, can } = useAuth();
  const [assets, setAssets]   = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('form');
  const { toast, show } = useToast();
  const blank = { asset_id:'', date:today(), reported_by:'', severity:'minor', description:'', location:'', action_taken:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
    loadReports();
  },[]);

  const loadReports = async () => {
    const { data } = await supabase.from('damage_reports').select('*,assets(name)').order('created_at',{ascending:false});
    setReports(data||[]);
    setLoading(false);
  };

  const submit = async () => {
    if (!form.asset_id||!form.description) return show('Asset and description are required','error');
    const { error } = await supabase.from('damage_reports').insert({...form,status:'open',created_by:user.id});
    if (error) return show(error.message,'error');
    show('Damage report submitted');
    setForm(blank);
    setViewMode('reports');
    loadReports();
  };

  const resolve = async (id) => {
    await supabase.from('damage_reports').update({status:'resolved',resolved_at:new Date().toISOString()}).eq('id',id);
    show('Report marked as resolved');
    loadReports();
  };

  const SEV = { minor:'#22c55e', moderate:'#f59e0b', major:'#ef4444', critical:'#dc2626' };
  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32,maxWidth:960}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,marginBottom:2}}>Damage Reports</h1>
          <p style={{color:'#64748b',fontSize:14,margin:0}}>{reports.filter(r=>r.status==='open').length} open · {reports.filter(r=>r.status==='resolved').length} resolved</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <GhostBtn onClick={()=>setViewMode('form')} active={viewMode==='form'}>New Report</GhostBtn>
          <GhostBtn onClick={()=>setViewMode('reports')} active={viewMode==='reports'}>View Reports</GhostBtn>
        </div>
      </div>

      {viewMode==='form' && (
        <div style={{background:'#0f1218',border:'1px solid #1e2530',borderRadius:12,padding:28}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Field label="Asset *">
              <select style={selectStyle} {...f('asset_id')}>
                <option value="">— Select Asset —</option>
                {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
              </select>
            </Field>
            <Field label="Date Discovered"><input type="date" style={inputStyle} {...f('date')}/></Field>
            <Field label="Reported By"><input style={inputStyle} {...f('reported_by')} placeholder="Your name"/></Field>
            <Field label="Severity">
              <select style={selectStyle} {...f('severity')}>
                <option value="minor">Minor — cosmetic / non-critical</option>
                <option value="moderate">Moderate — needs repair soon</option>
                <option value="major">Major — limits operation</option>
                <option value="critical">Critical — out of service now</option>
              </select>
            </Field>
            <Field label="Location on Equipment"><input style={inputStyle} {...f('location')} placeholder="e.g. Left rear panel, hydraulic line…"/></Field>
            <Field label="Immediate Action Taken"><input style={inputStyle} {...f('action_taken')} placeholder="e.g. Equipment parked, tag placed…"/></Field>
            <Field label="Description *" fullWidth><textarea style={{...inputStyle,height:100,resize:'vertical'}} {...f('description')} placeholder="Describe the damage in detail…"/></Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
            <Btn icon="alert" onClick={submit}>Submit Report</Btn>
          </div>
        </div>
      )}

      {viewMode==='reports' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {loading ? <LoadingPage/> : reports.length===0 ? <Empty text="No damage reports yet"/> : reports.map(r=>(
            <div key={r.id} style={{background:'#0f1218',borderLeft:`3px solid ${SEV[r.severity]||'#64748b'}`,border:`1px solid #1e2530`,borderRadius:10,padding:'16px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316',fontWeight:600}}>{r.asset_id}</span>
                    <span style={{fontWeight:600}}>{r.assets?.name}</span>
                    <Badge text={r.severity?.toUpperCase()} color={SEV[r.severity]||'#64748b'}/>
                    <Badge text={r.status?.toUpperCase()} color={r.status==='open'?'#ef4444':'#22c55e'}/>
                  </div>
                  <p style={{fontSize:13,color:'#94a3b8',margin:0,maxWidth:560}}>{r.description}</p>
                  {r.location && <p style={{fontSize:12,color:'#64748b',margin:'4px 0 0'}}>📍 {r.location}</p>}
                  <p style={{fontSize:11,color:'#475569',marginTop:6}}>Reported by {r.reported_by||'unknown'} · {fmtDate(r.date)}</p>
                </div>
                {r.status==='open' && can('damage') && (
                  <GhostBtn onClick={()=>resolve(r.id)}>Mark Resolved</GhostBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast toast={toast}/>
    </div>
  );
}


// ── INVOICES ─────────────────────────────────────────────────────────────────
export function Invoices() {
  const { user } = useAuth();
  const [assets, setAssets]     = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const { toast, show } = useToast();
  const blank = { asset_id:'', date:today(), vendor:'', amount:'', invoice_number:'', description:'', file_name:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
    load();
  },[]);

  const load = async () => {
    const { data } = await supabase.from('invoices').select('*,assets(name)').order('date',{ascending:false});
    setInvoices(data||[]);
    setLoading(false);
  };

  const save = async () => {
    if (!form.asset_id||!form.amount) return show('Asset and amount are required','error');
    const { error } = await supabase.from('invoices').insert({
      ...form, amount:Number(form.amount), created_by:user.id,
    });
    if (error) return show(error.message,'error');
    show('Invoice saved');
    setForm(blank);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await supabase.from('invoices').delete().eq('id',id);
    show('Invoice removed');
    load();
  };

  const filtered = invoices.filter(i =>
    (i.asset_id||'').toLowerCase().includes(search.toLowerCase())||
    (i.vendor||'').toLowerCase().includes(search.toLowerCase())||
    (i.invoice_number||'').toLowerCase().includes(search.toLowerCase())
  );
  const total = filtered.reduce((s,i)=>s+(Number(i.amount)||0),0);
  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32}}>
      <PageHeader title="Invoices & Receipts"
        subtitle={`${invoices.length} records · Total: ${fmtCurrency(invoices.reduce((s,i)=>s+(Number(i.amount)||0),0))}`}
        action={<Btn icon="upload" onClick={()=>setShowForm(true)}>Add Invoice</Btn>}/>

      <div style={{position:'relative',marginBottom:20}}>
        <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#475569'}}><Icon name="search" size={15}/></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by asset, vendor, invoice #…" style={{...inputStyle,paddingLeft:36,maxWidth:400}}/>
      </div>

      <div style={{background:'#0f1218',borderRadius:12,border:'1px solid #1e2530',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1e2530'}}>
              {['Invoice #','Date','Asset','Vendor','Description','Amount',''].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#475569'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? null : filtered.length===0 ? (
              <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#475569'}}>No invoices found</td></tr>
            ) : filtered.map(i=>(
              <tr key={i.id} style={{borderBottom:'1px solid #1e2530'}}
                onMouseEnter={e=>e.currentTarget.style.background='#111827'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{padding:'12px 16px'}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#94a3b8'}}>{i.invoice_number||'—'}</span></td>
                <td style={{padding:'12px 16px',color:'#94a3b8',whiteSpace:'nowrap'}}>{fmtDate(i.date)}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316'}}>{i.asset_id}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{i.assets?.name}</div>
                </td>
                <td style={{padding:'12px 16px',fontWeight:500}}>{i.vendor||'—'}</td>
                <td style={{padding:'12px 16px',color:'#94a3b8',maxWidth:200}}>{i.description||'—'}</td>
                <td style={{padding:'12px 16px',fontWeight:600,color:'#f97316'}}>{fmtCurrency(i.amount)}</td>
                <td style={{padding:'12px 16px'}}>
                  <IconBtn icon="trash" title="Delete" color="#ef4444" onClick={()=>remove(i.id)}/>
                </td>
              </tr>
            ))}
            {filtered.length>0 && (
              <tr style={{borderTop:'2px solid #1e2530'}}>
                <td colSpan={5} style={{padding:'12px 16px',fontWeight:600,textAlign:'right',fontSize:13}}>Total</td>
                <td colSpan={2} style={{padding:'12px 16px',fontWeight:700,color:'#f97316',fontSize:15}}>{fmtCurrency(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Add Invoice / Receipt" onClose={()=>setShowForm(false)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Asset *">
              <select style={selectStyle} {...f('asset_id')}>
                <option value="">— Select Asset —</option>
                {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" style={inputStyle} {...f('date')}/></Field>
            <Field label="Invoice Number"><input style={inputStyle} {...f('invoice_number')} placeholder="INV-0001"/></Field>
            <Field label="Vendor / Provider"><input style={inputStyle} {...f('vendor')} placeholder="Vendor name"/></Field>
            <Field label="Amount ($) *"><input type="number" style={inputStyle} {...f('amount')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="File Name (reference)"><input style={inputStyle} {...f('file_name')} placeholder="invoice_jan2024.pdf"/></Field>
            <Field label="Description" fullWidth><textarea style={{...inputStyle,height:72,resize:'vertical'}} {...f('description')}/></Field>
          </div>
          <div style={{marginTop:14,padding:'10px 14px',background:'#1e2530',borderRadius:8,fontSize:12,color:'#64748b'}}>
            📎 Direct file uploads can be enabled by connecting Supabase Storage — ask your admin to activate it.
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
            <GhostBtn onClick={()=>setShowForm(false)}>Cancel</GhostBtn>
            <Btn onClick={save}>Save Invoice</Btn>
          </div>
        </Modal>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
