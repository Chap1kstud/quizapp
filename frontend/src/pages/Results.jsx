import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { id } = useParams();
  const { apiFetch } = useAuth();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch(`/quizzes/${id}`),
      apiFetch(`/quizzes/${id}/leaderboard`)
    ]).then(([q, lb]) => { setQuiz(q); setLeaderboard(lb); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!quiz) return null;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>📊 Результаты: {quiz.title}</h1>
        <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>← Назад</button>
      </div>
      <div className="card">
        <h2 style={{ fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>🏆 Итоговый рейтинг</h2>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--text2)', textAlign: 'center' }}>Никто не участвовал</p>
        ) : leaderboard.map((row, i) => (
          <div key={i} className={`leaderboard-row ${i < 3 ? `top-${i + 1}` : ''}`}>
            <span style={{ fontSize: i < 3 ? 22 : 16, width: 36, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : i + 1}</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{row.username}</span>
            <span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{row.total_score} очков</span>
          </div>
        ))}
      </div>
    </div>
  );
}
