import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#0a0c10', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontFamily:"'DM Sans', sans-serif", padding:20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <div style={{width:'100%', maxWidth:420}}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:40}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:4, color:'#f97316', textTransform:'uppercase', marginBottom:6}}>FleetOps</div>
          <div style={{fontSize:28, fontWeight:700, color:'#e2e8f0', lineHeight:1.2}}>Maintenance System</div>
          <div style={{fontSize:13, color:'#64748b', marginTop:8}}>Sign in to your account</div>
        </div>

        {/* Card */}
        <div style={{background:'#0f1218', border:'1px solid #1e2530', borderRadius:14, padding:32}}>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Email address</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required autoFocus placeholder="you@yourcompany.com"
                style={inputStyle}
              />
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                required placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center', marginTop:20, fontSize:12, color:'#475569'}}>
          Contact your administrator to get an account.
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
