import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { today, Icon, Btn, Field, inputStyle, selectStyle, useToast, Toast } from './ui';

// ── Shared public page shell ──────────────────────────────────────────────────
const COMPANY_NAME = 'J.R. Boehlke';
const COMPANY_SHORT = 'JRB';
const LOGO_URL = '';

const publicStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f9fafb; }
  input, select, textarea, button { font-family: inherit; }
  input:focus, select:focus, textarea:focus { border-color: #f97316 !important; outline: none; }
  @media (max-width: 600px) {
    .pub-grid { grid-template-columns: 1fr !important; }
    .pub-wrap { padding: 16px !important; }
    .pub-card { padding: 20px !important; }
  }
`;

function PublicLogo() {
  if (LOGO_URL) return <img src={LOGO_URL} alt={COMPANY_NAME} style={{height:36,width:'auto',objectFit:'contain'}}/>;
  return (
    <div style={{width:40,height:40,background:'linear-gradient(135deg,#f97316,#ea580c)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#fff',letterSpacing:-0.5,flexShrink:0}}>
      {COMPANY_SHORT.slice(0,3)}
    </div>
  );
}

function PublicShell({ title, subtitle, icon, children }) {
  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',fontFamily:"'DM Sans',sans-serif"}}>
      <style>{publicStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <PublicLogo/>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#111827',lineHeight:1.2}}>{COMPANY_NAME}</div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:2,color:'#f97316',textTransform:'uppercase'}}>FleetOps</div>
          </div>
        </div>
        <a href="/" style={{fontSize:12,color:'#9ca3af',textDecoration:'none',display:'flex',alignItems:'center',gap:5}}
          onMouseEnter={e=>e.currentTarget.style.color='#111827'}
          onMouseLeave={e=>e.currentTarget.style.color='#9ca3af'}
        >
          <Icon name="logout" size={13}/> Staff login
        </a>
      </div>

      {/* Page */}
      <div className="pub-wrap" style={{maxWidth:680,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,background: icon==='wrench'?'#fff7ed':'#fef2f2',border:`1px solid ${icon==='wrench'?'#fed7aa':'#fecaca'}`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:icon==='wrench'?'#f97316':'#ef4444',flexShrink:0}}>
            <Icon name={icon} size={20}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:'#111827',marginBottom:2}}>{title}</h1>
            <p style={{fontSize:13,color:'#6b7280',margin:0}}>{subtitle}</p>
          </div>
        </div>
        <div className="pub-card" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SuccessBanner({ title, message, onAnother }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'24px 0',textAlign:'center'}}>
      <div style={{width:56,height:56,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a'}}>
        <Icon name="check" size={24}/>
      </div>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:'#111827',marginBottom:6}}>{title}</div>
        <div style={{fontSize:14,color:'#6b7280',maxWidth:340}}>{message}</div>
      </div>
      <button onClick={onAnother} style={{marginTop:4,padding:'10px 24px',background:'#f97316',border:'none',borderRadius:8,color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
        Submit Another
      </button>
    </div>
  );
}

// ── PUBLIC LOG MAINTENANCE ────────────────────────────────────────────────────
export function PublicLogMaintenance() {
  const [assets, setAssets] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileRef = useRef();
  const { toast, show } = useToast();

  const blank = { asset_id:'', date:today(), title:'', type:'inspection', description:'', performed_by:'', internal_hours:'', external_cost:'', vendor:'', odometer:'', notes:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
  },[]);

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const path = `receipts/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('maintenance-files').upload(path, file);
    if (error) show('Upload failed: '+error.message,'error');
    else { setUploadedFile({ name:file.name, path }); show('File uploaded'); }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.asset_id || !form.title) return show('Please select an asset and enter a task title','error');
    setSaving(true);
    const { error } = await supabase.from('maintenance_logs').insert({
      ...form,
      internal_hours: form.internal_hours ? Number(form.internal_hours) : 0,
      external_cost: form.external_cost ? Number(form.external_cost) : 0,
      receipt_path: uploadedFile?.path||null,
      receipt_name: uploadedFile?.name||null,
      created_by: null,
    });
    setSaving(false);
    if (error) return show(error.message,'error');
    setSubmitted(true);
  };

  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <PublicShell
      title="Log Maintenance"
      subtitle="Record completed maintenance or repair work"
      icon="wrench"
    >
      {submitted ? (
        <SuccessBanner
          title="Maintenance logged!"
          message="Your entry has been saved and will appear in the maintenance history."
          onAnother={()=>{ setForm(blank); setUploadedFile(null); setSubmitted(false); }}
        />
      ) : (
        <>
          <div className="pub-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Field label="Asset *">
              <select style={selectStyle} {...f('asset_id')}>
                <option value="">— Select Asset —</option>
                {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
              </select>
            </Field>
            <Field label="Date *"><input type="date" style={inputStyle} {...f('date')}/></Field>
            <Field label="Task Title *" fullWidth>
              <input style={inputStyle} {...f('title')} placeholder="e.g. Oil change, tire rotation, hydraulic repair…"/>
            </Field>
            <Field label="Type">
              <select style={selectStyle} {...f('type')}>
                <option value="inspection">Inspection</option>
                <option value="preventive">Preventative Maintenance</option>
                <option value="corrective">Corrective Repair</option>
                <option value="damage_repair">Damage Repair</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Performed By">
              <input style={inputStyle} {...f('performed_by')} placeholder="Your name"/>
            </Field>
            <Field label="Vendor / Shop">
              <input style={inputStyle} {...f('vendor')} placeholder="If outsourced"/>
            </Field>
            <Field label="Internal Hours">
              <input type="number" style={inputStyle} {...f('internal_hours')} placeholder="0.0" min="0" step="0.5"/>
            </Field>
            <Field label="External Cost ($)">
              <input type="number" style={inputStyle} {...f('external_cost')} placeholder="0.00" min="0" step="0.01"/>
            </Field>
            <Field label="Odometer / Engine Hours">
              <input style={inputStyle} {...f('odometer')} placeholder="miles or engine hours"/>
            </Field>
            <Field label="Receipt / Photo Upload">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={handleFile}/>
                <button onClick={()=>fileRef.current.click()} disabled={uploading} style={{...inputStyle,cursor:'pointer',background:'#f9fafb',color:'#374151',width:'auto',padding:'9px 14px',display:'flex',alignItems:'center',gap:7}}>
                  <Icon name="upload" size={14}/> {uploading?'Uploading…':uploadedFile?uploadedFile.name:'Choose file…'}
                </button>
                {uploadedFile && <button onClick={()=>setUploadedFile(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',padding:4}}><Icon name="close" size={14}/></button>}
              </div>
            </Field>
            <Field label="Description" fullWidth>
              <textarea style={{...inputStyle,height:80,resize:'vertical'}} {...f('description')} placeholder="Detailed description of work performed…"/>
            </Field>
            <Field label="Notes / Parts Used" fullWidth>
              <textarea style={{...inputStyle,height:60,resize:'vertical'}} {...f('notes')} placeholder="Parts replaced, follow-up needed, etc."/>
            </Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:24,paddingTop:20,borderTop:'1px solid #f3f4f6'}}>
            <Btn icon={saving?'check':'wrench'} onClick={submit} disabled={saving}>
              {saving?'Saving…':'Submit Log'}
            </Btn>
          </div>
        </>
      )}
      <Toast toast={toast}/>
    </PublicShell>
  );
}

