import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Assets from './components/Assets';
import { LogMaintenance, ReportDamage, Invoices } from './components/Forms';
import { PublicLogMaintenance, PublicReportDamage } from './components/PublicForms';
import { History, Costs, PMSchedules } from './components/Pages';
import Users from './components/Users';
import { Icon, ROLE_LABELS } from './components/ui';

// ── Company branding — update these constants to match your company ──────────
const COMPANY_NAME = 'J.R. Boehlke';
const COMPANY_SHORT = 'JRB';
// Set LOGO_URL to a hosted image URL to display a logo image, or leave '' for initials
const LOGO_URL = '';

const ROLE_COLORS = {
  admin:'#f97316', operations:'#0891b2', office_manager:'#3b82f6',
  foreman:'#22c55e', field_crew:'#8b5cf6',
};

const mobileNavStyles = `
  @media (max-width: 768px) {
    .fo-sidebar { display: none !important; }
    .fo-mobile-header { display: flex !important; }
    .fo-mobile-nav { display: flex !important; }
    .fo-main-content { padding-top: 56px; padding-bottom: 80px; }
  }
  @media (min-width: 769px) {
    .fo-mobile-header { display: none !important; }
    .fo-mobile-nav { display: none !important; }
  }
`;

function CompanyLogo({ size='normal' }) {
  const s = size==='small';
  if (LOGO_URL) return <img src={LOGO_URL} alt={COMPANY_NAME} style={{height:s?28:36,width:'auto',objectFit:'contain'}}/>;
  return (
    <div style={{width:s?32:40,height:s?32:40,background:'linear-gradient(135deg,#f97316,#ea580c)',borderRadius:s?8:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:s?12:14,color:'#fff',letterSpacing:-0.5,flexShrink:0}}>
      {COMPANY_SHORT.slice(0,3)}
    </div>
  );
}

// ── Public route detection (no router dependency needed) ─────────────────────
function getPublicRoute() {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path === '/log') return 'log';
  if (path === '/damage') return 'damage';
  return null;
}

