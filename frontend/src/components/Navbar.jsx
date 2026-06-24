import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <nav className="nav">
      <NavLink to="/" className="nav-logo" style={{ textDecoration: 'none' }}>⚡ QuizApp</NavLink>
      <div className="nav-links">
        {user ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {user.role === 'organizer' ? '📋 Мои квизы' : '🏠 Главная'}
            </NavLink>
            {user.role === 'organizer' && (
              <NavLink to="/quiz/create" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                ✨ Создать
              </NavLink>
            )}
            <NavLink to="/join" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              🎮 Войти в игру
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              👤 {user.username}
            </NavLink>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Выйти</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Войти</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Регистрация</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
