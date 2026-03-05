import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { clearRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setSuccess(true);
    setTimeout(() => clearRecovery(), 2000);
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#0a0c10', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:"'DM Sans', sans-serif", padding:20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      <div style={{width:'100%', maxWidth:420}}>
        <div style={{textAlign:'center', marginBottom:40}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:4, color:'#f97316', textTransform:'uppercase', marginBottom:6}}>FleetOps</div>
          <div style={{fontSize:28, fontWeight:700, color:'#e2e8f0', lineHeight:1.2}}>Set New Password</div>
          <div style={{fontSize:13, color:'#64748b', marginTop:8}}>Enter your new password below</div>
        </div>

        <div style={{background:'#0f1218', border:'1px solid #1e2530', borderRadius:14, padding:32}}>
          {success ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:40, marginBottom:12}}>✓</div>
              <div style={{color:'#4ade80', fontSize:16, fontWeight:600, marginBottom:8}}>Password Updated</div>
              <div style={{color:'#64748b', fontSize:13}}>Redirecting you now…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  required autoFocus placeholder="Min 8 characters"
                  style={inputStyle}
                />
              </div>
              <div style={{marginBottom:24}}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                  required placeholder="Re-enter your password"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{background:'#7f1d1d22', border:'1px solid #7f1d1d', borderRadius:8, padding:'10px 14px', color:'#fca5a5', fontSize:13, marginBottom:16}}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'11px 0', background: loading ? '#78350f' : '#f97316',
                border:'none', borderRadius:8, color:'#fff', fontWeight:600,
                fontSize:15, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', transition:'background .15s',
              }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display:'block', fontSize:12, fontWeight:600, color:'#64748b',
  marginBottom:6, letterSpacing:.5,
};
const inputStyle = {
  width:'100%', background:'#1a2030', border:'1px solid #1e2530',
  borderRadius:8, padding:'10px 14px', color:'#e2e8f0', fontSize:14,
  fontFamily:'inherit', outline:'none', boxSizing:'border-box',
};