// ── PUBLIC REPORT DAMAGE ──────────────────────────────────────────────────────
export function PublicReportDamage() {
  const [assets, setAssets] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  const blank = { asset_id:'', date:today(), reported_by:'', severity:'minor', description:'', location:'', action_taken:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{
    supabase.from('assets').select('id,name').order('id').then(({data})=>setAssets(data||[]));
  },[]);

  const submit = async () => {
    if (!form.asset_id || !form.description) return show('Please select an asset and describe the damage','error');
    setSaving(true);
    const { error } = await supabase.from('damage_reports').insert({
      ...form, status:'open', created_by:null,
    });
    setSaving(false);
    if (error) return show(error.message,'error');
    setSubmitted(true);
  };

  const f = (k) => ({ value:form[k], onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  const SEV_INFO = {
    minor:   { label:'Minor',    desc:'Cosmetic / non-critical',   color:'#22c55e' },
    moderate:{ label:'Moderate', desc:'Needs repair soon',          color:'#f59e0b' },
    major:   { label:'Major',    desc:'Limits operation',           color:'#ef4444' },
    critical:{ label:'Critical', desc:'Out of service immediately', color:'#dc2626' },
  };

  return (
    <PublicShell
      title="Report Damage"
      subtitle="Submit a damage report for any piece of equipment"
      icon="alert"
    >
      {submitted ? (
        <SuccessBanner
          title="Report submitted!"
          message="Your damage report has been received and flagged for review by the maintenance team."
          onAnother={()=>{ setForm(blank); setSubmitted(false); }}
        />
      ) : (
        <>
          <div className="pub-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Field label="Asset *">
              <select style={selectStyle} {...f('asset_id')}>
                <option value="">— Select Asset —</option>
                {assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
              </select>
            </Field>
            <Field label="Date Discovered">
              <input type="date" style={inputStyle} {...f('date')}/>
            </Field>
            <Field label="Reported By">
              <input style={inputStyle} {...f('reported_by')} placeholder="Your name"/>
            </Field>
            <Field label="Severity">
              <select style={selectStyle} {...f('severity')}>
                {Object.entries(SEV_INFO).map(([k,v])=>(
                  <option key={k} value={k}>{v.label} — {v.desc}</option>
                ))}
              </select>
            </Field>

            {/* Visual severity indicator */}
            <div style={{gridColumn:'1/-1',display:'flex',gap:8}}>
              {Object.entries(SEV_INFO).map(([k,v])=>(
                <button key={k} onClick={()=>setForm(p=>({...p,severity:k}))} style={{flex:1,padding:'10px 8px',border:`2px solid ${form.severity===k?v.color:'#e5e7eb'}`,borderRadius:8,background:form.severity===k?v.color+'11':'transparent',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                  <div style={{fontSize:11,fontWeight:700,color:form.severity===k?v.color:'#9ca3af',letterSpacing:.5}}>{v.label.toUpperCase()}</div>
                  <div style={{fontSize:10,color:form.severity===k?v.color:'#d1d5db',marginTop:2,lineHeight:1.3}}>{v.desc}</div>
                </button>
              ))}
            </div>

            <Field label="Location on Equipment">
              <input style={inputStyle} {...f('location')} placeholder="e.g. Left rear panel, hydraulic line…"/>
            </Field>
            <Field label="Immediate Action Taken">
              <input style={inputStyle} {...f('action_taken')} placeholder="e.g. Equipment parked, tag placed…"/>
            </Field>
            <Field label="Description *" fullWidth>
              <textarea style={{...inputStyle,height:110,resize:'vertical'}} {...f('description')} placeholder="Describe the damage in detail — what you saw, when it happened, how severe it appears…"/>
            </Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:24,paddingTop:20,borderTop:'1px solid #f3f4f6'}}>
            <Btn icon={saving?'check':'alert'} onClick={submit} disabled={saving} style={{background: form.severity==='critical'||form.severity==='major'?'#ef4444':'#f97316'}}>
              {saving?'Submitting…':'Submit Report'}
            </Btn>
          </div>
        </>
      )}
      <Toast toast={toast}/>
    </PublicShell>
  );
}
