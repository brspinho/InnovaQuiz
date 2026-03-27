/**
 * host.js – Host Setup & Host Game logic
 */

// ──────────────────────────────────────────────────────────────────────────────
// HOST SETUP
// ──────────────────────────────────────────────────────────────────────────────
const hostSetup = {
  questionCount: 0,
  predefinedQuizzes: [],

  init() {
    socket.emit('get-quizzes');
  },

  loadQuizzes(quizzes) {
    this.predefinedQuizzes = quizzes;
    const select = document.getElementById('predefined-quizzes-select');
    select.innerHTML = '<option value="">-- Selecione um Quiz --</option>';
    quizzes.forEach((q, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = q.title;
      select.appendChild(opt);
    });
  },

  loadSelectedQuiz() {
    const idx = document.getElementById('predefined-quizzes-select').value;
    if (idx === "") return;
    
    const quiz = this.predefinedQuizzes[idx];
    if (!quiz) return;

    if (confirm(`Isso irá substituir as perguntas atuais pelo quiz "${quiz.title}". Continuar?`)) {
      document.getElementById('questions-list').innerHTML = '';
      this.questionCount = 0;
      quiz.questions.forEach(q => {
        this.addQuestion(q);
      });
      app.showToast(`✅ Quiz "${quiz.title}" carregado!`);
    }
  },

  addQuestion(data = null) {
    this.questionCount++;
    const idx = this.questionCount;
    const list = document.getElementById('questions-list');

    const div = document.createElement('div');
    div.className = 'question-card';
    div.id = `qcard-${idx}`;
    div.innerHTML = `
      <div class="question-card-header">
        <span class="question-number">Pergunta ${idx}</span>
        <button class="btn-remove" onclick="hostSetup.removeQuestion(${idx})" title="Remover">✕</button>
      </div>
      <div class="input-group">
        <label>Enunciado</label>
        <textarea id="q-text-${idx}" placeholder="Digite a pergunta…" rows="2">${data ? data.question : ''}</textarea>
      </div>
      <div class="options-grid">
        ${['A','B','C','D'].map((l,i) => `
          <div class="option-item">
            <div class="option-icon opt-${l.toLowerCase()}">${l}</div>
            <input type="text" id="q-${idx}-opt-${i}" placeholder="Opção ${l}" value="${data ? data.options[i] : ''}" />
          </div>
        `).join('')}
      </div>
      <div class="correct-label">
        Respostas corretas (selecione uma ou mais):
        <div class="correct-checkboxes">
          ${['A','B','C','D'].map((l, i) => `
            <label class="cb-label">
              <input type="checkbox" id="q-${idx}-correct-${i}" value="${i}" ${data && data.correct.includes(i) ? 'checked' : ''}> ${l}
            </label>
          `).join('')}
        </div>
      </div>
    `;
    list.appendChild(div);
  },

  removeQuestion(idx) {
    const el = document.getElementById(`qcard-${idx}`);
    if (el) el.remove();
  },

  createGame() {
    const cards = document.querySelectorAll('.question-card');
    if (cards.length === 0) {
      app.showToast('⚠️ Adicione pelo menos uma pergunta.');
      return;
    }

    const quiz = [];
    for (const card of cards) {
      const id = card.id.replace('qcard-', '');
      const question = document.getElementById(`q-text-${id}`).value.trim();
      const options = [0,1,2,3].map(i => (document.getElementById(`q-${id}-opt-${i}`)?.value || '').trim());
      
      const correct = [];
      [0,1,2,3].forEach(i => {
        if (document.getElementById(`q-${id}-correct-${i}`).checked) {
          correct.push(i);
        }
      });

      if (!question) { app.showToast('⚠️ Preencha todos os enunciados.'); return; }
      if (options.some(o => !o)) { app.showToast('⚠️ Preencha todas as opções.'); return; }
      if (correct.length === 0) { app.showToast(`⚠️ Selecione pelo menos uma resposta correta para a pergunta ${id}.`); return; }

      quiz.push({ question, options, correct });
    }

    socket.emit('create-game', { quiz });
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// HOST GAME
// ──────────────────────────────────────────────────────────────────────────────
const hostGame = {
  pin: null,
  timerInterval: null,
  currentTimeLeft: 20,
  totalTime: 20,
  playerNames: new Set(),

  startGame() {
    socket.emit('start-game', { pin: this.pin });
  },

  nextQuestion() {
    socket.emit('next-question', { pin: this.pin });
    document.getElementById('host-results').style.display = 'none';
    document.getElementById('host-question').style.display = 'block';
  },

  endGame() {
    if (confirm('Encerrar o jogo?')) {
      socket.emit('end-game', { pin: this.pin });
      app.goTo('home');
      this.reset();
    }
  },

  showQuestion(data) {
    document.getElementById('host-lobby').style.display = 'none';
    document.getElementById('host-results').style.display = 'none';
    document.getElementById('host-question').style.display = 'block';

    document.getElementById('host-q-counter').textContent = `Pergunta ${data.index + 1} / ${data.total}`;
    document.getElementById('host-question-text').textContent = data.question;
    document.getElementById('host-answer-progress').textContent = `0 / ${data.playerCount} responderam`;

    // Render options
    const optClasses = ['opt-a', 'opt-b', 'opt-c', 'opt-d'];
    const optIcons   = ['▲', '◆', '●', '■'];
    const grid = document.getElementById('host-options-grid');
    grid.innerHTML = data.options.map((opt, i) => `
      <div class="host-option ${optClasses[i]}">
        <span>${optIcons[i]}</span> ${opt}
      </div>
    `).join('');

    // Timer
    this.currentTimeLeft = data.timeLimit;
    this.totalTime = data.timeLimit;
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timerInterval);
    const bar = document.getElementById('host-timer-bar');
    const num = document.getElementById('host-timer-num');

    const tick = () => {
      const pct = (this.currentTimeLeft / this.totalTime) * 100;
      bar.style.width = pct + '%';
      bar.className = 'timer-bar' + (this.currentTimeLeft <= 5 ? ' warning' : '');
      num.textContent = this.currentTimeLeft;
      if (this.currentTimeLeft > 0) this.currentTimeLeft--;
    };

    tick();
    this.timerInterval = setInterval(tick, 1000);
  },

  showResults(data) {
    clearInterval(this.timerInterval);

    document.getElementById('host-question').style.display = 'none';
    document.getElementById('host-results').style.display = 'block';

    // Bar chart
    const max = Math.max(...data.answerCounts, 1);
    const optClasses = ['opt-a', 'opt-b', 'opt-c', 'opt-d'];
    const optLabels  = ['A', 'B', 'C', 'D'];
    const barsEl = document.getElementById('result-bars');
    barsEl.innerHTML = data.answerCounts.map((cnt, i) => `
      <div class="result-bar-wrap">
        <div class="result-bar-count">${cnt}</div>
        <div class="result-bar ${optClasses[i]} ${data.correctAnswer.includes(i) ? 'correct-bar' : ''}"
             style="height:${Math.round((cnt/max)*160)+4}px"></div>
        <div class="result-bar-label">${optLabels[i]}</div>
      </div>
    `).join('');

    // Leaderboard
    this.renderLeaderboard('host-leaderboard', data.leaderboard);

    // Update next button label
    const btn = document.getElementById('btn-next-question');
    // We don't know here if it's the last question, server decides
    btn.textContent = '▶ Próxima Pergunta / Encerrar';
  },

  renderLeaderboard(elId, leaderboard) {
    const listEl = document.getElementById(elId);
    const podiumEl = document.getElementById(elId === 'host-leaderboard' ? 'host-podium' : 'player-podium');

    // Filter top 3 for podium
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    if (podiumEl) {
      if (top3.length > 0) {
        podiumEl.style.display = 'flex';
        podiumEl.innerHTML = `
          ${top3[1] ? `
          <div class="podium-step step-2">
            <div class="podium-avatar">${app.avatar(top3[1].avatar)}</div>
            <div class="podium-name">${top3[1].name}</div>
            <div class="podium-score">${top3[1].score.toLocaleString()}</div>
            <div class="podium-rank-circle">2</div>
          </div>` : ''}
          <div class="podium-step step-1">
            <div class="podium-avatar">${app.avatar(top3[0].avatar)}</div>
            <div class="podium-name">${top3[0].name}</div>
            <div class="podium-score">${top3[0].score.toLocaleString()}</div>
            <div class="podium-rank-circle">1</div>
          </div>
          ${top3[2] ? `
          <div class="podium-step step-3">
            <div class="podium-avatar">${app.avatar(top3[2].avatar)}</div>
            <div class="podium-name">${top3[2].name}</div>
            <div class="podium-score">${top3[2].score.toLocaleString()}</div>
            <div class="podium-rank-circle">3</div>
          </div>` : ''}
        `;
      } else {
        podiumEl.style.display = 'none';
      }
    }

    const medals = ['🥇', '🥈', '🥉'];
    listEl.innerHTML = leaderboard.map((p, i) => `
      <div class="leaderboard-item ${p.name === playerGame.name ? 'current-player' : ''}" style="animation-delay:${i*0.08}s">
        <div class="lb-rank">${p.rank <= 3 ? medals[p.rank-1] : p.rank}</div>
        <div class="lb-avatar">${app.avatar(p.avatar)}</div>
        <div class="lb-name">${p.name}</div>
        <div class="lb-score">${p.score.toLocaleString()} pts</div>
      </div>
    `).join('');
  },

  reset() {
    clearInterval(this.timerInterval);
    this.pin = null;
    this.playerNames.clear();
    document.getElementById('questions-list').innerHTML = '';
    hostSetup.questionCount = 0;
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// SOCKET EVENTS (Host)
// ──────────────────────────────────────────────────────────────────────────────

socket.on('quizzes-list', (data) => {
  hostSetup.loadQuizzes(data);
});

socket.on('game-created', ({ pin, totalQuestions }) => {
  hostGame.pin = pin;
  document.getElementById('host-pin-value').textContent = pin;
  document.getElementById('player-count-display').textContent = '0';
  document.getElementById('player-bubbles').innerHTML = '';
  document.getElementById('host-lobby').style.display = 'block';
  document.getElementById('host-question').style.display = 'none';
  document.getElementById('host-results').style.display = 'none';
  document.getElementById('btn-start-game').disabled = true;
  app.goTo('host-game');
  app.showToast(`✅ Jogo criado! PIN: ${pin} – ${totalQuestions} pergunta(s)`);
});

socket.on('player-joined', ({ players, count }) => {
  document.getElementById('player-count-display').textContent = count;
  document.getElementById('btn-start-game').disabled = count === 0;

  const bubbles = document.getElementById('player-bubbles');
  bubbles.innerHTML = '';
  players.forEach(p => {
    const b = document.createElement('div');
    b.className = 'player-bubble';
    b.textContent = `${app.avatar(p.avatar)} ${p.name}`;
    bubbles.appendChild(b);
  });
});

socket.on('player-left', ({ players, count, name }) => {
  document.getElementById('player-count-display').textContent = count;
  document.getElementById('btn-start-game').disabled = count === 0;
  app.showToast(`👋 ${name} saiu`);

  const bubbles = document.getElementById('player-bubbles');
  bubbles.innerHTML = '';
  players.forEach(p => {
    const b = document.createElement('div');
    b.className = 'player-bubble';
    b.textContent = `${app.avatar(p.avatar)} ${p.name}`;
    bubbles.appendChild(b);
  });
});

socket.on('question', (data) => {
  hostGame.showQuestion(data);
});

socket.on('answer-progress', ({ answered, total }) => {
  document.getElementById('host-answer-progress').textContent = `${answered} / ${total} responderam`;
});

socket.on('question-results', (data) => {
  hostGame.showResults(data);
});

socket.on('game-over', ({ leaderboard }) => {
  clearInterval(hostGame.timerInterval);
  // Host just redirects home after seeing final leaderboard
  if (leaderboard && leaderboard.length) {
    document.getElementById('host-question').style.display = 'none';
    document.getElementById('host-results').style.display = 'block';
    hostGame.renderLeaderboard('host-leaderboard', leaderboard);
    document.getElementById('result-bars').innerHTML = '<div style="color:var(--yellow);font-size:2rem;width:100%;text-align:center;">🏆 Fim do Jogo!</div>';
    document.getElementById('btn-next-question').textContent = '🏠 Voltar ao Início';
    document.getElementById('btn-next-question').onclick = () => { app.goTo('home'); hostGame.reset(); };
  } else {
    app.goTo('home');
    hostGame.reset();
  }
});
