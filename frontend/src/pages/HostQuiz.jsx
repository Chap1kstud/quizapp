import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

export default function HostQuiz() {
  const { id } = useParams();
  const { apiFetch, token } = useAuth();
  const nav = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [phase, setPhase] = useState('lobby'); // lobby | question | results | ended
  const [participants, setParticipants] = useState([]);
  const [currentQ, setCurrentQ] = useState(null);
  const [qIndex, setQIndex] = useState(-1);
  const [totalQ, setTotalQ] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_joined':
        setQuiz(msg.quiz);
        setParticipants(msg.participants || []);
        break;
      case 'participant_joined':
      case 'participant_left':
        setParticipants(msg.participants || []);
        break;
      case 'quiz_started':
        setTotalQ(msg.total_questions);
        setPhase('lobby');
        break;
      case 'question_start':
        setCurrentQ(msg.question);
        setQIndex(msg.index);
        setTotalQ(msg.total);
        setPhase('question');
        setAnswerCount(0);
        setTimeLeft(msg.time_limit || msg.question?.time_limit || 30);
        break;
      case 'answer_received':
        setAnswerCount(msg.count);
        break;
      case 'question_ended':
        clearInterval(timerRef.current);
        setLeaderboard(msg.leaderboard || []);
        setPhase('results');
        break;
      case 'quiz_ended':
        clearInterval(timerRef.current);
        setLeaderboard(msg.leaderboard || []);
        setPhase('ended');
        break;
      case 'error':
        setError(msg.message);
        break;
    }
  }, []);

  const { connect, send, disconnect } = useWebSocket(token, handleMessage);

  useEffect(() => {
    const ws = connect();
    if (ws) {
      ws.onopen = () => send({ type: 'join_room', quiz_id: parseInt(id) });
    }
    return () => { disconnect(); clearInterval(timerRef.current); };
  }, [id]);

  useEffect(() => {
    if (phase === 'question' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); send({ type: 'end_question' }); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ]);

  const startQuiz = () => send({ type: 'start_quiz' });
  const nextQuestion = () => send({ type: 'next_question' });
  const endQuestion = () => { clearInterval(timerRef.current); send({ type: 'end_question' }); };
  const forceEnd = () => { if (confirm('Завершить квиз?')) send({ type: 'force_end_quiz' }); };

  if (!quiz) return <div className="page-loader"><div className="spinner" /></div>;

  const progress = totalQ > 0 ? ((qIndex + 1) / totalQ) * 100 : 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Header */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{quiz.title}</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>
              Код комнаты: <span className="room-code" style={{ fontSize: 20, letterSpacing: 4 }}>{quiz.room_code}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {phase === 'ended' && <button className="btn btn-secondary" onClick={() => nav(`/quiz/${id}/results`)}>📊 Результаты</button>}
            {phase !== 'ended' && <button className="btn btn-danger btn-sm" onClick={forceEnd}>⏹ Завершить</button>}
          </div>
        </div>
        {totalQ > 0 && phase !== 'lobby' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
              <span>Вопрос {qIndex + 1} из {totalQ}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>

      {/* LOBBY */}
      {phase === 'lobby' && (
        <div style={{ textAlign: 'center' }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🎯 Зал ожидания</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Поделись кодом с участниками</p>
            <div className="room-code" style={{ marginBottom: 20 }}>{quiz.room_code}</div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
              Участники заходят на сайт → "Войти в игру" → вводят код
            </p>
            <button className="btn btn-success btn-lg" onClick={startQuiz} disabled={participants.length === 0} style={{ minWidth: 200 }}>
              {participants.length === 0 ? 'Жду участников...' : `▶️ Начать квиз (${participants.length} чел.)`}
            </button>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14 }}>👥 Участники ({participants.length})</h3>
            {participants.length === 0 ? (
              <p style={{ color: 'var(--text2)' }}>Никого нет... Поделись кодом!</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {participants.map((p, i) => (
                  <span key={i} style={{ padding: '6px 14px', background: 'var(--bg3)', borderRadius: 20, fontSize: 14 }}>{p.username}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUESTION */}
      {phase === 'question' && currentQ && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{currentQ.content}</h2>
              <div style={{ textAlign: 'center', marginLeft: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', border: `4px solid ${timeLeft > 5 ? 'var(--success)' : 'var(--error)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: timeLeft > 5 ? 'var(--success)' : 'var(--error)',
                  transition: 'border-color 0.3s, color 0.3s'
                }}>{timeLeft}</div>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>секунд</p>
              </div>
            </div>
            {currentQ.image_url && <img src={currentQ.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginBottom: 16 }} />}
            <div className="answer-grid">
              {currentQ.options.map((opt, i) => (
                <div key={i} className="answer-option" style={{ cursor: 'default' }}>
                  <span className="option-letter">{LETTERS[i]}</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--text2)' }}>
              Ответили: <strong style={{ color: 'var(--text)', fontSize: 18 }}>{answerCount}</strong> / {participants.length}
            </p>
            <button className="btn btn-accent" onClick={endQuestion}>⏩ Показать ответы</button>
          </div>
        </div>
      )}

      {/* RESULTS after question */}
      {phase === 'results' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>📊 Промежуточный рейтинг</h2>
            <Leaderboard rows={leaderboard} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={nextQuestion}>
              {qIndex + 1 >= totalQ ? '🏁 Завершить квиз' : '→ Следующий вопрос'}
            </button>
          </div>
        </div>
      )}

      {/* ENDED */}
      {phase === 'ended' && (
        <div className="card">
          <h2 style={{ fontWeight: 800, fontSize: 24, textAlign: 'center', marginBottom: 20 }}>🏆 Квиз завершён!</h2>
          <Leaderboard rows={leaderboard} final />
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => nav('/dashboard')}>← В личный кабинет</button>
          </div>
        </div>
      )}
    </div>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MEDALS = ['🥇', '🥈', '🥉'];

function Leaderboard({ rows, final }) {
  if (!rows.length) return <p style={{ color: 'var(--text2)', textAlign: 'center' }}>Нет данных</p>;
  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className={`leaderboard-row ${i < 3 ? `top-${i + 1}` : ''}`}>
          <span className="rank-badge" style={{ fontSize: i < 3 ? 20 : 15 }}>{i < 3 ? MEDALS[i] : i + 1}</span>
          <span style={{ flex: 1, fontWeight: 600 }}>{row.username}</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary-light)' }}>{row.total_score} очков</span>
        </div>
      ))}
    </div>
  );
}
