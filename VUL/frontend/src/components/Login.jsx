import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/auth/login/', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check server connection.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <h2>Sign In to ShopEase Labs</h2>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 8, borderRadius: 4, marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label>Username</label>
          <input 
            type="text" 
            style={{ width: '100%', padding: 8, marginTop: 4 }} 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password</label>
          <input 
            type="password" 
            style={{ width: '100%', padding: 8, marginTop: 4 }} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" style={{ padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Log In
        </button>
      </form>
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12 }}>
        Admin default: <code>admin</code> / <code>AdminPassword123!</code><br/>
        Student default: <code>wiener</code> / <code>peter</code>
      </p>
    </div>
  );
};

export default Login;
