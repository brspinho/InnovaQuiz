/**
 * player.js – Player Join & Player Game logic
 */

const playerJoin = {
  join() {
    const pin = document.getElementById('input-pin').value.trim();
    const name = document.getElementById('input-name').value.trim();

    if (!pin || pin.length !== 6) {
      app.showToast('⚠️ Digite um PIN válido de 6 dígitos.');
      return;
    }
    if (!name) {
      app.showToast('⚠️ Digite seu nome.');
      return;
    }

    socket.emit('join-game', { pin, playerName: name });
  }
};

const playerGame = {
  pin: null,
  name: null,
  score: 0,
  timerInterval: null,
  currentTimeLeft: 20,
  totalTime: 20,
  hasAnswered: false,
  rankingTimeout: null,

  init(data) {
    this.pin = document.getElementById('input-pin').value.trim();
    this.name = data.playerName;
    this.score = 0;
    
    document.getElementById('player-name-badge').textContent = `${this.name}`;
    document.getElementById('player-score-badge').textContent = `0 pts`;
    
    app.goTo('player-game');
    this.showWaiting();
  },

  showWaiting() {
    this.hideAll();
    document.getElementById('player-waiting').style.display = 'block';
  },

  showQuestion(data) {
    if (this.rankingTimeout) clearTimeout(this.rankingTimeout);
    this.hideAll();
    document.getElementById('player-question').style.display = 'block';
    document.getElementById('player-question-text').textContent = data.question;
    this.hasAnswered = false;

    const specialImg = document.getElementById('player-special-img');
    if (data.index === data.total - 1) {
      specialImg.style.display = 'block';
    } else {
      specialImg.style.display = 'none';
    }

    // Update buttons
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`ans-${i}`);
      const txt = document.getElementById(`ans-${i}-text`);
      btn.disabled = false;
      btn.classList.remove('shake', 'correct', 'wrong'); // Preserve existing class removal
      txt.textContent = data.options[i];
    }
    
    this.currentTimeLeft = data.timeLimit;
    this.totalTime = data.timeLimit;
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timerInterval);
    const bar = document.getElementById('player-timer-bar');
    const num = document.getElementById('player-timer-num');

    const tick = () => {
      const pct = (this.currentTimeLeft / this.totalTime) * 100;
      bar.style.width = pct + '%';
      bar.className = 'timer-bar' + (this.currentTimeLeft <= 5 ? ' warning' : '');
      num.textContent = Math.ceil(this.currentTimeLeft);
      
      if (this.currentTimeLeft > 0) {
        this.currentTimeLeft -= 0.1;
      } else {
        clearInterval(this.timerInterval);
        if (!this.hasAnswered) {
          this.lockButtons();
        }
      }
    };

    tick();
    this.timerInterval = setInterval(tick, 100);
  },

  answer(index) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;
    clearInterval(this.timerInterval);
    this.lockButtons();
    
    socket.emit('submit-answer', { pin: this.pin, answerIndex: index });
    
    // Show waiting for others
    this.hideAll();
    document.getElementById('player-waiting').style.display = 'block';
    const waitingH3 = document.querySelector('#player-waiting h3');
    if (waitingH3) waitingH3.textContent = 'Resposta enviada!';
    const waitingP = document.querySelector('#player-waiting p');
    if (waitingP) waitingP.textContent = 'Aguardando o fim do tempo...';
  },

  lockButtons() {
    document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
  },

  // Store result but don't show yet
  lastResult: null,
  storeAnswerResult(data) {
    this.lastResult = data;
  },

  showAnswerResult() {
    if (!this.lastResult) {
      // If player didn't answer in time
      this.lastResult = { isCorrect: false, pointsEarned: 0 };
    }
    
    this.hideAll();
    const feedback = document.getElementById('player-feedback');
    feedback.style.display = 'block';

    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-title');
    const points = document.getElementById('points-earned');

    if (this.lastResult.isCorrect) {
      icon.textContent = '✅';
      title.textContent = 'Correto!';
      points.textContent = `+${Math.round(this.lastResult.pointsEarned)}`;
      points.style.display = 'block';
      feedback.className = 'feedback-correct';
    } else {
      icon.textContent = '❌';
      title.textContent = this.hasAnswered ? 'Errado!' : 'Tempo Esgotado!';
      points.style.display = 'none';
      feedback.className = 'feedback-wrong';
    }

    // Reset for next question
    this.lastResult = null;
  },

  showRanking(leaderboard) {
    // First show feedback for 3 seconds
    this.showAnswerResult();
    
    if (this.rankingTimeout) clearTimeout(this.rankingTimeout);
    this.rankingTimeout = setTimeout(() => {
      // If we are still in this state (not next question yet)
      this.hideAll();
      const rankingPage = document.getElementById('player-ranking');
      rankingPage.style.display = 'block';
      
      const playerEntry = leaderboard.find(p => p.name === this.name);
      if (playerEntry) {
        document.getElementById('rank-position').textContent = `#${playerEntry.rank}`;
        document.getElementById('player-score-badge').textContent = `${playerEntry.score.toLocaleString()} pts`;
      }
      
      document.getElementById('rank-total').textContent = leaderboard.length;
      
      this.renderPodium('player-podium', leaderboard);

      const list = document.getElementById('player-leaderboard');
      list.innerHTML = leaderboard.slice(0, 5).map((p, i) => `
        <div class="leaderboard-item ${p.name === this.name ? 'current-player' : ''}" style="animation-delay:${i*0.05}s">
          <div class="lb-rank">${p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank-1] : p.rank}</div>
          <div class="lb-avatar">${app.avatar(p.avatar)}</div>
          <div class="lb-name">${p.name}</div>
          <div class="lb-score">${p.score.toLocaleString()}</div>
        </div>
      `).join('');
    }, 3000);
  },

  showGameOver(leaderboard) {
    this.hideAll();
    document.getElementById('player-gameover').style.display = 'block';
    
    this.renderPodium('player-podium', leaderboard);

    const list = document.getElementById('gameover-leaderboard');
    list.innerHTML = leaderboard.slice(0, 10).map((p, i) => `
      <div class="leaderboard-item ${p.name === this.name ? 'current-player' : ''}" style="animation-delay:${i*0.1}s">
        <div class="lb-rank">${p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank-1] : p.rank}</div>
        <div class="lb-avatar">${app.avatar(p.avatar)}</div>
        <div class="lb-name">${p.name}</div>
        <div class="lb-score">${p.score.toLocaleString()}</div>
      </div>
    `).join('');
  },

  renderPodium(elId, leaderboard) {
    const podiumEl = document.getElementById(elId);
    const top3 = leaderboard.slice(0, 3);
    if (podiumEl && top3.length > 0) {
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
    }
  },

  hideAll() {
    ['player-waiting', 'player-question', 'player-feedback', 'player-ranking', 'player-gameover'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// SOCKET EVENTS (Player)
// ──────────────────────────────────────────────────────────────────────────────

socket.on('joined', (data) => {
  playerGame.init(data);
  app.showToast(`🎮 Bem-vindo, ${data.playerName}!`);
});

socket.on('join-error', ({ message }) => {
  const errEl = document.getElementById('join-error');
  errEl.textContent = message;
  app.showToast('⚠️ ' + message);
});

socket.on('question', (data) => {
  playerGame.showQuestion(data);
});

socket.on('answer-result', (data) => {
  playerGame.storeAnswerResult(data);
});

socket.on('question-results', (data) => {
  // Show interim ranking to players
  playerGame.showRanking(data.leaderboard);
});

socket.on('game-over', ({ leaderboard }) => {
  playerGame.showGameOver(leaderboard);
});

socket.on('host-disconnected', () => {
  app.showToast('🔌 O host se desconectou.');
  setTimeout(() => app.goTo('home'), 3000);
});
