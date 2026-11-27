// All sound is synthesised with WebAudio: no audio files, no network.
// Short blips for jumps and pickups, a squawk for a hit, a gobble for the
// title, and a plucky little autumn tune that loops while the turkey runs.
// Nothing here runs until the player first presses a key or clicks, which
// is when browsers allow sound to start.

/** Notes of the running tune (Hz), a cheerful farmyard lope in C major. */
const TUNE = [523, 659, 784, 659, 587, 659, 523, 392, 440, 523, 587, 523, 440, 392];
const TUNE_STEP = 0.16;

export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let tuneIndex = 0;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** One oscillator blip: frequency slides from `from` to `to`. */
  function blip(from, to, seconds, type, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  function noise(seconds, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  const sounds = {
    /** The turkey's happy little gobble: two descending quacks. */
    gobble() {
      blip(420, 240, 0.09, 'square', 0.16);
      blip(380, 200, 0.11, 'square', 0.16, 0.1);
    },
    jump() {
      blip(300, 620, 0.14, 'sine', 0.2);
    },
    dash() {
      noise(0.18, 0.14);
      blip(500, 900, 0.12, 'sine', 0.1);
    },
    corn() {
      blip(880, 1320, 0.09, 'sine', 0.18);
      blip(1320, 1760, 0.08, 'sine', 0.12, 0.07);
    },
    golden() {
      blip(660, 990, 0.1, 'sine', 0.18);
      blip(990, 1320, 0.1, 'sine', 0.18, 0.09);
      blip(1320, 1980, 0.14, 'sine', 0.18, 0.18);
    },
    /** A startled squawk: noise plus a falling sawtooth. */
    hurt() {
      noise(0.2, 0.25);
      blip(700, 140, 0.3, 'sawtooth', 0.2);
    },
    /** The farmer's shout: a low bark of two notes. */
    shout() {
      blip(180, 120, 0.16, 'square', 0.2);
      blip(160, 110, 0.2, 'square', 0.2, 0.14);
    },
    hide() {
      blip(500, 300, 0.12, 'sine', 0.1);
    },
    stage() {
      blip(523, 523, 0.12, 'triangle', 0.18);
      blip(659, 659, 0.12, 'triangle', 0.18, 0.12);
      blip(784, 784, 0.2, 'triangle', 0.18, 0.24);
    },
    win() {
      const notes = [523, 659, 784, 1047, 784, 1047];
      notes.forEach((note, index) => blip(note, note, 0.22, 'triangle', 0.2, index * 0.13));
    },
    caught() {
      const notes = [392, 330, 262, 196];
      notes.forEach((note, index) => blip(note, note * 0.94, 0.3, 'sawtooth', 0.14, index * 0.18));
    },
  };

  function startMusic() {
    if (!ensure() || musicTimer !== null) return;
    tuneIndex = 0;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = TUNE[tuneIndex % TUNE.length];
      blip(note, note, TUNE_STEP * 0.9, 'triangle', 0.07);
      if (tuneIndex % 4 === 0) blip(note / 2, note / 2, TUNE_STEP * 1.8, 'sine', 0.05);
      tuneIndex += 1;
    }, TUNE_STEP * 1000);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    ...sounds,
    startMusic,
    stopMusic,
    /** Unlock the audio context on the first user gesture. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
