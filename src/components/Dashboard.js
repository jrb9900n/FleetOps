import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { fmtDate, fmtCurrency, Icon, Badge, Section, Empty } from './ui';

export default function Dashboard({ setTab }) {
  const { can } = useAuth();
  const [stats, setStats]         = useState({ assets:0, outOfService:0, openDamage:0, totalCost:0, totalHours:0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [pmAlerts, setPmAlerts]   = useState({ overdue:[], dueSoon:[] });
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [
      { count: assetCount },
      { count: outCount },
      { count: dmgCount },
      { data: logs },
      { data: pm },
    ] = await Promise.all([
      supabase.from('assets').select('*',{count:'exact',head:true}),
      supabase.from('assets').select('*',{count:'exact',head:true}).eq('status','out of service'),
      supabase.from('damage_reports').select('*',{count:'exact',head:true}).eq('status','open'),
      supabase.from('maintenance_logs').select('id,title,date,asset_id,external_cost,internal_hours,assets(name)').order('date',{ascending:false}).limit(6),
      supabase.from('pm_schedules').select('*,assets(name)').not('next_due','is',null),
    ]);

    const totalCost  = (logs||[]).reduce((s,l)=>s+(Number(l.external_cost)||0),0);
    const totalHours = (logs||[]).reduce((s,l)=>s+(Number(l.internal_hours)||0),0);

    const now = new Date();
    const overdue  = (pm||[]).filter(p => new Date(p.next_due) < now);
    const dueSoon  = (pm||[]).filter(p => { const d=(new Date(p.next_due)-now)/86400000; return d>=0&&d<=30; });

    setStats({ assets:assetCount||0, outOfService:outCount||0, openDamage:dmgCount||0, totalCost, totalHours });
    setRecentLogs(logs||[]);
    setPmAlerts({ overdue, dueSoon });
    setLoading(false);
  };

  if (loading) return <LoadingPage/>;

  const StatCard = ({label,value,sub,color,icon,tab}) => (
    <div onClick={()=>tab&&setTab(tab)} style={{
      background:'#fff', border:'1px solid #e5e7eb', borderRadius:12,
      padding:'20px 24px', cursor:tab?'pointer':'default', transition:'all .15s', boxShadow:'0 1px 3px rgba(0,0,0,.06)',
    }}
    onMouseEnter={e=>{if(tab){e.currentTarget.style.borderColor='#f97316';e.currentTarget.style.boxShadow='0 2px 8px rgba(249,115,22,.15)';}}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.06)';}}
    >
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#6b7280',marginBottom:8}}>{label}</div>
          <div style={{fontSize:32,fontWeight:700,color:color||'#111827'}}>{value}</div>
          {sub && <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>{sub}</div>}
        </div>
        <div style={{color:color||'#9ca3af'}}><Icon name={icon} size={24}/></div>
      </div>
    </div>
  );

  return (
    <div style={{padding:32}}>
      <h1 style={{fontSize:26,fontWeight:700,marginBottom:4}}>Dashboard</h1>
      <p style={{color:'#64748b',marginBottom:28,fontSize:14}}>
        Fleet overview · {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
      </p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,marginBottom:32}}>
        <StatCard label="Total Assets"       value={stats.assets}      sub={`${stats.outOfService} out of service`} icon="truck"   color="#3b82f6" tab="assets"/>
        <StatCard label="Open Damage Reports" value={stats.openDamage}  sub="awaiting resolution"                   icon="alert"   color={stats.openDamage>0?"#ef4444":"#22c55e"} tab="damage"/>
        <StatCard label="PM Overdue"          value={pmAlerts.overdue.length} sub={`${pmAlerts.dueSoon.length} due within 30 days`} icon="bell" color={pmAlerts.overdue.length>0?"#ef4444":pmAlerts.dueSoon.length>0?"#f59e0b":"#22c55e"} tab="pm"/>
        {can('costs') && <StatCard label="Total Maint. Cost" value={fmtCurrency(stats.totalCost)} sub={`${stats.totalHours.toFixed(1)} internal hrs`} icon="dollar" color="#f97316" tab="costs"/>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <Section title="Recent Maintenance" action={can('history')?{label:'View All',fn:()=>setTab('history')}:null}>
          {recentLogs.length===0 ? <Empty text="No maintenance logs yet"/> : recentLogs.map(l=>(
            <div key={l.id} style={{padding:'12px 0',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{l.title}</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{l.asset_id} · {l.assets?.name}</div>
              </div>
              <div style={{textAlign:'right',fontSize:12,color:'#64748b',flexShrink:0,marginLeft:12}}>
                <div>{fmtDate(l.date)}</div>
                {l.external_cost>0 && <div style={{color:'#f97316'}}>{fmtCurrency(l.external_cost)}</div>}
              </div>
            </div>
          ))}
        </Section>

        <Section title="PM Alerts" action={can('pm')?{label:'Manage PM',fn:()=>setTab('pm')}:null}>
          {[...pmAlerts.overdue,...pmAlerts.dueSoon].length===0
            ? <Empty text="No PM items due soon — fleet is on track!"/>
            : [...pmAlerts.overdue,...pmAlerts.dueSoon].slice(0,6).map(p=>{
              const overdue = new Date(p.next_due)<new Date();
              return (
                <div key={p.id} style={{padding:'12px 0',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{p.task}</div>
                    <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{p.asset_id} · {p.assets?.name}</div>
                  </div>
                  <Badge text={overdue?'OVERDUE':'DUE SOON'} color={overdue?'#ef4444':'#f59e0b'}/>
                </div>
              );
            })}
        </Section>
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'#6b7280',fontSize:14}}>
      Loading…
    </div>
  );
}
