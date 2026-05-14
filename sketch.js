let particles = [];
let particleCount = 320;

let pointerX = 0;
let pointerY = 0;
let hasPointer = false;

let isGathering = false;
let gatherTimer = 0;

function setup() {
  const container = document.getElementById("canvas-container");

  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(container);

  pixelDensity(1);

  pointerX = width / 2;
  pointerY = height / 2;

  createParticles();

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { passive: false });
}

function draw() {
  background(2, 6, 17, 38);

  if (isGathering) {
    gatherTimer--;

    if (gatherTimer <= 0) {
      isGathering = false;
    }
  }

  drawConnectionLines();

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].display();
  }

  drawPointerGlow();
}

function createParticles() {
  particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function handlePointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  hasPointer = true;

  if (!event.buttons) {
    isGathering = false;
  }
}

function handlePointerDown(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  hasPointer = true;

  isGathering = true;
  gatherTimer = 95;

  for (let i = 0; i < particles.length; i++) {
    particles[i].burst();
  }
}

function handlePointerUp() {
  gatherTimer = 45;
}

class Particle {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D().mult(random(0.4, 2.0));
    this.acceleration = createVector(0, 0);

    this.size = random(2, 5);
    this.maxSpeed = random(3.2, 6.5);
    this.noiseSeed = random(1000);

    this.blueAlpha = random(130, 230);
  }

  update() {
    const target = createVector(pointerX, pointerY);

    if (isGathering) {
      this.gatherTo(target);
    } else {
      this.followPointer(target);
      this.flowField();
    }

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    this.wrapAroundEdges();
  }

  followPointer(target) {
    const desired = p5.Vector.sub(target, this.position);
    const distance = desired.mag();

    if (distance > 1) {
      desired.normalize();

      let strength = map(distance, 0, 700, 0.015, 0.32);
      strength = constrain(strength, 0.015, 0.32);

      desired.mult(strength);
      this.acceleration.add(desired);
    }
  }

  gatherTo(target) {
    const desired = p5.Vector.sub(target, this.position);
    const distance = desired.mag();

    if (distance > 1) {
      desired.normalize();

      let strength = map(distance, 0, width, 0.45, 2.4);
      strength = constrain(strength, 0.45, 2.4);

      desired.mult(strength);
      this.acceleration.add(desired);
    }

    this.velocity.mult(0.96);
  }

  flowField() {
    const angle = noise(
      this.position.x * 0.004,
      this.position.y * 0.004,
      frameCount * 0.006 + this.noiseSeed
    ) * TWO_PI * 4;

    const force = createVector(cos(angle), sin(angle));
    force.mult(0.13);

    this.acceleration.add(force);
  }

  burst() {
    const randomForce = p5.Vector.random2D();
    randomForce.mult(random(0.4, 1.2));
    this.velocity.add(randomForce);
  }

  display() {
    noStroke();

    if (isGathering) {
      // 点击时：白色粒子
      fill(255, 255, 255, 225);
      circle(this.position.x, this.position.y, this.size * 1.7);

      fill(255, 255, 255, 38);
      circle(this.position.x, this.position.y, this.size * 6);
    } else {
      // 平时：蓝色粒子
      fill(55, 175, 255, this.blueAlpha);
      circle(this.position.x, this.position.y, this.size);

      fill(55, 175, 255, 34);
      circle(this.position.x, this.position.y, this.size * 5.5);
    }
  }

  wrapAroundEdges() {
    if (this.position.x < -20) {
      this.position.x = width + 20;
    }

    if (this.position.x > width + 20) {
      this.position.x = -20;
    }

    if (this.position.y < -20) {
      this.position.y = height + 20;
    }

    if (this.position.y > height + 20) {
      this.position.y = -20;
    }
  }
}

function drawPointerGlow() {
  if (!hasPointer) return;

  noStroke();

  if (isGathering) {
    fill(255, 255, 255, 45);
    circle(pointerX, pointerY, 150);

    fill(255, 255, 255, 90);
    circle(pointerX, pointerY, 36);
  } else {
    fill(55, 175, 255, 35);
    circle(pointerX, pointerY, 180);

    fill(55, 175, 255, 115);
    circle(pointerX, pointerY, 22);
  }
}

function drawConnectionLines() {
  if (!hasPointer) return;

  strokeWeight(1);

  for (let i = 0; i < particles.length; i += 4) {
    const p = particles[i];
    const distance = dist(p.position.x, p.position.y, pointerX, pointerY);

    if (distance < 180) {
      if (isGathering) {
        stroke(255, 255, 255, map(distance, 0, 180, 90, 0));
      } else {
        stroke(55, 175, 255, map(distance, 0, 180, 70, 0));
      }

      line(p.position.x, p.position.y, pointerX, pointerY);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (particles.length === 0) {
    createParticles();
  }
}
