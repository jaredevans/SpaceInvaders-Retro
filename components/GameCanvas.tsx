
import React, { useEffect, useRef } from 'react';
import { Alien, AlienSpecies, Entity, GameStatus, Particle, Projectile } from '../types';

// Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PLAYER_SPEED = 4.84; 
const BULLET_SPEED = 6.0;
const ALIEN_SPEED_BASE = 0.67;
const ALIEN_DROP = 20;
const UFO_SPEED = 4.0;

// Extended Outrun / Miami Vice Palette
const PALETTE = {
    CYAN: '#00f3ff',
    PINK: '#ff00ff',
    PURPLE: '#bc13fe',
    ORANGE: '#ff6600',
    YELLOW: '#ffe600',
    RED: '#ff0055',
    WHITE: '#ffffff',
    LIME: '#ccff00',
    ELECTRIC_BLUE: '#2e2bfd',
    HOT_MAGENTA: '#ff00cc'
};

// Alien Definitions with 80s colors
const ALIEN_TYPES: Record<Exclude<AlienSpecies, 'MOTHERSHIP'>, { symbol: string, color: string, score: number }> = {
  DREADNOUGHT: { symbol: '[<o>]', color: PALETTE.PURPLE, score: 40 },
  DESTROYER:   { symbol: '/-^-\\', color: PALETTE.PINK, score: 20 },
  VANGUARD:    { symbol: '}w{',   color: PALETTE.ORANGE, score: 10 },
};

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  color: string;
}

interface Lightning {
  path: {x: number, y: number}[];
  life: number;
  color: string;
}

interface GameCanvasProps {
  status: GameStatus;
  setStatus: React.Dispatch<React.SetStateAction<GameStatus>>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onLog: (msg: string) => void;
  isMobile?: boolean;
  mobileInputRef?: React.MutableRefObject<{ x: number }>;
  attackTrigger?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, setStatus, score, setScore, onLog, isMobile = false, mobileInputRef, attackTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef<GameStatus>(status);
  
