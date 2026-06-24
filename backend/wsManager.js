const db = require('./db/database');

const rooms = new Map();

function getOrCreateRoom(quizId) {
  if (!rooms.has(quizId)) rooms.set(quizId, { organizer: null, participants: new Map() });
  return rooms.get(quizId);
}

function broadcast(room, data, excludeWs = null) {
  const msg = JSON.stringify(data);
  if (room.organizer && room.organizer !== excludeWs && room.organizer.readyState === 1) room.organizer.send(msg);
  for (const [, p] of room.participants) {
    if (p.ws !== excludeWs && p.ws.readyState === 1) p.ws.send(msg);
  }
}

function sendTo(ws, data) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

function getParticipantList(room) {
  return Array.from(room.participants.values()).map(p => ({ userId: p.userId, username: p.username, score: p.score || 0 }));
}

function handleWS(ws, user) {
  let currentRoom = null;
  let currentQuizId = null;
  let isOrganizer = false;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join_room': {
        const { quiz_id } = msg;
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz_id);
        if (!quiz) return sendTo(ws, { type: 'error', message: 'Квиз не найден' });
        currentQuizId = quiz_id;
        currentRoom = getOrCreateRoom(quiz_id);
        isOrganizer = quiz.organizer_id === user.id;
        if (isOrganizer) {
          currentRoom.organizer = ws;
          sendTo(ws, { type: 'room_joined', role: 'organizer', quiz, participants: getParticipantList(currentRoom) });
        } else {
          if (quiz.status === 'ended') return sendTo(ws, { type: 'error', message: 'Квиз уже завершён' });
          try { db.prepare('INSERT OR IGNORE INTO quiz_sessions (quiz_id, participant_id) VALUES (?, ?)').run(quiz_id, user.id); } catch {}
          currentRoom.participants.set(user.id, { ws, userId: user.id, username: user.username, score: 0 });
          sendTo(ws, { type: 'room_joined', role: 'participant', quiz, quiz_status: quiz.status, current_question_index: quiz.current_question_index });
          broadcast(currentRoom, { type: 'participant_joined', participants: getParticipantList(currentRoom) }, ws);
          if (quiz.status === 'active') {
            const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quiz_id);
            if (quiz.current_question_index >= 0 && questions[quiz.current_question_index]) {
              const q = questions[quiz.current_question_index];
              q.options = JSON.parse(q.options);
              sendTo(ws, { type: 'question_start', question: sanitizeQuestion(q), index: quiz.current_question_index, total: questions.length });
            }
          }
        }
        break;
      }
      case 'start_quiz': {
        if (!isOrganizer || !currentRoom || !currentQuizId) return;
        const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(currentQuizId);
        if (questions.length === 0) return sendTo(ws, { type: 'error', message: 'Добавьте вопросы перед запуском' });
        db.prepare("UPDATE quizzes SET status='active', current_question_index=-1, started_at=datetime('now') WHERE id=?").run(currentQuizId);
        broadcast(currentRoom, { type: 'quiz_started', total_questions: questions.length });
        break;
      }
      case 'next_question': {
        if (!isOrganizer || !currentRoom || !currentQuizId) return;
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(currentQuizId);
        const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(currentQuizId);
        const nextIdx = (quiz.current_question_index || 0) + 1;
        if (nextIdx >= questions.length) { endQuiz(currentQuizId, currentRoom); return; }
        db.prepare('UPDATE quizzes SET current_question_index=? WHERE id=?').run(nextIdx, currentQuizId);
        const q = questions[nextIdx];
        q.options = JSON.parse(q.options);
        broadcast(currentRoom, { type: 'question_start', question: sanitizeQuestion(q), index: nextIdx, total: questions.length, time_limit: q.time_limit });
        break;
      }
      case 'end_question': {
        if (!isOrganizer || !currentRoom || !currentQuizId) return;
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(currentQuizId);
        const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(currentQuizId);
        const q = questions[quiz.current_question_index];
        if (!q) return;
        q.correct_answers = JSON.parse(q.correct_answers);
        broadcast(currentRoom, { type: 'question_ended', correct_answers: q.correct_answers, leaderboard: getLeaderboard(currentQuizId) });
        break;
      }
      case 'submit_answer': {
        if (isOrganizer || !currentRoom || !currentQuizId) return;
        const { question_id, selected_options, response_time_ms } = msg;
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(currentQuizId);
        if (!quiz || quiz.status !== 'active') return;
        const question = db.prepare('SELECT * FROM questions WHERE id = ? AND quiz_id = ?').get(question_id, currentQuizId);
        if (!question) return;
        const session = db.prepare('SELECT * FROM quiz_sessions WHERE quiz_id = ? AND participant_id = ?').get(currentQuizId, user.id);
        if (!session) return;
        const existing = db.prepare('SELECT id FROM answers WHERE session_id = ? AND question_id = ?').get(session.id, question_id);
        if (existing) return sendTo(ws, { type: 'answer_already_submitted' });
        const correctAnswers = JSON.parse(question.correct_answers);
        const selected = Array.isArray(selected_options) ? selected_options : [selected_options];
        const isCorrect = arraysEqual([...selected].sort(), [...correctAnswers].sort());
        let pointsEarned = 0;
        if (isCorrect) {
          const speedBonus = Math.max(0, 1 - ((response_time_ms || 0) / (question.time_limit * 1000)));
          pointsEarned = Math.round(question.points * (0.5 + 0.5 * speedBonus));
        }
        db.prepare('INSERT INTO answers (session_id, question_id, selected_options, is_correct, points_earned, response_time_ms) VALUES (?, ?, ?, ?, ?, ?)').run(session.id, question_id, JSON.stringify(selected), isCorrect ? 1 : 0, pointsEarned, response_time_ms || 0);
        db.prepare('UPDATE quiz_sessions SET total_score = total_score + ? WHERE id = ?').run(pointsEarned, session.id);
        const participant = currentRoom.participants.get(user.id);
        if (participant) participant.score = (participant.score || 0) + pointsEarned;
        sendTo(ws, { type: 'answer_result', is_correct: isCorrect, points_earned: pointsEarned, correct_answers: correctAnswers });
        const answerCount = db.prepare(`SELECT COUNT(DISTINCT a.session_id) as cnt FROM answers a JOIN quiz_sessions qs ON a.session_id = qs.id WHERE qs.quiz_id = ? AND a.question_id = ?`).get(currentQuizId, question_id);
        sendTo(currentRoom.organizer, { type: 'answer_received', count: answerCount ? answerCount.cnt : 0, total: currentRoom.participants.size });
        break;
      }
      case 'force_end_quiz': {
        if (!isOrganizer || !currentRoom || !currentQuizId) return;
        endQuiz(currentQuizId, currentRoom);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom || !currentQuizId) return;
    if (isOrganizer) currentRoom.organizer = null;
    else {
      currentRoom.participants.delete(user.id);
      broadcast(currentRoom, { type: 'participant_left', participants: getParticipantList(currentRoom) });
    }
  });
}

function endQuiz(quizId, room) {
  db.prepare("UPDATE quizzes SET status='ended', ended_at=datetime('now') WHERE id=?").run(quizId);
  const sessions = db.prepare('SELECT * FROM quiz_sessions WHERE quiz_id = ? ORDER BY total_score DESC').all(quizId);
  sessions.forEach((s, i) => db.prepare('UPDATE quiz_sessions SET rank=? WHERE id=?').run(i + 1, s.id));
  broadcast(room, { type: 'quiz_ended', leaderboard: getLeaderboard(quizId) });
}

function getLeaderboard(quizId) {
  return db.prepare(`SELECT qs.total_score, u.username FROM quiz_sessions qs JOIN users u ON qs.participant_id = u.id WHERE qs.quiz_id = ? ORDER BY qs.total_score DESC LIMIT 10`).all(quizId);
}

function sanitizeQuestion(q) {
  return { id: q.id, type: q.type, content: q.content, image_url: q.image_url, options: q.options, time_limit: q.time_limit, points: q.points };
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

module.exports = { handleWS };
