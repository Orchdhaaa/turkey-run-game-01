// The screenshot scenes behind ?shot=start|play|caught|escaped. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (jump what is coming, duck behind a
// bale when the farmer closes in, dash out of a lunge), so the frame is what
// a real run looks like and the same seed always gives the same frame. The
// caught scene's pilot is careless on purpose, so it gets caught the way a
// hurried player is.

import { FIELD, STEP } from './config.js';
import { FARMER_LUNGE_WARN } from './farmer.js';
import { EVENT_CAUGHT, EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 900;
const SAMPLE = STEP;
/** How far ahead, in pixels, the pilot looks for something to jump. */
const LOOK_AHEAD = 120;
/** How close an oven must be before the pilot jumps it (ovens are wide). */
const OVEN_JUMP_AT = 70;
/** How close the farmer must be before the pilot hides behind a bale. */
const HIDE_GAP = 130;
/** How far ahead, in pixels, the pilot checks for a hazard before hiding. */
const HIDE_CLEAR_AHEAD = 350;

/** True when a ground hazard is close enough ahead to need a jump. */
function hazardAhead(state, kind) {
  const turkey = state.turkey;
  for (const item of state.items) {
    if (!item.active) continue;
    if (item.kind === 'corn' || item.kind === 'golden' || item.kind === 'feather') continue;
    if (item.kind === 'mud') continue;
    if (item.kind === 'knife') {
      // A knife about to land on the turkey: jump through its landing.
      if (item.x < turkey.x + turkey.width && item.x + item.width > turkey.x && item.y > FIELD.groundY - 200) return true;
      continue;
    }
    if (item.kind === 'oven') {
      if (item.x > turkey.x + turkey.width && item.x < turkey.x + turkey.width + OVEN_JUMP_AT) return true;
      continue;
    }
    if (item.kind === 'bale') continue;
    if (item.x > turkey.x + turkey.width && item.x < turkey.x + turkey.width + LOOK_AHEAD) return true;
  }
  return false;
}

/** True when a hay bale is right beside the turkey and hiding is worthwhile. */
function baleBeside(state) {
  const turkey = state.turkey;
  if (state.farmer.gap > HIDE_GAP) return false;
  for (const item of state.items) {
    if (!item.active || item.kind !== 'bale') continue;
    if (item.x < turkey.x + turkey.width + 30 && item.x + item.width > turkey.x - 30) return true;
  }
  return false;
}

/** True when another hazard is coming soon, so hiding would be a trap. */
function hazardComingSoon(state) {
  const turkey = state.turkey;
  for (const item of state.items) {
    if (!item.active) continue;
    if (item.kind === 'corn' || item.kind === 'golden' || item.kind === 'feather' || item.kind === 'mud' || item.kind === 'bale') continue;
    if (item.x > turkey.x + turkey.width && item.x < turkey.x + turkey.width + HIDE_CLEAR_AHEAD) return true;
    if (item.kind === 'knife' && item.x < turkey.x + turkey.width && item.x + item.width > turkey.x) return true;
  }
  return false;
}

/** The careful pilot: jump, hide, dash. */
function carefulPilot(state) {
  const turkey = state.turkey;
  const controls = { jump: false, dash: false, duck: false };
  if (state.farmer.state === FARMER_LUNGE_WARN && turkey.dashCooldown <= 0) controls.dash = true;
  if (baleBeside(state) && turkey.onGround && !hazardComingSoon(state)) {
    controls.duck = true;
    return controls;
  }
  if (turkey.onGround && hazardAhead(state)) controls.jump = true;
  return controls;
}

/** The careless pilot: never jumps, never hides, never dashes. */
function carelessPilot() {
  return { jump: false, dash: false, duck: false };
}

/**
 * Set `world` to the named scene (start, play, caught or escaped; any other
 * name is start) and return the screen to draw over it and the best score
 * to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'caught' && name !== 'escaped') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const pilot = name === 'caught' ? carelessPilot : carefulPilot;
  const limit = name === 'play' ? PLAY_SECONDS : END_LIMIT_SECONDS;
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    events = world.step(STEP, pilot(world.state));
    if (events & (EVENT_OVER | EVENT_ESCAPED | EVENT_CAUGHT)) break;
  }
  if (world.state.escaped) return { screen: SCREEN_ESCAPED, best: world.state.score };
  if (world.state.over) return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
