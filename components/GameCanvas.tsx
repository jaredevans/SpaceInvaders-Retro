import React, { useEffect, useRef } from 'react';
import { Alien, AlienSpecies, Entity, GameStatus, Particle, Projectile } from '../types';

// Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 6;
const ALIEN_SPEED_BASE = 0.5;
const ALIEN_DROP = 20;
const UFO_SPEED = 3;

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
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, setStatus, score, setScore, onLog }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable game state (refs for performance in RAF loop)
  const gameState = useRef({
    player: { pos: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 40 }, width: 30, height: 20, active: true, symbol: '_^_', color: PALETTE.CYAN } as Entity,
    aliens: [] as Alien[],
    totalAliens: 0, // Track initial count for percentage calculations
    ufo: null as Alien | null,
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
    attackCooldown: 60
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
    gameState.current.bullets = [];
    gameState.current.particles = [];
    gameState.current.lightning = [];
    gameState.current.player.pos.x = CANVAS_WIDTH / 2 - 15;
    gameState.current.player.active = true;
    gameState.current.alienSpeed = ALIEN_SPEED_BASE;
    gameState.current.attackCooldown = 60;
    gameState.current.chaosMode = false;
    gameState.current.pauseUntil = 0;
    setScore(0);
    onLog("System: Initializing Chromatic_Wave...");
    onLog("System: Multi-spectrum targets detected.");
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      initGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (status === GameStatus.MENU) {
        drawMenu(ctx);
      } else if (status === GameStatus.GAME_OVER) {
        draw(ctx); // Draw frozen state
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else if (status === GameStatus.VICTORY) {
        draw(ctx);
        drawVictory(ctx);
      }

      animationFrameId = requestAnimationFrame(render);
    };
    
    const drawStars = (ctx: CanvasRenderingContext2D) => {
        const state = gameState.current;
        
        state.stars.forEach(star => {
            // Update
            star.y += star.speed;
            if (star.y > CANVAS_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * CANVAS_WIDTH;
            }
            // Twinkle
            if (Math.random() < 0.02) star.alpha = 0.3 + Math.random() * 0.7;

            // Draw with colored glow
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

      // Calculate Alien Speed based on percentage remaining
      const activeAliensCount = state.aliens.filter(a => a.active).length;
      if (state.totalAliens > 0) {
        const fractionLost = (state.totalAliens - activeAliensCount) / state.totalAliens;
        const chunks = Math.floor(fractionLost / 0.1);
        state.alienSpeed = ALIEN_SPEED_BASE * Math.pow(1.1, chunks);
      }

      // Player Movement
      if (state.keys.left) state.player.pos.x = Math.max(0, state.player.pos.x - PLAYER_SPEED);
      if (state.keys.right) state.player.pos.x = Math.min(CANVAS_WIDTH - state.player.width, state.player.pos.x + PLAYER_SPEED);

      // Shooting
      if (state.keys.shoot) {
        const bulletX = state.player.pos.x + state.player.width / 2 - 2;
        const bulletY = state.player.pos.y;

        createMuzzleFlash(bulletX + 2, bulletY);

        state.bullets.push({
          pos: { x: bulletX, y: bulletY },
          width: 4,
          height: 10,
          active: true,
          velocity: -BULLET_SPEED,
          isEnemy: false,
          symbol: '|',
          color: PALETTE.YELLOW
        });
        state.keys.shoot = false;
      }

      // Update Bullets
      state.bullets.forEach(b => {
        b.pos.y += b.velocity;
        if (b.pos.y < 0 || b.pos.y > CANVAS_HEIGHT) b.active = false;
      });

      // Collision: Player Bullet vs Aliens
      state.bullets.filter(b => !b.isEnemy && b.active).forEach(b => {
        // Check standard aliens
        state.aliens.filter(a => a.active).forEach(a => {
          if (
            b.pos.x < a.pos.x + a.width &&
            b.pos.x + b.width > a.pos.x &&
            b.pos.y < a.pos.y + a.height &&
            b.pos.y + b.height > a.pos.y
          ) {
            b.active = false;
            a.active = false;
            setScore(prev => prev + a.scoreValue);
            createExplosion(a.pos.x + a.width/2, a.pos.y + a.height/2, a.color);
          }
        });

        // Check UFO
        const ufo = state.ufo;
        if (ufo && ufo.active && b.active) {
           if (
            b.pos.x < ufo.pos.x + ufo.width &&
            b.pos.x + b.width > ufo.pos.x &&
            b.pos.y < ufo.pos.y + ufo.height &&
            b.pos.y + b.height > ufo.pos.y
          ) {
            b.active = false;
            ufo.active = false;
            setScore(prev => prev + ufo.scoreValue);
            
            // Massive visual effects
            const centerX = ufo.pos.x + ufo.width/2;
            const centerY = ufo.pos.y + ufo.height/2;
            createExplosion(centerX, centerY, ufo.color, true);
            
            // Lightning flash to all active aliens
            const remainingAliens = state.aliens.filter(a => a.active);
            createLightningStorm(centerX, centerY, remainingAliens);
            
            // TRIGGER CHAOS MODE
            state.chaosMode = true;
            state.pauseUntil = Date.now() + 1500; // 1.5s hit-stop
            onLog("System: MOTHERSHIP DOWN. HIVE MIND SEVERED.");
            onLog("System: WARNING: ORBITAL DECAY DETECTED.");
            
            state.ufo = null;
          }
        }
      });

      // UFO Logic (Spawn if not Chaos Mode)
      if (!state.chaosMode && !state.ufo && Math.random() < 0.0015) { 
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction === 1 ? -50 : CANVAS_WIDTH + 10;
          state.ufo = {
              pos: { x: startX, y: 35 }, // Fly high
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

      if (state.ufo) {
          state.ufo.pos.x += (state.ufo as any).velocityX;
          if ((state.ufo.pos.x > CANVAS_WIDTH + 60) || (state.ufo.pos.x < -60)) {
              state.ufo = null;
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

      // --- MOVEMENT LOGIC SWITCH ---
      if (state.chaosMode) {
          // CHAOS MODE: Glide randomly down with swooping
          activeAliens.forEach(a => {
              const alien = a as any;
              // Initialize drift props if needed
              if (!alien.fallSpeed) {
                  alien.fallSpeed = 1.0 + Math.random() * 3.0;
                  // Slower frequency for wider, smoother swoops (0.001 - 0.003)
                  alien.driftFreq = 0.001 + Math.random() * 0.003; 
                  alien.driftOffset = Math.random() * Math.PI * 2;
                  // Larger amplitude for velocity (sway speed)
                  alien.driftAmp = 4 + Math.random() * 4; 
                  // Add a constant drift bias
                  alien.vxBias = (Math.random() - 0.5) * 2;
              }

              // Move down
              a.pos.y += alien.fallSpeed;
              
              // Swooping motion (Sinusoidal velocity + Bias)
              const osc = Math.sin(now * alien.driftFreq + alien.driftOffset) * alien.driftAmp;
              a.pos.x += osc + alien.vxBias;

              // Bounce off walls
              if (a.pos.x <= 0) {
                  a.pos.x = 0;
                  alien.vxBias = Math.abs(alien.vxBias); 
                  alien.driftOffset += Math.PI; // Flip phase
              } else if (a.pos.x >= CANVAS_WIDTH - a.width) {
                  a.pos.x = CANVAS_WIDTH - a.width;
                  alien.vxBias = -Math.abs(alien.vxBias);
                  alien.driftOffset += Math.PI;
              }

              // Die if they hit bottom
              if (a.pos.y > CANVAS_HEIGHT) {
                  a.active = false;
                  createExplosion(a.pos.x, CANVAS_HEIGHT - 10, a.color);
              }
          });

          // Check Collision with Player (Fatal)
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
          // Standard Grid Movement (>= 50%)
          activeAliens.forEach(a => {
            a.pos.x += state.alienSpeed * state.alienDirection;
            if (a.pos.x <= 10 || a.pos.x >= CANVAS_WIDTH - 40) {
              hitEdge = true;
            }
          });

          if (hitEdge) {
            state.alienDirection *= -1;
            state.aliens.forEach(a => a.pos.y += ALIEN_DROP);
          }

          // Normal Invasion Check
          if (activeAliens.some(a => a.pos.y + a.height >= state.player.pos.y)) {
             setStatus(GameStatus.GAME_OVER);
             onLog("System: PERIMETER BREACHED. SYSTEM CRITICAL.");
          }

      } else {
          // Swarm Movement (< 50%) - UPPER 66% ZONE
          activeAliens.forEach(a => {
             const alien = a as any;
             if (typeof alien.vx !== 'number') {
                 alien.vx = (Math.random() - 0.5) * state.alienSpeed * 4;
                 alien.vy = (Math.random() - 0.5) * state.alienSpeed * 4;
             }

             let fx = 0;
             let fy = 0; 

             // Separation
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

             // Boundaries
             const MARGIN = 30;
             const UPPER_ZONE_LIMIT = CANVAS_HEIGHT * 0.66; // Approx 330px (66%)

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

          // Normal Invasion Check
          if (activeAliens.some(a => a.pos.y + a.height >= state.player.pos.y)) {
             setStatus(GameStatus.GAME_OVER);
             onLog("System: PERIMETER BREACHED. SYSTEM CRITICAL.");
          }
      }

      // --- ALIEN SHOOTING LOGIC ---
      if (state.attackCooldown > 0) state.attackCooldown--;

      const fireEnemyBullet = (alien: Alien, colorOverride?: string, speedMult: number = 0.5, symbolOverride?: string) => {
           let speed = BULLET_SPEED * speedMult;
           let sym = symbolOverride || '!';
           let col = colorOverride || alien.color;

           if (alien.species === 'VANGUARD') {
               speed = BULLET_SPEED * 0.8; 
               sym = '|';
           } else if (alien.species === 'DREADNOUGHT') {
               speed = BULLET_SPEED * 0.4; 
               sym = '*';
               col = PALETTE.WHITE;
           }

           state.bullets.push({
            pos: { x: alien.pos.x + alien.width/2 - 2, y: alien.pos.y + alien.height },
            width: 4,
            height: 10,
            active: true,
            velocity: speed,
            isEnemy: true,
            symbol: sym,
            color: col
        });
      };

      if (activeAliens.length > 0) {
          if (Math.random() < 0.01) {
             const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
             if (shooter.species === 'VANGUARD' || Math.random() > 0.5) {
                 fireEnemyBullet(shooter);
             }
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
              } 
              else if (pattern < 0.6) {
                  const count = Math.min(activeAliens.length, 3);
                  const shooters = [...activeAliens].sort(() => 0.5 - Math.random()).slice(0, count);
                  shooters.forEach(s => fireEnemyBullet(s)); 
                  onLog("System: ALERT - PLASMA SURGE");
              }
              else if (pattern < 0.85) {
                  const sorted = [...activeAliens].sort((a, b) => a.pos.x - b.pos.x);
                  if (sorted.length >= 2) {
                      fireEnemyBullet(sorted[0], PALETTE.ELECTRIC_BLUE, 0.6, '/');
                      fireEnemyBullet(sorted[sorted.length-1], PALETTE.ELECTRIC_BLUE, 0.6, '\\');
                  }
              }
              else {
                   activeAliens.forEach(a => {
                       let chance = 0.1;
                       if (a.species === 'VANGUARD') chance = 0.25;
                       if (Math.random() < chance) fireEnemyBullet(a, PALETTE.YELLOW, 0.5, '|');
                   });
                   onLog("System: DANGER - BARRAGE INCOMING");
              }

              state.attackCooldown = 80 + Math.floor(Math.random() * 80);
          }
      }

      // Collision: Enemy Bullet vs Player
      state.bullets.filter(b => b.isEnemy && b.active).forEach(b => {
          if (
            b.pos.x < state.player.pos.x + state.player.width &&
            b.pos.x + b.width > state.player.pos.x &&
            b.pos.y < state.player.pos.y + state.player.height &&
            b.pos.y + b.height > state.player.pos.y
          ) {
              b.active = false;
              setStatus(GameStatus.GAME_OVER);
              onLog("System: CRITICAL MALFUNCTION. SIGNAL LOST.");
              createExplosion(state.player.pos.x, state.player.pos.y, PALETTE.CYAN, true);
          }
      });

      state.bullets = state.bullets.filter(b => b.active);
      updateParticles();
      updateLightning();
    };

    const updateParticles = () => {
        const state = gameState.current;
        state.particles.forEach(p => {
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            
            // Friction/Drag to simulate atmosphere
            p.velocity.x *= 0.92;
            p.velocity.y *= 0.92;
            
            p.life -= 0.025;
            if (p.life <= 0) p.active = false;
        });
        state.particles = state.particles.filter(p => p.active);
    }

    const updateLightning = () => {
        const state = gameState.current;
        state.lightning.forEach(l => l.life -= 0.05); // Lasts ~20 frames
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
                // Jitter
                path.push({
                    x: mx + (Math.random() - 0.5) * 40, 
                    y: my + (Math.random() - 0.5) * 40
                });
            }
            path.push({x: endX, y: endY});
            
            bolts.push({
                path,
                life: 1.0,
                color: '#ffffff'
            });
        });
        gameState.current.lightning = bolts;
    }

    const createMuzzleFlash = (x: number, y: number) => {
        // Burst of small, bright particles
        for (let i = 0; i < 6; i++) {
            gameState.current.particles.push({
                pos: { x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4 },
                velocity: {
                    x: (Math.random() - 0.5) * 5,
                    y: (Math.random() - 0.5) * 5
                },
                life: 0.3, // Very short life
                active: true,
                width: 2,
                height: 2,
                symbol: '●',
                color: Math.random() > 0.5 ? PALETTE.WHITE : PALETTE.YELLOW
            });
        }
        // Center Flash
        gameState.current.particles.push({
            pos: { x: x - 3, y: y - 3 },
            velocity: { x: 0, y: 0 },
            life: 0.1,
            active: true,
            width: 6,
            height: 6,
            symbol: '☼',
            color: '#fff'
        });
    }

    const createExplosion = (x: number, y: number, color: string, isMassive: boolean = false) => {
        const particleCount = isMassive ? 120 : 20;
        
        // Shockwave / Core
        gameState.current.particles.push({
            pos: { x, y },
            velocity: { x: 0, y: 0 },
            life: isMassive ? 2.0 : 1.0,
            active: true,
            width: isMassive ? 60 : 15,
            height: isMassive ? 60 : 15,
            symbol: '💥', // Special char for core
            color: '#FFF'
        });

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (isMassive ? 15 : 6);
            
            // Multicolor for massive explosions
            const pColor = isMassive 
                ? [PALETTE.RED, PALETTE.ORANGE, PALETTE.YELLOW, PALETTE.PURPLE, PALETTE.WHITE][Math.floor(Math.random()*5)]
                : (Math.random() > 0.3 ? color : PALETTE.WHITE);

            gameState.current.particles.push({
                pos: { x, y },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                life: isMassive ? (2.0 + Math.random()) : (0.8 + Math.random() * 0.6),
                active: true,
                width: Math.random() > 0.5 ? 3 : 2,
                height: Math.random() > 0.5 ? 3 : 2,
                symbol: Math.random() > 0.7 ? (isMassive ? '#' : '*') : '.',
                color: pColor
            });
        }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const state = gameState.current;
      ctx.font = '16px "Fira Code"';
      ctx.textBaseline = 'top';

      // Helper: Multi-layered Neon Bloom
      // Draws text 3 times with varying blur to simulate neon light
      const drawNeonText = (text: string, x: number, y: number, color: string) => {
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          
          // Layer 1: Wide Soft Glow (Ambient)
          ctx.shadowBlur = 20;
          ctx.fillText(text, x, y);
          
          // Layer 2: Tight Intense Glow (Definition)
          ctx.shadowBlur = 6;
          ctx.fillText(text, x, y);
          
          // Layer 3: Core (Sharpness)
          ctx.shadowBlur = 0;
          ctx.fillText(text, x, y);
      };

      // Player (Neon Cyan)
      drawNeonText(state.player.symbol, state.player.pos.x, state.player.pos.y, state.player.color);

      // Aliens (Mixed Palette)
      state.aliens.filter(a => a.active).forEach(a => {
        drawNeonText(a.symbol, a.pos.x, a.pos.y, a.color);
      });

      // Lightning (Behind UFO, In Front of Aliens)
      drawLightning(ctx);

      // UFO (Red/Pink)
      if (state.ufo && state.ufo.active) {
          drawNeonText(state.ufo.symbol, state.ufo.pos.x, state.ufo.pos.y, state.ufo.color);
      }

      // Bullets
      const time = Date.now();
      state.bullets.forEach(b => {
        // Bullets use the standard neon renderer but we can modulate opacity/color elsewhere if needed
        drawNeonText(b.symbol, b.pos.x, b.pos.y, b.color);
      });

      // Particles
      state.particles.forEach(p => {
          ctx.shadowBlur = p.life * 15;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life); 
          
          // Check if it's a "core" explosion particle
          if (p.symbol === '💥') {
             // Flash effect
             if (Math.random() > 0.5) {
                 ctx.font = `${p.width}px "Fira Code"`;
                 ctx.fillText(p.symbol, p.pos.x - (p.width/2), p.pos.y - (p.height/2));
             }
          } else {
             // Scale text based on life - shrinking effect
             const size = Math.max(10, p.width * 4 * p.life);
             ctx.font = `${size}px "Fira Code"`; 
             ctx.fillText(p.symbol, p.pos.x, p.pos.y);
          }
          
          ctx.globalAlpha = 1.0;
          ctx.font = '16px "Fira Code"'; // Reset font
      });

      // Reset shadow properties
      ctx.shadowBlur = 0;
    };

    const drawLightning = (ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        gameState.current.lightning.forEach(bolt => {
            // Pass 1: Wide Glow
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life * 0.6})`;
            ctx.lineWidth = 3 + Math.random() * 2;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
            
            if (bolt.path.length > 0) {
                ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
                for(let i=1; i<bolt.path.length; i++) {
                    ctx.lineTo(bolt.path[i].x, bolt.path[i].y);
                }
            }
            ctx.stroke();

            // Pass 2: Tight Core
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 5;
            
             if (bolt.path.length > 0) {
                ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
                for(let i=1; i<bolt.path.length; i++) {
                    ctx.lineTo(bolt.path[i].x, bolt.path[i].y);
                }
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
        ctx.fillText("INSERT COIN / PRESS [ENTER]", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        ctx.fillStyle = '#aaa';
        ctx.font = '10px "Fira Code"';
        ctx.fillText("v1.3-NEON_DREAM | SYSTEM: ONLINE", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
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
        ctx.fillText("Sector Clear. [ENTER] to Continue", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, setScore, setStatus, onLog]);

  // Menu controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Enter') {
              if (status === GameStatus.MENU || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
                  setStatus(GameStatus.PLAYING);
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, setStatus]);

  return (
    <div className="relative border-2 border-cyan-500/40 bg-[#050010] rounded-sm shadow-[0_0_50px_rgba(0,243,255,0.3)] overflow-hidden" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
        style={{ cursor: 'none' }}
      />

      {/* GAME OVER OVERLAY */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 pointer-events-auto">
            <h1 className="text-red-500 font-bold text-4xl mb-4 text-glow-strong font-mono animate-pulse">SYSTEM FAILURE</h1>
            <p className="text-gray-400 text-xs animate-pulse">PRESS [ENTER] TO REBOOT SYSTEM</p>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;