function AppShell() {
  const { user, profile, loading, can, signOut } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f9fafb',color:'#374151',fontFamily:"'DM Sans',sans-serif",fontSize:14}}>Loading…</div>
  );
  if (!user) return <LoginPage/>;

  const defaultTab = can('dashboard')?'dashboard':can('log')?'log':'damage';
  const activeTab = tab==='dashboard'&&!can('dashboard')?defaultTab:tab;

  const NAV = [
    {id:'dashboard',label:'Dashboard',icon:'dashboard',perm:'dashboard'},
    {id:'assets',label:'Assets',icon:'truck',perm:'assets'},
    {id:'log',label:'Log Maintenance',icon:'wrench',perm:'log'},
    {id:'damage',label:'Report Damage',icon:'alert',perm:'damage'},
    {id:'invoices',label:'Invoices',icon:'clip',perm:'invoices'},
    {id:'history',label:'History',icon:'history',perm:'history'},
    {id:'costs',label:'Costs',icon:'dollar',perm:'costs'},
    {id:'pm',label:'PM Schedules',icon:'bell',perm:'pm'},
    {id:'users',label:'Users',icon:'users',perm:'users'},
  ].filter(n=>can(n.perm));

  const PAGES = {
    dashboard:<Dashboard setTab={setTab}/>,assets:<Assets/>,log:<LogMaintenance/>,damage:<ReportDamage/>,
    invoices:<Invoices/>,history:<History/>,costs:<Costs/>,pm:<PMSchedules/>,users:<Users/>,
  };

  const navigate = (id) => setTab(id);

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f9fafb',color:'#111827',fontFamily:"'DM Sans',sans-serif"}}>
      <style>{mobileNavStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Desktop Sidebar */}
      <aside className="fo-sidebar" style={{width:220,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',flexShrink:0,boxShadow:'1px 0 4px rgba(0,0,0,.04)'}}>
        <div style={{padding:'20px 18px 16px',borderBottom:'1px solid #e5e7eb'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <CompanyLogo/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#111827',lineHeight:1.2}}>{COMPANY_NAME}</div>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:2,color:'#f97316',textTransform:'uppercase',marginTop:2}}>FleetOps</div>
            </div>
          </div>
          <div style={{fontSize:10.5,color:'#9ca3af',fontWeight:500}}>Maintenance & Asset Management</div>
        </div>
        <nav style={{flex:1,padding:'12px 10px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>navigate(n.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',border:'none',borderRadius:8,cursor:'pointer',textAlign:'left',fontSize:13.5,fontWeight:500,fontFamily:'inherit',background:activeTab===n.id?'#fff7ed':'transparent',color:activeTab===n.id?'#f97316':'#6b7280',borderLeft:activeTab===n.id?'3px solid #f97316':'3px solid transparent'}}
              onMouseEnter={e=>{if(activeTab!==n.id){e.currentTarget.style.background='#f9fafb';e.currentTarget.style.color='#111827';}}}
              onMouseLeave={e=>{if(activeTab!==n.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#6b7280';}}}
            >
              <Icon name={n.icon} size={16}/>{n.label}
            </button>
          ))}
        </nav>

        {/* QR code quick-access links */}
        <div style={{padding:'12px 14px',borderTop:'1px solid #e5e7eb',borderBottom:'1px solid #e5e7eb'}}>
          <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Public QR Links</div>
          {[
            {path:'/log',label:'Log Maintenance',color:'#f97316'},
            {path:'/damage',label:'Report Damage',color:'#ef4444'},
          ].map(({path,label,color})=>(
            <div key={path} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:11.5,color:'#374151',fontWeight:500}}>{label}</span>
              <button
                onClick={()=>{ const url=window.location.origin+path; navigator.clipboard?.writeText(url); alert('Copied: '+url); }}
                title={'Copy link: '+window.location.origin+path}
                style={{fontSize:10,color,background:color+'11',border:`1px solid ${color}33`,borderRadius:4,padding:'2px 7px',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}
              >
                Copy URL
              </button>
            </div>
          ))}
        </div>

        <div style={{padding:'12px 14px'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.full_name||user.email}</div>
          <div style={{marginBottom:8}}>
            <span style={{display:'inline-block',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:.5,background:(ROLE_COLORS[profile?.role]||'#64748b')+'22',color:ROLE_COLORS[profile?.role]||'#6b7280',border:`1px solid ${(ROLE_COLORS[profile?.role]||'#64748b')}44`}}>
              {ROLE_LABELS[profile?.role]||profile?.role}
            </span>
          </div>
          <button onClick={signOut} style={{display:'flex',alignItems:'center',gap:7,background:'transparent',border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',color:'#9ca3af',padding:'6px 10px',fontSize:12,fontFamily:'inherit'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.color='#111827';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#9ca3af';}}
          >
            <Icon name="logout" size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="fo-mobile-header" style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 16px',height:56,alignItems:'center',justifyContent:'space-between',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <CompanyLogo size="small"/>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#111827'}}>{COMPANY_NAME}</div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:2,color:'#f97316',textTransform:'uppercase'}}>FleetOps</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,color:'#6b7280',fontWeight:500}}>{profile?.full_name?.split(' ')[0]||''}</span>
          <button onClick={signOut} style={{background:'transparent',border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',color:'#9ca3af',padding:'6px 8px',display:'flex',alignItems:'center'}}>
            <Icon name="logout" size={14}/>
          </button>
        </div>
      </div>

      {/* Page content */}
      <main className="fo-main-content" style={{flex:1,overflow:'auto'}}>
        {PAGES[activeTab]||PAGES[defaultTab]}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fo-mobile-nav" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:50,background:'#fff',borderTop:'1px solid #e5e7eb',padding:'6px 4px 16px',boxShadow:'0 -2px 12px rgba(0,0,0,.08)',justifyContent:'space-around',alignItems:'center',gap:2}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>navigate(n.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'5px 6px',borderRadius:8,flex:1,minWidth:0,color:activeTab===n.id?'#f97316':'#9ca3af',background:activeTab===n.id?'#fff7ed':'transparent',transition:'all .1s'}}>
            <Icon name={n.icon} size={22}/>
            <span style={{fontSize:9.5,fontWeight:600,letterSpacing:.1,textAlign:'center',lineHeight:1.1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%',maxWidth:60}}>
              {n.label.split(' ').slice(-1)[0]}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  // Check for public routes BEFORE rendering auth
  const publicRoute = getPublicRoute();
  if (publicRoute === 'log') return <PublicLogMaintenance/>;
  if (publicRoute === 'damage') return <PublicReportDamage/>;

  return (
    <AuthProvider>
      <AppShell/>
    </AuthProvider>
  );
}
