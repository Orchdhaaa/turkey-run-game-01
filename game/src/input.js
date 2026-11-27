// Keyboard and pointer input. Held keys steer (jump is held to jump higher
// is not a thing here: jump fires on press); one-shot presses (jump, dash,
// duck, start, pause, mute) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// Clicking the canvas jumps; clicking a menu button is handled by the caller.

export const ACTION_JUMP = 1;
export const ACTION_DASH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_CONFIRM = 8;
export const ACTION_MUTE = 16;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DASH = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CONFIRM = new Set(['Enter']);
const MUTE = new Set(['KeyM']);
const DUCK = new Set(['ArrowDown', 'KeyS']);

export function createInput(target) {
  let ducking = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (DUCK.has(event.code)) {
      ducking = true;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (DUCK.has(event.code)) ducking = false;
  });
  // A key released while the tab is hidden never sends keyup: unduck on blur.
  window.addEventListener('blur', () => {
    ducking = false;
  });
  // A click on the canvas is a jump (and a confirm on menus).
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_JUMP | ACTION_CONFIRM;
  });

  return {
    /** True while the duck key is held. */
    isDucking() {
      return ducking;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
