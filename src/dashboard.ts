import express from 'express';
import path from 'path';
import { getUpcomingTurnos, getAllTurnos, getRecentConversations, getAllConfig, cancelTurno, getTurnosByDate } from './database';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.get('/api/turnos', (req, res) => {
  const upcoming = req.query.all === 'true' ? getAllTurnos() : getUpcomingTurnos();
  res.json(upcoming);
});

app.get('/api/turnos/date/:date', (req, res) => {
  res.json(getTurnosByDate(req.params.date));
});

app.post('/api/turnos/:id/cancel', (req, res) => {
  cancelTurno(parseInt(req.params.id));
  res.json({ success: true });
});

app.get('/api/conversations', (req, res) => {
  const convs = getRecentConversations();
  res.json(convs.map((c: any) => ({
    ...c,
    messages: JSON.parse(c.messages),
  })));
});

app.get('/api/config', (req, res) => {
  res.json(getAllConfig());
});

app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayTurnos = getTurnosByDate(today);
  const upcoming = getUpcomingTurnos();
  const convs = getRecentConversations();
  res.json({
    todayCount: todayTurnos.length,
    upcomingCount: upcoming.length,
    conversationCount: convs.length,
  });
});

// Serve dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

export function startDashboard(port = 3000) {
  app.listen(port, () => {
    console.log(`📊 Dashboard: http://localhost:${port}`);
  });
}

export { app };
