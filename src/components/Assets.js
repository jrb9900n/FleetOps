import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, ASSET_TYPES, CONDITIONS, CAT_COLORS, STATUS_COLORS, fmtDate, Icon, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast } from './ui';
import { LoadingPage } from './Dashboard';

const CONDITION_COLORS = {
  'Excellent':'#16a34a','Good':'#65a30d','Fair':'#d97706','Poor':'#ea580c','Out of Service':'#dc2626',
};

export default function Assets() {
  const { can } = useAuth();
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const { toast, show } = useToast();

  const blank = { id:'', name:'', category:'asphalt', type:'truck', year:'', make:'', model:'', status:'active', condition:'Good', odometer:'', comments:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    const { data } = await supabase.from('assets').select('*').order('id');
    setAssets(data||[]);
    setLoading(false);
  };

  const openNew  = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (a) => {
    // Map notes field → comments if needed for legacy records
    setForm({ ...blank, ...a, comments: a.comments || a.notes || '' });
    setEditId(a.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.id||!form.name) return show('Asset ID and Name are required','error');
    const payload = { id:form.id, name:form.name, category:form.category, type:form.type,
      year:form.year, make:form.make, model:form.model, status:form.status,
      condition:form.condition, odometer:form.odometer, comments:form.comments };
    if (editId) {
      const { error } = await supabase.from('assets').update(payload).eq('id',editId);
      if (error) return show(error.message,'error');
      show('Asset updated');
    } else {
      const { error } = await supabase.from('assets').insert(payload);
      if (error) return show(error.message,'error');
      show('Asset added');
    }
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this asset? This cannot be undone.')) return;
    await supabase.from('assets').delete().eq('id',id);
    show('Asset removed');
    load();
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filtered = assets
    .filter(a =>
      (filterCat==='all'||a.category===filterCat) &&
      (a.id.toLowerCase().includes(search.toLowerCase())||
       a.name.toLowerCase().includes(search.toLowerCase())||
       (a.make||'').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a,b)=>{
      let av = (a[sortCol]||'').toString().toLowerCase();
      let bv = (b[sortCol]||'').toString().toLowerCase();
      if (av < bv) return sortDir==='asc' ? -1 : 1;
      if (av > bv) return sortDir==='asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({col}) => {
    if (sortCol !== col) return <Icon name="sort" size={12}/>;
    return <Icon name={sortDir==='asc'?'sort':'sortdown'} size={12}/>;
  };

  const thStyle = (col) => ({
    padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600,
    letterSpacing:1.5, textTransform:'uppercase', color:'#6b7280',
    cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
    background: sortCol===col ? '#fafafa' : 'transparent',
  });

  if (loading) return <LoadingPage/>;

  return (
    <div style={{padding:32, background:'#f9fafb', minHeight:'100vh'}}>
      <PageHeader title="Assets" subtitle={`${assets.length} assets registered`}
        action={can('assets') && <Btn icon="plus" onClick={openNew}>Add Asset</Btn>}/>

      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 200px'}}>
          <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af'}}><Icon name="search" size={15}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, name, or make…" style={{...inputStyle,paddingLeft:36}}/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...selectStyle,flex:'0 0 180px'}}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>

      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
          <thead style={{background:'#f9fafb'}}>
            <tr style={{borderBottom:'1px solid #e5e7eb'}}>
              {[
                ['id','Asset ID'],['name','Name'],['category','Category'],['type','Type'],
                ['year','Year / Make / Model'],['condition','Condition'],['odometer','Odometer / Hours'],['status','Status'],
              ].map(([col,label])=>(
                <th key={col} style={thStyle(col)} onClick={()=>handleSort(col)}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{label}<SortIcon col={col}/></span>
                </th>
              ))}
              {can('assets') && <th style={{...thStyle('actions'),cursor:'default'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={9} style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No assets found</td></tr>}
            {filtered.map(a=>(
              <tr key={a.id} style={{borderBottom:'1px solid #f3f4f6'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{padding:'12px 16px'}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#f97316',fontWeight:600}}>{a.id}</span></td>
                <td style={{padding:'12px 16px',fontWeight:500,color:'#111827'}}>{a.name}</td>
                <td style={{padding:'12px 16px'}}><Badge text={a.category} color={CAT_COLORS[a.category]||'#64748b'}/></td>
                <td style={{padding:'12px 16px',color:'#6b7280',textTransform:'capitalize'}}>{a.type}</td>
                <td style={{padding:'12px 16px',color:'#6b7280'}}>{[a.year,a.make,a.model].filter(Boolean).join(' · ')||'—'}</td>
                <td style={{padding:'12px 16px'}}>
                  {a.condition
                    ? <Badge text={a.condition} color={CONDITION_COLORS[a.condition]||'#64748b'}/>
                    : <span style={{color:'#d1d5db'}}>—</span>}
                </td>
                <td style={{padding:'12px 16px',color:'#6b7280',fontFamily:"'DM Mono',monospace",fontSize:12}}>{a.odometer||'—'}</td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:500,color:STATUS_COLORS[a.status||'active']||'#16a34a'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:STATUS_COLORS[a.status||'active'],display:'inline-block'}}/>
                    {(a.status||'active').toUpperCase()}
                  </span>
                </td>
                {can('assets') && (
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <IconBtn icon="edit" title="Edit" onClick={()=>openEdit(a)}/>
                      <IconBtn icon="trash" title="Delete" color="#ef4444" onClick={()=>remove(a.id)}/>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editId?'Edit Asset':'Add New Asset'} onClose={()=>setShowForm(false)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Asset ID *"><input style={inputStyle} value={form.id} onChange={e=>setForm(p=>({...p,id:e.target.value}))} placeholder="e.g. FLV004" disabled={!!editId}/></Field>
            <Field label="Name *"><input style={inputStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></Field>
            <Field label="Category">
              <select style={selectStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select style={selectStyle} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                {ASSET_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Year"><input style={inputStyle} value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} placeholder="2022"/></Field>
            <Field label="Make"><input style={inputStyle} value={form.make} onChange={e=>setForm(p=>({...p,make:e.target.value}))}/></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}/></Field>
            <Field label="Status">
              <select style={selectStyle} value={form.status||'active'} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                <option value="active">Active</option>
                <option value="out of service">Out of Service</option>
                <option value="maintenance">In Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </Field>
            <Field label="Condition">
              <select style={selectStyle} value={form.condition||'Good'} onChange={e=>setForm(p=>({...p,condition:e.target.value}))}>
                {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Odometer / Engine Hours"><input style={inputStyle} value={form.odometer||''} onChange={e=>setForm(p=>({...p,odometer:e.target.value}))} placeholder="e.g. 45,200 mi or 1,340 hrs"/></Field>
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