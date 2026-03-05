import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, Badge, Btn, GhostBtn, IconBtn, Modal, Field, Empty, PageHeader, inputStyle, selectStyle, useToast, Toast, Icon } from './ui';
import { LoadingPage } from './Dashboard';

const ROLE_COLORS = {
  admin:'#f97316', operations:'#0891b2', office_manager:'#3b82f6',
  foreman:'#22c55e', field_crew:'#8b5cf6',
};

const ROLE_DESCRIPTIONS = {
  admin:          'Full system access — all modules including user management',
  operations:     'Full access to all modules except cannot edit Users page',
  office_manager: 'Dashboard, invoices, history, costs, damage reports',
  foreman:        'Dashboard, log maintenance, damage, history, PM schedules',
  field_crew:     'Log maintenance + submit damage reports only',
};

export default function Users() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [resetEmail, setResetEmail] = useState(null); // email being reset
  const { toast, show } = useToast();
  const blank = { email:'', full_name:'', role:'field_crew', password:'' };
  const [form, setForm] = useState(blank);

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(data||[]);
    setLoading(false);
  };

  const openNew  = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (u) => { setForm({...u, password:''}); setEditId(u.id); setShowForm(true); };

  const save = async () => {
    if (!form.full_name) return show('Name is required','error');
    if (editId) {
      const { error } = await supabase.from('profiles').update({ full_name:form.full_name, role:form.role }).eq('id',editId);
      if (error) return show(error.message,'error');
      show('User updated');
    } else {
      if (!form.email) return show('Email is required','error');
      if (!form.password||form.password.length<8) return show('Password must be at least 8 characters','error');
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name, role: form.role },
          emailRedirectTo: window.location.origin + '/login',
        },
      });
      if (error) return show(error.message,'error');
      show('User created — they will receive a confirmation email');
    }
    setShowForm(false);
    load();
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.full_name||u.email}? This cannot be undone.`)) return;
    // Use RPC to delete from auth.users (cascades to profiles)
    const { error } = await supabase.rpc('delete_auth_user', { user_id: u.id });
    if (error) {
      // Fallback: delete profile row only
      const { error: e2 } = await supabase.from('profiles').delete().eq('id', u.id);
      if (e2) return show(e2.message, 'error');
    }
    show('User deleted');
    load();
  };

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
    if (error) return show(error.message, 'error');
    show(`Password reset email sent to ${email}`);
    setResetEmail(null);
  };

  const updateRole = async (id, role) => {
    if (!isAdmin) return;
    await supabase.from('profiles').update({ role }).eq('id', id);
    show('Role updated');
    load();
  };

  if (loading) return <LoadingPage/>;

  const f = (k) => ({ value:form[k]||'', onChange:e=>setForm(p=>({...p,[k]:e.target.value})) });

  return (
    <div style={{padding:32, background:'#f9fafb', minHeight:'100vh'}}>
      <PageHeader title="User Management" subtitle={`${users.length} team members`}
        action={isAdmin && <Btn icon="plus" onClick={openNew}>Add User</Btn>}/>

      {!isAdmin && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#92400e'}}>
          👁 You can view users but only Admins can add, edit, or remove users.
        </div>
      )}

      {/* Role legend */}
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'14px 20px',marginBottom:24,boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#9ca3af',marginBottom:12}}>Role Permissions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role,desc])=>(
            <div key={role} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
              <Badge text={ROLE_LABELS[role]} color={ROLE_COLORS[role]}/>
              <span style={{fontSize:12,color:'#6b7280'}}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
          <thead style={{background:'#f9fafb'}}>
            <tr style={{borderBottom:'1px solid #e5e7eb'}}>
              {['Name','Email','Role','Actions'].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#6b7280'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length===0 && <tr><td colSpan={4} style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No users found</td></tr>}
            {users.map(u=>(
              <tr key={u.id} style={{borderBottom:'1px solid #f3f4f6'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{padding:'12px 16px',fontWeight:500,color:'#111827'}}>{u.full_name||'—'}</td>
                <td style={{padding:'12px 16px',color:'#6b7280',fontSize:13}}>{u.email}</td>
                <td style={{padding:'12px 16px'}}>
                  {isAdmin ? (
                    <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)}
                      style={{...selectStyle,width:'auto',padding:'5px 10px',fontSize:12}}>
                      {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : (
                    <Badge text={ROLE_LABELS[u.role]||u.role} color={ROLE_COLORS[u.role]||'#64748b'}/>
                  )}
                </td>
                <td style={{padding:'12px 16px'}}>
                  {isAdmin && u.id !== profile?.id && (
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <button onClick={()=>openEdit(u)}
                        style={{background:'transparent',border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',color:'#6b7280',padding:'5px 10px',fontSize:12,fontFamily:'inherit'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#f3f4f6';e.currentTarget.style.color='#111827';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#6b7280';}}
                      >Edit</button>
                      <button onClick={()=>setResetEmail(u.email)}
                        style={{background:'transparent',border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',color:'#3b82f6',padding:'5px 10px',fontSize:12,fontFamily:'inherit'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#eff6ff';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}
                        title="Send password reset email"
                      >Reset PW</button>
                      <IconBtn icon="trash" title="Delete user" color="#ef4444" onClick={()=>deleteUser(u)}/>
                    </div>
                  )}
                  {isAdmin && u.id === profile?.id && (
                    <span style={{fontSize:12,color:'#9ca3af',fontStyle:'italic'}}>You</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {showForm && isAdmin && (
        <Modal title={editId?'Edit User':'Add New User'} onClose={()=>setShowForm(false)}>
          {!editId && (
            <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#0369a1',marginBottom:16}}>
              💡 The new user will receive a confirmation email before they can sign in.
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Field label="Full Name *" fullWidth={!!editId}>
              <input style={inputStyle} {...f('full_name')} placeholder="Jane Smith"/>
            </Field>
            <Field label="Role">
              <select style={selectStyle} {...f('role')}>
                {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {!editId && <>
              <Field label="Email *"><input type="email" style={inputStyle} {...f('email')} placeholder="jane@company.com"/></Field>
              <Field label="Temporary Password *"><input type="password" style={inputStyle} {...f('password')} placeholder="Min 8 characters"/></Field>
            </>}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
            <GhostBtn onClick={()=>setShowForm(false)}>Cancel</GhostBtn>
            <Btn onClick={save}>{editId?'Save Changes':'Create User'}</Btn>
          </div>
        </Modal>
      )}

      {/* Password Reset Confirm Modal */}
      {resetEmail && (
        <Modal title="Reset Password" onClose={()=>setResetEmail(null)} width={420}>
          <p style={{fontSize:14,color:'#374151',marginBottom:20,lineHeight:1.6}}>
            Send a password reset email to <strong>{resetEmail}</strong>?<br/>
            They'll receive a link to set a new password.
          </p>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <GhostBtn onClick={()=>setResetEmail(null)}>Cancel</GhostBtn>
            <Btn onClick={()=>sendPasswordReset(resetEmail)} style={{background:'#3b82f6'}}>Send Reset Email</Btn>
          </div>
        </Modal>
      )}

      <Toast toast={toast}/>
    </div>
  );
}