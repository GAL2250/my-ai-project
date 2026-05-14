let particles = [];

const MAX_PARTICLES = 150;
const PARTICLE_LIFE = 180; // 约 3 秒，60fps 下 180 帧
const SPAWN_DISTANCE = 6;

let pointerX = 0;
let pointerY = 0;
let previousPointerX = 0;
let previousPointerY = 0;

let hasPointer = false;
let lastMoveFrame = -9999;

let clickGather = false;
let clickGatherTimer = 0;

function setup() {
  const status = document.getElementById("debug-status");
  if (status) {
    status.textContent = "generative field active";
  }

  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(windowWidth, windowHeight);

  if (container) {
    canvas.parent(container);
  }

  canvas.style("position", "fixed");
  canvas.style("left", "0");
  canvas.style("top", "0");
  canvas.style("z-index", "9999");
  canvas.style("pointer-events", "none");

  pixelDensity(1);

  pointerX = width / 2;
  pointerY = height / 2;
  previousPointerX = pointerX;
  previousPointerY = pointerY;

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);
}

function draw() {
  // 透明清屏，让粒子叠在网页上，不再生成大面积背景雾团
  clear();

  if (clickGather) {
    clickGatherTimer--;

    if (clickGatherTimer <= 0) {
      clickGather = false;
    }
  }

  updateParticles();
  drawParticles();
}

function handlePointerMove(event) {
  const newX = event.clientX;
  const newY = event.clientY;

  if (!hasPointer) {
    pointerX = newX;
    pointerY = newY;
    previousPointerX = newX;
    previousPointerY = newY;
    hasPointer = true;
  }

  const movement = dist(newX, newY, pointerX, pointerY);

  previousPointerX = pointerX;
  previousPointerY = pointerY;

  pointerX = newX;
  pointerY = newY;

  if (movement > SPAWN_DISTANCE) {
    lastMoveFrame = frameCount;
    spawnParticlesAlongPath(previousPointerX, previousPointerY, pointerX, pointerY);
  }

  // 鼠标移动时回到蓝色状态
  if (event.buttons === 0) {
    clickGather = false;
  }
}

function handlePointerDown(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  hasPointer = true;

  clickGather = true;
  clickGatherTimer = 55;

  // 点击时只影响现有粒子，不额外制造大量爆炸粒子
  for (let p of particles) {
    p.turnWhite();
  }
}

function handlePointerUp() {
  clickGatherTimer = 25;
}

function spawnParticlesAlongPath(x1, y1, x2, y2) {
  const pathLength = dist(x1, y1, x2, y2);

  // 控制生成密度：移动越快，沿路径生成少量粒子
  const steps = constrain(floor(pathLength / 18), 1, 5);

  for (let i = 0; i < steps; i++) {
    const t = i / steps;

    const x = lerp(x1, x2, t) + random(-18, 18);
    const y = lerp(y1, y2, t) + random(-18, 18);

    // 每个点生成少量像素粒子
    const amount = 2;

    for (let j = 0; j < amount; j++) {
      particles.push(new Particle(x, y));
    }
  }

  // 限制总数，避免页面变乱
  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.update();

    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  noStroke();

  for (let p of particles) {
    p.draw();
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.vx = random(-0.55, 0.55);
    this.vy = random(-0.55, 0.55);

    this.size = random(1.1, 2.2);

    this.age = 0;
    this.life = PARTICLE_LIFE + random(-30, 25);

    this.seed = random(1000);

    this.isWhite = false;
    this.whiteTimer = 0;

    this.history = [];
    this.maxHistory = floor(random(5, 9));
  }

  update() {
    this.age++;

    // 保存历史位置，形成细微拖影
    this.history.push({
      x: this.x,
      y: this.y
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (clickGather) {
      this.gatherToPointer();
    } else {
      this.drift();
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.whiteTimer > 0) {
      this.whiteTimer--;
    } else {
      this.isWhite = false;
    }
  }

  drift() {
    // 轻微噪声漂移，让它像生成式像素场，而不是普通鼠标尾迹
    const angle = noise(
      this.x * 0.008,
      this.y * 0.008,
      frameCount * 0.01 + this.seed
    ) * TWO_PI * 2;

    this.vx += cos(angle) * 0.025;
    this.vy += sin(angle) * 0.025;

    // 缓慢阻尼，保持高级感
    this.vx *= 0.975;
    this.vy *= 0.975;
  }

  gatherToPointer() {
    const dx = pointerX - this.x;
    const dy = pointerY - this.y;
    const d = sqrt(dx * dx + dy * dy) || 1;

    // 只做轻微聚拢，不要形成一大团
    const force = map(d, 0, 500, 0.015, 0.18);
    const limitedForce = constrain(force, 0.015, 0.18);

    this.vx += (dx / d) * limitedForce;
    this.vy += (dy / d) * limitedForce;

    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  turnWhite() {
    this.isWhite = true;
    this.whiteTimer = 70;
  }

  draw() {
    const lifeRatio = 1 - this.age / this.life;
    const alpha = constrain(lifeRatio, 0, 1);

    // 画拖影：不是线，而是逐渐消失的小像素点
    for (let i = 0; i < this.history.length; i++) {
      const h = this.history[i];
      const trailRatio = i / this.history.length;
      const trailAlpha = alpha * trailRatio * 70;

      if (this.isWhite || clickGather) {
        fill(255, 255, 255, trailAlpha);
      } else {
        fill(80, 175, 255, trailAlpha);
      }

      rect(h.x, h.y, this.size, this.size);
    }

    // 主像素点
    if (this.isWhite || clickGather) {
      fill(255, 255, 255, alpha * 210);
    } else {
      fill(85, 180, 255, alpha * 190);
    }

    rect(this.x, this.y, this.size, this.size);
  }

  isDead() {
    return this.age >= this.life;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
