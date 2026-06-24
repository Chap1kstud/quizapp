import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 20px 60px' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>⚡</div>
        <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: -2 }}>
          Квизы в{' '}
          <span style={{ background: 'linear-gradient(135deg, #7C3AED, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            реальном времени
          </span>
        </h1>
        <p style={{ fontSize: 20, color: 'var(--text2)', maxWidth: 500, margin: '0 auto 36px' }}>
          Создавай интерактивные квизы, подключай участников по коду и смотри результаты в прямом эфире.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              {user.role === 'organizer' ? (
                <Link to="/quiz/create" className="btn btn-primary btn-lg">✨ Создать квиз</Link>
              ) : (
                <Link to="/join" className="btn btn-primary btn-lg">🎮 Войти в игру</Link>
              )}
              <Link to="/dashboard" className="btn btn-secondary btn-lg">Мой кабинет</Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">Начать бесплатно</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Войти</Link>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid-3" style={{ marginBottom: 60 }}>
        {[
          { icon: '🎯', title: 'Создавай квизы', desc: 'Добавляй вопросы с текстом и картинками, выбирай тип ответа' },
          { icon: '🔗', title: 'Подключай игроков', desc: 'Участники входят по 6-значному коду прямо с телефона' },
          { icon: '📊', title: 'Следи за результатами', desc: 'Лидерборд в реальном времени после каждого вопроса' },
          { icon: '⏱️', title: 'Таймер и очки', desc: 'Быстрые ответы дают больше очков — мотивирует думать!' },
          { icon: '🖼️', title: 'Вопросы с картинками', desc: 'Загружай изображения для визуальных вопросов' },
          { icon: '💾', title: 'История квизов', desc: 'Все результаты сохраняются в личном кабинете' },
        ].map((f, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!user && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.08))', border: '1.5px solid rgba(124,58,237,0.3)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Готов попробовать?</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Регистрация занимает меньше минуты</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/register?role=organizer" className="btn btn-primary btn-lg">📋 Я организатор</Link>
            <Link to="/register?role=participant" className="btn btn-accent btn-lg">🎮 Я участник</Link>
          </div>
        </div>
      )}
    </div>
  );
}
