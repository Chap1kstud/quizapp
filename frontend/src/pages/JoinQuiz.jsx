import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function JoinQuiz() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { apiFetch } = useAuth();
  const nav = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(''); setLoading(true);
    try {
      const quiz = await apiFetch(`/quizzes/room/${code.trim().toUpperCase()}`);
      if (quiz.status === 'ended') return setError('Этот квиз уже завершён');
      nav(`/play/${quiz.id}`);
    } catch (e) {
      setError(e.message || 'Квиз не найден');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎮</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Войти в квиз</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Введи код комнаты, который дал организатор</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleJoin}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            style={{
              fontSize: 36, textAlign: 'center', letterSpacing: 10, fontWeight: 800,
              padding: '18px 24px', marginBottom: 16,
              border: '2px solid var(--border)', borderRadius: 12
            }}
            autoFocus
          />
          <br />
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || code.length < 4} style={{ minWidth: 200 }}>
            {loading ? 'Ищем...' : '🚀 Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
