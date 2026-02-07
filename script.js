// ===== State =====
let playerCount = 4;
let ladderData = null;
let animating = false;
let revealedPlayers = new Set();
let ladderVisible = false;

const COLORS = [
  '#7C9FF5', '#F5A0C0', '#6BD4A8', '#F5C56B',
  '#B58BF5', '#F57B7B', '#5BC8D4', '#E88B5A'
];

const PRIZE_ICONS = ['🏆', '🎖️', '🥉', '🎁', '⭐', '🎯', '🎪', '🎨'];

// ===== DOM References =====
const $playerCount = document.getElementById('player-count');
const $btnMinus = document.getElementById('btn-minus');
const $btnPlus = document.getElementById('btn-plus');
const $nameInputs = document.getElementById('name-inputs');
const $prizeInputs = document.getElementById('prize-inputs');
const $btnGenerate = document.getElementById('btn-generate');
const $setupSection = document.getElementById('setup-section');
const $gameSection = document.getElementById('game-section');
const $canvas = document.getElementById('ladder-canvas');
const $canvasWrapper = document.getElementById('canvas-wrapper');
const $ladderCover = document.getElementById('ladder-cover');
const $playerLabelsTop = document.getElementById('player-labels-top');
const $prizeLabelsBottom = document.getElementById('prize-labels-bottom');
const $btnStart = document.getElementById('btn-start');
const $btnSelectAll = document.getElementById('btn-select-all');
const $btnToggleLadder = document.getElementById('btn-toggle-ladder');
const $resultPanel = document.getElementById('result-panel');
const $bottomControls = document.getElementById('bottom-controls');
const $btnAgain = document.getElementById('btn-again');
const $btnShare = document.getElementById('btn-share');
const $toast = document.getElementById('toast');
const ctx = $canvas.getContext('2d');

// ===== Init =====
function init() {
  renderInputs();
  bindEvents();
}

function bindEvents() {
  $btnMinus.addEventListener('click', () => {
    if (playerCount > 2) {
      playerCount--;
      $playerCount.textContent = playerCount;
      renderInputs();
    }
  });

  $btnPlus.addEventListener('click', () => {
    if (playerCount < 8) {
      playerCount++;
      $playerCount.textContent = playerCount;
      renderInputs();
    }
  });

  $btnGenerate.addEventListener('click', generateGame);
  $btnStart.addEventListener('click', () => startPlayerSelect());
  $btnSelectAll.addEventListener('click', revealAll);
  $btnToggleLadder.addEventListener('click', toggleLadder);
  $btnAgain.addEventListener('click', resetGame);
  $btnShare.addEventListener('click', shareResult);
}

function renderInputs() {
  $nameInputs.innerHTML = '';
  $prizeInputs.innerHTML = '';

  for (let i = 0; i < playerCount; i++) {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `Player ${i + 1}`;
    nameInput.maxLength = 12;
    nameInput.dataset.index = i;
    $nameInputs.appendChild(nameInput);

    const prizeInput = document.createElement('input');
    prizeInput.type = 'text';
    prizeInput.placeholder = getDefaultPrize(i);
    prizeInput.maxLength = 12;
    prizeInput.dataset.index = i;
    $prizeInputs.appendChild(prizeInput);
  }
}

function getDefaultPrize(index) {
  const suffixes = ['st', 'nd', 'rd'];
  const s = index < 3 ? suffixes[index] : 'th';
  return `${index + 1}${s}`;
}

// ===== Ladder Toggle =====
function toggleLadder() {
  ladderVisible = !ladderVisible;
  if (ladderVisible) {
    $ladderCover.classList.add('revealed');
    $btnToggleLadder.textContent = 'Hide Ladder';
    $btnToggleLadder.classList.add('active');
  } else {
    $ladderCover.classList.remove('revealed');
    $btnToggleLadder.textContent = 'Show Ladder';
    $btnToggleLadder.classList.remove('active');
  }
}

