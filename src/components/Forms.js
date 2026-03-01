import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { today, fmtDate, fmtCurrency, Icon, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

// ── LOG MAINTENANCE ────────────────────────────────────────────────────────────
export function LogMaintenance() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileRef = useRef();
  const { toast, show } = useToast();
  const blank = { asset_id:'', date:today(), title:'', type:'preventive', description:'', performed_by:'', internal_hours:'', external_cost:'', vendor:'', odometer:'', notes:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
  },[]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `receipts/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('maintenance-files').upload(path, file);
    if (error) {
      show('Upload failed: ' + error.message, 'error');
    } else {
      setUploadedFile({ name: file.name, path });
      show('File uploaded');
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.asset_id || !form.title) return show('Asset and title are required', 'error');
    const { error } = await supabase.from('maintenance_logs').insert({
      ...form,
      internal_hours: form.internal_hours ? Number(form.internal_hours) : 0,
      external_cost: form.external_cost ? Number(form.external_cost) : 0,
      receipt_path: uploadedFile?.path || null,
      receipt_name: uploadedFile?.name || null,
      created_by: user.id,
    });
    if (error) return show(error.message, 'error');
    show('Maintenance log saved');
    setForm(blank);
    setUploadedFile(null);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false), 2500);
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32, maxWidth:820}}>
      <PageHeader title="Log Maintenance" subtitle="Record completed maintenance or repair work"/>
      <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:28, boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
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
          <Field label="Receipt / Invoice Upload">
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={handleFile}/>
              <button
                onClick={()=>fileRef.current.click()}
                disabled={uploading}
                style={{...inputStyle, cursor:'pointer', background:'#f9fafb', color:'#374151', width:'auto', padding:'9px 14px', display:'flex', alignItems:'center', gap:7}}
              >
                <Icon name="upload" size={14}/>
                {uploading ? 'Uploading…' : uploadedFile ? uploadedFile.name : 'Choose file…'}
              </button>
              {uploadedFile && (
                <button onClick={()=>setUploadedFile(null)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#ef4444', padding:4}}>
                  <Icon name="close" size={14}/>
                </button>
              )}
            </div>
          </Field>
          <Field label="Description" fullWidth><textarea style={{...inputStyle, height:80, resize:'vertical'}} {...f('description')} placeholder="Detailed description of work performed…"/></Field>
          <Field label="Notes / Parts Used" fullWidth><textarea style={{...inputStyle, height:60, resize:'vertical'}} {...f('notes')} placeholder="Parts replaced, follow-up needed, etc."/></Field>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:20}}>
          <Btn icon={submitted?'check':'wrench'} onClick={submit} disabled={submitted}>
            {submitted ? 'Saved!' : 'Submit Log'}
          </Btn>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );
}

// ── REPORT DAMAGE ──────────────────────────────────────────────────────────────
export function ReportDamage() {
  const { user, can } = useAuth();
  const [assets, setAssets] = useState([]);
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
    if (!form.asset_id || !form.description) return show('Asset and description are required', 'error');
    const { error } = await supabase.from('damage_reports').insert({...form, status:'open', created_by:user.id});
    if (error) return show(error.message, 'error');
    show('Damage report submitted');
    setForm(blank);
    setViewMode('reports');
    loadReports();
  };

  const resolve = async (id) => {
    await supabase.from('damage_reports').update({status:'resolved', resolved_at:new Date().toISOString()}).eq('id',id);
    show('Report marked as resolved');
    loadReports();
  };

  const SEV = { minor:'#22c55e', moderate:'#f59e0b', major:'#ef4444', critical:'#dc2626' };
  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32, maxWidth:960}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <div>
          <h1 style={{fontSize:26, fontWeight:700, marginBottom:2, color:'#111827'}}>Damage Reports</h1>
          <p style={{color:'#6b7280', fontSize:14, margin:0}}>{reports.filter(r=>r.status==='open').length} open · {reports.filter(r=>r.status==='resolved').length} resolved</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <GhostBtn onClick={()=>setViewMode('form')} active={viewMode==='form'}>New Report</GhostBtn>
          <GhostBtn onClick={()=>setViewMode('reports')} active={viewMode==='reports'}>View Reports</GhostBtn>
        </div>
      </div>

      {viewMode==='form' && (
        <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:28, boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
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
            <Field label="Description *" fullWidth><textarea style={{...inputStyle, height:100, resize:'vertical'}} {...f('description')} placeholder="Describe the damage in detail…"/></Field>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:20}}>
            <Btn icon="alert" onClick={submit}>Submit Report</Btn>
          </div>
        </div>
      )}

      {viewMode==='reports' && (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {loading ? <LoadingPage/> : reports.length===0 ? <Empty text="No damage reports yet"/> : reports.map(r=>(
            <div key={r.id} style={{background:'#fff', borderLeft:`3px solid ${SEV[r.severity]||'#64748b'}`, border:`1px solid #e5e7eb`, borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8}}>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap'}}>
                    <span style={{fontFamily:"'DM Mono',monospace", fontSize:12, color:'#f97316', fontWeight:600}}>{r.asset_id}</span>
                    <span style={{fontWeight:600, color:'#111827'}}>{r.assets?.name}</span>
                    <Badge text={r.severity?.toUpperCase()} color={SEV[r.severity]||'#64748b'}/>
                    <Badge text={r.status?.toUpperCase()} color={r.status==='open'?'#ef4444':'#22c55e'}/>
                  </div>
                  <p style={{fontSize:13, color:'#6b7280', margin:0, maxWidth:560}}>{r.description}</p>
                  {r.location && <p style={{fontSize:12, color:'#9ca3af', margin:'4px 0 0'}}>📍 {r.location}</p>}
                  <p style={{fontSize:11, color:'#9ca3af', marginTop:6}}>Reported by {r.reported_by||'unknown'} · {fmtDate(r.date)}</p>
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

// ── INVOICES ───────────────────────────────────────────────────────────────────
export function Invoices() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileRef = useRef();
  const { toast, show } = useToast();
  const blank = { asset_id:'', date:today(), vendor:'', amount:'', invoice_number:'', description:'' };
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

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `invoices/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('maintenance-files').upload(path, file);
    if (error) {
      show('Upload failed: ' + error.message, 'error');
    } else {
      setUploadedFile({ name: file.name, path });
      show('File uploaded');
    }
    setUploading(false);
  };

  const save = async () => {
    if (!form.asset_id || !form.amount) return show('Asset and amount are required', 'error');
    const { error } = await supabase.from('invoices').insert({
      ...form,
      amount: Number(form.amount),
      file_path: uploadedFile?.path || null,
      file_name: uploadedFile?.name || null,
      created_by: user.id,
    });
    if (error) return show(error.message, 'error');
    show('Invoice saved');
    setForm(blank);
    setUploadedFile(null);
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
    (i.asset_id||'').toLowerCase().includes(search.toLowerCase()) ||
    (i.vendor||'').toLowerCase().includes(search.toLowerCase()) ||
    (i.invoice_number||'').toLowerCase().includes(search.toLowerCase())
  );
  const total = filtered.reduce((s,i)=>s+(Number(i.amount)||0),0);
  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32}}>
      <PageHeader
        title="Invoices & Receipts"
        subtitle={`${invoices.length} records · Total: ${fmtCurrency(invoices.reduce((s,i)=>s+(Number(i.amount)||0),0))}`}
        action={<Btn icon="upload" onClick={()=>setShowForm(true)}>Add Invoice</Btn>}
      />
      <div style={{position:'relative', marginBottom:20}}>
        <div style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9ca3af'}}><Icon name="search" size={15}/></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by asset, vendor, invoice #…" style={{...inputStyle, paddingLeft:36, maxWidth:400}}/>
      </div>

      <div style={{background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13.5}}>
          <thead style={{background:'#f9fafb'}}>
            <tr style={{borderBottom:'1px solid #e5e7eb'}}>
              {['Invoice #','Date','Asset','Vendor','Description','Amount','File',''].map(h=>(
                <th key={h} style={{padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:'#6b7280'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? null : filtered.length===0 ? (
              <tr><td colSpan={8} style={{padding:32, textAlign:'center', color:'#9ca3af'}}>No invoices found</td></tr>
            ) : filtered.map(i=>(
              <tr key={i.id} style={{borderBottom:'1px solid #f3f4f6'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{padding:'12px 16px'}}><span style={{fontFamily:"'DM Mono',monospace", fontSize:12, color:'#6b7280'}}>{i.invoice_number||'—'}</span></td>
                <td style={{padding:'12px 16px', color:'#6b7280', whiteSpace:'nowrap'}}>{fmtDate(i.date)}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{fontFamily:"'DM Mono',monospace", fontSize:12, color:'#f97316'}}>{i.asset_id}</div>
                  <div style={{fontSize:11, color:'#9ca3af'}}>{i.assets?.name}</div>
                </td>
                <td style={{padding:'12px 16px', fontWeight:500, color:'#111827'}}>{i.vendor||'—'}</td>
                <td style={{padding:'12px 16px', color:'#6b7280', maxWidth:200}}>{i.description||'—'}</td>
                <td style={{padding:'12px 16px', fontWeight:600, color:'#f97316'}}>{fmtCurrency(i.amount)}</td>
                <td style={{padding:'12px 16px'}}>
                  {i.file_path ? (
                    <a href={supabase.storage.from('maintenance-files').getPublicUrl(i.file_path).data.publicUrl}
                       target="_blank" rel="noopener noreferrer"
                       style={{fontSize:12, color:'#3b82f6', textDecoration:'none'}}>
                      📎 {i.file_name||'View'}
                    </a>
                  ) : <span style={{color:'#d1d5db', fontSize:12}}>—</span>}
                </td>
                <td style={{padding:'12px 16px'}}>
                  <IconBtn icon="trash" title="Delete" color="#ef4444" onClick={()=>remove(i.id)}/>
                </td>
              </tr>
            ))}
            {filtered.length>0 && (
              <tr style={{borderTop:'2px solid #e5e7eb', background:'#f9fafb'}}>
                <td colSpan={5} style={{padding:'12px 16px', fontWeight:600, textAlign:'right', fontSize:13, color:'#6b7280'}}>Total</td>
                <td colSpan={3} style={{padding:'12px 16px', fontWeight:700, color:'#f97316', fontSize:15}}>{fmtCurrency(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Add Invoice / Receipt" onClose={()=>{ setShowForm(false); setUploadedFile(null); }}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
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
            <Field label="Upload File (PDF / Image)">
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={handleFile}/>
                <button
                  onClick={()=>fileRef.current.click()}
                  disabled={uploading}
                  style={{...inputStyle, cursor:'pointer', background:'#f9fafb', color:'#374151', width:'auto', padding:'9px 14px', display:'flex', alignItems:'center', gap:7}}
                >
                  <Icon name="upload" size={14}/>
                  {uploading ? 'Uploading…' : uploadedFile ? uploadedFile.name : 'Choose file…'}
                </button>
                {uploadedFile && (
                  <button onClick={()=>setUploadedFile(null)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#ef4444', padding:4}}>
                    <Icon name="close" size={14}/>
                  </button>
                )}
              </div>
            </Field>
            <Field label="Description" fullWidth><textarea style={{...inputStyle, height:72, resize:'vertical'}} {...f('description')}/></Field>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20}}>
            <GhostBtn onClick={()=>{ setShowForm(false); setUploadedFile(null); }}>Cancel</GhostBtn>
            <Btn onClick={save}>Save Invoice</Btn>
          </div>
        </Modal>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
