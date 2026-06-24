import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = { general: 'Общие', science: 'Наука', history: 'История', sports: 'Спорт', music: 'Музыка', movies: 'Кино', tech: 'Технологии' };
const STATUS_BADGE = { draft: ['badge-gray', '✏️ Черновик'], active: ['badge-green', '🟢 Активен'], ended: ['badge-red', '🔴 Завершён'] };

export default function Dashboard() {
  const { user, apiFetch } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    apiFetch('/quizzes/my').then(setQuizzes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const deleteQuiz = async (id) => {
    if (!confirm('Удалить квиз?')) return;
    await apiFetch(`/quizzes/${id}`, { method: 'DELETE' });
    setQuizzes(q => q.filter(x => x.id !== id));
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Мои квизы</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>Привет, {user.username}! Управляй своими квизами.</p>
        </div>
        <Link to="/quiz/create" className="btn btn-primary btn-lg">✨ Создать квиз</Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎯</div>
          <h3>Квизов пока нет</h3>
          <p style={{ marginBottom: 20 }}>Создай свой первый квиз и начни веселье!</p>
          <Link to="/quiz/create" className="btn btn-primary">Создать первый квиз</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {quizzes.map(quiz => {
            const [badgeClass, statusLabel] = STATUS_BADGE[quiz.status] || ['badge-gray', quiz.status];
            return (
              <div key={quiz.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 24px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>{quiz.title}</h3>
                    <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                    <span className="badge badge-purple">{CATEGORY_LABELS[quiz.category] || quiz.category}</span>
                  </div>
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
                    Код: <strong style={{ color: 'var(--primary-light)', letterSpacing: 2 }}>{quiz.room_code}</strong>
                    {' · '}{quiz.participant_count} участников · {quiz.time_per_question}с/вопрос
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => nav(`/quiz/${quiz.id}/edit`)}>✏️ Редактировать</button>
                  {quiz.status !== 'ended' && (
                    <button className="btn btn-success btn-sm" onClick={() => nav(`/quiz/${quiz.id}/host`)}>▶️ Запустить</button>
                  )}
                  {quiz.status === 'ended' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => nav(`/quiz/${quiz.id}/results`)}>📊 Результаты</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => deleteQuiz(quiz.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
