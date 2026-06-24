import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuizEditor from './pages/QuizEditor';
import HostQuiz from './pages/HostQuiz';
import JoinQuiz from './pages/JoinQuiz';
import PlayQuiz from './pages/PlayQuiz';
import Profile from './pages/Profile';
import Results from './pages/Results';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/quiz/create" element={<RequireAuth role="organizer"><QuizEditor /></RequireAuth>} />
          <Route path="/quiz/:id/edit" element={<RequireAuth role="organizer"><QuizEditor /></RequireAuth>} />
          <Route path="/quiz/:id/host" element={<RequireAuth role="organizer"><HostQuiz /></RequireAuth>} />
          <Route path="/quiz/:id/results" element={<RequireAuth role="organizer"><Results /></RequireAuth>} />
          <Route path="/join" element={<RequireAuth><JoinQuiz /></RequireAuth>} />
          <Route path="/play/:id" element={<RequireAuth><PlayQuiz /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
