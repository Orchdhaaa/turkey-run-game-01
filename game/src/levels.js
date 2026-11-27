// The three stages of the escape: farmyard, barn, kitchen. Each stage names
// its look, its hazards and how often they appear, so the run gets harder
// the closer the turkey gets to the oven — and to freedom.

import { COURSE_FEET } from './config.js';

export const STAGE_FARMYARD = 0;
export const STAGE_BARN = 1;
export const STAGE_KITCHEN = 2;

export const STAGES = [
  {
    name: 'The Farmyard',
    tagline: 'Fences, pumpkins and one very cross farmer.',
    sky: 'skyFarm',
    ground: 'groundFarm',
    /** Fraction of the course this stage covers. */
    until: 0.34,
    hazards: [
      { kind: 'fence', weight: 5 },
      { kind: 'mud', weight: 3 },
      { kind: 'pumpkin', weight: 2 },
      { kind: 'bale', weight: 3 },
      { kind: 'knife', weight: 1 },
    ],
    farmerLunges: false,
  },
  {
    name: 'The Barn',
    tagline: 'Hay bales to hide behind. Mind the falling knives.',
    sky: 'skyBarn',
    ground: 'groundBarn',
    until: 0.67,
    hazards: [
      { kind: 'fence', weight: 4 },
      { kind: 'mud', weight: 3 },
      { kind: 'pumpkin', weight: 3 },
      { kind: 'bale', weight: 4 },
      { kind: 'knife', weight: 3 },
    ],
    farmerLunges: false,
  },
  {
    name: 'The Kitchen',
    tagline: 'The oven is lit. The carving knife is out. RUN.',
    sky: 'skyKitchen',
    ground: 'groundKitchen',
    until: 1.0,
    hazards: [
      { kind: 'oven', weight: 4 },
      { kind: 'knife', weight: 5 },
      { kind: 'pumpkin', weight: 2 },
      { kind: 'bale', weight: 2 },
      { kind: 'fence', weight: 2 },
      { kind: 'mud', weight: 2 },
    ],
    farmerLunges: true,
  },
];

/** Which stage the turkey is in, from how far along the course it is. */
export function stageAt(distanceFeet) {
  const fraction = distanceFeet / COURSE_FEET;
  for (let index = 0; index < STAGES.length; index += 1) {
    if (fraction < STAGES[index].until) return index;
  }
  return STAGES.length - 1;
}

/** The stage's name, for the HUD and the stage-change banner. */
export function stageName(index) {
  return STAGES[index].name;
}
