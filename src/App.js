import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Assets from './components/Assets';
import { LogMaintenance, ReportDamage, Invoices } from './components/Forms';
import { History, Costs, PMSchedules } from './components/Pages';
import Users from './components/Users';
import { Icon, ROLE_LABELS } from './components/ui';

const ROLE_COLORS = {
  admin:'#f97316', operations:'#0891b2', office_manager:'#3b82f6',
  foreman:'#22c55e', field_crew:'#8b5cf6',
};

function AppShell() {
  const { user, profile, loading, can, signOut } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f9fafb',color:'#374151',fontFamily:"'DM Sans',sans-serif",fontSize:14}}>
      Loading…
    </div>
  );

  if (!user) return <LoginPage/>;

  const defaultTab = can('dashboard') ? 'dashboard' : can('log') ? 'log' : 'damage';
  const activeTab = tab === 'dashboard' && !can('dashboard') ? defaultTab : tab;

  const NAV = [
    { id:'dashboard', label:'Dashboard',       icon:'dashboard', perm:'dashboard' },
    { id:'assets',    label:'Assets',          icon:'truck',     perm:'assets'    },
    { id:'log',       label:'Log Maintenance', icon:'wrench',    perm:'log'       },
    { id:'damage',    label:'Report Damage',   icon:'alert',     perm:'damage'    },
    { id:'invoices',  label:'Invoices',        icon:'clip',      perm:'invoices'  },
    { id:'history',   label:'History',         icon:'history',   perm:'history'   },
    { id:'costs',     label:'Costs',           icon:'dollar',    perm:'costs'     },
    { id:'pm',        label:'PM Schedules',    icon:'bell',      perm:'pm'        },
    { id:'users',     label:'Users',           icon:'users',     perm:'users'     },
  ].filter(n => can(n.perm));

  const PAGES = {
    dashboard: <Dashboard setTab={setTab}/>,
    assets:    <Assets/>,
    log:       <LogMaintenance/>,
    damage:    <ReportDamage/>,
    invoices:  <Invoices/>,
    history:   <History/>,
    costs:     <Costs/>,
    pm:        <PMSchedules/>,
    users:     <Users/>,
  };

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f9fafb',color:'#111827',fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Sidebar */}
      <aside style={{width:220,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',flexShrink:0,boxShadow:'1px 0 4px rgba(0,0,0,.04)'}}>
        {/* Logo */}
        <div style={{padding:'24px 20px 16px',borderBottom:'1px solid #e5e7eb'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:'#f97316',textTransform:'uppercase',marginBottom:4}}>FleetOps</div>
          <div style={{fontSize:20,fontWeight:700,lineHeight:1.2,color:'#111827'}}>Maintenance<br/>System</div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 10px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
              border:'none', borderRadius:8, cursor:'pointer', textAlign:'left',
              fontSize:13.5, fontWeight:500, fontFamily:'inherit',
              background: activeTab===n.id ? '#fff7ed' : 'transparent',
              color: activeTab===n.id ? '#f97316' : '#6b7280',
              borderLeft: activeTab===n.id ? '3px solid #f97316' : '3px solid transparent',
            }}
            onMouseEnter={e=>{if(activeTab!==n.id){e.currentTarget.style.background='#f9fafb';e.currentTarget.style.color='#111827';}}}
            onMouseLeave={e=>{if(activeTab!==n.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#6b7280';}}}
            >
              <Icon name={n.icon} size={16}/>{n.label}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div style={{padding:'12px 14px',borderTop:'1px solid #e5e7eb'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {profile?.full_name || user.email}
          </div>
          <div style={{marginBottom:8}}>
            <span style={{
              display:'inline-block', padding:'2px 7px', borderRadius:4,
              fontSize:10, fontWeight:700, letterSpacing:.5,
              background:(ROLE_COLORS[profile?.role]||'#64748b')+'22',
              color:ROLE_COLORS[profile?.role]||'#6b7280',
              border:`1px solid ${(ROLE_COLORS[profile?.role]||'#64748b')}44`,
            }}>
              {ROLE_LABELS[profile?.role] || profile?.role}
            </span>
          </div>
          <button onClick={signOut} style={{
            display:'flex', alignItems:'center', gap:7, background:'transparent',
            border:'1px solid #e5e7eb', borderRadius:6, cursor:'pointer',
            color:'#9ca3af', padding:'6px 10px', fontSize:12, fontFamily:'inherit',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.color='#111827';}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#9ca3af';}}
          >
            <Icon name="logout" size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main style={{flex:1,overflow:'auto'}}>
        {PAGES[activeTab] || PAGES[defaultTab]}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell/>
    </AuthProvider>
  );
}