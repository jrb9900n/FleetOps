// ── Shared UI components ────────────────────────────────────────────────────
import { useState } from 'react';

export const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
export const fmtCurrency = (n) => n != null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2})}` : '—';
export const today = () => new Date().toISOString().split('T')[0];

export const CATEGORIES   = ['asphalt','concrete','landscape','general','fleet','safety'];
export const ASSET_TYPES  = ['Vehicle','Trailer','Vehicle Attachment','Heavy Equipment','Ride On Machine','Small Engine','Skid Attachment','Hand Tool','Landscape Tool','Other'];
export const PM_INTERVALS = ['weekly','monthly','quarterly','semi-annual','annual','every 250hrs','every 500hrs','every 1000hrs','every 5000mi','every 10000mi'];
export const CONDITIONS   = ['Excellent','Good','Fair','Poor','Out of Service'];

export const ROLE_LABELS = {
  admin:          'Admin',
  operations:     'Operations',
  office_manager: 'Office Manager',
  foreman:        'Foreman',
  field_crew:     'Field Crew',
};

export const CAT_COLORS = {
  asphalt:'#ea580c', concrete:'#64748b', landscape:'#16a34a',
  general:'#2563eb', fleet:'#7c3aed', safety:'#db2777',
};
export const STATUS_COLORS = {
  active:'#16a34a', 'out of service':'#dc2626',
  maintenance:'#d97706', retired:'#6b7280',
};

// SVG icon library
export const Icon = ({ name, size=18 }) => {
  const icons = {
    truck:    <path d="M1 3h15v11H1zM16 8l3 2v4h-3V8zM5.5 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM15.5 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" strokeLinecap="round" strokeLinejoin="round"/>,
    wrench:   <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>,
    alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    upload:   <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></>,
    history:  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>,
    dollar:   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    dashboard:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    clip:     <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>,
    close:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:    <polyline points="20 6 9 17 4 12"/>,
    eye:      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    edit:     <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    bell:     <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    users:    <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    logout:   <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    shield:   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    sort:     <><polyline points="18 15 12 9 6 15"/></>,
    sortdown: <><polyline points="6 9 12 15 18 9"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
      {icons[name] || null}
    </svg>
  );
};

// ── Light theme styles ───────────────────────────────────────────────────────
export const inputStyle = {
  width:'100%', background:'#fff', border:'1px solid #d1d5db',
  borderRadius:8, padding:'9px 12px', color:'#111827', fontSize:13.5,
  fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box',
};
export const selectStyle = { ...inputStyle, cursor:'pointer' };

export function Field({ label, children, fullWidth }) {
  return (
    <div style={{gridColumn: fullWidth ? '1/-1' : undefined}}>
      <label style={{display:'block',fontSize:11.5,fontWeight:600,color:'#6b7280',marginBottom:6,letterSpacing:.5}}>{label}</label>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, icon, type='button', disabled, style={} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
      background: disabled ? '#fed7aa' : '#f97316',
      border:'none', borderRadius:8, color:'#fff', fontWeight:600,
      fontSize:13.5, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily:'inherit', ...style,
    }}>
      {icon && <Icon name={icon} size={15}/>}{children}
    </button>
  );
}

export function GhostBtn({ children, onClick, active, style={} }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
      background: active ? '#f3f4f6' : 'transparent',
      border:'1px solid #d1d5db', borderRadius:8, color: active ? '#111827' : '#6b7280',
      fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', ...style,
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='#f3f4f6';e.currentTarget.style.color='#111827';}}
    onMouseLeave={e=>{e.currentTarget.style.background=active?'#f3f4f6':'transparent';e.currentTarget.style.color=active?'#111827':'#6b7280';}}
    >
      {children}
    </button>
  );
}

export function IconBtn({ icon, title, onClick, color }) {
  return (
    <button title={title} onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      width:32, height:32, background:'transparent', border:'1px solid #d1d5db',
      borderRadius:6, cursor:'pointer', color: color||'#6b7280',
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='#f3f4f6';e.currentTarget.style.color=color||'#111827';}}
    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=color||'#6b7280';}}
    >
      <Icon name={icon} size={14}/>
    </button>
  );
}

export function Badge({ text, color }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:4,
      fontSize:10.5, fontWeight:700, letterSpacing:.5,
      background:color+'22', color, border:`1px solid ${color}44`, whiteSpace:'nowrap',
    }}>
      {text}
    </span>
  );
}

export function Modal({ title, children, onClose, width=640 }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:28,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:18,fontWeight:700,margin:0,color:'#111827'}}>{title}</h2>
          <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',color:'#9ca3af',padding:4}}>
            <Icon name="close" size={18}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Section({ title, children, action }) {
  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15,color:'#111827'}}>{title}</div>
        {action && <button onClick={action.fn} style={{background:'transparent',border:'none',cursor:'pointer',color:'#f97316',fontSize:12,fontWeight:500,fontFamily:'inherit'}}>{action.label} →</button>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return <div style={{padding:'24px 0',textAlign:'center',color:'#9ca3af',fontSize:13}}>{text}</div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:700,marginBottom:2,color:'#111827'}}>{title}</h1>
        {subtitle && <p style={{color:'#6b7280',fontSize:14,margin:0}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, padding:'12px 20px',
      borderRadius:10, background:toast.type==='error'?'#fef2f2':'#f0fdf4',
      color:toast.type==='error'?'#991b1b':'#166534',
      border:`1px solid ${toast.type==='error'?'#fecaca':'#bbf7d0'}`,
      fontWeight:500, fontSize:14, boxShadow:'0 8px 32px rgba(0,0,0,.12)',
      zIndex:999, display:'flex', alignItems:'center', gap:8,
    }}>
      <Icon name={toast.type==='error'?'alert':'check'} size={16}/>{toast.msg}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3200);
  };
  return { toast, show };
}