  // Mutable game state (refs for performance in RAF loop)
  const gameState = useRef({
    player: { pos: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 40 }, width: 30, height: 20, active: true, symbol: '_^_', color: PALETTE.CYAN, shield: 2 } as Entity,
    aliens: [] as Alien[],
    totalAliens: 0, // Track initial count for percentage calculations
    ufo: null as Alien | null,
    mothershipSequence: { active: false, startTime: 0, missilesFired: 0, lastMissileTime: 0 },
    bullets: [] as Projectile[],
    particles: [] as Particle[],
    lightning: [] as Lightning[],
    stars: Array.from({ length: 120 }, () => {
        const colors = Object.values(PALETTE); // Use all colors for stars
        return {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() > 0.95 ? 2.5 : 1, // Occasional larger star
            speed: 0.2 + Math.random() * 1.2,
            alpha: 0.3 + Math.random() * 0.7,
            color: colors[Math.floor(Math.random() * colors.length)]
        };
    }) as Star[],
    alienDirection: 1, // 1 for right, -1 for left
    alienSpeed: ALIEN_SPEED_BASE,
    chaosMode: false, // Triggered when mothership is destroyed
    pauseUntil: 0, // For hit-stop effects
    keys: { left: false, right: false, shoot: false, shootPressed: false },
    attackCooldown: 60,
    lastSpecialTime: 0, // Timer for special bullet
    playerCooldown: 0 // For auto-fire
  });

  // Initialize Aliens
  const initGame = () => {
    const rows = 5;
    const cols = 8;
    const aliens: Alien[] = [];
    
    for (let r = 0; r < rows; r++) {
      // Determine Species & Color by Row for Rainbow/Gradient Effect
      let species: AlienSpecies = 'VANGUARD';
      let rowColor = PALETTE.LIME;

      if (r === 0) { 
          species = 'DREADNOUGHT'; 
          rowColor = PALETTE.PURPLE; 
      } else if (r === 1) { 
          species = 'DESTROYER'; 
          rowColor = PALETTE.HOT_MAGENTA; 
      } else if (r === 2) { 
          species = 'DESTROYER'; 
          rowColor = PALETTE.PINK; 
      } else if (r === 3) { 
          species = 'VANGUARD'; 
          rowColor = PALETTE.ORANGE; 
      } else { 
          species = 'VANGUARD'; 
          rowColor = PALETTE.LIME; 
      }
      
      const typeDef = ALIEN_TYPES[species as Exclude<AlienSpecies, 'MOTHERSHIP'>];

      for (let c = 0; c < cols; c++) {
        aliens.push({
          pos: { x: 50 + c * 50, y: 50 + r * 40 },
          width: 30,
          height: 20,
          active: true,
          row: r,
          col: c,
          scoreValue: typeDef.score,
          symbol: typeDef.symbol,
          color: rowColor, // Use row-specific color
          species: species
        });
      }
    }
    
    gameState.current.aliens = aliens;
    gameState.current.totalAliens = aliens.length;
    gameState.current.ufo = null;
    gameState.current.mothershipSequence = { active: false, startTime: 0, missilesFired: 0, lastMissileTime: 0 };
    gameState.current.bullets = [];
    gameState.current.particles = [];
    gameState.current.lightning = [];
    gameState.current.player.pos.x = CANVAS_WIDTH / 2 - 15;
    gameState.current.player.active = true;
    gameState.current.player.shield = 2;
    gameState.current.alienSpeed = ALIEN_SPEED_BASE;
    gameState.current.attackCooldown = 60;
    gameState.current.chaosMode = false;
    gameState.current.pauseUntil = 0;
    gameState.current.lastSpecialTime = Date.now();
    gameState.current.playerCooldown = 0;
    setScore(0);
    onLog("System: Initializing Chromatic_Wave...");
    onLog("System: SHIELDS ONLINE (200%).");
  };

  // Focus on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // --- Helper Functions ---
  
  const updateParticles = () => {
        const state = gameState.current;
        state.particles.forEach(p => {
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            p.velocity.x *= 0.92;
            p.velocity.y *= 0.92;
            p.life -= 0.031; 
            if (p.life <= 0) p.active = false;
        });
        state.particles = state.particles.filter(p => p.active);
  }

  const updateLightning = () => {
        const state = gameState.current;
        state.lightning.forEach(l => l.life -= 0.05);
        state.lightning = state.lightning.filter(l => l.life > 0);
  }

  const createLightningStorm = (startX: number, startY: number, targets: Alien[]) => {
        const bolts: Lightning[] = [];
        targets.forEach(target => {
            const endX = target.pos.x + target.width/2;
            const endY = target.pos.y + target.height/2;
            const segments = 6;
            const path = [{x: startX, y: startY}];
            for(let i=1; i < segments; i++) {
                const t = i/segments;
                const mx = startX + (endX - startX) * t;
                const my = startY + (endY - startY) * t;
                path.push({ x: mx + (Math.random() - 0.5) * 40, y: my + (Math.random() - 0.5) * 40 });
            }
            path.push({x: endX, y: endY});
            bolts.push({ path, life: 1.0, color: '#ffffff' });
        });
        gameState.current.lightning = bolts;
  }

  const createMuzzleFlash = (x: number, y: number) => {
        gameState.current.particles.push({
            pos: { x: x - 6, y: y - 15 }, velocity: { x: 0, y: 0 }, life: 0.15, active: true, width: 16, height: 16, symbol: '✦', color: '#FFF'
        });
        for (let i = 0; i < 8; i++) {
             const angle = (Math.PI * 2 * i) / 8;
             const speed = 3.85;
             gameState.current.particles.push({
                pos: { x: x, y: y - 5 },
                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.6 },
                life: 0.2, active: true, width: 2, height: 2, symbol: '·', color: PALETTE.CYAN
            });
        }
        for (let i = 0; i < 5; i++) {
            gameState.current.particles.push({
                pos: { x: x + (Math.random() - 0.5) * 4, y: y - 5 },
                velocity: { x: (Math.random() - 0.5) * 8.8, y: (Math.random() - 0.5) * 8.8 - 2.2 },
                life: 0.25, active: true, width: 2, height: 2, symbol: '.', color: Math.random() > 0.5 ? PALETTE.WHITE : PALETTE.YELLOW
            });
        }
  }

  const createExplosion = (x: number, y: number, color: string, isMassive: boolean = false) => {
        const particleCount = isMassive ? 120 : 20;
        gameState.current.particles.push({
            pos: { x, y }, velocity: { x: 0, y: 0 }, life: isMassive ? 2.0 : 1.0, active: true, width: isMassive ? 60 : 15, height: isMassive ? 60 : 15, symbol: '💥', color: '#FFF'
        });

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (isMassive ? 16.5 : 6.6); 
            const pColor = isMassive ? [PALETTE.RED, PALETTE.ORANGE, PALETTE.YELLOW, PALETTE.PURPLE, PALETTE.WHITE][Math.floor(Math.random()*5)] : (Math.random() > 0.3 ? color : PALETTE.WHITE);

            gameState.current.particles.push({
                pos: { x, y },
                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                life: isMassive ? (2.0 + Math.random()) : (0.8 + Math.random() * 0.6),
                active: true,
                width: Math.random() > 0.5 ? 3 : 2, height: Math.random() > 0.5 ? 3 : 2,
                symbol: Math.random() > 0.7 ? (isMassive ? '#' : '*') : '.',
                color: pColor
            });
        }
  };

  const fireHomingMissile = (source: Alien, xOffset: number) => {
      const state = gameState.current;
      state.bullets.push({
        pos: { 
            x: source.pos.x + (source.width/2) + xOffset, 
            y: source.pos.y + 15 
        },
        width: 8, height: 8,
        active: true,
        velocity: 0,
        vx: xOffset < 0 ? -4.5 : 4.5,
        vy: 3.0,
        isEnemy: true,
        symbol: '⚡',
        color: PALETTE.RED, // Angry color
        type: 'HOMING_LIGHTNING',
        phase: 'HOME' // Start tracking immediately
    });
  };

  const triggerMothershipAttack = () => {
      const state = gameState.current;
      if (status !== GameStatus.PLAYING) {
          setStatus(GameStatus.PLAYING); // Unpause if needed
      }

      onLog("System: WARNING!! MOTHERSHIP SENTIENCE DETECTED!");
      
      // Spawn UFO if missing
      if (!state.ufo || !state.ufo.active) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          state.ufo = {
                pos: { x: CANVAS_WIDTH / 2 - 20, y: 35 },
                width: 40, height: 20, active: true,
                row: -1, col: -1,
                scoreValue: 500,
                species: 'MOTHERSHIP',
                symbol: 'Ò_Ó', // Angry face
                color: PALETTE.RED
            };
            (state.ufo as any).velocityX = UFO_SPEED * direction;
      } else {
          state.ufo.symbol = 'Ò_Ó'; // Change face to angry
          state.ufo.color = PALETTE.RED;
      }

      // Initialize Attack Sequence State
      state.mothershipSequence = {
          active: true,
          startTime: Date.now(),
          missilesFired: 0,
          lastMissileTime: 0
      };
      
      // Visual feedback
      createExplosion(state.ufo.pos.x + 20, state.ufo.pos.y + 10, PALETTE.RED, true);
  };

  // Mothership Attack Trigger
  useEffect(() => {
      if (attackTrigger && attackTrigger > 0) {
          triggerMothershipAttack();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackTrigger]);

  useEffect(() => {
    // Only reset game if we are NOT coming from a PAUSED state
    if (status === GameStatus.PLAYING && prevStatus.current !== GameStatus.PAUSED) {
      initGame();
    }
    
    if (status === GameStatus.PAUSED) {
        gameState.current.keys = { left: false, right: false, shoot: false, shootPressed: false };
    }

    prevStatus.current = status;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in console
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (status !== GameStatus.PLAYING) return;
      if (e.code === 'ArrowLeft') gameState.current.keys.left = true;
      if (e.code === 'ArrowRight') gameState.current.keys.right = true;
      if (e.code === 'Space') {
        if (!gameState.current.keys.shootPressed) {
            gameState.current.keys.shoot = true;
            gameState.current.keys.shootPressed = true;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore if user is typing in console
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'ArrowLeft') gameState.current.keys.left = false;
      if (e.code === 'ArrowRight') gameState.current.keys.right = false;
      if (e.code === 'Space') {
        gameState.current.keys.shoot = false;
        gameState.current.keys.shootPressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');

    const render = () => {
      if (!ctx || !canvasRef.current) return;

      // Background: Deep Dark Purple/Black
      ctx.fillStyle = '#050010'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw Stars (Background Layer)
      drawStars(ctx);

      // Scanline effect (Subtle multicolor tint)
      ctx.fillStyle = 'rgba(0, 255, 255, 0.02)';
      ctx.shadowBlur = 0;
      for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
          ctx.fillRect(0, i, CANVAS_WIDTH, 1);
      }

      if (status === GameStatus.PLAYING) {
        if (Date.now() > gameState.current.pauseUntil) {
          update();
        }
        draw(ctx);
      } else if (status === GameStatus.PAUSED) {
        draw(ctx);
      } else if (status === GameStatus.MENU) {
        drawMenu(ctx);
      } else if (status === GameStatus.GAME_OVER) {
        draw(ctx); // Draw frozen state
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGameOver(ctx);
      } else if (status === GameStatus.VICTORY) {
        draw(ctx);
        drawVictory(ctx);
      }

      animationFrameId = requestAnimationFrame(render);
    };
    
    const drawStars = (ctx: CanvasRenderingContext2D) => {
        const state = gameState.current;
        state.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > CANVAS_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * CANVAS_WIDTH;
            }
            if (Math.random() < 0.02) star.alpha = 0.3 + Math.random() * 0.7;
            ctx.shadowBlur = star.size * 3;
            ctx.shadowColor = star.color;
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.alpha;
            ctx.fillRect(star.x, star.y, star.size, star.size);
            ctx.globalAlpha = 1.0;
        });
        ctx.shadowBlur = 0;
    };

    const update = () => {
      const state = gameState.current;
      const now = Date.now();

      // Mobile Input Handling
      if (isMobile && mobileInputRef) {
          const inputX = mobileInputRef.current.x;
          const THRESHOLD = 0.1;
          state.keys.left = false;
          state.keys.right = false;
          if (inputX < -THRESHOLD) state.keys.left = true;
          else if (inputX > THRESHOLD) state.keys.right = true;
          
          if (state.playerCooldown > 0) state.playerCooldown--;
          if (state.playerCooldown <= 0) {
             state.keys.shoot = true;
             state.playerCooldown = 15; 
          }
      }

      const activeAliensCount = state.aliens.filter(a => a.active).length;
      if (state.totalAliens > 0) {
        const fractionLost = (state.totalAliens - activeAliensCount) / state.totalAliens;
        const chunks = Math.floor(fractionLost / 0.1);
        state.alienSpeed = ALIEN_SPEED_BASE * Math.pow(1.1, chunks);
      }

      if (state.keys.left) state.player.pos.x = Math.max(0, state.player.pos.x - PLAYER_SPEED);
      if (state.keys.right) state.player.pos.x = Math.min(CANVAS_WIDTH - state.player.width, state.player.pos.x + PLAYER_SPEED);

      // Shooting
      if (state.keys.shoot) {
        const bulletX = state.player.pos.x + state.player.width / 2 - 2;
        const bulletY = state.player.pos.y;
        createMuzzleFlash(bulletX + 2, bulletY);
        state.bullets.push({
          pos: { x: bulletX, y: bulletY },
          width: 4, height: 10, active: true, velocity: -BULLET_SPEED, isEnemy: false, symbol: '|', color: PALETTE.YELLOW
        });
        state.keys.shoot = false;
      }

      // Update Bullets
      state.bullets.forEach(b => {
        if (b.type === 'HOMING_LIGHTNING') {
            if (b.phase === 'ASCEND') {
                b.pos.y += b.vy || -4.5;
                if (b.pos.y < 40) b.phase = 'HOME';
            } else {
                const targetX = state.player.pos.x + state.player.width / 2;
                const targetY = state.player.pos.y + state.player.height / 2;
                const dx = targetX - b.pos.x;
                const dy = targetY - b.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const passedPlayer = b.pos.y > state.player.pos.y;

                if (dist > 0 && !passedPlayer) {
                    const speed = 7.5;
                    const targetVx = (dx / dist) * speed;
                    const targetVy = (dy / dist) * speed;
                    const steer = 0.2; 
                    b.vx = (b.vx || 0) + (targetVx - (b.vx || 0)) * steer;
                    b.vy = (b.vy || 0) + (targetVy - (b.vy || 0)) * steer;
                    const currentSpeed = Math.sqrt((b.vx*b.vx) + (b.vy*b.vy));
                    if (currentSpeed > speed) {
                        const ratio = speed / currentSpeed;
                        b.vx *= ratio;
                        b.vy *= ratio;
                    }
                }
                b.pos.x += b.vx || 0;
                b.pos.y += b.vy || 0;
            }
            if (b.pos.y > CANVAS_HEIGHT + 50 || b.pos.x < -50 || b.pos.x > CANVAS_WIDTH + 50) {
                b.active = false;
            }
        } else {
            b.pos.y += b.velocity;
            if (b.pos.y < 0 || b.pos.y > CANVAS_HEIGHT) b.active = false;
        }
      });

      // Collision: Player Bullet vs Aliens
      state.bullets.filter(b => !b.isEnemy && b.active).forEach(b => {
        state.aliens.filter(a => a.active).forEach(a => {
          if (
            b.pos.x < a.pos.x + a.width && b.pos.x + b.width > a.pos.x &&
            b.pos.y < a.pos.y + a.height && b.pos.y + b.height > a.pos.y
          ) {
            b.active = false;
            a.active = false;
            setScore(prev => prev + a.scoreValue);
            createExplosion(a.pos.x + a.width/2, a.pos.y + a.height/2, a.color);
          }
        });

        const ufo = state.ufo;
        if (ufo && ufo.active && b.active) {
           if (
            b.pos.x < ufo.pos.x + ufo.width && b.pos.x + b.width > ufo.pos.x &&
            b.pos.y < ufo.pos.y + ufo.height && b.pos.y + b.height > ufo.pos.y
          ) {
            b.active = false;
            ufo.active = false;
            setScore(prev => prev + ufo.scoreValue);
            
            const centerX = ufo.pos.x + ufo.width/2;
            const centerY = ufo.pos.y + ufo.height/2;
            createExplosion(centerX, centerY, ufo.color, true);
            const remainingAliens = state.aliens.filter(a => a.active);
            createLightningStorm(centerX, centerY, remainingAliens);
            
            state.chaosMode = true;
            state.pauseUntil = Date.now() + 1500;
            // End mothership sequence immediately if destroyed
            state.mothershipSequence.active = false;
            onLog("System: MOTHERSHIP DOWN. HIVE MIND SEVERED.");
            onLog("System: WARNING: ORBITAL DECAY DETECTED.");
            state.ufo = null;
          }
        }
      });

      // UFO Logic
      if (state.ufo) {
          state.ufo.pos.x += (state.ufo as any).velocityX;

          // Movement Logic: If attacking, patrol back and forth. If not, fly by.
          if (state.mothershipSequence.active) {
               // Patrol bounce logic
               if (state.ufo.pos.x > CANVAS_WIDTH - state.ufo.width - 10) {
                   state.ufo.pos.x = CANVAS_WIDTH - state.ufo.width - 10;
                   (state.ufo as any).velocityX *= -1;
               } else if (state.ufo.pos.x < 10) {
                   state.ufo.pos.x = 10;
                   (state.ufo as any).velocityX *= -1;
               }
          } else {
              // Normal fly-by / exit logic
              if ((state.ufo.pos.x > CANVAS_WIDTH + 60) || (state.ufo.pos.x < -60)) {
                  state.ufo = null;
              }
          }
      }
      
      // Spawn random UFO if not chaos mode and no current UFO
      if (!state.chaosMode && !state.ufo && Math.random() < 0.0015) { 
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction === 1 ? -50 : CANVAS_WIDTH + 10;
          state.ufo = {
              pos: { x: startX, y: 35 }, 
              width: 40, height: 20, active: true,
              row: -1, col: -1,
              scoreValue: 150,
              species: 'MOTHERSHIP',
              symbol: '<(^_^)>',
              color: PALETTE.RED
          };
          onLog("System: ALERT! High-velocity signature detected.");
          (state.ufo as any).velocityX = UFO_SPEED * direction;
      }

      // Mothership Attack Sequence Logic
      if (state.mothershipSequence.active && state.ufo && state.ufo.active) {
          const elapsed = now - state.mothershipSequence.startTime;
          
          // 1. Move back and forth for 7 seconds (handled in UFO movement above)
          // 2. Fire first missile after 7 seconds
          if (state.mothershipSequence.missilesFired === 0 && elapsed > 7000) {
               fireHomingMissile(state.ufo, -10); // Left side fire
               state.mothershipSequence.missilesFired = 1;
               state.mothershipSequence.lastMissileTime = now;
               createExplosion(state.ufo.pos.x, state.ufo.pos.y + 20, PALETTE.RED); // Muzzle flash
               onLog("System: MOTHERSHIP FIRING PRIMARY!");
          }
          // 3. Fire second missile 5 seconds later
          else if (state.mothershipSequence.missilesFired === 1 && now - state.mothershipSequence.lastMissileTime > 5000) {
               fireHomingMissile(state.ufo, state.ufo.width + 10); // Right side fire
               state.mothershipSequence.missilesFired = 2;
               // Attack sequence complete, allow UFO to fly off screen (by disabling active sequence)
               state.mothershipSequence.active = false;
               createExplosion(state.ufo.pos.x + state.ufo.width, state.ufo.pos.y + 20, PALETTE.RED);
               onLog("System: MOTHERSHIP DISENGAGING.");
          }
      }

      // Alien Movement Logic
      let hitEdge = false;
      const activeAliens = state.aliens.filter(a => a.active);
      
      if (activeAliens.length === 0) {
          setStatus(GameStatus.VICTORY);
          onLog("System: SECTOR CLEARED. EXCELLENT WORK.");
          return;
      }

      const fractionRemaining = state.totalAliens > 0 ? activeAliens.length / state.totalAliens : 0;

      if (state.chaosMode) {
          activeAliens.forEach(a => {
              const alien = a as any;
              if (!alien.fallSpeed) {
                  alien.fallSpeed = 1.1 + Math.random() * 3.3;
                  alien.driftFreq = 0.001 + Math.random() * 0.003; 
                  alien.driftOffset = Math.random() * Math.PI * 2;
                  alien.driftAmp = 4.4 + Math.random() * 4.4; 
                  alien.vxBias = (Math.random() - 0.5) * 2.2;
              }
              a.pos.y += alien.fallSpeed;
              const osc = Math.sin(now * alien.driftFreq + alien.driftOffset) * alien.driftAmp;
              a.pos.x += osc + alien.vxBias;
              if (a.pos.x <= 0) {
                  a.pos.x = 0;
                  alien.vxBias = Math.abs(alien.vxBias); 
                  alien.driftOffset += Math.PI;
              } else if (a.pos.x >= CANVAS_WIDTH - a.width) {
                  a.pos.x = CANVAS_WIDTH - a.width;
                  alien.vxBias = -Math.abs(alien.vxBias);
                  alien.driftOffset += Math.PI;
              }
              if (a.pos.y > CANVAS_HEIGHT) {
                  a.active = false;
                  createExplosion(a.pos.x, CANVAS_HEIGHT - 10, a.color);
              }
          });
          const playerHit = activeAliens.some(a => 
              a.active &&
              a.pos.x < state.player.pos.x + state.player.width &&
              a.pos.x + a.width > state.player.pos.x &&
              a.pos.y < state.player.pos.y + state.player.height &&
              a.pos.y + a.height > state.player.pos.y
          );
          if (playerHit) {
              setStatus(GameStatus.GAME_OVER);
              onLog("System: IMPACT DETECTED. HULL COMPROMISED.");
              createExplosion(state.player.pos.x, state.player.pos.y, PALETTE.CYAN, true);
          }

      } else if (fractionRemaining >= 0.5) {
          activeAliens.forEach(a => {
            a.pos.x += state.alienSpeed * state.alienDirection;
            if (a.pos.x <= 10 || a.pos.x >= CANVAS_WIDTH - 40) hitEdge = true;
          });
          if (hitEdge) {
            state.alienDirection *= -1;
            state.aliens.forEach(a => a.pos.y += ALIEN_DROP);
          }
          if (activeAliens.some(a => a.pos.y + a.height >= state.player.pos.y)) {
             setStatus(GameStatus.GAME_OVER);
             onLog("System: PERIMETER BREACHED. SYSTEM CRITICAL.");
          }
      } else {
          activeAliens.forEach(a => {
             const alien = a as any;
             if (typeof alien.vx !== 'number') {
                 alien.vx = (Math.random() - 0.5) * state.alienSpeed * 4;
                 alien.vy = (Math.random() - 0.5) * state.alienSpeed * 4;
             }
             let fx = 0, fy = 0; 
             activeAliens.forEach(other => {
                 if (other === a) return;
                 const dx = a.pos.x - other.pos.x;
                 const dy = a.pos.y - other.pos.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 const safeDist = 45; 
                 if (dist < safeDist && dist > 0) {
                     const pushFactor = (safeDist - dist) / safeDist;
                     fx += (dx / dist) * pushFactor * 0.8;
                     fy += (dy / dist) * pushFactor * 0.8;
                 }
             });
             const MARGIN = 30;
             const UPPER_ZONE_LIMIT = CANVAS_HEIGHT * 0.66;
             if (a.pos.x < MARGIN) fx += 0.4;
             if (a.pos.x > CANVAS_WIDTH - MARGIN) fx -= 0.4;
             if (a.pos.y < MARGIN) fy += 0.4;
             if (a.pos.y > UPPER_ZONE_LIMIT) fy -= 0.4;

             fx += (Math.random() - 0.5) * 0.25;
             fy += (Math.random() - 0.5) * 0.25;
             alien.vx += fx;
             alien.vy += fy;
             const speedCap = state.alienSpeed * 2.5; 
             const currentSpeed = Math.sqrt(alien.vx*alien.vx + alien.vy*alien.vy);
             if (currentSpeed > speedCap) {
                 alien.vx = (alien.vx / currentSpeed) * speedCap;
                 alien.vy = (alien.vy / currentSpeed) * speedCap;
             }
             if (currentSpeed < state.alienSpeed * 0.5) {
                 alien.vx *= 1.05;
                 alien.vy *= 1.05;
             }
             a.pos.x += alien.vx;
             a.pos.y += alien.vy;
          });
          if (activeAliens.some(a => a.pos.y + a.height >= state.player.pos.y)) {
             setStatus(GameStatus.GAME_OVER);
             onLog("System: PERIMETER BREACHED. SYSTEM CRITICAL.");
          }
      }

      // Alien Shooting
      if (state.attackCooldown > 0) state.attackCooldown--;
      
      const hasSpecialBullet = state.bullets.some(b => b.type === 'HOMING_LIGHTNING');
      if (!hasSpecialBullet && now - state.lastSpecialTime > 10000 && activeAliens.length > 0) {
          state.lastSpecialTime = now;
          const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
          state.bullets.push({
              pos: { x: shooter.pos.x + shooter.width/2, y: shooter.pos.y },
              width: 8, height: 8, active: true, velocity: 0, vx: 0, vy: -4.5,
              isEnemy: true, symbol: '@', color: PALETTE.CYAN, type: 'HOMING_LIGHTNING', phase: 'ASCEND'
          });
          onLog("System: WARNING: HOMING PROJECTILE DETECTED");
      }

      const fireEnemyBullet = (alien: Alien, colorOverride?: string, speedMult: number = 0.5, symbolOverride?: string) => {
           let speed = BULLET_SPEED * speedMult;
           let sym = symbolOverride || '!';
           let col = colorOverride || alien.color;
           if (alien.species === 'VANGUARD') { speed = BULLET_SPEED * 0.8; sym = '|'; } 
           else if (alien.species === 'DREADNOUGHT') { speed = BULLET_SPEED * 0.4; sym = '*'; col = PALETTE.WHITE; }
           state.bullets.push({
            pos: { x: alien.pos.x + alien.width/2 - 2, y: alien.pos.y + alien.height },
            width: 4, height: 10, active: true, velocity: speed, isEnemy: true, symbol: sym, color: col
           });
      };

      if (activeAliens.length > 0) {
          if (Math.random() < 0.01) {
             const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
             if (shooter.species === 'VANGUARD' || Math.random() > 0.5) fireEnemyBullet(shooter);
          }

          if (state.attackCooldown <= 0) {
              const pattern = Math.random();
              if (pattern < 0.3) {
                  const playerX = state.player.pos.x + state.player.width / 2;
                  const closest = activeAliens.reduce((prev, curr) => {
                      return (Math.abs((curr.pos.x + curr.width/2) - playerX) < Math.abs((prev.pos.x + prev.width/2) - playerX)) ? curr : prev;
                  });
                  fireEnemyBullet(closest, PALETTE.RED, 0.7, 'V');
                  onLog(`System: TARGETING LOCKED by ${closest.species}`);
              } else if (pattern < 0.6) {
                  const count = Math.min(activeAliens.length, 3);
                  const shooters = [...activeAliens].sort(() => 0.5 - Math.random()).slice(0, count);
                  shooters.forEach(s => fireEnemyBullet(s)); 
                  onLog("System: ALERT - PLASMA SURGE");
              } else if (pattern < 0.85) {
                  const sorted = [...activeAliens].sort((a, b) => a.pos.x - b.pos.x);
                  if (sorted.length >= 2) {
                      fireEnemyBullet(sorted[0], PALETTE.ELECTRIC_BLUE, 0.6, '/');
                      fireEnemyBullet(sorted[sorted.length-1], PALETTE.ELECTRIC_BLUE, 0.6, '\\');
                  }
              } else {
                   activeAliens.forEach(a => {
                       let chance = 0.1;
                       if (a.species === 'VANGUARD') chance = 0.25;
                       if (Math.random() < chance) fireEnemyBullet(a, PALETTE.YELLOW, 0.5, '|');
                   });
                   onLog("System: DANGER - BARRAGE INCOMING");
              }
              state.attackCooldown = 72 + Math.floor(Math.random() * 72);
          }
      }

      state.bullets.filter(b => b.isEnemy && b.active).forEach(b => {
          const hitBoxMargin = b.type === 'HOMING_LIGHTNING' ? 2 : 0;
          if (
            b.pos.x + hitBoxMargin < state.player.pos.x + state.player.width &&
            b.pos.x + b.width - hitBoxMargin > state.player.pos.x &&
            b.pos.y + hitBoxMargin < state.player.pos.y + state.player.height &&
            b.pos.y + b.height - hitBoxMargin > state.player.pos.y
          ) {
              b.active = false;
              if (state.player.shield && state.player.shield > 0) {
                  state.player.shield--;
                  createExplosion(state.player.pos.x + state.player.width/2, state.player.pos.y + state.player.height/2, '#00ff00');
                  onLog(state.player.shield === 0 ? "System: SHIELD DEPLETED!" : "System: SHIELD ABSORBING IMPACT.");
                  if (state.player.shield === 0) {
                       createExplosion(state.player.pos.x + state.player.width/2, state.player.pos.y + state.player.height/2, '#00FF00', true);
                  }
              } else {
                  setStatus(GameStatus.GAME_OVER);
                  onLog("System: CRITICAL MALFUNCTION. SIGNAL LOST.");
                  createExplosion(state.player.pos.x, state.player.pos.y, PALETTE.CYAN, true);
              }
          }
      });

      state.bullets = state.bullets.filter(b => b.active);
      updateParticles();
      updateLightning();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const state = gameState.current;
      ctx.font = '16px "Fira Code"';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left'; // Ensure alignment is reset from menu

      const drawNeonText = (text: string, x: number, y: number, color: string) => {
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.shadowBlur = 20; ctx.fillText(text, x, y);
          ctx.shadowBlur = 6; ctx.fillText(text, x, y);
          ctx.shadowBlur = 0; ctx.fillText(text, x, y);
      };

      drawNeonText(state.player.symbol, state.player.pos.x + 4.5, state.player.pos.y, state.player.color);
      
      // Draw Shield
      if (state.player.shield && state.player.shield > 0) {
        ctx.save();
        const shieldOpacity = state.player.shield === 1 ? 0.3 : 0.6;
        const pulse = Math.sin(Date.now() / 200) * 0.1;
        ctx.strokeStyle = `rgba(0, 255, 0, ${shieldOpacity + pulse})`;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;
        
        const centerX = state.player.pos.x + state.player.width / 2;
        const centerY = state.player.pos.y + state.player.height / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      state.aliens.filter(a => a.active).forEach(a => { drawNeonText(a.symbol, a.pos.x, a.pos.y, a.color); });
      drawLightning(ctx);
      if (state.ufo && state.ufo.active) { drawNeonText(state.ufo.symbol, state.ufo.pos.x, state.ufo.pos.y, state.ufo.color); }

      const time = Date.now();
      state.bullets.filter(b => b.isEnemy && b.active).forEach(b => {
         if (b.type === 'HOMING_LIGHTNING') {
             const flicker = Math.random() * 0.5 + 0.5;
             ctx.shadowBlur = 10 * flicker;
             ctx.shadowColor = b.color;
             ctx.fillStyle = '#E0FFFF'; 
             ctx.beginPath();
             ctx.arc(b.pos.x, b.pos.y, 3 + Math.random() * 1.5, 0, Math.PI * 2); 
             ctx.fill();
             ctx.strokeStyle = b.color; 
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             for(let i=0; i<4; i++) {
                 const angle = Math.random() * Math.PI * 2;
                 const len = 4 + Math.random() * 5; 
                 const midX = b.pos.x + Math.cos(angle) * len * 0.5 + (Math.random()-0.5)*3;
                 const midY = b.pos.y + Math.sin(angle) * len * 0.5 + (Math.random()-0.5)*3;
                 const endX = b.pos.x + Math.cos(angle) * len;
                 const endY = b.pos.y + Math.sin(angle) * len;
                 ctx.moveTo(b.pos.x, b.pos.y);
                 ctx.lineTo(midX, midY);
                 ctx.lineTo(endX, endY);
             }
             ctx.stroke();
             ctx.shadowBlur = 0;
         } else {
             drawNeonText(b.symbol, b.pos.x, b.pos.y, b.color);
         }
      });

      const playerBullets = state.bullets.filter(b => !b.isEnemy && b.active);
      if (playerBullets.length > 0) {
             const hue = (time * 0.5) % 360; 
             const cycleColor = `hsl(${hue}, 100%, 60%)`;
             const flicker = Math.sin(time * 0.1) > 0; 
             const glowIntensity = 15 + Math.sin(time * 0.05) * 8;
    
             ctx.save();
             ctx.font = 'bold 18px "Fira Code"';
             ctx.shadowColor = cycleColor;
             ctx.fillStyle = cycleColor;
             ctx.globalAlpha = 0.3;
             ctx.shadowBlur = 5;
             playerBullets.forEach(b => { ctx.fillText(b.symbol, b.pos.x, b.pos.y + 6); ctx.fillText(b.symbol, b.pos.x, b.pos.y + 12); });
             ctx.globalAlpha = 0.6;
             ctx.shadowBlur = glowIntensity * 2;
             playerBullets.forEach(b => { ctx.fillText(b.symbol, b.pos.x, b.pos.y); });
             ctx.globalAlpha = 1.0;
             ctx.shadowBlur = glowIntensity;
             ctx.fillStyle = flicker ? '#FFFFFF' : cycleColor;
             playerBullets.forEach(b => { ctx.fillText(b.symbol, b.pos.x, b.pos.y); });
             ctx.restore();
      }

      state.particles.forEach(p => {
          ctx.shadowBlur = p.life * 15;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life); 
          if (p.symbol === '💥' || p.symbol === '✦') {
             if (Math.random() > 0.2) {
                 ctx.font = `${p.width}px "Fira Code"`;
                 ctx.fillText(p.symbol, p.pos.x - (p.width/2), p.pos.y - (p.height/2));
             }
          } else {
             ctx.font = '16px "Fira Code"'; 
             ctx.fillText(p.symbol, p.pos.x, p.pos.y);
          }
          ctx.globalAlpha = 1.0;
      });
      ctx.font = '16px "Fira Code"'; 
      ctx.shadowBlur = 0;
    };

    const drawLightning = (ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        gameState.current.lightning.forEach(bolt => {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life * 0.6})`;
            ctx.lineWidth = 3 + Math.random() * 2;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
            if (bolt.path.length > 0) {
                ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
                for(let i=1; i<bolt.path.length; i++) { ctx.lineTo(bolt.path[i].x, bolt.path[i].y); }
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 5;
             if (bolt.path.length > 0) {
                ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
                for(let i=1; i<bolt.path.length; i++) { ctx.lineTo(bolt.path[i].x, bolt.path[i].y); }
            }
            ctx.stroke();
        });
        ctx.restore();
    }

    const drawMenu = (ctx: CanvasRenderingContext2D) => {
        ctx.shadowBlur = 40;
        ctx.shadowColor = PALETTE.PINK;
        ctx.fillStyle = PALETTE.PINK;
        ctx.font = '24px "Fira Code"';
        ctx.textAlign = 'center';
        ctx.fillText("PY_SPACE_INVADERS.EXE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
        ctx.shadowBlur = 10;
        ctx.font = '14px "Fira Code"';
        ctx.fillStyle = PALETTE.CYAN;
        if (isMobile) { ctx.fillText("TAP SCREEN OR JOYSTICK TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); } 
        else { ctx.fillText("INSERT COIN / PRESS [ENTER]", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); }
        ctx.fillStyle = '#aaa';
        ctx.font = '10px "Fira Code"';
        ctx.fillText("v1.5-SHIELD-UPGRADE | SYSTEM: ONLINE", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    };
    
    const drawGameOver = (ctx: CanvasRenderingContext2D) => {
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        const color = '#8B0000'; 

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 60px "Fira Code"';
        const glitchOffset = (Math.random() - 0.5) * 15;
        const mainJitterX = (Math.random() - 0.5) * 4;
        const mainJitterY = (Math.random() - 0.5) * 4;
        
        ctx.fillStyle = 'rgba(139, 0, 0, 0.4)'; 
        ctx.shadowBlur = 40;
        ctx.shadowColor = color;
        ctx.fillText("GAME OVER", centerX + glitchOffset, centerY - 10 + (Math.random() - 0.5) * 10);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 30; 
        ctx.fillText("GAME OVER", centerX + mainJitterX, centerY - 10 + mainJitterY);
        ctx.shadowBlur = 15; 
        ctx.fillText("GAME OVER", centerX + mainJitterX, centerY - 10 + mainJitterY);
        ctx.shadowBlur = 5; 
        ctx.fillText("GAME OVER", centerX + mainJitterX, centerY - 10 + mainJitterY);
        ctx.shadowBlur = 0;
        ctx.fillText("GAME OVER", centerX + mainJitterX, centerY - 10 + mainJitterY);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aaa';
        ctx.font = '16px "Fira Code"';
        ctx.fillText("SIGNAL LOST...", centerX, centerY + 40);

        if (Math.floor(Date.now() / 600) % 2 === 0) {
             ctx.fillStyle = PALETTE.CYAN;
             ctx.shadowBlur = 15;
             ctx.shadowColor = PALETTE.CYAN;
             ctx.font = '14px "Fira Code"';
             if (isMobile) { ctx.fillText("TAP TO RETRY", centerX, centerY + 70); } 
             else { ctx.fillText("PRESS [ENTER] TO RETRY", centerX, centerY + 70); }
        }
        ctx.restore();
    };

    const drawVictory = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(13, 2, 33, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.shadowBlur = 50;
        ctx.shadowColor = PALETTE.ELECTRIC_BLUE;
        ctx.fillStyle = PALETTE.ELECTRIC_BLUE;
        ctx.font = '30px "Fira Code"';
        ctx.textAlign = 'center';
        ctx.fillText("RADICAL!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Fira Code"';
        if (isMobile) { ctx.fillText("Sector Clear. TAP to Continue", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20); } 
        else { ctx.fillText("Sector Clear. [ENTER] to Continue", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20); }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, setScore, setStatus, onLog, isMobile, mobileInputRef, attackTrigger]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
          if (e.code === 'Enter') {
              if (status === GameStatus.MENU || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
                  setStatus(GameStatus.PLAYING);
              }
          }
      };
      const handleTouch = () => {
           if (isMobile && (status === GameStatus.MENU || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY)) {
               setStatus(GameStatus.PLAYING);
           }
      }

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('touchstart', handleTouch); 
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('touchstart', handleTouch);
      };
  }, [status, setStatus, isMobile]);

  return (
    <div 
        ref={containerRef}
        tabIndex={0}
        className="relative flex flex-col items-center w-full max-w-[600px] outline-none"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-black rounded border border-pink-900/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] max-w-full h-auto"
        style={{ 
            imageRendering: 'pixelated',
            boxShadow: `0 0 20px ${gameState.current.chaosMode ? 'rgba(255,0,0,0.2)' : 'rgba(0,243,255,0.1)'}`
        }}
      />
      {status === GameStatus.PAUSED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm rounded">
            <h2 className="text-3xl text-pink-500 font-bold mb-6 text-glow-strong tracking-widest animate-pulse">GAME PAUSED</h2>
            <button 
              onClick={() => {
                setStatus(GameStatus.PLAYING);
                containerRef.current?.focus();
              }}
              className="px-8 py-3 bg-cyan-900/50 hover:bg-cyan-600 border border-cyan-400 text-cyan-100 font-mono text-lg rounded shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] hover:scale-105"
            >
              RESUME PLAYING
            </button>
            <div className="mt-4 text-xs text-cyan-600/80">Click above to return to ship controls</div>
          </div>
      )}
    </div>
  );
};

export default GameCanvas;
