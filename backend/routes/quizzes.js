const express = require('express');
const db = require('../db/database');
const { authMiddleware, organizerOnly } = require('../middleware/auth');

const router = express.Router();

function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

router.post('/', authMiddleware, organizerOnly, (req, res) => {
  const { title, description, category, time_per_question, max_participants } = req.body;
  if (!title) return res.status(400).json({ error: 'Название обязательно' });
  let room_code;
  do { room_code = genCode(); } while (db.prepare('SELECT id FROM quizzes WHERE room_code = ?').get(room_code));
  const result = db.prepare('INSERT INTO quizzes (organizer_id, title, description, category, time_per_question, max_participants, room_code) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.user.id, title, description || '', category || 'general', time_per_question || 30, max_participants || 100, room_code);
  res.json(db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/my', authMiddleware, organizerOnly, (req, res) => {
  const quizzes = db.prepare('SELECT * FROM quizzes WHERE organizer_id = ? ORDER BY created_at DESC').all(req.user.id);
  const result = quizzes.map(q => {
    const cnt = db.prepare('SELECT COUNT(*) as c FROM quiz_sessions WHERE quiz_id = ?').get(q.id);
    return { ...q, participant_count: cnt ? cnt.c : 0 };
  });
  res.json(result);
});

router.get('/history', authMiddleware, (req, res) => {
  const sessions = db.prepare(`SELECT qs.*, q.title, q.category, q.room_code, u.username as organizer_name FROM quiz_sessions qs JOIN quizzes q ON qs.quiz_id = q.id JOIN users u ON q.organizer_id = u.id WHERE qs.participant_id = ? ORDER BY qs.joined_at DESC`).all(req.user.id);
  res.json(sessions);
});

router.get('/room/:code', authMiddleware, (req, res) => {
  const quiz = db.prepare("SELECT id, title, description, category, status, room_code, time_per_question FROM quizzes WHERE room_code = ?").get(req.params.code.toUpperCase());
  if (!quiz) return res.status(404).json({ error: 'Квиз с таким кодом не найден' });
  res.json(quiz);
});

router.get('/:id', authMiddleware, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quiz.id);
  questions.forEach(q => { q.options = JSON.parse(q.options); q.correct_answers = JSON.parse(q.correct_answers); });
  res.json({ ...quiz, questions });
});

router.put('/:id', authMiddleware, organizerOnly, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  const { title, description, category, time_per_question, max_participants } = req.body;
  db.prepare('UPDATE quizzes SET title=?, description=?, category=?, time_per_question=?, max_participants=? WHERE id=?').run(title || quiz.title, description ?? quiz.description, category || quiz.category, time_per_question || quiz.time_per_question, max_participants || quiz.max_participants, quiz.id);
  res.json(db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz.id));
});

router.delete('/:id', authMiddleware, organizerOnly, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(quiz.id);
  db.prepare('DELETE FROM quiz_sessions WHERE quiz_id = ?').run(quiz.id);
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(quiz.id);
  res.json({ ok: true });
});

router.post('/:id/questions', authMiddleware, organizerOnly, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  const { type, content, image_url, options, correct_answers, time_limit, points } = req.body;
  if (!content || !options || !correct_answers) return res.status(400).json({ error: 'Заполните все поля вопроса' });
  const maxRow = db.prepare('SELECT MAX(order_index) as m FROM questions WHERE quiz_id = ?').get(quiz.id);
  const maxOrder = (maxRow && maxRow.m !== null) ? maxRow.m : -1;
  const result = db.prepare('INSERT INTO questions (quiz_id, type, content, image_url, options, correct_answers, time_limit, points, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(quiz.id, type || 'single', content, image_url || null, JSON.stringify(options), JSON.stringify(correct_answers), time_limit || quiz.time_per_question, points || 100, maxOrder + 1);
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);
  q.options = JSON.parse(q.options); q.correct_answers = JSON.parse(q.correct_answers);
  res.json(q);
});

router.put('/:id/questions/:qid', authMiddleware, organizerOnly, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  const { type, content, image_url, options, correct_answers, time_limit, points } = req.body;
  db.prepare('UPDATE questions SET type=?, content=?, image_url=?, options=?, correct_answers=?, time_limit=?, points=? WHERE id=? AND quiz_id=?').run(type, content, image_url || null, JSON.stringify(options), JSON.stringify(correct_answers), time_limit, points, req.params.qid, quiz.id);
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.qid);
  q.options = JSON.parse(q.options); q.correct_answers = JSON.parse(q.correct_answers);
  res.json(q);
});

router.delete('/:id/questions/:qid', authMiddleware, organizerOnly, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  db.prepare('DELETE FROM questions WHERE id = ? AND quiz_id = ?').run(req.params.qid, quiz.id);
  res.json({ ok: true });
});

router.get('/:id/leaderboard', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT qs.total_score, qs.rank, qs.finished_at, u.username, u.id as user_id FROM quiz_sessions qs JOIN users u ON qs.participant_id = u.id WHERE qs.quiz_id = ? ORDER BY qs.total_score DESC`).all(req.params.id);
  res.json(rows);
});

module.exports = router;