// ===== Game Generation =====
function generateGame() {
  const names = [];
  const prizes = [];

  $nameInputs.querySelectorAll('input').forEach((input, i) => {
    names.push(input.value.trim() || `Player ${i + 1}`);
  });

  $prizeInputs.querySelectorAll('input').forEach((input, i) => {
    prizes.push(input.value.trim() || getDefaultPrize(i));
  });

  // More complex ladder: more rows & higher bridge probability
  const rows = Math.max(10, playerCount * 3);
  const bridges = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < playerCount - 1; c++) {
      // No two adjacent bridges in same row
      if (c > 0 && row[c - 1]) {
        row.push(false);
      } else {
        row.push(Math.random() < 0.55);
      }
    }
    bridges.push(row);
  }

  // Ensure each column gap has at least 2 bridges for complexity
  for (let c = 0; c < playerCount - 1; c++) {
    const bridgeCount = bridges.filter(row => row[c]).length;
    let needed = Math.max(0, 2 - bridgeCount);
    let attempts = 0;
    while (needed > 0 && attempts < 50) {
      const randomRow = Math.floor(Math.random() * rows);
      if (!bridges[randomRow][c]) {
        // Check adjacent conflicts
        const leftOk = c === 0 || !bridges[randomRow][c - 1];
        const rightOk = c === playerCount - 2 || !bridges[randomRow][c + 1];
        if (leftOk && rightOk) {
          bridges[randomRow][c] = true;
          needed--;
        }
      }
      attempts++;
    }
  }

  // Compute paths
  const paths = [];
  for (let start = 0; start < playerCount; start++) {
    const path = tracePath(start, bridges, rows);
    paths.push(path);
  }

  ladderData = { names, prizes, bridges, rows, paths };
  revealedPlayers = new Set();
  animating = false;

  showGameSection();
}

function tracePath(startCol, bridges, rows) {
  const steps = [];
  let col = startCol;

  steps.push({ row: -1, col });

  for (let r = 0; r < rows; r++) {
    if (col > 0 && bridges[r][col - 1]) {
      steps.push({ row: r, col });
      col--;
      steps.push({ row: r, col });
    } else if (col < bridges[r].length && bridges[r][col]) {
      steps.push({ row: r, col });
      col++;
      steps.push({ row: r, col });
    } else {
      steps.push({ row: r, col });
    }
  }

  steps.push({ row: rows, col });
  return { startCol, endCol: col, steps };
}

// ===== Rendering =====
function showGameSection() {
  $setupSection.classList.add('hidden');
  $gameSection.classList.remove('hidden');
  $resultPanel.classList.add('hidden');
  $btnShare.classList.add('hidden');
  $btnStart.classList.remove('hidden');
  $btnSelectAll.classList.add('hidden');
  $btnStart.textContent = 'Start!';

  // Reset ladder cover (hidden by default)
  ladderVisible = false;
  $ladderCover.classList.remove('revealed');
  $btnToggleLadder.textContent = 'Show Ladder';
  $btnToggleLadder.classList.remove('active');

  renderLabels();
  resizeCanvas();
  drawLadder();
}

function renderLabels() {
  $playerLabelsTop.innerHTML = '';
  $prizeLabelsBottom.innerHTML = '';

  ladderData.names.forEach((name, i) => {
    const item = document.createElement('div');
    item.className = 'label-item';
    item.dataset.player = i;
    item.innerHTML = `
      <div class="avatar" style="background:${COLORS[i]}">${name.charAt(0).toUpperCase()}</div>
      <div class="name">${name}</div>
    `;
    item.addEventListener('click', () => {
      if (!animating && ladderData) {
        revealPlayer(i);
      }
    });
    $playerLabelsTop.appendChild(item);
  });

  ladderData.prizes.forEach((prize, i) => {
    const item = document.createElement('div');
    item.className = 'label-item';
    item.innerHTML = `
      <div class="prize-icon">${PRIZE_ICONS[i] || '🎁'}</div>
      <div class="prize-text">${prize}</div>
    `;
    $prizeLabelsBottom.appendChild(item);
  });
}

