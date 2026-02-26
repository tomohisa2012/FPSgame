const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

const hpLabel = document.getElementById("hp");
const ammoLabel = document.getElementById("ammo");
const scoreLabel = document.getElementById("score");
const waveLabel = document.getElementById("wave");

const keys = new Set();

const state = {
  hp: 100,
  ammo: 30,
  score: 0,
  wave: 1,
  reloadTimer: 0,
  gameOver: false,
};

const player = {
  x: canvas.width / 2,
  z: 360,
  angle: -Math.PI / 2,
  speed: 2.4,
  radius: 14,
};

const bullets = [];
const enemies = [];

function spawnWave() {
  const count = 4 + state.wave * 2;
  for (let i = 0; i < count; i += 1) {
    enemies.push({
      x: 120 + Math.random() * (canvas.width - 240),
      z: 40 + Math.random() * 140,
      speed: 0.45 + Math.random() * 0.3 + state.wave * 0.04,
      hp: 20,
      radius: 12,
    });
  }
}

function resetGame() {
  state.hp = 100;
  state.ammo = 30;
  state.score = 0;
  state.wave = 1;
  state.reloadTimer = 0;
  state.gameOver = false;
  player.x = canvas.width / 2;
  player.z = 360;
  player.angle = -Math.PI / 2;
  bullets.length = 0;
  enemies.length = 0;
  spawnWave();
}

function fire() {
  if (state.gameOver) return;
  if (state.ammo <= 0 || state.reloadTimer > 0) return;

  bullets.push({
    x: player.x,
    z: player.z,
    vx: Math.cos(player.angle) * 6,
    vz: Math.sin(player.angle) * 6,
    life: 60,
  });

  state.ammo -= 1;
  if (state.ammo === 0) {
    state.reloadTimer = 100;
  }
}

function updatePlayer() {
  if (keys.has("ArrowLeft")) player.angle -= 0.045;
  if (keys.has("ArrowRight")) player.angle += 0.045;

  let moveX = 0;
  let moveZ = 0;

  if (keys.has("w")) {
    moveX += Math.cos(player.angle) * player.speed;
    moveZ += Math.sin(player.angle) * player.speed;
  }
  if (keys.has("s")) {
    moveX -= Math.cos(player.angle) * player.speed * 0.8;
    moveZ -= Math.sin(player.angle) * player.speed * 0.8;
  }
  if (keys.has("a")) {
    moveX += Math.cos(player.angle - Math.PI / 2) * player.speed * 0.7;
    moveZ += Math.sin(player.angle - Math.PI / 2) * player.speed * 0.7;
  }
  if (keys.has("d")) {
    moveX += Math.cos(player.angle + Math.PI / 2) * player.speed * 0.7;
    moveZ += Math.sin(player.angle + Math.PI / 2) * player.speed * 0.7;
  }

  player.x = Math.max(20, Math.min(canvas.width - 20, player.x + moveX));
  player.z = Math.max(180, Math.min(canvas.height - 30, player.z + moveZ));
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx;
    bullet.z += bullet.vz;
    bullet.life -= 1;

    if (
      bullet.life <= 0 ||
      bullet.x < 0 ||
      bullet.x > canvas.width ||
      bullet.z < 0 ||
      bullet.z > canvas.height
    ) {
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    const dist = Math.hypot(dx, dz);

    enemy.x += (dx / dist) * enemy.speed;
    enemy.z += (dz / dist) * enemy.speed;

    if (dist < player.radius + enemy.radius + 4) {
      state.hp -= 0.25;
    }

    for (let j = bullets.length - 1; j >= 0; j -= 1) {
      const bullet = bullets[j];
      const hitDist = Math.hypot(enemy.x - bullet.x, enemy.z - bullet.z);
      if (hitDist < enemy.radius + 5) {
        enemy.hp -= 10;
        bullets.splice(j, 1);
        if (enemy.hp <= 0) {
          enemies.splice(i, 1);
          state.score += 100;
          break;
        }
      }
    }
  }
}

function drawGround() {
  const horizon = 170;
  ctx.fillStyle = "#6d8f77";
  ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  ctx.fillStyle = "#7a96be";
  ctx.fillRect(0, 0, canvas.width, horizon);

  ctx.strokeStyle = "#4f604e";
  ctx.lineWidth = 1;
  for (let z = horizon; z < canvas.height; z += 20) {
    ctx.beginPath();
    ctx.moveTo(0, z);
    ctx.lineTo(canvas.width, z);
    ctx.stroke();
  }

  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(canvas.width / 2 + (x - canvas.width / 2) * 1.8, canvas.height);
    ctx.stroke();
  }
}

function drawTankLikeActor(x, z, color, facing) {
  const bodyScale = 0.65 + (z - 140) / 520;
  const width = 40 * bodyScale;
  const height = 25 * bodyScale;

  ctx.save();
  ctx.translate(x, z);
  ctx.rotate(facing);

  ctx.fillStyle = "#111";
  ctx.fillRect(-width / 2 + 2, -height / 2 + 2, width, height);

  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  ctx.fillStyle = "#242424";
  ctx.fillRect(-width * 0.08, -height * 0.9, width * 0.16, height * 0.7);

  ctx.strokeStyle = "#161616";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.8);
  ctx.lineTo(0, -height * 1.7);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();

  enemies
    .slice()
    .sort((a, b) => a.z - b.z)
    .forEach((enemy) => {
      const facing = Math.atan2(player.z - enemy.z, player.x - enemy.x) + Math.PI / 2;
      drawTankLikeActor(enemy.x, enemy.z, "#8b6a49", facing);
    });

  bullets.forEach((bullet) => {
    ctx.fillStyle = "#ffd45a";
    ctx.fillRect(bullet.x - 2, bullet.z - 2, 4, 4);
  });

  drawTankLikeActor(player.x, player.z, "#4f6f40", player.angle + Math.PI / 2);

  const crossY = canvas.height / 2 + 20;
  ctx.strokeStyle = "#d7ece0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 8, crossY);
  ctx.lineTo(canvas.width / 2 + 8, crossY);
  ctx.moveTo(canvas.width / 2, crossY - 8);
  ctx.lineTo(canvas.width / 2, crossY + 8);
  ctx.stroke();

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff7a7a";
    ctx.font = "bold 48px monospace";
    ctx.fillText("MISSION FAILED", 280, 245);
    ctx.fillStyle = "#f6f6f6";
    ctx.font = "20px monospace";
    ctx.fillText("Rキーで再スタート", 360, 290);
  }
}

function tick() {
  if (!state.gameOver) {
    updatePlayer();
    updateBullets();
    updateEnemies();

    if (state.reloadTimer > 0) {
      state.reloadTimer -= 1;
      if (state.reloadTimer === 0) state.ammo = 30;
    }

    if (enemies.length === 0) {
      state.wave += 1;
      spawnWave();
    }

    if (state.hp <= 0) {
      state.hp = 0;
      state.gameOver = true;
    }
  }

  hpLabel.textContent = `HP: ${Math.round(state.hp)}`;
  ammoLabel.textContent =
    state.reloadTimer > 0 ? `Ammo: RELOAD ${Math.ceil(state.reloadTimer / 20)}` : `Ammo: ${state.ammo}`;
  scoreLabel.textContent = `Score: ${state.score}`;
  waveLabel.textContent = `Wave: ${state.wave}`;

  draw();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (event.code === "Space") {
    event.preventDefault();
    fire();
  }

  if (key === "r" && state.gameOver) {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

resetGame();
tick();
