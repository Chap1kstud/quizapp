import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, apiFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/quizzes/history').then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const roleLabel = user?.role === 'organizer' ? '📋 Организатор' : '🎮 Участник';

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, flexShrink: 0
          }}>{user?.username?.[0]?.toUpperCase()}</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{user?.username}</h1>
            <p style={{ color: 'var(--text2)' }}>{user?.email}</p>
            <span className={`badge ${user?.role === 'organizer' ? 'badge-purple' : 'badge-green'}`} style={{ marginTop: 6 }}>{roleLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-light)' }}>{history.length}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Квизов пройдено</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
              {history.reduce((sum, s) => sum + (s.total_score || 0), 0)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Всего очков</div>
          </div>
          {history.filter(s => s.rank === 1).length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FFD700' }}>{history.filter(s => s.rank === 1).length} 🥇</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Побед</div>
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontWeight: 700, marginBottom: 14 }}>📚 История участия</h2>
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="card empty-state"><div style={{ fontSize: 40 }}>🎮</div><h3>Нет истории</h3><p>Ты ещё не участвовал в квизах</p></div>
      ) : (
        history.map((s, i) => (
          <div key={i} className="card" style={{ marginBottom: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>{s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : '🎮'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700 }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Организатор: {s.organizer_name} · {new Date(s.joined_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary-light)' }}>{s.total_score} очков</div>
              {s.rank && <div style={{ fontSize: 13, color: 'var(--text2)' }}>Место #{s.rank}</div>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
