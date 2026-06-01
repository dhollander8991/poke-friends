/** Art factory entry point — every texture in the game is generated here. */
import type Phaser from 'phaser';
import { generateBackdrops } from './backdrop.js';
import { generateTable } from './table.js';
import { generateCards } from './cards.js';
import { generateChips } from './chips.js';
import { generateAvatars } from './avatars.js';
import { generateWheel } from './wheel.js';
import { generateUiFx } from './ui.js';

export interface ArtStep {
  label: string;
  run: () => void;
}

/** Ordered generation steps so the boot screen can show progress. */
export function buildArt(scene: Phaser.Scene): ArtStep[] {
  return [
    { label: 'Lighting the casino…', run: () => generateBackdrops(scene) },
    { label: 'Building the table…', run: () => generateTable(scene) },
    { label: 'Printing the cards…', run: () => generateCards(scene) },
    { label: 'Stacking the chips…', run: () => generateChips(scene) },
    { label: 'Waking the players…', run: () => generateAvatars(scene) },
    { label: 'Greasing the wheel…', run: () => generateWheel(scene) },
    { label: 'Adding sparkle…', run: () => generateUiFx(scene) },
  ];
}
