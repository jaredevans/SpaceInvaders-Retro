
export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  PAUSED = 'PAUSED'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  pos: Position;
  width: number;
  height: number;
  active: boolean;
  symbol: string;
  color: string;
}

export type AlienSpecies = 'DREADNOUGHT' | 'DESTROYER' | 'VANGUARD' | 'MOTHERSHIP';

export interface Alien extends Entity {
  row: number;
  col: number;
  scoreValue: number;
  species: AlienSpecies;
}

export interface Projectile extends Entity {
  velocity: number;
  isEnemy: boolean;
  // Special bullet properties
  vx?: number;
  vy?: number;
  type?: 'STANDARD' | 'HOMING_LIGHTNING';
  phase?: 'ASCEND' | 'HOME';
}

export interface Particle extends Entity {
  life: number;
  velocity: { x: number; y: number };
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}