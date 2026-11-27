// The game's rules and state, with no drawing and no browser in it: the
// turkey, the farmer's gap, the pool of hazards and pickups, spawning,
// collisions, score, lives, distance and stages. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.

import {
  COURSE_FEET, FARMER, FIELD, LIVES, POOL_SIZE, SCORE, SPAWN, STEP, TURKEY, TURKEY_X,
} from './config.js';
import { STAGES, stageAt } from './levels.js';
import { createFarmer } from './farmer.js';
import { pickWeighted } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_GOLDEN = 4;
export const EVENT_OVER = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_STAGE = 32;
export const EVENT_HIDE = 64;
export const EVENT_LUNGE_WARN = 128;
export const EVENT_CAUGHT = 256;
export const EVENT_FEATHER = 512;
export const EVENT_STUMBLE = 1024;
export const EVENT_DASH = 2048;

/** Pixels of scroll that make one foot of the escape. */
const PX_PER_FOOT = 16;
/** How far ahead of the turkey a falling knife may aim. */
const KNIFE_SPREAD = 260;
/** How long a knife hangs in the air before it drops (its telegraph). */
const KNIFE_HANG = 0.55;
/** How far from the turkey's x a knife may aim while the turkey is airborne. */
const KNIFE_AIR_OFFSET = 130;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const turkey = {
    x: TURKEY_X,
    y: FIELD.groundY - TURKEY.height,
    width: TURKEY.width,
    height: TURKEY.height,
    vy: 0,
    onGround: true,
    ducking: false,
    dashTime: 0,
    dashCooldown: 0,
    invulnerable: 0,
    /** Seconds of mud slowing the turkey right now. */
    inMud: false,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false, kind: '', x: 0, y: 0, width: 0, height: 0,
      fallSpeed: 0, hang: 0, scored: false, anchored: false,
    });
  }
  const particles = [];
  for (let index = 0; index < 64; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, kind: '' });
  }
  const farmer = createFarmer();
  const state = {
    turkey, items, particles, farmer: farmer.farmer,
    score: 0, scoreFloat: 0, lives: LIVES, distance: 0, stage: 0,
    elapsed: 0, over: false, escaped: false, caught: false,
    hidden: false, stageBanner: 0, shake: 0,
    /** Seconds until the next hazard of each kind may spawn. */
    timers: {},
    dustTimer: 0,
  };

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.onGround = true;
    turkey.ducking = false;
    turkey.dashTime = 0;
    turkey.dashCooldown = 0;
    turkey.invulnerable = 0;
    turkey.inMud = false;
    for (const item of items) {
      item.active = false;
      item.anchored = false;
    }
    for (const particle of particles) particle.active = false;
    farmer.reset();
    state.score = 0;
    state.scoreFloat = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.stage = 0;
    state.elapsed = 0;
    state.over = false;
    state.escaped = false;
    state.caught = false;
    state.hidden = false;
    state.stageBanner = 0;
    state.shake = 0;
    state.timers = {
      hazard: 1.4, corn: 0.8, goldenCorn: 7.0, feather: 18.0,
    };
    state.dustTimer = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) {
      if (!particles[index].active) return particles[index];
    }
    return null;
  }

  function puff(x, y, kind, count, spread) {
    for (let index = 0; index < count; index += 1) {
      const particle = freeParticle();
      if (particle === null) return;
      particle.active = true;
      particle.kind = kind;
      particle.x = x;
      particle.y = y;
      particle.vx = (random() - 0.5) * spread;
      particle.vy = -random() * spread * 0.7;
      particle.life = 0.4 + random() * 0.4;
    }
  }

  function scrollSpeed() {
    let speed = TURKEY.runSpeed + TURKEY.speedPerStage * state.stage;
    if (turkey.inMud) speed *= 0.55;
    if (turkey.dashTime > 0) speed += TURKEY.dashSpeed;
    return speed;
  }

  function spawnTimer(kind) {
    const spec = SPAWN[kind];
    const scale = spec.perStage ** state.stage;
    return spec.base * scale * (0.75 + random() * 0.5);
  }

  function spawnGround(kind, width, height) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = width;
    item.height = height;
    item.x = FIELD.width + 40 + random() * 120;
    item.y = FIELD.groundY - height;
    item.fallSpeed = 0;
    item.hang = 0;
    item.scored = false;
    item.anchored = false;
  }

  function spawnHazard() {
    const stage = STAGES[state.stage];
    const kind = pickWeighted(random, stage.hazards.map((hazard) => [hazard.weight, hazard.kind]));
    if (kind === 'fence') spawnGround('fence', 26, 46);
    else if (kind === 'bale') spawnGround('bale', 64, 56);
    else if (kind === 'mud') spawnGround('mud', 130, 14);
    else if (kind === 'pumpkin') spawnGround('pumpkin', 46, 44);
    else if (kind === 'oven') spawnGround('oven', 96, 88);
    else if (kind === 'knife') {
      const item = freeItem();
      if (item === null) return;
      item.active = true;
      item.kind = 'knife';
      item.width = 34;
      item.height = 74;
      // A knife never drops straight onto an airborne turkey: while the
      // turkey is jumping it aims well clear, so a jump over a fence cannot
      // end with a knife in the turkey's face.
      const aim = turkey.onGround
        ? TURKEY_X + (random() - 0.5) * KNIFE_SPREAD * 2
        : TURKEY_X + (random() < 0.5 ? -1 : 1) * (KNIFE_AIR_OFFSET + random() * 160);
      item.x = Math.min(FIELD.width - 40, Math.max(60, aim));
      item.y = -item.height;
      item.fallSpeed = 580 + state.stage * 70;
      item.hang = KNIFE_HANG;
      item.scored = false;
      item.anchored = false;
    }
  }

  function spawnCornArc(golden) {
    const count = golden ? 1 : 3 + Math.floor(random() * 3);
    const baseX = FIELD.width + 40;
    for (let index = 0; index < count; index += 1) {
      const item = freeItem();
      if (item === null) return;
      item.active = true;
      item.kind = golden ? 'golden' : 'corn';
      item.width = golden ? 34 : 26;
      item.height = golden ? 34 : 26;
      item.x = baseX + index * 44;
      item.y = FIELD.groundY - 90 - (index % 2) * 44 - random() * 30;
      item.fallSpeed = 0;
      item.hang = 0;
      item.scored = false;
      item.anchored = false;
    }
  }

  function spawnFeather() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = 'feather';
    item.width = 30;
    item.height = 30;
    item.x = FIELD.width + 40;
    item.y = FIELD.groundY - 170 - random() * 60;
    item.fallSpeed = 0;
    item.hang = 0;
    item.scored = false;
    item.anchored = false;
  }

  function hitTurkey(events) {
    state.lives -= 1;
    turkey.invulnerable = TURKEY.invulnerable;
    farmer.closeIn(FARMER.hitCost);
    state.shake = 0.35;
    puff(turkey.x + turkey.width / 2, turkey.y + 10, 'feather', 10, 260);
    farmer.say('GOTCHA, DINNER!', 1.0);
    events |= EVENT_HIT;
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function stumble(events) {
    farmer.closeIn(FARMER.stumbleCost);
    state.shake = 0.2;
    turkey.invulnerable = Math.max(turkey.invulnerable, 0.8);
    farmer.say('HEY!', 0.7);
    return events | EVENT_STUMBLE;
  }

  /**
   * One fixed step. `controls` is { jump, dash, duck } (edge flags for jump
   * and dash, held state for duck), or null for the title screen's backdrop,
   * where the turkey runs itself and nothing can hurt it.
   */
  function step(dt, controls) {
    if (state.over) return 0;
    let events = 0;
    const harmless = controls === null;
    state.elapsed += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    const speed = scrollSpeed();
    const newStage = stageAt(state.distance);
    if (newStage !== state.stage) {
      state.stage = newStage;
      state.score += SCORE.stageClear;
      state.stageBanner = 2.4;
      events |= EVENT_STAGE;
    }
    if (state.stageBanner > 0) state.stageBanner -= dt;

    // --- the turkey ---
    if (!harmless) {
      turkey.ducking = controls.duck && turkey.onGround;
      if (controls.jump && turkey.onGround && !turkey.ducking) {
        turkey.vy = -TURKEY.jumpVelocity;
        turkey.onGround = false;
      }
      if (controls.dash && turkey.dashCooldown <= 0) {
        turkey.dashTime = TURKEY.dashTime;
        turkey.dashCooldown = TURKEY.dashCooldown;
        farmer.fallBack(50);
        events |= EVENT_DASH;
      }
    } else if (turkey.onGround) {
      // The title backdrop runs itself: hop over whatever is coming.
      for (const item of items) {
        if (!item.active || item.kind === 'corn' || item.kind === 'golden' || item.kind === 'feather') continue;
        if (item.kind === 'knife' || item.kind === 'mud') continue;
        if (item.x > turkey.x && item.x < turkey.x + 150) {
          turkey.vy = -TURKEY.jumpVelocity;
          turkey.onGround = false;
          break;
        }
      }
    }
    if (turkey.dashTime > 0) turkey.dashTime -= dt;
    if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);

    if (!turkey.onGround) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - turkey.height) {
        turkey.y = FIELD.groundY - turkey.height;
        turkey.vy = 0;
        turkey.onGround = true;
      }
    }
    // Ducking squashes the turkey's hitbox.
    turkey.height = turkey.ducking ? 34 : TURKEY.height;
    if (turkey.onGround) turkey.y = FIELD.groundY - turkey.height;

    // Dust while running on the ground.
    if (turkey.onGround && !state.hidden) {
      state.dustTimer -= dt;
      if (state.dustTimer <= 0) {
        state.dustTimer = 0.09;
        puff(turkey.x + 8, FIELD.groundY - 4, 'dust', 1, 60);
      }
    }

    // --- hiding: ducking behind a hay bale anchors it and pauses the run ---
    let hiding = false;
    if (!harmless && turkey.ducking) {
      for (const item of items) {
        if (!item.active || item.kind !== 'bale') continue;
        if (overlaps(turkey, item)) {
          hiding = true;
          item.anchored = true;
          break;
        }
      }
    }
    if (hiding && !state.hidden) {
      state.score += SCORE.hide;
      events |= EVENT_HIDE;
    }
    state.hidden = hiding;
    if (!hiding) {
      for (const item of items) item.anchored = false;
    }

    // --- distance: the run only advances while the turkey is not hiding ---
    if (!harmless && !state.hidden) {
      const feet = (speed * dt) / PX_PER_FOOT;
      state.distance += feet;
      // Score accrues a fraction of a point per step: bank the fraction and
      // pay out whole points, so slow steps never round the score to zero.
      state.scoreFloat += feet * SCORE.perFoot;
      const whole = Math.floor(state.scoreFloat);
      state.score += whole;
      state.scoreFloat -= whole;
      if (state.distance >= COURSE_FEET) {
        state.distance = COURSE_FEET;
        state.escaped = true;
        state.over = true;
        return events | EVENT_ESCAPED;
      }
    }

    // --- the farmer ---
    const farmerEvent = farmer.step(state.hidden, STAGES[state.stage].farmerLunges);
    if (farmerEvent === 'caught') {
      state.caught = true;
      state.over = true;
      return events | EVENT_CAUGHT | EVENT_OVER;
    }
    if (farmerEvent === 'found') {
      farmer.closeIn(FARMER.lungeCost);
      events |= EVENT_STUMBLE;
    }
    if (farmerEvent === 'lunge-warn') events |= EVENT_LUNGE_WARN;

    // --- spawning: one hazard at a time, paced by the stage ---
    state.timers.hazard -= dt;
    if (state.timers.hazard <= 0) {
      state.timers.hazard = (2.0 * 0.88 ** state.stage) * (0.75 + random() * 0.5);
      spawnHazard();
    }
    state.timers.corn -= dt;
    if (state.timers.corn <= 0) {
      state.timers.corn = spawnTimer('corn');
      spawnCornArc(false);
    }
    state.timers.goldenCorn -= dt;
    if (state.timers.goldenCorn <= 0) {
      state.timers.goldenCorn = spawnTimer('goldenCorn');
      spawnCornArc(true);
    }
    state.timers.feather -= dt;
    if (state.timers.feather <= 0) {
      state.timers.feather = spawnTimer('feather');
      spawnFeather();
    }

    // --- move everything, then collide ---
    turkey.inMud = false;
    for (const item of items) {
      if (!item.active) continue;
      if (item.anchored) continue;
      if (item.kind === 'knife') {
        if (item.hang > 0) {
          item.hang -= dt;
        } else {
          item.y += item.fallSpeed * dt;
        }
        if (item.y > FIELD.groundY) {
          item.active = false;
          if (!harmless && !item.scored) {
            state.score += SCORE.dodge;
            farmer.fallBack(8);
            item.scored = true;
          }
        }
      } else {
        item.x -= speed * dt;
        if (item.x + item.width < -40) {
          const wasHazard = item.kind !== 'corn' && item.kind !== 'golden' && item.kind !== 'feather';
          item.active = false;
          if (!harmless && wasHazard && !item.scored) {
            state.score += SCORE.dodge;
            farmer.fallBack(8);
            item.scored = true;
          }
          continue;
        }
      }
      if (harmless) continue;
      if (!overlaps(item, turkey)) continue;
      if (item.kind === 'corn') {
        item.active = false;
        state.score += SCORE.corn;
        events |= EVENT_CORN;
        puff(item.x + 13, item.y + 13, 'corn', 4, 120);
      } else if (item.kind === 'golden') {
        item.active = false;
        state.score += SCORE.goldenCorn;
        events |= EVENT_GOLDEN;
        puff(item.x + 17, item.y + 17, 'corn', 8, 160);
      } else if (item.kind === 'feather') {
        item.active = false;
        state.lives = Math.min(LIVES, state.lives + 1);
        state.score += SCORE.feather;
        events |= EVENT_FEATHER;
        puff(item.x + 15, item.y + 15, 'feather', 6, 140);
      } else if (item.kind === 'mud') {
        turkey.inMud = true;
      } else if (item.kind === 'bale') {
        if (state.hidden) continue;
        item.active = false;
        if (turkey.invulnerable === 0) events = stumble(events);
      } else if (turkey.invulnerable === 0 && turkey.dashTime <= 0) {
        // Fence, pumpkin, oven and knife all cost a life.
        item.active = false;
        events = hitTurkey(events);
        if (state.over) return events;
      } else if (turkey.dashTime > 0) {
        // A dash smashes straight through a hazard.
        item.active = false;
        state.score += SCORE.dodge;
        puff(item.x + item.width / 2, item.y + item.height / 2, 'feather', 5, 200);
      }
    }

    // Mud drags the farmer closer while the turkey wades through it.
    if (turkey.inMud && !harmless) farmer.closeIn(26 * dt);

    // --- particles ---
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 320 * dt;
      particle.x -= speed * dt * 0.6;
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
