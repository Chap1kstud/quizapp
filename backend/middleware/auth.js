const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'quizapp_secret_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена авторизации' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

function organizerOnly(req, res, next) {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'Только для организаторов' });
  }
  next();
}

module.exports = { authMiddleware, organizerOnly, JWT_SECRET };