function resizeCanvas() {
  const containerWidth = $gameSection.clientWidth - 48;
  const dpr = window.devicePixelRatio || 1;
  const height = Math.max(350, ladderData.rows * 32 + 60);

  $canvas.style.width = containerWidth + 'px';
  $canvas.style.height = height + 'px';
  $canvas.width = containerWidth * dpr;
  $canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getLadderMetrics() {
  const w = parseFloat($canvas.style.width);
  const h = parseFloat($canvas.style.height);
  const padX = 30;
  const padY = 20;
  const colGap = (w - padX * 2) / (playerCount - 1);
  const rowGap = (h - padY * 2) / (ladderData.rows + 1);

  return { w, h, padX, padY, colGap, rowGap };
}

function colX(col, m) {
  return m.padX + col * m.colGap;
}

function rowY(row, m) {
  return m.padY + (row + 1) * m.rowGap;
}

function drawLadder() {
  const m = getLadderMetrics();

  ctx.clearRect(0, 0, m.w, m.h);

  // Vertical lines
  ctx.strokeStyle = '#DEE4F0';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (let c = 0; c < playerCount; c++) {
    const x = colX(c, m);
    ctx.beginPath();
    ctx.moveTo(x, m.padY);
    ctx.lineTo(x, m.h - m.padY);
    ctx.stroke();
  }

  // Bridges
  ctx.strokeStyle = '#C5D0E6';
  ctx.lineWidth = 2.5;

  for (let r = 0; r < ladderData.rows; r++) {
    for (let c = 0; c < playerCount - 1; c++) {
      if (ladderData.bridges[r][c]) {
        const x1 = colX(c, m);
        const x2 = colX(c + 1, m);
        const y = rowY(r, m);
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
    }
  }
}

// ===== Player Selection Mode =====
function startPlayerSelect() {
  $btnStart.classList.add('hidden');
  $btnSelectAll.classList.remove('hidden');

  const avatars = $playerLabelsTop.querySelectorAll('.label-item');
  avatars.forEach(a => {
    a.style.cursor = 'pointer';
  });
}

function revealPlayer(playerIndex) {
  if (revealedPlayers.has(playerIndex) || animating) return;

  animating = true;
  revealedPlayers.add(playerIndex);

  // Auto-reveal ladder when animation starts
  if (!ladderVisible) {
    ladderVisible = true;
    $ladderCover.classList.add('revealed');
    $btnToggleLadder.textContent = 'Hide Ladder';
    $btnToggleLadder.classList.add('active');
  }

  const path = ladderData.paths[playerIndex];
  const color = COLORS[playerIndex];

  animatePath(path, color, () => {
    animating = false;

    const avatarEl = $playerLabelsTop.children[playerIndex];
    if (avatarEl) {
      avatarEl.style.opacity = '0.5';
      avatarEl.style.pointerEvents = 'none';
    }

    showSingleResult(playerIndex, path.endCol);

    if (revealedPlayers.size === playerCount) {
      onAllRevealed();
    }
  });
}

function revealAll() {
  if (animating) return;

  const unrevealed = [];
  for (let i = 0; i < playerCount; i++) {
    if (!revealedPlayers.has(i)) unrevealed.push(i);
  }

  if (unrevealed.length === 0) return;

  let chain = Promise.resolve();
  unrevealed.forEach((pi) => {
    chain = chain.then(() => new Promise(resolve => {
      revealPlayer(pi);
      const checkDone = setInterval(() => {
        if (!animating) {
          clearInterval(checkDone);
          setTimeout(resolve, 200);
        }
      }, 50);
    }));
  });
}

// ===== Animation =====
function animatePath(pathData, color, onComplete) {
  const m = getLadderMetrics();
  const steps = pathData.steps;

  const waypoints = steps.map(s => {
    const x = colX(s.col, m);
    const y = s.row === -1 ? m.padY : (s.row === ladderData.rows ? m.h - m.padY : rowY(s.row, m));
    return { x, y };
  });

  let totalDist = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }

  const duration = Math.min(2500, Math.max(1400, totalDist * 2.5));
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(progress);
    const targetDist = eased * totalDist;

    let traveled = 0;
    let px = waypoints[0].x;
    let py = waypoints[0].y;

    drawLadder();
    redrawRevealedPaths();

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);

    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      const segDist = Math.sqrt(dx * dx + dy * dy);

      if (traveled + segDist <= targetDist) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
        traveled += segDist;
        px = waypoints[i].x;
        py = waypoints[i].y;
      } else {
        const remain = targetDist - traveled;
        const ratio = remain / segDist;
        px = waypoints[i - 1].x + dx * ratio;
        py = waypoints[i - 1].y + dy * ratio;
        ctx.lineTo(px, py);
        traveled = targetDist;
        break;
      }
    }

    ctx.stroke();
    ctx.globalAlpha = 1;

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      if (!ladderData.completedPaths) ladderData.completedPaths = [];
      ladderData.completedPaths.push({ waypoints, color });

      drawLadder();
      redrawRevealedPaths();

      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

