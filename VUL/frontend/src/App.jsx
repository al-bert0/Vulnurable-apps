import React, { useState, useEffect } from 'react';
import AdminHub from './components/AdminHub';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 24px', background: '#111827', color: '#fff' }}>
        <strong>ShopEase Security Lab Platform</strong>
        {user ? (
          <div>
            <span style={{ marginRight: 15 }}>Logged in as: <b>{user.username}</b> ({user.role})</span>
            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        ) : null}
      </header>

      {user ? <AdminHub /> : <Login onLoginSuccess={setUser} />}
    </div>
  );
}

export default App;
