/* RunnerJS - game.js
- Controles: SPACE o click/tap
- Guarda en backend con fallback a localStorage
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const highscoreEl = document.getElementById("highscore");

const gameOverPanel = document.getElementById("gameOverPanel");
const finalScoreEl = document.getElementById("finalScore");
const finalLevelEl = document.getElementById("finalLevel");
const playerNameInput = document.getElementById("playerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const restartBtn = document.getElementById("restartBtn");

const leaderboardPanel = document.getElementById("leaderboardPanel");
const scoresList = document.getElementById("scoresList");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");

let highscore = parseInt(localStorage.getItem("runner_highscore") || "0", 10);

highscoreEl.textContent = highscore;

let state = {
  player: { x: 60, y: 200, w: 44, h: 44, vy: 0, jumpPower: 13, grounded: false },
  gravity: 0.8,
  obstacles: [],
  scrollSpeed: 6,
  score: 0,
  level: 1,
  running: true,
  frames: 0
};

function resetState() {
  state.obstacles = [];
  state.scrollSpeed = 6;
  state.score = 0;
  state.level = 1;
  state.running = true;
  state.frames = 0;
  state.player.y = 200;
  state.player.vy = 0;
  state.player.grounded = false;
  playerNameInput.value = "";
  gameOverPanel.classList.add("hidden");
}

function spawnObstacle() {
  // obstacle size/prob grows with level
  const h = 20 + Math.floor(Math.random() * (20 + state.level*3));
  const w = 18 + Math.floor(Math.random() * (20 + state.level));
  const y = H - 20 - h; // ground at H-20
  state.obstacles.push({ x: W + 10, y, w, h });
}

function updatePhysics() {
  state.frames++;

  // spawn probability increases with level
  const spawnProb = Math.min(0.02 + state.level * 0.005, 0.18);
  if (Math.random() < spawnProb) spawnObstacle();

  // update player physical
  const p = state.player;
  p.y += p.vy;
  p.vy += state.gravity;
  if (p.y + p.h >= H - 20) {
    p.y = H - 20 - p.h;
    p.vy = 0;
    p.grounded = true;
  }

  // move obstacles and remove past ones
  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    state.obstacles[i].x -= state.scrollSpeed;
    if (state.obstacles[i].x + state.obstacles[i].w < -50) state.obstacles.splice(i, 1);
  }

  // collision check
  for (let obs of state.obstacles) {
    if (p.x < obs.x + obs.w && p.x + p.w > obs.x && p.y < obs.y + obs.h && p.y + p.h > obs.y) {
      // collision: end game
      state.running = false;
    }
  }

  // increase score
  if (state.frames % 4 === 0) state.score++;

  // level progression: every 400 points level up
  const newLevel = 1 + Math.floor(state.score / 400);
  if (newLevel !== state.level) {
    state.level = newLevel;
    state.scrollSpeed = 6 + Math.floor(state.level * 1.5);
  }

  // update HUD
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;
  if (state.score > highscore) {
    highscore = state.score;
    highscoreEl.textContent = highscore;
    localStorage.setItem("runner_highscore", String(highscore));
  }
}

function draw() {
  // background
  ctx.clearRect(0, 0, W, H);
  // ground
  ctx.fillStyle = "#e9eef5";
  ctx.fillRect(0, H - 20, W, 20);

  // player
  ctx.fillStyle = "#86c9f0ff";
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

  // obstacles
  ctx.fillStyle = "#ad2fd3ff";
  for (let obs of state.obstacles) {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  }
}

function loop() {
  if (!state.running) {
    onGameOver();
    return;
  }
  updatePhysics();
  draw();
  requestAnimationFrame(loop);
}

function jump() {
  if (!state.player.grounded) return;
  state.player.vy = -state.player.jumpPower;
  state.player.grounded = false;
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (state.running) jump();
  }
  if (!state.running && e.code === "Enter") {
    restart();
  }
});

canvas.addEventListener("pointerdown", () => {
  if (state.running) jump();
});

function onGameOver() {
  // show panel and allow save
  finalScoreEl.textContent = state.score;
  finalLevelEl.textContent = state.level;
  gameOverPanel.classList.remove("hidden");
}

function restart() {
  resetState();
  loop();
}

restartBtn.addEventListener("click", restart);

saveScoreBtn.addEventListener("click", async () => {
  const name = (playerNameInput.value || "Anon").trim().slice(0, 20);
  const payload = { name, score: state.score, level: state.level, date: new Date().toISOString() };

  // try server, fallback handled by api.js
  await saveScoreToServer(payload);
  // update local highscore storage if needed
  const localStored = JSON.parse(localStorage.getItem("runner_local_scores") || "[]");
  localStored.push(payload);
  localStorage.setItem("runner_local_scores", JSON.stringify(localStored));
  // close panel and show leaderboard
  gameOverPanel.classList.add("hidden");
  showLeaderboard();
});

async function showLeaderboard() {
  leaderboardPanel.classList.remove("hidden");
  leaderboardPanel.setAttribute("aria-hidden", "false");
  scoresList.innerHTML = "";
  // get scores
  const arr = await fetchScoresFromServer();
  // unify with local fallback and sort
  const combined = Array.isArray(arr) ? arr.slice() : [];
  // also include local saved scores (in case server returned fallback)
  const local = JSON.parse(localStorage.getItem("runner_local_scores") || "[]");
  for (const s of local) combined.push(s);
  combined.sort((a,b)=>b.score - a.score);
  const top = combined.slice(0, 10);
  top.forEach(s => {
    const li = document.createElement("li");
    const date = s.date ? new Date(s.date).toLocaleString() : "";
    li.textContent = `${s.name} — ${s.score} pts — lvl ${s.level} ${date ? "• " + date : ""}`;
    scoresList.appendChild(li);
  });
}

showLeaderboardBtn.addEventListener("click", showLeaderboard);
closeLeaderboardBtn.addEventListener("click", () => {
  leaderboardPanel.classList.add("hidden");
  leaderboardPanel.setAttribute("aria-hidden", "true");
});

// init
resetState();
loop();
