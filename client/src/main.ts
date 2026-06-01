import Phaser from 'phaser';
import { W, H, COL, css } from './theme.js';
import { BootScene } from './scenes/BootScene.js';
import { HomeScene } from './scenes/HomeScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { WheelScene } from './scenes/WheelScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

// Portrait design that scales to fit any screen — works on both mobile and
// desktop browsers (FIT letterboxes the 9:16 canvas and centres it).
new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: css(COL.bgBot),
  scene: [BootScene, HomeScene, GameScene, ResultScene, ShopScene, WheelScene, SettingsScene],
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  dom: { createContainer: true },
  input: { activePointers: 3 }, // multi-touch friendly
  render: { antialias: true, roundPixels: false },
});
