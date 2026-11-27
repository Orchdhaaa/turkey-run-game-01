// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. The turkey runs from the farmyard,
// through the barn, into the kitchen: one course, three stages, and the
// finish line is freedom from the Thanksgiving table.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The whole escape, in feet. Reaching it means the turkey got away. */
export const COURSE_FEET = 2600;

/** Where the turkey stands on screen (the world scrolls past it). */
export const TURKEY_X = 300;

export const TURKEY = {
  width: 64,
  height: 58,
  /** Pixels per second the world scrolls at the start of the run. */
  runSpeed: 340,
  /** Extra scroll speed added per stage. */
  speedPerStage: 55,
  jumpVelocity: 900,
  gravity: 1900,
  /** Seconds of dash (Shift): faster scroll, brief protection. */
  dashTime: 0.45,
  dashCooldown: 1.6,
  dashSpeed: 260,
  /** Seconds of flashing protection after a hit. */
  invulnerable: 1.6,
  /** How far the farmer may lag behind before he catches up on his own. */
  maxGap: 260,
};

export const LIVES = 3;

export const FARMER = {
  /** Gap (px behind the turkey) at the start of the run. */
  startGap: 210,
  /** Gap regained per second of clean running. */
  driftBack: 14,
  /** Gap lost when the turkey stumbles into something. */
  stumbleCost: 46,
  /** Gap lost when a knife, pumpkin or oven hits the turkey. */
  hitCost: 60,
  /** Gap lost when the farmer's lunge connects. */
  lungeCost: 80,
  /** Seconds the farmer searches a hay bale before giving up. */
  searchTime: 2.2,
  /** Seconds of warning before a lunge in the kitchen stage. */
  lungeWarn: 0.7,
  /** Seconds between lunges, at best. */
  lungeCooldown: 4.5,
};

/** Spawn pacing, in seconds between spawns at stage 1; each stage multiplies. */
export const SPAWN = {
  fence: { base: 1.9, perStage: 0.82 },
  bale: { base: 3.4, perStage: 0.9 },
  mud: { base: 2.8, perStage: 0.9 },
  pumpkin: { base: 4.2, perStage: 0.78 },
  knife: { base: 5.5, perStage: 0.7 },
  oven: { base: 4.6, perStage: 0.85 },
  corn: { base: 1.1, perStage: 0.95 },
  goldenCorn: { base: 9.0, perStage: 0.9 },
  feather: { base: 22.0, perStage: 1.0 },
};

/** How many moving things can exist at once; the pool is allocated once. */
export const POOL_SIZE = 96;

export const SCORE = {
  perFoot: 1,
  corn: 10,
  goldenCorn: 50,
  feather: 25,
  dodge: 5,
  hide: 15,
  stageClear: 100,
};

export const PALETTE = {
  backdrop: '#2b1a12',
  skyFarm: '#f7b267',
  skyBarn: '#e07840',
  skyKitchen: '#8a4b2d',
  groundFarm: '#7a4a21',
  groundBarn: '#5d3a1c',
  groundKitchen: '#4a2c1e',
  grass: '#c98f2e',
  turkeyBody: '#8a5230',
  turkeyWing: '#6e3f22',
  tail: ['#b4552d', '#d2691e', '#e8a33c', '#f2c94c'],
  head: '#e8dcc8',
  beak: '#f2a93b',
  wattle: '#e5534b',
  snood: '#c0392b',
  farmerShirt: '#3e6b8e',
  farmerOveralls: '#2f4d6d',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9a441',
  knife: '#d7dce3',
  knifeHandle: '#5d3a1c',
  oven: '#3a3f47',
  ovenGlow: '#ff7a2f',
  ovenDoor: '#22262d',
  corn: '#f2c94c',
  goldenCorn: '#ffe066',
  feather: '#f5efe0',
  pumpkin: '#e07820',
  pumpkinStem: '#4a7a2f',
  hay: '#e8c25a',
  hayBand: '#b8933a',
  mud: '#5a3a22',
  fence: '#8a5a2b',
  panel: '#241610',
  panelEdge: '#d9a441',
  text: '#fff3d6',
  muted: '#d9b98a',
  danger: '#ff5a3c',
  good: '#8fd14f',
};

/** System fonts only: nothing is fetched, so the game plays fully offline. */
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'turkey-run-giblet.best';
