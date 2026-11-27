// The farmer: he chases, he searches, and in the kitchen he corners.
// He is a gap behind the turkey, measured in pixels on screen. Clean
// running lets the gap grow back; every stumble and hit lets him close in.
// When the turkey hides behind a hay bale he stops and searches; find the
// turkey still there when his patience runs out and he lunges for it.
// In the kitchen he telegraphs a lunge with a shout: dash away or be caught.

import { FARMER, STEP, TURKEY } from './config.js';

export const FARMER_CHASE = 'chase';
export const FARMER_SEARCH = 'search';
export const FARMER_LUNGE_WARN = 'lunge-warn';
export const FARMER_LUNGE = 'lunge';

export function createFarmer() {
  const farmer = {
    gap: FARMER.startGap,
    state: FARMER_CHASE,
    /** Seconds left of the current search or lunge warning. */
    timer: 0,
    /** Seconds until the next lunge is allowed. */
    lungeCooldown: FARMER.lungeCooldown,
    /** Comic shout to show above his head ("HEY!"). */
    shout: '',
    shoutTimer: 0,
  };

  function say(words, seconds) {
    farmer.shout = words;
    farmer.shoutTimer = seconds;
  }

  function reset() {
    farmer.gap = FARMER.startGap;
    farmer.state = FARMER_CHASE;
    farmer.timer = 0;
    farmer.lungeCooldown = FARMER.lungeCooldown;
    farmer.shout = '';
    farmer.shoutTimer = 0;
  }

  /**
   * Advance the farmer one step. `hidden` is true while the turkey ducks
   * behind a hay bale; `canLunge` is true only in the kitchen stage.
   * Returns 'caught' when the farmer reaches the turkey, else ''.
   */
  function step(hidden, canLunge) {
    if (farmer.shoutTimer > 0) farmer.shoutTimer -= STEP;
    else farmer.shout = '';

    if (farmer.state === FARMER_LUNGE_WARN) {
      farmer.timer -= STEP;
      if (farmer.timer <= 0) {
        farmer.state = FARMER_LUNGE;
        farmer.timer = 0.25;
        say('GOTCHA!', 0.5);
      }
      return '';
    }
    if (farmer.state === FARMER_LUNGE) {
      farmer.timer -= STEP;
      farmer.gap -= 420 * STEP;
      if (farmer.gap <= 0) return 'caught';
      if (farmer.timer <= 0) {
        farmer.state = FARMER_CHASE;
        farmer.lungeCooldown = FARMER.lungeCooldown;
      }
      return '';
    }

    if (hidden) {
      if (farmer.state !== FARMER_SEARCH) {
        farmer.state = FARMER_SEARCH;
        farmer.timer = FARMER.searchTime;
        say('WHERE ARE YA?', 1.2);
      } else {
        farmer.timer -= STEP;
        farmer.gap = Math.min(farmer.gap + 26 * STEP, TURKEY.maxGap);
        if (farmer.timer <= 0) {
          // Patience gone: he spots the turkey and charges.
          farmer.state = FARMER_LUNGE;
          farmer.timer = 0.3;
          say('THERE YA ARE!', 0.6);
          return 'found';
        }
      }
      return '';
    }

    if (farmer.state === FARMER_SEARCH) {
      // The turkey slipped out of hiding: back to the chase, a little behind.
      farmer.state = FARMER_CHASE;
      farmer.gap = Math.min(farmer.gap + 30, TURKEY.maxGap);
      say('HEY! COME BACK!', 1.0);
    }
    farmer.gap = Math.min(farmer.gap + FARMER.driftBack * STEP, TURKEY.maxGap);
    farmer.lungeCooldown -= STEP;
    if (canLunge && farmer.lungeCooldown <= 0 && farmer.gap < 170) {
      farmer.state = FARMER_LUNGE_WARN;
      farmer.timer = FARMER.lungeWarn;
      say('!', 0.7);
      return 'lunge-warn';
    }
    if (farmer.gap <= 0) return 'caught';
    return '';
  }

  return {
    farmer,
    reset,
    step,
    say,
    /** The farmer gains ground: a stumble, a hit, a caught lunge. */
    closeIn(amount) {
      farmer.gap = Math.max(0, farmer.gap - amount);
    },
    /** The farmer loses ground: a clean dodge, a good hide. */
    fallBack(amount) {
      farmer.gap = Math.min(TURKEY.maxGap, farmer.gap + amount);
    },
    /** Screen x of the farmer, from the turkey's fixed screen x. */
    screenX(turkeyX) {
      return turkeyX - farmer.gap - 70;
    },
  };
}
