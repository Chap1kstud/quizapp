import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['general', 'science', 'history', 'sports', 'music', 'movies', 'tech'];
const CAT_LABELS = { general: 'Общие знания', science: 'Наука', history: 'История', sports: 'Спорт', music: 'Музыка', movies: 'Кино', tech: 'Технологии' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const blankQuestion = () => ({ type: 'single', content: '', image_url: '', options: ['', '', '', ''], correct_answers: [], time_limit: 30, points: 100 });

export default function QuizEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { apiFetch, token } = useAuth();
  const nav = useNavigate();

  const [settings, setSettings] = useState({ title: '', description: '', category: 'general', time_per_question: 30, max_participants: 100 });
  const [questions, setQuestions] = useState([]);
  const [activeQ, setActiveQ] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState(id || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      apiFetch(`/quizzes/${id}`).then(data => {
        setSettings({ title: data.title, description: data.description, category: data.category, time_per_question: data.time_per_question, max_participants: data.max_participants });
        setQuestions(data.questions || []);
      });
    }
  }, [id]);

  const setSetting = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const saveSettings = async () => {
    setSaving(true); setError('');
    try {
      if (!quizId) {
        const quiz = await apiFetch('/quizzes', { method: 'POST', body: JSON.stringify(settings) });
        setQuizId(quiz.id);
        return quiz.id;
      } else {
        await apiFetch(`/quizzes/${quizId}`, { method: 'PUT', body: JSON.stringify(settings) });
        return quizId;
      }
    } catch (e) { setError(e.message); return null; }
    finally { setSaving(false); }
  };

  const addQuestion = async () => {
    let qid = quizId;
    if (!qid) { qid = await saveSettings(); if (!qid) return; }
    const blank = blankQuestion();
    blank.time_limit = settings.time_per_question;
    // Add locally first
    const localQ = { ...blank, id: `new_${Date.now()}`, quiz_id: qid, order_index: questions.length, isNew: true };
    setQuestions(q => [...q, localQ]);
    setActiveQ(questions.length);
  };

  const updateQuestion = (idx, field, val) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const toggleCorrect = (qIdx, opt) => {
    const q = questions[qIdx];
    if (q.type === 'single') {
      updateQuestion(qIdx, 'correct_answers', [opt]);
    } else {
      const cur = q.correct_answers || [];
      updateQuestion(qIdx, 'correct_answers', cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]);
    }
  };

  const addOption = (qIdx) => {
    const q = questions[qIdx];
    if (q.options.length >= 6) return;
    updateQuestion(qIdx, 'options', [...q.options, '']);
  };

  const removeOption = (qIdx, oIdx) => {
    const q = questions[qIdx];
    const newOpts = q.options.filter((_, i) => i !== oIdx);
    const removed = q.options[oIdx];
    updateQuestion(qIdx, 'options', newOpts);
    updateQuestion(qIdx, 'correct_answers', (q.correct_answers || []).filter(x => x !== removed));
  };

  const saveQuestion = async (idx) => {
    const q = questions[idx];
    if (!q.content.trim()) return setError('Введите текст вопроса');
    const filledOpts = q.options.filter(o => o.trim());
    if (filledOpts.length < 2) return setError('Добавьте минимум 2 варианта ответа');
    if (!q.correct_answers.length) return setError('Выберите правильный ответ');
    setError('');
    let qid = quizId;
    if (!qid) { qid = await saveSettings(); if (!qid) return; }
    try {
      const payload = { ...q, options: filledOpts, correct_answers: q.correct_answers };
      let saved;
      if (q.isNew || typeof q.id === 'string') {
        saved = await apiFetch(`/quizzes/${qid}/questions`, { method: 'POST', body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/quizzes/${qid}/questions/${q.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      setQuestions(qs => qs.map((x, i) => i === idx ? saved : x));
      setActiveQ(null);
    } catch (e) { setError(e.message); }
  };

  const deleteQuestion = async (idx) => {
    const q = questions[idx];
    if (!q.isNew && typeof q.id !== 'string') {
      await apiFetch(`/quizzes/${quizId}/questions/${q.id}`, { method: 'DELETE' }).catch(() => {});
    }
    setQuestions(qs => qs.filter((_, i) => i !== idx));
    if (activeQ === idx) setActiveQ(null);
  };

  const uploadImage = async (idx, file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (data.url) updateQuestion(idx, 'image_url', data.url);
    } catch {} finally { setUploading(false); }
  };

  const handleSaveAndGo = async () => {
    const qid = await saveSettings();
    if (qid) nav(`/quiz/${qid}/host`);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>{isEdit ? '✏️ Редактирование квиза' : '✨ Новый квиз'}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>← Назад</button>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>{saving ? 'Сохраняем...' : '💾 Сохранить'}</button>
          {quizId && questions.length > 0 && (
            <button className="btn btn-success" onClick={handleSaveAndGo}>▶️ Запустить</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 18, fontSize: 16 }}>⚙️ Настройки квиза</h2>
        <div className="grid-2">
          <div className="form-group">
            <label>Название *</label>
            <input value={settings.title} onChange={e => setSetting('title', e.target.value)} placeholder="Например: История России" />
          </div>
          <div className="form-group">
            <label>Категория</label>
            <select value={settings.category} onChange={e => setSetting('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Время на вопрос (секунды)</label>
            <input type="number" min="5" max="300" value={settings.time_per_question} onChange={e => setSetting('time_per_question', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>Макс. участников</label>
            <input type="number" min="1" max="500" value={settings.max_participants} onChange={e => setSetting('max_participants', +e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Описание</label>
          <textarea rows={2} value={settings.description} onChange={e => setSetting('description', e.target.value)} placeholder="Краткое описание..." />
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 700, fontSize: 16 }}>❓ Вопросы ({questions.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={addQuestion}>+ Добавить вопрос</button>
      </div>

      {questions.length === 0 && (
        <div className="card empty-state" style={{ padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>❓</div>
          <h3>Вопросов пока нет</h3>
          <p style={{ marginBottom: 16 }}>Добавь вопросы чтобы начать квиз</p>
          <button className="btn btn-primary" onClick={addQuestion}>Добавить первый вопрос</button>
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id || idx} className="card" style={{ marginBottom: 12, border: activeQ === idx ? '1.5px solid var(--primary)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>{idx + 1}</div>
            <div style={{ flex: 1 }}>
              {activeQ === idx ? (
                <QuestionForm q={q} idx={idx} onUpdate={updateQuestion} onToggleCorrect={toggleCorrect}
                  onAddOption={addOption} onRemoveOption={removeOption} onUpload={uploadImage} uploading={uploading} />
              ) : (
                <div>
                  <p style={{ fontWeight: 600 }}>{q.content || <span style={{ color: 'var(--text2)' }}>Без текста</span>}</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                    {q.type === 'single' ? 'Один ответ' : 'Несколько ответов'} · {q.time_limit}с · {q.points} очков
                    {q.correct_answers?.length > 0 && ` · ✅ ${q.correct_answers.join(', ')}`}
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeQ === idx ? (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => saveQuestion(idx)}>✓ Сохранить</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveQ(null)}>Отмена</button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveQ(idx)}>✏️ Изменить</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(idx)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionForm({ q, idx, onUpdate, onToggleCorrect, onAddOption, onRemoveOption, onUpload, uploading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label>Тип вопроса</label>
          <select value={q.type} onChange={e => onUpdate(idx, 'type', e.target.value)}>
            <option value="single">Один правильный ответ</option>
            <option value="multiple">Несколько правильных ответов</option>
          </select>
        </div>
        <div>
          <label>Время (сек)</label>
          <input type="number" min="5" max="300" value={q.time_limit} onChange={e => onUpdate(idx, 'time_limit', +e.target.value)} style={{ width: 90 }} />
        </div>
        <div>
          <label>Очки</label>
          <input type="number" min="10" max="1000" step="10" value={q.points} onChange={e => onUpdate(idx, 'points', +e.target.value)} style={{ width: 90 }} />
        </div>
      </div>

      <div>
        <label>Текст вопроса *</label>
        <textarea rows={2} value={q.content} onChange={e => onUpdate(idx, 'content', e.target.value)} placeholder="Введите вопрос..." />
      </div>

      <div>
        <label>Изображение (необязательно)</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={q.image_url || ''} onChange={e => onUpdate(idx, 'image_url', e.target.value)} placeholder="URL изображения или загрузи файл" />
          <label className="btn btn-secondary btn-sm" style={{ width: 'auto', cursor: 'pointer', margin: 0 }}>
            {uploading ? '...' : '📷'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && onUpload(idx, e.target.files[0])} />
          </label>
        </div>
        {q.image_url && <img src={q.image_url} alt="" style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, objectFit: 'contain' }} />}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ margin: 0 }}>Варианты ответа * <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(нажми чтобы отметить правильный)</span></label>
          {q.options.length < 6 && <button className="btn btn-secondary btn-sm" onClick={() => onAddOption(idx)}>+ Вариант</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.options.map((opt, oIdx) => {
            const isCorrect = (q.correct_answers || []).includes(opt) && opt.trim();
            return (
              <div key={oIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => opt.trim() && onToggleCorrect(idx, opt)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: `2px solid ${isCorrect ? 'var(--success)' : 'var(--border)'}`,
                    background: isCorrect ? 'rgba(16,185,129,0.2)' : 'var(--bg3)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700
                  }}
                  title="Отметить как правильный"
                >{isCorrect ? '✓' : LETTERS[oIdx]}</button>
                <input value={opt} onChange={e => {
                  const newOpts = [...q.options];
                  const wasCorrect = (q.correct_answers || []).includes(opt);
                  newOpts[oIdx] = e.target.value;
                  // If was correct, update correct_answers too
                  if (wasCorrect) {
                    const newCorrect = (q.correct_answers || []).map(c => c === opt ? e.target.value : c);
                    // handled externally; just update options
                  }
                  const fakeEvent = { type: 'options', value: newOpts };
                  // Direct update
                  onUpdate(idx, 'options', newOpts);
                }} placeholder={`Вариант ${LETTERS[oIdx]}`} style={{ flex: 1 }} />
                {q.options.length > 2 && (
                  <button onClick={() => onRemoveOption(idx, oIdx)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, padding: '0 4px' }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
