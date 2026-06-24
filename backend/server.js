const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const { initDB } = require('./db/database');
const { handleWS } = require('./wsManager');

async function main() {
  await initDB();
  console.log('✅ База данных инициализирована');

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server, path: '/ws' });

  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/quizzes', require('./routes/quizzes'));
  app.use('/api/upload', require('./routes/upload'));
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1] || '');
    const token = params.get('token');
    if (!token) return ws.close(4001, 'No token');
    try {
      const user = jwt.verify(token, JWT_SECRET);
      handleWS(ws, user);
    } catch {
      ws.close(4001, 'Invalid token');
    }
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => console.log(`✅ Сервер запущен на http://localhost:${PORT}`));
}

main().catch(console.error);
