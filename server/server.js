/**
 * InnovaQuiz Server
 * Express + Socket.IO backend for real-time quiz game
 * Supports up to 100 simultaneous players per room
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const engine = require('./gameEngine');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

// Load predefined quizzes
let predefinedQuizzes = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'quizzes.json'), 'utf8');
  predefinedQuizzes = JSON.parse(data);
  console.log(`[INFO] Loaded ${predefinedQuizzes.length} predefined quizzes.`);
} catch (err) {
  console.error('[ERROR] Could not load quizzes.json:', err.message);
}

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ─── Socket.IO Events ────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── PREDEFINED QUIZZES ──────────────────────────────────────────────────
  socket.on('get-quizzes', () => {
    socket.emit('quizzes-list', predefinedQuizzes);
  });

  // ── HOST: Create game ──────────────────────────────────────────────────────
  socket.on('create-game', ({ quiz }) => {
    if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
      return socket.emit('error', { message: 'Quiz inválido.' });
    }
    const result = engine.createRoom(socket.id, quiz);
    socket.join(result.pin);
    console.log(`[GAME] Host ${socket.id} created room ${result.pin}`);
    socket.emit('game-created', result);
  });

  // ── HOST: Start game ───────────────────────────────────────────────────────
  socket.on('start-game', ({ pin }) => {
    const room = engine.getRoom(pin);
    if (!room || room.hostId !== socket.id) return;

    const questionData = engine.startGame(pin);
    if (questionData.error) return socket.emit('error', questionData);

    // Broadcast question to all (host + players)
    io.to(pin).emit('question', questionData);
    console.log(`[GAME] ${pin} - Game started, Q1`);

    // Auto-end question after time limit
    scheduleEndQuestion(pin, questionData.timeLimit);
  });

  // ── PLAYER: Join game ──────────────────────────────────────────────────────
  socket.on('join-game', ({ pin, playerName }) => {
    const trimmedName = (playerName || '').trim().substring(0, 20);
    if (!trimmedName) return socket.emit('join-error', { message: 'Nome inválido.' });

    const result = engine.joinRoom(pin, socket.id, trimmedName);
    if (result.error) return socket.emit('join-error', result);

    socket.join(pin);
    socket.data.pin = pin;
    socket.data.name = trimmedName;

    socket.emit('joined', result);

    // Notify host of updated player list
    const playerList = engine.getPlayerList(pin);
    const hostSocket = getHostSocket(pin);
    if (hostSocket) {
      io.to(hostSocket).emit('player-joined', {
        players: playerList,
        count: playerList.length,
      });
    }

    console.log(`[JOIN] ${trimmedName} joined ${pin} (${result.playerCount}/100)`);
  });

  // ── PLAYER: Submit answer ──────────────────────────────────────────────────
  socket.on('submit-answer', ({ pin, answerIndex }) => {
    const result = engine.submitAnswer(pin, socket.id, answerIndex);
    if (result.error) return socket.emit('error', result);

    // Send personal result to player
    socket.emit('answer-result', result);

    // Notify host of progress
    const hostSocket = getHostSocket(pin);
    if (hostSocket) {
      io.to(hostSocket).emit('answer-progress', {
        answered: result.totalAnswered,
        total: result.totalPlayers,
      });
    }

    // If all players answered, end question early
    if (result.totalAnswered >= result.totalPlayers && result.totalPlayers > 0) {
      const room = engine.getRoom(pin);
      if (room && room.state === 'question') {
        triggerEndQuestion(pin);
      }
    }
  });

  // ── HOST: Next question ────────────────────────────────────────────────────
  socket.on('next-question', ({ pin }) => {
    const room = engine.getRoom(pin);
    if (!room || room.hostId !== socket.id) return;

    const result = engine.nextQuestion(pin);
    if (result.done) {
      io.to(pin).emit('game-over', { leaderboard: result.leaderboard });
      console.log(`[GAME] ${pin} - Game over`);
    } else {
      io.to(pin).emit('question', result.question);
      scheduleEndQuestion(pin, result.question.timeLimit);
      console.log(`[GAME] ${pin} - Q${result.question.index + 1}`);
    }
  });

  // ── HOST: End game early ───────────────────────────────────────────────────
  socket.on('end-game', ({ pin }) => {
    const room = engine.getRoom(pin);
    if (!room || room.hostId !== socket.id) return;
    io.to(pin).emit('game-over', { leaderboard: [] });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    // If host disconnected
    const hostPin = engine.removeHost(socket.id);
    if (hostPin) {
      io.to(hostPin).emit('host-disconnected', { message: 'O host saiu do jogo.' });
      return;
    }

    // If player disconnected
    const pin = socket.data.pin;
    if (pin) {
      engine.removePlayer(pin, socket.id);
      const playerList = engine.getPlayerList(pin);
      const hostSocket = getHostSocket(pin);
      if (hostSocket) {
        io.to(hostSocket).emit('player-left', {
          players: playerList,
          count: playerList.length,
          name: socket.data.name,
        });
      }
    }
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const questionTimers = new Map();

function scheduleEndQuestion(pin, timeLimit) {
  // Clear existing timer if any
  if (questionTimers.has(pin)) clearTimeout(questionTimers.get(pin));

  const timer = setTimeout(() => {
    triggerEndQuestion(pin);
  }, (timeLimit + 0.5) * 1000);

  questionTimers.set(pin, timer);
}

function triggerEndQuestion(pin) {
  if (questionTimers.has(pin)) {
    clearTimeout(questionTimers.get(pin));
    questionTimers.delete(pin);
  }
  const room = engine.getRoom(pin);
  if (!room || room.state !== 'question') return;

  const results = engine.endQuestion(pin);
  if (results) {
    io.to(pin).emit('question-results', results);
  }
}

function getHostSocket(pin) {
  const room = engine.getRoom(pin);
  return room ? room.hostId : null;
}

// ─── Start server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`✅ InnovaQuiz rodando em http://localhost:${PORT}`);
});
