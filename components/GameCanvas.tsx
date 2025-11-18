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

// Alien Definitions
const ALIEN_TYPES: Record<Exclude<AlienSpecies, 'MOTHERSHIP'>, { symbol: string, color: string, score: number }> = {
  DREADNOUGHT: { symbol: '[<o>]', color: '#ff00ff', score: 40 },
  DESTROYER:   { symbol: '/-^-\\', color: '#00ffff', score: 20 },
  VANGUARD:    { symbol: '}w{',   color: '#ffff00', score: 10 },
};

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
    player: { pos: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 40 }, width: 30, height: 20, active: true, symbol: '_^_', color: '#00ff00' } as Entity,
    aliens: [] as Alien[],
    ufo: null as Alien | null,
    bullets: [] as Projectile[],
    particles: [] as Particle[],
    alienDirection: 1, // 1 for right, -1 for left
    alienSpeed: ALIEN_SPEED_BASE,
    keys: { left: false, right: false, shoot: false, shootPressed: false },
    attackCooldown: 60
  });

  // Initialize Aliens
  const initGame = () => {
    const rows = 5;
    const cols = 8;
    const aliens: Alien[] = [];
    
    for (let r = 0; r < rows; r++) {
      // Determine Species by Row
      let species: AlienSpecies = 'VANGUARD';
      if (r === 0) species = 'DREADNOUGHT';
      else if (r === 1 || r === 2) species = 'DESTROYER';
      
      // Safe lookup for non-Mothership types
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
          color: typeDef.color,
          species: species
        });
      }
    }
    
    gameState.current.aliens = aliens;
    gameState.current.ufo = null;
    gameState.current.bullets = [];
    gameState.current.particles = [];
    gameState.current.player.pos.x = CANVAS_WIDTH / 2 - 15;
    gameState.current.player.active = true;
    gameState.current.alienSpeed = ALIEN_SPEED_BASE;
    gameState.current.attackCooldown = 60;
    setScore(0);
    onLog("System: Initializing game entities...");
    onLog("System: Threat analysis - Dreadnoughts, Destroyers, and Vanguards detected.");
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
  }, []);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');

    const render = () => {
      if (!ctx || !canvasRef.current) return;

      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Scanline effect
      ctx.fillStyle = 'rgba(0, 255, 0, 0.02)';
      for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
          ctx.fillRect(0, i, CANVAS_WIDTH, 1);
      }

      if (status === GameStatus.PLAYING) {
        update();
        draw(ctx);
      } else if (status === GameStatus.MENU) {
        drawMenu(ctx);
      } else if (status === GameStatus.GAME_OVER) {
        draw(ctx); // Draw frozen state
        drawGameOver(ctx);
      } else if (status === GameStatus.VICTORY) {
        draw(ctx);
        drawVictory(ctx);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const update = () => {
      const state = gameState.current;

      // Player Movement
      if (state.keys.left) state.player.pos.x = Math.max(0, state.player.pos.x - PLAYER_SPEED);
      if (state.keys.right) state.player.pos.x = Math.min(CANVAS_WIDTH - state.player.width, state.player.pos.x + PLAYER_SPEED);

      // Shooting
      if (state.keys.shoot) {
        state.bullets.push({
          pos: { x: state.player.pos.x + state.player.width / 2 - 2, y: state.player.pos.y },
          width: 4,
          height: 10,
          active: true,
          velocity: -BULLET_SPEED,
          isEnemy: false,
          symbol: '|',
          color: '#ffff00'
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
            createExplosion(ufo.pos.x + ufo.width/2, ufo.pos.y + ufo.height/2, ufo.color);
            
            // Revenge Attack: Spawn Flaming Ball
            state.bullets.push({
                pos: { x: ufo.pos.x + ufo.width / 2 - 6, y: ufo.pos.y + ufo.height },
                width: 12,
                height: 12,
                active: true,
                velocity: 12, // Very fast drop
                isEnemy: true,
                symbol: '{O}',
                color: '#ff4400'
            });
            
            state.ufo = null;
            onLog("System: MOTHERSHIP DESTROYED. +150 PTS");
            onLog("System: WARNING! UNSTABLE CORE EJECTED!");
          }
        }
      });

      // UFO Logic
      if (!state.ufo && Math.random() < 0.0015) { // Approx every 10-12 seconds
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction === 1 ? -50 : CANVAS_WIDTH + 10;
          state.ufo = {
              pos: { x: startX, y: 35 }, // Fly high
              width: 40, height: 20, active: true,
              row: -1, col: -1,
              scoreValue: 150,
              species: 'MOTHERSHIP',
              symbol: '<(^_^)>',
              color: '#ff3333'
          };
          onLog("System: ALERT! Unknown bogey entering airspace.");
          // We store the direction in a custom property if we wanted, but simpler to just derive velocity from logic or store it in Entity?
          // For now, hack it by attaching velocity to the UFO entity or using a closure variable isn't great for RAF.
          // Let's assume UFO always moves towards the other side.
          (state.ufo as any).velocityX = UFO_SPEED * direction;
      }

      if (state.ufo) {
          state.ufo.pos.x += (state.ufo as any).velocityX;
          // Despawn
          if ((state.ufo.pos.x > CANVAS_WIDTH + 60) || (state.ufo.pos.x < -60)) {
              state.ufo = null;
          }
      }

      // Alien Movement
      let hitEdge = false;
      const activeAliens = state.aliens.filter(a => a.active);
      
      if (activeAliens.length === 0) {
          setStatus(GameStatus.VICTORY);
          onLog("System: All targets eliminated. Mission Accomplished.");
          return;
      }

      activeAliens.forEach(a => {
        a.pos.x += state.alienSpeed * state.alienDirection;
        if (a.pos.x <= 10 || a.pos.x >= CANVAS_WIDTH - 40) {
          hitEdge = true;
        }
      });

      if (hitEdge) {
        state.alienDirection *= -1;
        state.aliens.forEach(a => a.pos.y += ALIEN_DROP);
        state.alienSpeed += 0.05;
        
        // Check invasion
        if (activeAliens.some(a => a.pos.y + a.height >= state.player.pos.y)) {
           setStatus(GameStatus.GAME_OVER);
           onLog("System: CRITICAL FAILURE. Invasion successful.");
        }
      }

      // --- ALIEN SHOOTING LOGIC ---
      if (state.attackCooldown > 0) state.attackCooldown--;

      const fireEnemyBullet = (alien: Alien, colorOverride?: string, speedMult: number = 0.5, symbolOverride?: string) => {
           // Default values based on species
           let speed = BULLET_SPEED * speedMult;
           let sym = symbolOverride || '!';
           let col = colorOverride || alien.color;

           if (alien.species === 'VANGUARD') {
               speed = BULLET_SPEED * 0.8; // Vanguards shoot fast
               sym = '|';
           } else if (alien.species === 'DREADNOUGHT') {
               speed = BULLET_SPEED * 0.4; // Dreadnoughts shoot slow heavy shots
               sym = '*';
               col = '#ff00ff';
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
          // 1. Random Pot-shots (Vanguards are more aggressive)
          if (Math.random() < 0.01) {
             const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
             // Vanguards have double chance to actually fire when picked
             if (shooter.species === 'VANGUARD' || Math.random() > 0.5) {
                 fireEnemyBullet(shooter);
             }
          }

          // 2. Structured Attack Patterns
          if (state.attackCooldown <= 0) {
              const pattern = Math.random();
              
              if (pattern < 0.3) {
                  // TARGETED LOCK (Prioritize Dreadnoughts for heavy hits)
                  const playerX = state.player.pos.x + state.player.width / 2;
                  const closest = activeAliens.reduce((prev, curr) => {
                      return (Math.abs((curr.pos.x + curr.width/2) - playerX) < Math.abs((prev.pos.x + prev.width/2) - playerX)) ? curr : prev;
                  });
                  fireEnemyBullet(closest, '#ffaa00', 0.7, 'V');
                  onLog(`System: WARN - Precision shot from ${closest.species}`);
              } 
              else if (pattern < 0.6) {
                  // VOLLEY: 3 Random Aliens
                  const count = Math.min(activeAliens.length, 3);
                  const shooters = [...activeAliens].sort(() => 0.5 - Math.random()).slice(0, count);
                  shooters.forEach(s => fireEnemyBullet(s)); 
                  onLog("System: ALERT - Volley Fire Incoming");
              }
              else if (pattern < 0.85) {
                  // FLANK
                  const sorted = [...activeAliens].sort((a, b) => a.pos.x - b.pos.x);
                  if (sorted.length >= 2) {
                      fireEnemyBullet(sorted[0], '#00ffff', 0.6, '/');
                      fireEnemyBullet(sorted[sorted.length-1], '#00ffff', 0.6, '\\');
                  }
              }
              else {
                   // SATURATION: (Prefer Vanguards)
                   activeAliens.forEach(a => {
                       let chance = 0.1;
                       if (a.species === 'VANGUARD') chance = 0.25;
                       if (Math.random() < chance) fireEnemyBullet(a, '#ff4444', 0.5, '|');
                   });
                   onLog("System: DANGER - Saturation Fire");
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
              onLog("System: PLAYER DESTROYED. GAME OVER.");
              createExplosion(state.player.pos.x, state.player.pos.y, '#00ff00');
          }
      });

      state.bullets = state.bullets.filter(b => b.active);
      updateParticles();
    };

    const updateParticles = () => {
        const state = gameState.current;
        state.particles.forEach(p => {
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            p.life -= 0.05;
            if (p.life <= 0) p.active = false;
        });
        state.particles = state.particles.filter(p => p.active);
    }

    const createExplosion = (x: number, y: number, color: string) => {
        for (let i = 0; i < 8; i++) {
            gameState.current.particles.push({
                pos: {x, y},
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                life: 1.0,
                active: true,
                width: 2,
                height: 2,
                symbol: '.',
                color: color
            });
        }
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
      const state = gameState.current;
      ctx.font = '16px "Fira Code"';
      ctx.textBaseline = 'top';

      // Player
      ctx.fillStyle = state.player.color;
      ctx.fillText(state.player.symbol, state.player.pos.x, state.player.pos.y);

      // Aliens
      state.aliens.filter(a => a.active).forEach(a => {
        ctx.fillStyle = a.color;
        ctx.fillText(a.symbol, a.pos.x, a.pos.y);
      });

      // UFO
      if (state.ufo && state.ufo.active) {
          ctx.fillStyle = state.ufo.color;
          ctx.fillText(state.ufo.symbol, state.ufo.pos.x, state.ufo.pos.y);
      }

      // Bullets
      state.bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillText(b.symbol, b.pos.x, b.pos.y);
      });

      // Particles
      state.particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillText(p.symbol, p.pos.x, p.pos.y);
          ctx.globalAlpha = 1.0;
      });
    };

    const drawMenu = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#00ff00';
        ctx.font = '24px "Fira Code"';
        ctx.textAlign = 'center';
        ctx.fillText("PY_SPACE_INVADERS.EXE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
        
        ctx.font = '14px "Fira Code"';
        ctx.fillStyle = '#cccccc';
        ctx.fillText("Press [ENTER] to Initialize", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        ctx.fillStyle = '#555';
        ctx.font = '10px "Fira Code"';
        ctx.fillText("v1.1.0 | Types: Dreadnought, Destroyer, Vanguard", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    };

    const drawGameOver = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = '30px "Fira Code"';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Fira Code"';
        ctx.fillText("Press [ENTER] to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    };

    const drawVictory = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '30px "Fira Code"';
        ctx.textAlign = 'center';
        ctx.fillText("VICTORY!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Fira Code"';
        ctx.fillText("Mission Success. Press [ENTER] to Re-deploy", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
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
    <div className="relative border-2 border-gray-700 bg-black rounded-sm shadow-[0_0_15px_rgba(0,255,0,0.2)]">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
        style={{ cursor: 'none' }}
      />
    </div>
  );
};

export default GameCanvas;