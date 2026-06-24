import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MEDALS = ['🥇', '🥈', '🥉'];
const COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

export default function PlayQuiz() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const nav = useNavigate();

  const [phase, setPhase] = useState('waiting'); // waiting | active | question | answered | results | ended
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [selected, setSelected] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_joined':
        setQuiz(msg.quiz);
        if (msg.quiz_status === 'active') setPhase('active');
        else setPhase('waiting');
        break;
      case 'quiz_started':
        setPhase('active');
        setTotalQ(msg.total_questions);
        break;
      case 'question_start':
        setCurrentQ(msg.question);
        setQIndex(msg.index);
        setTotalQ(msg.total);
        setPhase('question');
        setSelected([]);
        setAnswered(false);
        setAnswerResult(null);
        setCorrectAnswers([]);
        const tl = msg.time_limit || msg.question?.time_limit || 30;
        setTimeLeft(tl);
        setStartTime(Date.now());
        break;
      case 'answer_result':
        setAnswerResult(msg);
        setAnswered(true);
        if (msg.is_correct) setTotalScore(s => s + msg.points_earned);
        break;
      case 'answer_already_submitted':
        setAnswered(true);
        break;
      case 'question_ended':
        clearInterval(timerRef.current);
        setCorrectAnswers(msg.correct_answers || []);
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
    if (ws) ws.onopen = () => send({ type: 'join_room', quiz_id: parseInt(id) });
    return () => { disconnect(); clearInterval(timerRef.current); };
  }, [id]);

  useEffect(() => {
    if (phase === 'question' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ]);

  const selectAnswer = (opt) => {
    if (answered) return;
    if (currentQ.type === 'single') {
      setSelected([opt]);
    } else {
      setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    }
  };

  const submitAnswer = () => {
    if (answered || selected.length === 0) return;
    const responseTime = Date.now() - (startTime || Date.now());
    send({ type: 'submit_answer', question_id: currentQ.id, selected_options: selected, response_time_ms: responseTime });
    setAnswered(true);
  };

  const progress = totalQ > 0 ? ((qIndex + 1) / totalQ) * 100 : 0;
  const timePercent = currentQ ? (timeLeft / (currentQ.time_limit || 30)) * 100 : 100;

  if (!quiz) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* WAITING */}
      {(phase === 'waiting' || phase === 'active') && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{quiz.title}</h1>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Подключено! Ожидай начала квиза...</p>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', animation: `bounce ${0.6 + i * 0.15}s infinite alternate` }} />
            ))}
          </div>
          <style>{`@keyframes bounce { to { transform: translateY(-8px); opacity: 0.5; } }`}</style>
        </div>
      )}

      {/* QUESTION */}
      {phase === 'question' && currentQ && (
        <div>
          {/* Timer + progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>Вопрос {qIndex + 1} / {totalQ}</span>
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>Очки: {totalScore}</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-bar" style={{ marginBottom: 20, background: timeLeft <= 5 ? 'rgba(239,68,68,0.15)' : undefined }}>
            <div className="progress-fill" style={{ width: `${timePercent}%`, background: timeLeft <= 5 ? 'var(--error)' : 'var(--success)', transition: 'width 1s linear, background 0.3s' }} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{currentQ.content}</h2>
              <div style={{
                minWidth: 56, height: 56, borderRadius: '50%',
                border: `3px solid ${timeLeft <= 5 ? 'var(--error)' : 'var(--success)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: timeLeft <= 5 ? 'var(--error)' : 'var(--success)',
                transition: 'all 0.3s', flexShrink: 0
              }}>{timeLeft}</div>
            </div>
            {currentQ.image_url && <img src={currentQ.image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8, marginBottom: 16 }} />}
            {currentQ.type === 'multiple' && <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>⚡ Можно выбрать несколько вариантов</p>}
            <div className="answer-grid">
              {currentQ.options.map((opt, i) => {
                const isSel = selected.includes(opt);
                const isCorrect = answered && answerResult && correctAnswers.includes(opt);
                const isWrong = answered && isSel && !correctAnswers.includes(opt) && correctAnswers.length > 0;
                return (
                  <button key={i}
                    className={`answer-option ${isSel && !answered ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                    onClick={() => selectAnswer(opt)}
                    disabled={answered}>
                    <span className="option-letter" style={{ background: COLORS[i] + '33', color: COLORS[i] }}>{LETTERS[i]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {!answered && selected.length > 0 && (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={submitAnswer}>
              ✅ Подтвердить ответ
            </button>
          )}
          {answered && !answerResult && (
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text2)' }}>✅ Ответ отправлен! Ожидаем остальных...</p>
            </div>
          )}
          {answered && answerResult && (
            <div className="card" style={{
              textAlign: 'center', padding: '20px',
              background: answerResult.is_correct ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1.5px solid ${answerResult.is_correct ? 'var(--success)' : 'var(--error)'}`
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{answerResult.is_correct ? '🎉' : '😞'}</div>
              <h3 style={{ fontWeight: 800, fontSize: 20, color: answerResult.is_correct ? 'var(--success)' : 'var(--error)' }}>
                {answerResult.is_correct ? 'Правильно!' : 'Неправильно'}
              </h3>
              {answerResult.is_correct && <p style={{ color: 'var(--text2)', marginTop: 4 }}>+{answerResult.points_earned} очков</p>}
              <p style={{ color: 'var(--text2)', marginTop: 8, fontSize: 14 }}>Ждём следующего вопроса...</p>
            </div>
          )}
        </div>
      )}

      {/* BETWEEN QUESTIONS */}
      {phase === 'results' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>🏆 Рейтинг</h2>
          {leaderboard.map((row, i) => {
            const isMe = row.username === user?.username;
            return (
              <div key={i} className={`leaderboard-row ${i < 3 ? `top-${i + 1}` : ''}`}
                style={{ border: isMe ? '1.5px solid var(--accent)' : undefined }}>
                <span style={{ fontSize: i < 3 ? 22 : 16, width: 36, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : i + 1}</span>
                <span style={{ flex: 1, fontWeight: isMe ? 800 : 600 }}>{row.username}{isMe && ' (вы)'}</span>
                <span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{row.total_score}</span>
              </div>
            );
          })}
          <p style={{ color: 'var(--text2)', marginTop: 16, fontSize: 14 }}>Ожидаем следующий вопрос...</p>
        </div>
      )}

      {/* ENDED */}
      {phase === 'ended' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🎊</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Квиз завершён!</h1>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Твой итоговый счёт: <strong style={{ color: 'var(--accent)', fontSize: 20 }}>{totalScore}</strong> очков</p>
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>🏆 Итоговый рейтинг</h2>
          {leaderboard.map((row, i) => {
            const isMe = row.username === user?.username;
            return (
              <div key={i} className={`leaderboard-row ${i < 3 ? `top-${i + 1}` : ''}`}
                style={{ border: isMe ? '2px solid var(--accent)' : undefined }}>
                <span style={{ fontSize: i < 3 ? 22 : 16, width: 36, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : i + 1}</span>
                <span style={{ flex: 1, fontWeight: isMe ? 800 : 600 }}>{row.username}{isMe && ' 👈'}</span>
                <span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{row.total_score} очков</span>
              </div>
            );
          })}
          <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={() => nav('/join')}>Сыграть ещё раз</button>
        </div>
      )}
    </div>
  );
}