function redrawRevealedPaths() {
  if (!ladderData.completedPaths) return;

  ladderData.completedPaths.forEach(({ waypoints, color }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    const last = waypoints[waypoints.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ===== Results =====
function showSingleResult(playerIndex, endCol) {
  $resultPanel.classList.remove('hidden');

  if (!$resultPanel.querySelector('h3')) {
    $resultPanel.innerHTML = '<h3>Results</h3><div class="result-list"></div>';
  }

  const list = $resultPanel.querySelector('.result-list');
  const item = document.createElement('div');
  item.className = 'result-item';
  item.style.animationDelay = '0s';

  const name = ladderData.names[playerIndex];
  const prize = ladderData.prizes[endCol];
  const icon = PRIZE_ICONS[endCol] || '🎁';

  item.innerHTML = `
    <span style="color:${COLORS[playerIndex]};font-weight:800">${name}</span>
    <span class="arrow">→</span>
    <span>${icon} ${prize}</span>
  `;

  list.appendChild(item);
  item.offsetHeight;
  item.style.opacity = '1';
}

function onAllRevealed() {
  $btnSelectAll.classList.add('hidden');
  $btnShare.classList.remove('hidden');
}

function resetGame() {
  $gameSection.classList.add('hidden');
  $setupSection.classList.remove('hidden');
  ladderData = null;
  revealedPlayers = new Set();
  animating = false;
  ladderVisible = false;
}

// ===== Share =====
function shareResult() {
  if (!ladderData) return;

  let text = '🪜 Ladder Game Results\n\n';

  ladderData.paths.forEach(p => {
    const name = ladderData.names[p.startCol];
    const prize = ladderData.prizes[p.endCol];
    const icon = PRIZE_ICONS[p.endCol] || '🎁';
    text += `${name} → ${icon} ${prize}\n`;
  });

  text += '\nPlay at: https://ladder-game.vercel.app';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    }).catch(() => {
      fallbackShare(text);
    });
  } else {
    fallbackShare(text);
  }
}

function fallbackShare(text) {
  if (navigator.share) {
    navigator.share({ title: 'Ladder Game', text }).catch(() => {});
  } else {
    showToast('Share not supported');
  }
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.remove('hidden');
  $toast.classList.add('show');
  setTimeout(() => {
    $toast.classList.remove('show');
    setTimeout(() => $toast.classList.add('hidden'), 300);
  }, 2000);
}

// ===== Window resize =====
window.addEventListener('resize', () => {
  if (ladderData && !$gameSection.classList.contains('hidden')) {
    resizeCanvas();
    drawLadder();
    redrawRevealedPaths();
  }
});

// ===== Start =====
init();
