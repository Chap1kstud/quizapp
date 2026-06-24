import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'participant' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await register(form.username, form.email, form.password, form.role);
      nav(user.role === 'organizer' ? '/dashboard' : '/join');
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Создать аккаунт</h1>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        {/* Role selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
          {[
            { role: 'participant', icon: '🎮', title: 'Участник', desc: 'Играть в квизы' },
            { role: 'organizer', icon: '📋', title: 'Организатор', desc: 'Создавать квизы' }
          ].map(opt => (
            <div key={opt.role}
              onClick={() => set('role', opt.role)}
              style={{
                padding: '16px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${form.role === opt.role ? 'var(--primary)' : 'var(--border)'}`,
                background: form.role === opt.role ? 'rgba(124,58,237,0.15)' : 'var(--bg3)',
                transition: 'all 0.15s'
              }}>
              <div style={{ fontSize: 26 }}>{opt.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{opt.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{opt.desc}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input placeholder="QuizMaster" value={form.username} onChange={e => set('username', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" placeholder="Минимум 6 символов" value={form.password} onChange={e => set('password', e.target.value)} minLength={6} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Создаём...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
