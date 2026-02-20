import { useState } from 'react';
import { registerUser, loginUser } from '../utils/auth';
import './AuthPage.css';

export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function resetForm() {
    setUsername('');
    setPassword('');
    setError('');
    setSuccessMsg('');
  }

  function switchTab(t) {
    setTab(t);
    resetForm();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (tab === 'register') {
      const result = registerUser(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccessMsg('Account created! You can now log in.');
      setUsername('');
      setPassword('');
      setTimeout(() => switchTab('login'), 1200);
    } else {
      const result = loginUser(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLogin(result.username);
    }
  }

  return (
    <div className="auth-wrapper">
      <h1 className="auth-app-title">Task Manager</h1>
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Log In
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            className="auth-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />

          <label className="auth-label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="auth-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
          />

          {error && <p className="auth-error">{error}</p>}
          {successMsg && <p className="auth-success">{successMsg}</p>}

          <button className="auth-submit" type="submit">
            {tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
