// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. Everything
// is drawn with canvas shapes in a coherent autumn palette: the turkey,
// the farmer, the farmyard, the barn and the kitchen, the HUD and the
// panels. Text that holds a number is rebuilt only when the number changes,
// so a frame allocates nothing.

import { COURSE_FEET, FIELD, FONT, LIVES, PALETTE, TURKEY, TURKEY_X } from './config.js';
import { STAGES } from './levels.js';
import { FARMER_CHASE, FARMER_LUNGE, FARMER_LUNGE_WARN, FARMER_SEARCH } from './farmer.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ESCAPED = 'escaped';

/** The panel's width; its height grows with its lines. */
const PANEL = { width: 660, top: 150, line: 34, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const distanceLabel = cachedLabel('FREEDOM ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    // The caller sets textBaseline: HUD text uses 'top', panels 'alphabetic'.
    context.fillText(value, x, y);
  }

  // ---------- scenery ----------

  function drawSky(stage) {
    context.fillStyle = PALETTE[STAGES[stage].sky];
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // A low autumn sun and a few drifting clouds.
    context.fillStyle = '#ffe9a8';
    context.beginPath();
    context.arc(1050, 110, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 243, 214, 0.85)';
    for (const cloud of [{ x: 180, y: 90 }, { x: 560, y: 60 }, { x: 880, y: 150 }]) {
      context.beginPath();
      context.ellipse(cloud.x, cloud.y, 70, 18, 0, 0, Math.PI * 2);
      context.ellipse(cloud.x + 40, cloud.y + 6, 50, 14, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Birds heading somewhere warmer, and rolling hills on the horizon.
    context.strokeStyle = 'rgba(90, 50, 20, 0.8)';
    context.lineWidth = 3;
    for (const bird of [{ x: 420, y: 200 }, { x: 470, y: 180 }, { x: 700, y: 240 }]) {
      context.beginPath();
      context.moveTo(bird.x - 12, bird.y);
      context.quadraticCurveTo(bird.x, bird.y - 8, bird.x + 12, bird.y);
      context.stroke();
    }
    context.fillStyle = '#d98a3d';
    context.beginPath();
    context.ellipse(240, FIELD.groundY + 10, 420, 90, 0, Math.PI, 0);
    context.fill();
    context.fillStyle = '#c97a30';
    context.beginPath();
    context.ellipse(1020, FIELD.groundY + 10, 460, 110, 0, Math.PI, 0);
    context.fill();
  }

  function drawGround(stage, elapsed) {
    context.fillStyle = PALETTE[STAGES[stage].ground];
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
    // Scrolling fence posts and tufts, for a sense of speed.
    const speed = TURKEY.runSpeed + TURKEY.speedPerStage * stage;
    const offset = (elapsed * speed) % 160;
    context.fillStyle = PALETTE.fence;
    for (let x = -offset; x < FIELD.width; x += 160) {
      context.fillRect(x, FIELD.groundY - 34, 8, 34);
      context.fillRect(x + 8, FIELD.groundY - 30, 44, 5);
      context.fillRect(x + 8, FIELD.groundY - 18, 44, 5);
    }
    // Grass tufts and pebbles scrolling past on the ground.
    const tuftOffset = (elapsed * speed) % 130;
    context.strokeStyle = '#5d3a1c';
    context.lineWidth = 3;
    for (let x = -tuftOffset; x < FIELD.width; x += 130) {
      context.beginPath();
      context.moveTo(x, FIELD.groundY + 40);
      context.lineTo(x + 4, FIELD.groundY + 28);
      context.moveTo(x + 10, FIELD.groundY + 40);
      context.lineTo(x + 12, FIELD.groundY + 30);
      context.stroke();
    }
    context.fillStyle = '#4a2c1e';
    const pebbleOffset = (elapsed * speed) % 210;
    for (let x = -pebbleOffset; x < FIELD.width; x += 210) {
      context.beginPath();
      context.ellipse(x + 60, FIELD.groundY + 70, 8, 4, 0, 0, Math.PI * 2);
      context.fill();
    }
    if (stage === STAGE_KITCHEN_INDEX) {
      // Kitchen tiles along the bottom of the screen.
      context.fillStyle = '#6b4a35';
      for (let x = 0; x < FIELD.width; x += 80) {
        context.fillRect(x, FIELD.height - 24, 78, 24);
      }
    }
  }

  const STAGE_KITCHEN_INDEX = 2;

  function drawBackdrop(stage, elapsed) {
    drawSky(stage);
    if (stage === 0) {
      // A red barn and a pumpkin patch on the horizon.
      context.fillStyle = '#a83c22';
      context.fillRect(80, 420, 220, 200);
      context.beginPath();
      context.moveTo(60, 420);
      context.lineTo(190, 330);
      context.lineTo(320, 420);
      context.closePath();
      context.fillStyle = '#7a2a16';
      context.fill();
      context.fillStyle = '#f5efe0';
      context.fillRect(165, 480, 50, 70);
      context.fillStyle = PALETTE.pumpkin;
      for (const px of [900, 960, 1030, 1100]) {
        context.beginPath();
        context.arc(px, FIELD.groundY - 14, 20, 0, Math.PI * 2);
        context.fill();
      }
    } else if (stage === 1) {
      // Inside the barn: beams, hanging lanterns, stacked hay.
      context.fillStyle = '#3a2415';
      context.fillRect(0, 0, FIELD.width, 60);
      context.fillRect(0, 120, FIELD.width, 26);
      for (const bx of [140, 420, 700, 980]) {
        context.fillRect(bx, 0, 22, FIELD.groundY);
      }
      context.fillStyle = '#ffcf6e';
      for (const lx of [260, 620, 980]) {
        context.beginPath();
        context.arc(lx, 200, 16, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = PALETTE.hay;
      context.fillRect(60, FIELD.groundY - 90, 130, 90);
      context.fillRect(1120, FIELD.groundY - 70, 110, 70);
    } else {
      // The kitchen: checkered wall, a window, the dreaded oven row.
      context.fillStyle = '#c9a06a';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.fillStyle = '#b98d58';
      for (let y = 0; y < FIELD.groundY; y += 64) {
        for (let x = ((y / 64) % 2) * 32; x < FIELD.width; x += 64) {
          context.fillRect(x, y, 32, 32);
        }
      }
      context.fillStyle = '#7fb3d5';
      context.fillRect(520, 80, 240, 180);
      context.fillStyle = '#f5efe0';
      context.fillRect(632, 80, 16, 180);
      context.fillRect(520, 160, 240, 16);
      context.fillStyle = '#5d3a1c';
      context.fillRect(80, 300, 300, 18);
      context.fillStyle = '#e5534b';
      context.beginPath();
      context.arc(120, 280, 16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.pumpkin;
      context.beginPath();
      context.arc(340, 282, 18, 0, Math.PI * 2);
      context.fill();
    }
    drawGround(stage, elapsed);
  }

  // ---------- actors ----------

  /** The turkey: a plump brown body, a fan of autumn tail feathers, a head with a red wattle. */
  function drawTurkey(state) {
    const turkey = state.turkey;
    const cx = turkey.x + turkey.width / 2;
    const base = turkey.y + turkey.height;
    const running = turkey.onGround && !state.hidden;
    const bob = running ? Math.sin(state.elapsed * 18) * 3 : 0;
    const legSwing = running ? Math.sin(state.elapsed * 18) * 10 : 0;

    // Faint while invulnerable after a hit: the turkey stays clearly visible, just ghosted.
    const ghosted = turkey.invulnerable > 0 && Math.floor(turkey.invulnerable * 10) % 2 === 0;
    context.globalAlpha = ghosted ? 0.6 : 1;

    // Legs.
    context.strokeStyle = '#f2a93b';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(cx - 8, base - 4);
    context.lineTo(cx - 8 + legSwing, base + 8);
    context.moveTo(cx + 8, base - 4);
    context.lineTo(cx + 8 - legSwing, base + 8);
    context.stroke();

    // Tail fan: four autumn feathers.
    for (let index = 0; index < 4; index += 1) {
      context.fillStyle = PALETTE.tail[index];
      context.beginPath();
      context.arc(cx - 18, base - 14 + bob, 30 - index * 4, Math.PI * 0.9, Math.PI * 1.9);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx, base - 22 + bob, 30, 24, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = PALETTE.turkeyWing;
    context.beginPath();
    context.ellipse(cx - 4, base - 20 + bob, 16, 12, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle and snood.
    const headY = base - 52 + bob;
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(cx + 22, headY, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 32, headY - 2);
    context.lineTo(cx + 46, headY + 3);
    context.lineTo(cx + 32, headY + 7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.arc(cx + 26, headY + 12, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.snood;
    context.fillRect(cx + 30, headY - 14, 4, 10);
    // A determined eye.
    context.fillStyle = '#241610';
    context.beginPath();
    context.arc(cx + 26, headY - 3, 2.5, 0, Math.PI * 2);
    context.fill();

    if (state.hidden) {
      text('...', cx, base - 78, 26, PALETTE.text, 'center');
    } else if (turkey.dashTime > 0) {
      context.fillStyle = 'rgba(255, 243, 214, 0.5)';
      context.beginPath();
      context.ellipse(cx - 40, base - 24, 34, 16, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  /** The farmer: overalls, a straw hat, and a very determined walk. */
  function drawFarmer(state) {
    const farmer = state.farmer;
    const x = TURKEY_X - farmer.gap - 70;
    if (x < -90) return;
    const base = FIELD.groundY;
    const walk = Math.sin(state.elapsed * 12) * 6;
    const lunging = farmer.state === FARMER_LUNGE || farmer.state === FARMER_LUNGE_WARN;

    // Legs mid-stride.
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(x + 30, base - 52);
    context.lineTo(x + 22 + walk, base);
    context.moveTo(x + 42, base - 52);
    context.lineTo(x + 50 - walk, base);
    context.stroke();
    // Body: shirt and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(x + 14, base - 96, 44, 46);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 14, base - 62, 44, 14);
    // An arm reaching forward (or both arms, when lunging).
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(x + 52, base - 88);
    context.lineTo(x + (lunging ? 92 : 72), base - (lunging ? 66 : 78));
    context.stroke();
    // Head and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(x + 36, base - 108, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(x + 36, base - 118, 30, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x + 20, base - 138, 32, 22);
    // A bristly moustache.
    context.fillStyle = '#7a5a34';
    context.fillRect(x + 42, base - 104, 16, 5);

    if (farmer.shout) {
      const words = farmer.shout;
      context.font = `bold 22px ${FONT}`;
      const width = context.measureText(words).width + 24;
      // The bubble goes to the right of the farmer — unless he is far left,
      // where the panel would cover it, in which case it goes to his left.
      const toLeft = x < 420;
      const bx = toLeft
        ? Math.max(8, x - width - 10)
        : Math.min(x + 10, FIELD.width - width - 10);
      const by = base - 178;
      context.fillStyle = '#fff3d6';
      context.beginPath();
      context.roundRect(bx, by, width, 36, 10);
      context.fill();
      context.beginPath();
      if (toLeft) {
        context.moveTo(bx + width - 20, by + 36);
        context.lineTo(bx + width - 34, by + 50);
        context.lineTo(bx + width - 40, by + 36);
      } else {
        context.moveTo(bx + 20, by + 36);
        context.lineTo(bx + 34, by + 50);
        context.lineTo(bx + 40, by + 36);
      }
      context.closePath();
      context.fill();
      context.fillStyle = '#241610';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(words, bx + width / 2, by + 19);
      context.textBaseline = 'alphabetic';
    }
    if (farmer.state === FARMER_LUNGE_WARN) {
      text('!', x + 36, base - 160, 44, PALETTE.danger, 'center');
    }
  }

  // ---------- hazards and pickups ----------

  function drawFence(item) {
    context.fillStyle = PALETTE.fence;
    context.fillRect(item.x, item.y, 6, item.height);
    context.fillRect(item.x + item.width - 6, item.y, 6, item.height);
    context.fillRect(item.x, item.y + 6, item.width, 6);
    context.fillRect(item.x, item.y + 22, item.width, 6);
    context.fillRect(item.x, item.y + 38, item.width, 6);
  }

  function drawBale(item) {
    context.fillStyle = PALETTE.hay;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.hayBand;
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2 - 8, item.height / 2 - 8, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(item.x + 8, item.y + item.height / 2);
    context.lineTo(item.x + item.width - 8, item.y + item.height / 2);
    context.stroke();
    if (item.anchored) {
      text('HIDING!', item.x + item.width / 2, item.y - 12, 20, PALETTE.good, 'center');
    }
  }

  function drawMud(item) {
    context.fillStyle = PALETTE.mud;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 243, 214, 0.25)';
    context.beginPath();
    context.ellipse(item.x + item.width * 0.3, item.y + item.height / 2, 14, 5, 0, 0, Math.PI * 2);
    context.ellipse(item.x + item.width * 0.65, item.y + item.height / 2 + 3, 10, 4, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawPumpkin(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.pumpkin;
    context.beginPath();
    context.ellipse(cx, cy, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#c25a10';
    context.lineWidth = 3;
    for (const dx of [-12, 0, 12]) {
      context.beginPath();
      context.ellipse(cx + dx, cy, 8, item.height / 2 - 4, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = PALETTE.pumpkinStem;
    context.fillRect(cx - 3, item.y - 6, 7, 10);
    // A grumpy carved face, because it is rolling at you.
    context.fillStyle = '#241610';
    context.beginPath();
    context.moveTo(cx - 12, cy - 6);
    context.lineTo(cx - 4, cy - 12);
    context.lineTo(cx - 4, cy - 4);
    context.closePath();
    context.moveTo(cx + 12, cy - 6);
    context.lineTo(cx + 4, cy - 12);
    context.lineTo(cx + 4, cy - 4);
    context.closePath();
    context.fill();
    context.fillRect(cx - 10, cy + 6, 20, 4);
  }

  /** A falling carving knife, point down, with a telegraph shadow on the ground. */
  function drawKnife(item) {
    if (item.hang > 0) {
      context.fillStyle = 'rgba(255, 90, 60, 0.5)';
      context.beginPath();
      context.ellipse(item.x + item.width / 2, FIELD.groundY + 4, item.width, 7, 0, 0, Math.PI * 2);
      context.fill();
      text('!', item.x + item.width / 2, item.y + item.height + 26, 30, PALETTE.danger, 'center');
    }
    const handle = item.height * 0.32;
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(item.x + item.width * 0.38, item.y, item.width * 0.24, handle);
    context.fillStyle = PALETTE.knife;
    context.beginPath();
    context.moveTo(item.x, item.y + handle);
    context.lineTo(item.x + item.width, item.y + handle);
    context.lineTo(item.x + item.width / 2, item.y + item.height);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.fillRect(item.x + item.width * 0.3, item.y + handle + 4, 3, item.height * 0.4);
  }

  /** The oven: a glowing, humming box the turkey must jump clean over. */
  function drawOven(item) {
    const glow = 0.55 + Math.sin(item.x * 0.05) * 0.15;
    context.fillStyle = `rgba(255, 122, 47, ${glow.toFixed(2)})`;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width * 0.75, item.height * 0.7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.oven;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = PALETTE.ovenDoor;
    context.fillRect(item.x + 10, item.y + 16, item.width - 20, item.height - 30);
    context.fillStyle = PALETTE.ovenGlow;
    context.fillRect(item.x + 18, item.y + 26, item.width - 36, 8);
    context.fillStyle = '#f5efe0';
    for (let knob = 0; knob < 3; knob += 1) {
      context.beginPath();
      context.arc(item.x + 26 + knob * 28, item.y + 10, 5, 0, Math.PI * 2);
      context.fill();
    }
    text('HOT!', item.x + item.width / 2, item.y - 10, 20, PALETTE.ovenGlow, 'center');
  }

  function drawCorn(item, golden) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = golden ? PALETTE.goldenCorn : PALETTE.corn;
    context.beginPath();
    context.ellipse(cx, cy, item.width / 2, item.height / 2, 0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(122, 74, 18, 0.6)';
    for (let row = -1; row <= 1; row += 1) {
      context.fillRect(cx - 8, cy + row * 7, 16, 2);
    }
    context.fillStyle = '#4a7a2f';
    context.beginPath();
    context.moveTo(cx - 8, cy + item.height / 2 - 2);
    context.lineTo(cx, cy + item.height / 2 + 12);
    context.lineTo(cx + 8, cy + item.height / 2 - 2);
    context.closePath();
    context.fill();
  }

  function drawFeather(item) {
    context.strokeStyle = PALETTE.feather;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(item.x + 15, item.y + 15, 8, 14, 0.5, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.feather;
    context.beginPath();
    context.ellipse(item.x + 15, item.y + 15, 6, 11, 0.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawItems(state) {
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === 'fence') drawFence(item);
      else if (item.kind === 'bale') drawBale(item);
      else if (item.kind === 'mud') drawMud(item);
      else if (item.kind === 'pumpkin') drawPumpkin(item);
      else if (item.kind === 'knife') drawKnife(item);
      else if (item.kind === 'oven') drawOven(item);
      else if (item.kind === 'corn') drawCorn(item, false);
      else if (item.kind === 'golden') drawCorn(item, true);
      else if (item.kind === 'feather') drawFeather(item);
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      const alpha = Math.max(0, particle.life * 2);
      if (particle.kind === 'dust') context.fillStyle = `rgba(201, 143, 46, ${alpha.toFixed(2)})`;
      else if (particle.kind === 'corn') context.fillStyle = `rgba(242, 201, 76, ${alpha.toFixed(2)})`;
      else context.fillStyle = `rgba(245, 239, 224, ${alpha.toFixed(2)})`;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.kind === 'dust' ? 5 : 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  // ---------- HUD and panels ----------

  function drawHud(state) {
    const feetLeft = Math.max(0, Math.ceil(COURSE_FEET - state.distance));
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left');
    text(distanceLabel(feetLeft) + ' FT', FIELD.width / 2, 18, 30, PALETTE.text, 'center');
    // Lives as little hearts.
    for (let life = 0; life < LIVES; life += 1) {
      const x = FIELD.width - 24 - (LIVES - life) * 34;
      const y = 26;
      context.fillStyle = life < state.lives ? PALETTE.wattle : 'rgba(255, 255, 255, 0.25)';
      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.arc(x + 14, y, 9, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(x - 7, y + 3);
      context.lineTo(x + 21, y + 3);
      context.lineTo(x + 7, y + 18);
      context.closePath();
      context.fill();
    }
    // Stage name, top left under the score.
    text(STAGES[state.stage].name.toUpperCase(), 24, 56, 20, PALETTE.muted, 'left');
    // The farmer meter: how close he is, bottom left.
    const gapFraction = 1 - state.farmer.gap / TURKEY.maxGap;
    const barX = 24;
    const barY = FIELD.height - 44;
    const barWidth = 260;
    context.fillStyle = 'rgba(36, 22, 16, 0.7)';
    context.fillRect(barX - 6, barY - 24, barWidth + 12, 44);
    text('FARMER', barX, barY - 20, 16, PALETTE.muted, 'left');
    context.fillStyle = '#5a3a22';
    context.fillRect(barX, barY, barWidth, 12);
    context.fillStyle = gapFraction > 0.75 ? PALETTE.danger : gapFraction > 0.45 ? '#f2a93b' : PALETTE.good;
    context.fillRect(barX, barY, barWidth * gapFraction, 12);
    // Dash cooldown pip, bottom right.
    const ready = state.turkey.dashCooldown <= 0;
    context.fillStyle = ready ? PALETTE.good : 'rgba(255, 255, 255, 0.25)';
    context.beginPath();
    context.arc(FIELD.width - 40, FIELD.height - 36, 12, 0, Math.PI * 2);
    context.fill();
    text(ready ? 'DASH READY (SHIFT)' : 'DASH...', FIELD.width - 60, FIELD.height - 42, 16, PALETTE.text, 'right');
    // Stage-change banner.
    if (state.stageBanner > 0) {
      const alpha = Math.min(1, state.stageBanner);
      context.fillStyle = `rgba(36, 22, 16, ${0.75 * alpha})`;
      context.fillRect(0, 180, FIELD.width, 110);
      context.textBaseline = 'alphabetic';
      text(STAGES[state.stage].name, FIELD.width / 2, 232, 44, PALETTE.text, 'center');
      text(STAGES[state.stage].tagline, FIELD.width / 2, 272, 22, PALETTE.muted, 'center');
    }
    context.textBaseline = 'alphabetic';
  }

  function drawPanel(title, lines, prompt, xOffset = 0) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2 + xOffset;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 12, 8, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 4;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    const centre = x + PANEL.width / 2;
    text(title, centre, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], centre, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, centre, y + height - 40, 24, PALETTE.corn, 'center');
  }

  const TITLE_LINES = [
    'Thanksgiving is coming. You are the main course.',
    'Run the farmyard, the barn and the kitchen — and get away.',
    'SPACE / CLICK jump · S duck & hide · SHIFT dash',
    'Jump fences and ovens. Dodge knives and pumpkins.',
    'Hide behind hay bales when the farmer gets close.',
    'P pause · M mute',
    '',
  ];

  /** Paint one frame: the world, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 24 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 24 : 0;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawBackdrop(state.stage, state.elapsed);
    drawItems(state);
    drawParticles(state);
    drawFarmer(state);
    drawTurkey(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[6] = bestLabel(best);
      // Shifted right so the turkey shows beside the panel on the cover.
      drawPanel("Giblet's Great Escape", TITLE_LINES, 'Press Space or click to run for your life', 90);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The farmer waits. The oven stays hot.'], 'Press P to keep running');
    } else if (screen === SCREEN_OVER) {
      const lines = state.caught
        ? ['The farmer caught you at ' + Math.floor(state.distance) + ' feet.', 'Thanksgiving dinner is served. Sorry, Giblet.']
        : ['Three strikes — the farmer got you at ' + Math.floor(state.distance) + ' feet.', 'So close to freedom.'];
      lines.push(finalLabel(state.score));
      lines.push(bestLabel(best));
      drawPanel('CAUGHT!', lines, 'Press Space or click to run again');
    } else if (screen === SCREEN_ESCAPED) {
      const lines = [
        'You outran the farmer, the knives and the oven.',
        'Giblet lives to gobble another day. Happy Thanksgiving!',
        finalLabel(state.score),
        bestLabel(best),
      ];
      drawPanel('ESCAPED!', lines, 'Press Space or click to run again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
