/**
 * InnovaQuiz Game Engine
 * Manages all game rooms, players, questions and scoring.
 * Designed to handle up to 100 simultaneous players per room.
 */

const { v4: uuidv4 } = require('uuid');

// In-memory store: Map<pin, GameRoom>
const rooms = new Map();

const QUESTION_TIME = 20; // seconds per question

function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(pin));
  return pin;
}

function calculateScore(timeLeft, totalTime) {
  const base = 1000;
  const bonus = Math.round((timeLeft / totalTime) * 500);
  return base + bonus;
}

/**
 * Create a new game room
 * @param {string} hostId - Socket ID of host
 * @param {Array} quiz - Array of question objects
 * @returns {object} room info
 */
function createRoom(hostId, quiz) {
  const pin = generatePin();
  rooms.set(pin, {
    pin,
    hostId,
    quiz,
    players: new Map(), // socketId -> player
    state: 'lobby',
    currentQuestion: -1,
    questionStartTime: null,
    answers: new Map(),
    lastResults: null,
  });
  return { pin, totalQuestions: quiz.length };
}

function joinRoom(pin, socketId, name) {
  const room = rooms.get(pin);
  if (!room) return { error: 'Sala não encontrada.' };
  if (room.state !== 'lobby') return { error: 'O jogo já começou.' };
  if (room.players.size >= 100) return { error: 'Sala cheia (máx 100).' };

  const player = {
    socketId,
    name,
    score: 0,
    avatar: room.players.size % 8, 
  };

  room.players.set(socketId, player);
  return { 
    playerName: name, 
    playerCount: room.players.size,
    avatar: player.avatar
  };
}

/**
 * Remove player from room (on disconnect)
 */
function removePlayer(pin, socketId) {
  const room = rooms.get(pin);
  if (room) {
    room.players.delete(socketId);
    if (room.players.size === 0 && room.hostId !== socketId) {
      rooms.delete(pin);
    }
  }
}

/**
 * Handle host disconnect – mark room as ended
 */
function removeHost(socketId) {
  for (const [pin, room] of rooms) {
    if (room.hostId === socketId) {
      rooms.delete(pin);
      return pin;
    }
  }
  return null;
}

/**
 * Get player list for lobby display
 */
function getPlayerList(pin) {
  const room = rooms.get(pin);
  if (!room) return [];
  return [...room.players.values()].map(p => ({ name: p.name, avatar: p.avatar }));
}

/**
 * Start game – returns first question data
 */
function startGame(pin) {
  const room = rooms.get(pin);
  if (!room) return { error: 'Sala não encontrada.' };
  if (room.state !== 'lobby') return { error: 'Jogo já iniciado.' };

  room.state = 'question';
  room.currentQuestion = 0;
  room.answers = new Map();
  room.questionStartTime = Date.now();

  return buildQuestionPayload(room);
}

/**
 * Submit a player's answer
 */
function submitAnswer(pin, socketId, answerIndex) {
  const room = rooms.get(pin);
  if (!room || room.state !== 'question') return { error: 'Não é possível responder agora.' };
  if (room.answers.has(socketId)) return { error: 'Já respondeu.' };

  const elapsed = (Date.now() - room.questionStartTime) / 1000;
  const timeLeft = Math.max(0, QUESTION_TIME - elapsed);

  room.answers.set(socketId, { index: answerIndex, timeLeft });

  const q = room.quiz[room.currentQuestion];
  // Support both single value and array for backward compatibility/flexibility
  const correctAnswers = Array.isArray(q.correct) ? q.correct : [q.correct];
  const isCorrect = correctAnswers.includes(answerIndex);
  let pointsEarned = 0;

  if (isCorrect) {
    pointsEarned = calculateScore(timeLeft, QUESTION_TIME);
    const player = room.players.get(socketId);
    if (player) player.score += pointsEarned;
  }

  return {
    isCorrect,
    pointsEarned,
    correctAnswer: q.correct,
    totalAnswered: room.answers.size,
    totalPlayers: room.players.size,
  };
}

/**
 * End current question – returns results + leaderboard
 */
function endQuestion(pin) {
  const room = rooms.get(pin);
  if (!room) return null;

  const q = room.quiz[room.currentQuestion];
  room.state = 'results';

  // Support array for correctAnswers
  const correct = Array.isArray(q.correct) ? q.correct : [q.correct];

  // Count answers per option
  const answerCounts = [0, 0, 0, 0];
  for (const ans of room.answers.values()) {
    if (ans.index >= 0 && ans.index < 4) answerCounts[ans.index]++;
  }

  const leaderboard = getSortedLeaderboard(room);

  return {
    correctAnswer: correct,
    answerCounts,
    leaderboard: leaderboard.slice(0, 10), // top 10
    totalAnswered: room.answers.size,
    totalPlayers: room.players.size,
  };
}

/**
 * Advance to next question
 */
function nextQuestion(pin) {
  const room = rooms.get(pin);
  if (!room) return { done: true };

  room.currentQuestion++;

  if (room.currentQuestion >= room.quiz.length) {
    room.state = 'ended';
    const leaderboard = getSortedLeaderboard(room);
    rooms.delete(pin);
    return { done: true, leaderboard };
  }

  room.state = 'question';
  room.answers = new Map();
  room.questionStartTime = Date.now();
  room.lastResults = null; // Clear previous results

  return { done: false, question: buildQuestionPayload(room) };
}

function buildQuestionPayload(room) {
  const q = room.quiz[room.currentQuestion];
  return {
    index: room.currentQuestion,
    total: room.quiz.length,
    question: q.question,
    options: q.options,
    timeLimit: QUESTION_TIME,
    playerCount: room.players.size,
  };
}


function getSortedLeaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, avatar: p.avatar }));
}

/**
 * Find which room a socket belongs to (as player)
 */
function findPlayerRoom(socketId) {
  for (const [pin, room] of rooms) {
    if (room.players.has(socketId)) return pin;
  }
  return null;
}

function getRoom(pin) {
  return rooms.get(pin);
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayer,
  removeHost,
  getPlayerList,
  startGame,
  submitAnswer,
  endQuestion,
  nextQuestion,
  findPlayerRoom,
  getRoom,
  QUESTION_TIME,
};
