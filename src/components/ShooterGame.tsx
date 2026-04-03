import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Box, Cylinder } from '@react-three/drei';
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Minimize } from 'lucide-react';

// --- TUTORIAL ---
const TUTORIAL_STEPS = {
  en: [
    { title: "WELCOME TO CYBER ARENA", text: "Let's get you ready for combat. This tutorial will guide you through the basics.", isAction: false },
    { title: "MOVEMENT", text: "Try it now: Use WASD keys to move your character. On mobile, use the left joystick.", isAction: true },
    { title: "AIMING & SHOOTING", text: "Try it now: Use your MOUSE to aim and LEFT CLICK to shoot. On mobile, use the right joystick.", isAction: true },
    { title: "WEAPON SYSTEM", text: "Enemies have a chance to drop weapons like Shotguns or Machine Guns. Walk over them to pick them up!", isAction: true },
    { title: "RELOADING", text: "Try it now: Press R to reload manually. Your ammo is shown in the bottom right.", isAction: true },
    { title: "ABILITIES", text: "Try it now: Press Q for a Shockwave and E for a Shield. Watch the cooldowns!", isAction: true },
    { title: "HEALTH & POWERUPS", text: "Restore HP by picking up green Health Packs from enemies or clicking the Health icon on your HUD.", isAction: true },
    { title: "DRONES", text: "As your score increases, support drones will automatically spawn to assist you in combat.", isAction: false },
    { title: "DIMENSION PORTALS", text: "Look for the purple rings. They allow you to switch between different arenas.", isAction: false },
    { title: "READY FOR COMBAT", text: "Tutorial complete! Enemies are about to spawn. Good luck, soldier!", isAction: false }
  ],
  de: [
    { title: "WILLKOMMEN IN DER CYBER ARENA", text: "Bereiten wir dich auf den Kampf vor. Dieses Tutorial führt dich durch die Grundlagen.", isAction: false },
    { title: "BEWEGUNG", text: "Probier es aus: Nutze die WASD-Tasten zum Bewegen. Auf dem Handy nutzt du den linken Joystick.", isAction: true },
    { title: "ZIELEN & SCHIESSEN", text: "Probier es aus: Nutze die MAUS zum Zielen und LINKSKLICK zum Schießen. Auf dem Handy nutzt du den rechten Joystick.", isAction: true },
    { title: "WAFFENSYSTEM", text: "Gegner können Waffen wie Schrotflinten oder Maschinengewehre fallen lassen. Laufe darüber, um sie aufzusammeln!", isAction: true },
    { title: "NACHLADEN", text: "Probier es aus: Drücke R zum manuellen Nachladen. Deine Munition siehst du unten rechts.", isAction: true },
    { title: "FÄHIGKEITEN", text: "Probier es aus: Drücke Q für eine Schockwelle und E für einen Schild. Achte auf die Abklingzeiten!", isAction: true },
    { title: "GESUNDHEIT & POWERUPS", text: "Stelle HP wieder her, indem du grüne Medipacks von Gegnern aufsammelst oder auf das Herz-Symbol im HUD klickst.", isAction: true },
    { title: "DROHNEN", text: "Wenn dein Score steigt, erscheinen automatisch Drohnen, die dich im Kampf unterstützen.", isAction: false },
    { title: "DIMENSIONS-PORTALE", text: "Suche nach den lila Ringen. Sie ermöglichen den Wechsel zwischen verschiedenen Arenen.", isAction: false },
    { title: "BEREIT FÜR DEN KAMPF", text: "Tutorial beendet! Die Gegner werden gleich erscheinen. Viel Glück, Soldat!", isAction: false }
  ]
};

const TutorialOverlay = ({ onComplete, onSkip, step, setStep, language, setLanguage, isHidden, setIsHidden }: { onComplete: () => void, onSkip: () => void, step: number, setStep: (s: number | ((s: number) => number)) => void, language: 'en' | 'de' | null, setLanguage: (l: 'en' | 'de') => void, isHidden: boolean, setIsHidden: (h: boolean) => void }) => {
  if (!language) {
    return (
      <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-900 border-2 border-cyan-500 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_30px_rgba(6,182,212,0.3)]"
        >
          <h2 className="text-3xl font-black text-cyan-400 mb-8 tracking-tighter">SELECT LANGUAGE</h2>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => { setLanguage('en'); soundManager.playMenuClick(); }}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              ENGLISH
            </button>
            <button 
              onClick={() => { setLanguage('de'); soundManager.playMenuClick(); }}
              className="px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              DEUTSCH
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentSteps = TUTORIAL_STEPS[language];
  const currentStep = currentSteps[step];

  const nextStep = () => {
    if (step < currentSteps.length - 1) {
      setStep(s => s + 1);
      soundManager.playMenuClick();
    } else {
      onComplete();
    }
  };

  if (isHidden) return null;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
      <motion.div 
        key={step}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gray-900 border-2 border-cyan-500 p-8 rounded-2xl max-w-md w-full text-center pointer-events-auto shadow-[0_0_50px_rgba(6,182,212,0.3)]"
      >
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black font-black px-4 py-1 rounded-lg text-xs tracking-widest uppercase">
          TUTORIAL {step + 1}/{currentSteps.length}
        </div>
        
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase italic">{currentStep.title}</h3>
        <p className="text-gray-300 text-base leading-relaxed mb-8 font-medium">{currentStep.text}</p>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <button 
              onClick={onSkip}
              className="flex-1 px-4 py-3 text-gray-500 hover:text-white font-bold text-xs tracking-widest transition-colors uppercase border border-white/10 rounded-xl"
            >
              {language === 'en' ? 'Skip' : 'Überspringen'}
            </button>
            
            <button 
              onClick={currentStep.isAction ? () => setIsHidden(true) : nextStep}
              className="flex-[2] px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] uppercase tracking-tighter"
            >
              {currentStep.isAction 
                ? (language === 'en' ? 'Try it now' : 'Jetzt ausprobieren')
                : (step === currentSteps.length - 1 
                  ? (language === 'en' ? 'Start Game' : 'Spiel starten') 
                  : (language === 'en' ? 'Next' : 'Weiter'))}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- FULLSCREEN BUTTON ---
const FullscreenButton = ({ isInline = false }: { isInline?: boolean }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isInline) {
    return (
      <button 
        onClick={toggleFullscreen} 
        className="px-8 py-4 bg-purple-600 text-white text-xl font-bold rounded-xl flex items-center justify-center gap-2"
      >
        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
      </button>
    );
  }

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute top-6 right-6 z-60 p-3 bg-black/50 border border-white/20 rounded-full text-white hover:bg-white/20 backdrop-blur-sm pointer-events-auto"
    >
      {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
    </button>
  );
};

// --- GLOBAL STATE & INPUT ---
const inputRef = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  mouseNDC: new THREE.Vector2(0, 0),
  isShooting: false,
  isMobileAiming: false,
  justShot: false,
  keys: { w: false, a: false, s: false, d: false, space: false, r: false, q: false, e: false },
  abilities: { q: false, e: false }
};

const ENEMY_SPEED = 5;
const PLAYER_SPEED = 12;
const MAX_PARTICLES = 2000;
const BULLET_SPEED = 40;
const ENEMY_BULLET_SPEED = 15;
const MAX_BULLETS = 200;

const playerState = {
  pos: new THREE.Vector3(),
  health: 100,
  ammo: 30,
  maxAmmo: 30,
  weapon: 'pistol' as 'pistol' | 'shotgun' | 'machinegun',
  isReloading: false,
  speedBoostEndTime: 0,
  shieldEndTime: 0,
  shockwaveTime: 0,
  abilityCooldowns: { q: 0, e: 0 },
  takeDamage: (amount: number) => {},
  gameState: 'menu' as 'menu' | 'playing' | 'gameover' | 'paused'
};

const enemiesData = new Map<number, { pos: THREE.Vector3, takeDamage: (amount: number, hitPos: THREE.Vector3) => void }>();
const barrelsData = new Map<number, { pos: THREE.Vector3, takeDamage: (amount: number) => void }>();

const JUMP_PADS = [
  [-40, 0.1, -40], [40, 0.1, 40], [-40, 0.1, 40], [40, 0.1, -40], [0, 0.1, -60], [0, 0.1, 60]
];
const SPEED_PADS = [
  [-60, 0.1, 0], [60, 0.1, 0], [0, 0.1, -30], [0, 0.1, 30]
];

// --- MINIMAP ---
const Minimap = () => {
  const [enemies, setEnemies] = useState<THREE.Vector3[]>([]);
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3());
  const [barrels, setBarrels] = useState<THREE.Vector3[]>([]);
  
  const jumpPads = useMemo(() => [
    new THREE.Vector3(-40, 0, -40), new THREE.Vector3(40, 0, 40), new THREE.Vector3(-40, 0, 40), new THREE.Vector3(40, 0, -40), new THREE.Vector3(0, 0, -60), new THREE.Vector3(0, 0, 60)
  ], []);
  
  const speedPads = useMemo(() => [
    new THREE.Vector3(-60, 0, 0), new THREE.Vector3(60, 0, 0), new THREE.Vector3(0, 0, -30), new THREE.Vector3(0, 0, 30)
  ], []);
  
  const teleporters = useMemo(() => [
    new THREE.Vector3(-80, 0, -80),
    new THREE.Vector3(80, 0, 80),
    new THREE.Vector3(-80, 0, 80),
    new THREE.Vector3(80, 0, -80),
  ], []);

  useEffect(() => {
    let frameId: number;
    const update = () => {
      const currentEnemies: THREE.Vector3[] = [];
      enemiesData.forEach((data) => {
        currentEnemies.push(data.pos.clone());
      });
      setEnemies(currentEnemies);

      const currentBarrels: THREE.Vector3[] = [];
      barrelsData.forEach((data) => {
        currentBarrels.push(data.pos.clone());
      });
      setBarrels(currentBarrels);

      setPlayerPos(playerState.pos.clone());
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const mapSize = 100;
  const arenaSize = 200;
  const scale = mapSize / arenaSize;

  const toMapCoord = (v: THREE.Vector3) => ({
    x: (v.x + arenaSize / 2) * scale,
    y: (v.z + arenaSize / 2) * scale,
  });

  return (
    <div className="absolute bottom-20 right-6 z-30 pointer-events-none">
      <div 
        className="relative bg-black/40 border-2 border-white/10 rounded-xl backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
        
        {/* Teleporters */}
        {teleporters.map((t, i) => {
          const pos = toMapCoord(t);
          return (
            <div 
              key={`tele-${i}`} 
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_#00ffff]"
              style={{ left: pos.x, top: pos.y }}
            />
          );
        })}
        
        {/* Jump Pads */}
        {jumpPads.map((t, i) => {
          const pos = toMapCoord(t);
          return <div key={`minimap-jp-${i}`} className="absolute w-1.5 h-1.5 bg-orange-400 rounded-sm -translate-x-1/2 -translate-y-1/2 opacity-60" style={{ left: pos.x, top: pos.y }} />
        })}

        {/* Speed Pads */}
        {speedPads.map((t, i) => {
          const pos = toMapCoord(t);
          return <div key={`minimap-sp-${i}`} className="absolute w-1.5 h-1.5 bg-green-400 rounded-sm -translate-x-1/2 -translate-y-1/2 opacity-60" style={{ left: pos.x, top: pos.y }} />
        })}

        {/* Barrels */}
        {barrels.map((b, i) => {
          const pos = toMapCoord(b);
          return <div key={`minimap-b-${i}`} className="absolute w-1.5 h-1.5 bg-orange-500 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-80" style={{ left: pos.x, top: pos.y }} />
        })}

        {/* Enemies */}
        {enemies.map((e, i) => {
          const pos = toMapCoord(e);
          return (
            <div 
              key={`enemy-${i}`} 
              className="absolute w-1 h-1 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#ff0000]"
              style={{ left: pos.x, top: pos.y }}
            />
          );
        })}

        {/* Player */}
        {(() => {
          const pos = toMapCoord(playerPos);
          return (
            <div 
              className="absolute w-2 h-2 bg-green-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_10px_#00ff00]"
              style={{ left: pos.x, top: pos.y }}
            >
               <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-50" />
            </div>
          );
        })()}
      </div>
      <div className="mt-1 text-right font-mono text-[7px] text-white/20 tracking-[0.1em] uppercase font-bold">RADAR v1.1</div>
    </div>
  );
};

// --- BULLET SYSTEM ---
class Bullet {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  active = false;
  isPlayer = false;
  life = 0;
  damage = 35;
  scale = 1;
}
const bullets = Array.from({ length: MAX_BULLETS }, () => new Bullet());

const spawnBullet = (pos: THREE.Vector3, dir: THREE.Vector3, speed: number, isPlayer: boolean, damage: number = 35, scale: number = 1) => {
  const b = bullets.find(b => !b.active);
  if (b) {
    b.pos.copy(pos);
    b.vel.copy(dir).normalize().multiplyScalar(speed);
    b.active = true;
    b.isPlayer = isPlayer;
    b.life = 0;
    b.damage = damage;
    b.scale = scale;
  }
};

const BulletManager = ({ bloodSystem }: any) => {
  const playerMeshRef = useRef<THREE.InstancedMesh>(null);
  const enemyMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { world } = useRapier();

  useFrame((state, delta) => {
    if (!playerMeshRef.current || !enemyMeshRef.current || playerState.gameState !== 'playing') return;
    
    let playerCount = 0;
    let enemyCount = 0;

    bullets.forEach((b) => {
      if (b.active) {
        const oldPos = b.pos.clone();
        b.pos.addScaledVector(b.vel, delta);
        b.life += delta;
        
        let hit = false;
        
        // Raycast for collision
        const ray = new RAPIER.Ray(oldPos, b.vel.clone().normalize());
        const hitInfo = world.castRay(ray, b.vel.length() * delta, true);
        if (hitInfo) {
          hit = true;
        }
        
        // Floor/Wall basic collision (Updated for larger arena)
        if (!hit && (b.pos.y < -0.5 || b.pos.y > 40 || b.pos.x < -100 || b.pos.x > 100 || b.pos.z < -100 || b.pos.z > 100)) {
          hit = true;
        }
        
        if (!hit && b.isPlayer) {
          for (const [id, enemy] of enemiesData.entries()) {
            if (b.pos.distanceToSquared(enemy.pos) < 2.0) {
              enemy.takeDamage(b.damage, b.pos);
              hit = true;
              break;
            }
          }
        } else if (!hit && !b.isPlayer) {
          if (b.pos.distanceToSquared(playerState.pos) < 1.5) {
            playerState.takeDamage(10);
            bloodSystem.current?.emit(b.pos, 10);
            hit = true;
          }
        }

        if (!hit) {
          for (const [id, barrel] of barrelsData.entries()) {
            if (b.pos.distanceToSquared(barrel.pos) < 2.5) {
              barrel.takeDamage(35);
              hit = true;
              break;
            }
          }
        }
        
        if (b.life > 2 || hit) {
          b.active = false;
        }
        
        if (b.active) {
          dummy.position.copy(b.pos);
          dummy.lookAt(b.pos.x + b.vel.x, b.pos.y + b.vel.y, b.pos.z + b.vel.z);
          const s = b.scale || 1;
          dummy.scale.set(0.15 * s, 0.15 * s, 2.0 * s);
          dummy.updateMatrix();
          
          if (b.isPlayer) {
            playerMeshRef.current!.setMatrixAt(playerCount++, dummy.matrix);
          } else {
            enemyMeshRef.current!.setMatrixAt(enemyCount++, dummy.matrix);
          }
        }
      }
    });

    playerMeshRef.current.count = playerCount;
    enemyMeshRef.current.count = enemyCount;

    playerMeshRef.current.instanceMatrix.needsUpdate = true;
    enemyMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={playerMeshRef} args={[undefined as any, undefined as any, MAX_BULLETS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffff00" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={enemyMeshRef} args={[undefined as any, undefined as any, MAX_BULLETS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ff0055" toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

// --- BLOOD PARTICLE SYSTEM ---
class BloodParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;

  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 0;
    this.active = false;
  }

  spawn(origin: THREE.Vector3) {
    this.pos.copy(origin);
    this.vel.set(
      (Math.random() - 0.5) * 10,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 10
    );
    this.life = 0;
    this.maxLife = Math.random() * 3 + 2;
    this.active = true;
  }

  update(delta: number) {
    if (!this.active) return;
    if (this.pos.y > 0.05) {
      this.vel.y -= 25 * delta;
      this.pos.addScaledVector(this.vel, delta);
      if (this.pos.y <= 0.05) {
        this.pos.y = 0.05;
        this.vel.set(0, 0, 0);
      }
    } else {
      this.life += delta;
      if (this.life >= this.maxLife) {
        this.active = false;
      }
    }
  }
}

const BloodParticles = React.forwardRef((props, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => Array.from({ length: MAX_PARTICLES }, () => new BloodParticle()), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useImperativeHandle(ref, () => ({
    emit: (pos: THREE.Vector3, count: number) => {
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        if (!particles[i].active) {
          particles[i].spawn(pos);
          spawned++;
        }
      }
    }
  }));

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    let activeCount = 0;
    particles.forEach((p) => {
      if (p.active) {
        p.update(delta);
        dummy.position.copy(p.pos);
        if (p.pos.y <= 0.05) {
           const scale = 1 + (p.life / p.maxLife) * 3;
           dummy.scale.set(scale, 0.1, scale);
        } else {
           dummy.scale.setScalar(1);
        }
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(activeCount++, dummy.matrix);
      }
    });
    meshRef.current.count = activeCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial color="#8a0000" roughness={0.1} metalness={0.2} />
    </instancedMesh>
  );
});

// --- TELEPORTER ---
const Teleporter = ({ position, target, onTeleport }: any) => {
  return (
    <group position={position}>
      <RigidBody
        type="fixed"
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.userData?.isPlayer) {
            onTeleport(target);
          }
        }}
      >
        <Cylinder args={[1.5, 1.5, 0.2, 32]}>
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} transparent opacity={0.6} />
        </Cylinder>
        <Cylinder args={[1.6, 1.6, 0.1, 32]} position={[0, -0.05, 0]}>
          <meshStandardMaterial color="#333" />
        </Cylinder>
      </RigidBody>
    </group>
  );
};

// --- JUMP PAD ---
const JumpPad = ({ position }: any) => {
  return (
    <group position={position}>
      <RigidBody
        type="fixed"
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.userData?.isPlayer) {
            const body = other.rigidBody as any;
            if (body && body.linvel) {
              const vel = body.linvel();
              body.setLinvel({ x: vel.x, y: 25, z: vel.z }, true);
              soundManager.playShoot(); // Reuse shoot sound or add a jump sound
            }
          }
        }}
      >
        <Box args={[3, 0.2, 3]}>
          <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1} />
        </Box>
        <Box args={[3.2, 0.1, 3.2]} position={[0, -0.05, 0]}>
          <meshStandardMaterial color="#333" />
        </Box>
      </RigidBody>
    </group>
  );
};

// --- SPEED PAD ---
const SpeedPad = ({ position }: any) => {
  return (
    <group position={position}>
      <RigidBody
        type="fixed"
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.userData?.isPlayer) {
            playerState.speedBoostEndTime = performance.now() + 3000;
            soundManager.playShoot(); // Reuse sound
          }
        }}
      >
        <Box args={[3, 0.2, 3]}>
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
        </Box>
        <Box args={[3.2, 0.1, 3.2]} position={[0, -0.05, 0]}>
          <meshStandardMaterial color="#333" />
        </Box>
      </RigidBody>
    </group>
  );
};

// --- EXPLOSIVE BARREL ---
const ExplosiveBarrel = ({ id, position, bloodSystem }: any) => {
  const [health, setHealth] = useState(30);
  const [exploded, setExploded] = useState(false);
  const posVec = useMemo(() => new THREE.Vector3(...position), [position]);

  useEffect(() => {
    if (exploded) return;
    const takeDamage = (amount: number) => {
      setHealth(h => h - amount);
    };
    barrelsData.set(id, { pos: posVec, takeDamage });
    return () => { barrelsData.delete(id); };
  }, [id, posVec, exploded]);

  useEffect(() => {
    if (health <= 0 && !exploded) {
      setExploded(true);
      barrelsData.delete(id);
      soundManager.playEnemyDie(); // Reuse explosion-like sound
      bloodSystem.current?.emit(posVec, 100); // Visual explosion

      // Damage player
      if (playerState.pos.distanceTo(posVec) < 12) {
        playerState.takeDamage(40);
      }
      // Damage enemies
      for (const [enemyId, enemy] of enemiesData.entries()) {
        if (enemy.pos.distanceTo(posVec) < 12) {
          enemy.takeDamage(150, enemy.pos);
        }
      }
    }
  }, [health, exploded, id, posVec, bloodSystem]);

  if (exploded) return null;

  return (
    <RigidBody type="dynamic" position={position} mass={2}>
      <Cylinder args={[0.8, 0.8, 2, 16]}>
        <meshStandardMaterial color="#ff3300" roughness={0.6} metalness={0.3} />
      </Cylinder>
    </RigidBody>
  );
};

const ApartmentFurniture = () => {
  return (
    <group>
      {/* Furniture on Ground Floor (y = 0.5 is the floor surface) */}
      {/* Bed */}
      <RigidBody type="fixed" position={[-50, 1.5, -70]}>
        <Box args={[15, 2, 25]} receiveShadow castShadow>
          <meshStandardMaterial color="#113355" />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[-50, 3, -81]}>
        <Box args={[15, 4, 2]} receiveShadow castShadow>
          <meshStandardMaterial color="#442211" />
        </Box>
      </RigidBody>

      {/* Desk */}
      <RigidBody type="fixed" position={[50, 2.5, -80]}>
        <Box args={[30, 1, 10]} receiveShadow castShadow>
          <meshStandardMaterial color="#553322" />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[40, 1.5, -80]}>
        <Box args={[2, 2, 8]} receiveShadow castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[60, 1.5, -80]}>
        <Box args={[2, 2, 8]} receiveShadow castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
      </RigidBody>

      {/* Computer Monitor */}
      <RigidBody type="fixed" position={[50, 6.5, -82]}>
        <Box args={[12, 7, 1]} receiveShadow castShadow>
          <meshStandardMaterial color="#111111" />
        </Box>
        <Box args={[11, 6, 1.2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.5} />
        </Box>
      </RigidBody>
      
      {/* Wardrobe */}
      <RigidBody type="fixed" position={[0, 5.5, -84]}>
        <Box args={[20, 10, 8]} receiveShadow castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
      </RigidBody>
      
      {/* Couch */}
      <RigidBody type="fixed" position={[0, 1.5, -40]}>
        <Box args={[25, 2, 10]} receiveShadow castShadow>
          <meshStandardMaterial color="#551111" />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 3, -44]}>
        <Box args={[25, 4, 2]} receiveShadow castShadow>
          <meshStandardMaterial color="#551111" />
        </Box>
      </RigidBody>
    </group>
  );
};

const TextSprite = ({ text, position }: { text: string, position: [number, number, number] }) => {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = '#ff88ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#cc00ff';
      ctx.shadowBlur = 15;
      ctx.fillText(text, c.width / 2, c.height / 2);
    }
    return c;
  }, [text]);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [canvas]);

  return (
    <sprite position={position} scale={[12, 3, 1]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
};

const DimensionPortal = ({ position, onPortalEnter, portalUsesLeft }: any) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.02;
      ref.current.rotation.x += 0.01;
    }
  });
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4, 4, 4]} sensor onIntersectionEnter={(e) => {
          if (e.other.rigidBodyObject?.userData?.isPlayer) {
            onPortalEnter();
          }
        }} />
        <mesh ref={ref}>
          <torusGeometry args={[3, 0.8, 16, 32]} />
          <meshStandardMaterial color="#cc00ff" emissive="#cc00ff" emissiveIntensity={2} wireframe />
        </mesh>
        <pointLight color="#cc00ff" intensity={5} distance={20} />
      </RigidBody>
      <TextSprite text={`PORTALS: ${portalUsesLeft}/5`} position={[0, 6, 0]} />
    </group>
  );
};

// --- ARENA MAP ---
const Arena = ({ onTeleport, bloodSystem, mapType, onPortalEnter, portalUsesLeft }: any) => {
  const mapConfig = useMemo(() => {
    switch (mapType) {
      case 'military':
        return {
          floor: '#1a221a', grid: '#00ff00', gridBg: '#0a110a', wall: '#0a110a',
          obs1: '#2a332a', obs2: '#1f261f',
          obsTypes: ['box', 'cylinder']
        };
      case 'factory':
        return {
          floor: '#2a1100', grid: '#ff8800', gridBg: '#1a0a00', wall: '#1a0a00',
          obs1: '#4a2200', obs2: '#3a1a00',
          obsTypes: ['cylinder', 'cylinder', 'box'] // more cylinders for pipes/tanks
        };
      case 'apartment':
        return {
          floor: '#2a2a3a', grid: '#4444ff', gridBg: '#1a1a2a', wall: '#111122',
          obs1: '#3a3a4a', obs2: '#2a2a3a',
          obsTypes: ['box'] // mostly boxes for indoor feel
        };
      case 'city':
      default:
        return {
          floor: '#222222', grid: '#880000', gridBg: '#111111', wall: '#111111',
          obs1: '#333333', obs2: '#444444',
          obsTypes: ['box', 'box', 'cylinder'] // more boxes for buildings
        };
    }
  }, [mapType]);

  const obstacles = useMemo(() => {
    const obs = [];
    const seed = mapType === 'city' ? 123 : mapType === 'military' ? 456 : mapType === 'apartment' ? 101 : 789;
    const pseudoRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const criticalPoints = [
      [0,0], // spawn
      [-80,-80], [80,80], [-80,80], [80,-80], // teleporters
      [-40,-40], [40,40], [-40,40], [40,-40], [0,-60], [0,60], // jump pads
      [-60,0], [60,0], [0,-30], [0,30], // speed pads
      [0,80] // dimension portal
    ];

    for (let i = 0; i < 25; i++) {
      const x = (pseudoRandom(seed + i * 13) - 0.5) * 180;
      const z = (pseudoRandom(seed + i * 17) - 0.5) * 180;
      
      let tooClose = false;
      for (const [cx, cz] of criticalPoints) {
        if (Math.hypot(x - cx, z - cz) < 18) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      
      if (mapType === 'apartment' && z < 20) continue; // Keep the back half clear for the 2nd floor and ramps
      
      const typeIndex = Math.floor(pseudoRandom(seed + i * 19) * mapConfig.obsTypes.length);
      const type = mapConfig.obsTypes[typeIndex];
      const w = 4 + pseudoRandom(seed + i * 23) * 12;
      const h = 2 + pseudoRandom(seed + i * 29) * 8;
      const d = 4 + pseudoRandom(seed + i * 31) * 12;
      const color = pseudoRandom(seed + i * 37) > 0.5 ? mapConfig.obs1 : mapConfig.obs2;
      
      obs.push({ x, z, type, w, h, d, color });
    }
    return obs;
  }, [mapType, mapConfig]);

  const barrels = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 160,
      z: (Math.random() - 0.5) * 160,
    })).filter(b => Math.abs(b.x) > 15 || Math.abs(b.z) > 15);
  }, [mapType]);

  const jumpPads = useMemo(() => [
    [-40, 0.1, -40],
    [40, 0.1, 40],
    [-40, 0.1, 40],
    [40, 0.1, -40],
    [0, 0.1, -60],
    [0, 0.1, 60],
  ], []);

  const speedPads = useMemo(() => [
    [-60, 0.1, 0],
    [60, 0.1, 0],
    [0, 0.1, -30],
    [0, 0.1, 30],
  ], []);

  return (
    <group>
      {/* Main Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]} friction={0.1}>
        <Box args={[200, 1, 200]} receiveShadow>
          <meshStandardMaterial color={mapConfig.floor} roughness={0.9} metalness={0.1} />
        </Box>
        <gridHelper args={[200, 100, mapConfig.grid, mapConfig.gridBg]} position={[0, 0.51, 0]} />
      </RigidBody>
      
      {/* Boundary Walls */}
      <RigidBody type="fixed" position={[0, 4, -100]}>
        <Box args={[200, 8, 4]} receiveShadow castShadow>
          <meshStandardMaterial color={mapConfig.wall} roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 4, 100]}>
        <Box args={[200, 8, 4]} receiveShadow castShadow>
          <meshStandardMaterial color={mapConfig.wall} roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[-100, 4, 0]}>
        <Box args={[4, 8, 200]} receiveShadow castShadow>
          <meshStandardMaterial color={mapConfig.wall} roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[100, 4, 0]}>
        <Box args={[4, 8, 200]} receiveShadow castShadow>
          <meshStandardMaterial color={mapConfig.wall} roughness={1} />
        </Box>
      </RigidBody>

      {/* Obstacles */}
      {obstacles.map((o, i) => (
        <RigidBody key={i} type="fixed" position={[o.x, o.h / 2, o.z]}>
          {o.type === 'box' ? (
            <Box args={[o.w, o.h, o.d]} receiveShadow castShadow>
              <meshStandardMaterial color={o.color} roughness={0.8} />
            </Box>
          ) : (
            <Cylinder args={[o.w / 2, o.w / 2, o.h, 16]} receiveShadow castShadow>
              <meshStandardMaterial color={o.color} roughness={0.8} />
            </Cylinder>
          )}
        </RigidBody>
      ))}

      {/* Explosive Barrels */}
      {barrels.map(b => (
        <ExplosiveBarrel key={`barrel-${b.id}`} id={b.id} position={[b.x, 1, b.z]} bloodSystem={bloodSystem} />
      ))}

      {/* Jump Pads */}
      {jumpPads.map((pos, i) => (
        <JumpPad key={`jump-${i}`} position={pos} />
      ))}

      {/* Speed Pads */}
      {speedPads.map((pos, i) => (
        <SpeedPad key={`speed-${i}`} position={pos} />
      ))}

      {/* Teleporters */}
      <Teleporter position={[-80, 0.1, -80]} target={[80, 2, 80]} onTeleport={onTeleport} />
      <Teleporter position={[80, 0.1, 80]} target={[-80, 2, -80]} onTeleport={onTeleport} />
      <Teleporter position={[-80, 0.1, 80]} target={[80, 2, -80]} onTeleport={onTeleport} />
      <Teleporter position={[80, 0.1, -80]} target={[-80, 2, 80]} onTeleport={onTeleport} />
      
      {/* Map Portal */}
      {portalUsesLeft > 0 && <DimensionPortal position={[0, 4, 80]} onPortalEnter={onPortalEnter} portalUsesLeft={portalUsesLeft} />}

      {mapType === 'apartment' && <ApartmentFurniture />}
    </group>
  );
};

// --- ENEMY ---
const Enemy = React.memo(({ id, type = 'standard', initialPos, onDie, bloodSystem, gameMode, wave }: any) => {
  const bodyRef = useRef<any>(null);
  const isDead = useRef(false);
  
  const stats = useMemo(() => {
    const baseHealth = 100 + (wave - 1) * 20;
    switch(type) {
      case 'runner': return { health: baseHealth * 0.5, speed: ENEMY_SPEED * 1.8, color: '#00ff88', range: 1.5, damage: 15 };
      case 'tank': return { health: baseHealth * 2.5, speed: ENEMY_SPEED * 0.6, color: '#0088ff', range: 30, damage: 25 };
      default: return { health: baseHealth, speed: ENEMY_SPEED, color: '#8a1111', range: 25, damage: 10 };
    }
  }, [type, wave]);

  const [health, setHealth] = useState(stats.health);
  const lastShootTime = useRef(Math.random() * 2);
  const lastMeleeTime = useRef(0);

  useEffect(() => {
    const takeDamage = (amount: number, hitPos: THREE.Vector3) => {
      if (isDead.current) return;
      setHealth(h => {
        const newH = h - amount;
        if (newH > 0) {
          bloodSystem.current?.emit(hitPos, 15);
        }
        return newH;
      });
    };
    const push = (force: THREE.Vector3) => {
      if (bodyRef.current) {
        bodyRef.current.applyImpulse(force, true);
      }
    };
    enemiesData.set(id, { pos: new THREE.Vector3(...initialPos), takeDamage, push } as any);
    return () => { enemiesData.delete(id); };
  }, [id, bloodSystem, initialPos]);

  useFrame((state, delta) => {
    if (!bodyRef.current || health <= 0 || playerState.gameState !== 'playing' || isDead.current) return;

    try {
      const posObj = bodyRef.current.translation();
      if (!posObj || isNaN(posObj.x)) return;
      const currentPos = new THREE.Vector3(posObj.x, posObj.y, posObj.z);
      
      if (currentPos.y < -10) {
        isDead.current = true;
        onDie(id, false, currentPos);
        return;
      }

      const eData = enemiesData.get(id);
      if (eData) eData.pos.copy(currentPos);

      const playerPos = playerState.pos;
      const distToPlayer = currentPos.distanceTo(playerPos);
      const dir = new THREE.Vector3().subVectors(playerPos, currentPos);
      dir.y = 0;
      
      const waveSpeedBonus = (wave - 1) * 0.5;
      const speed = (stats.speed + waveSpeedBonus) * (gameMode === 'hardcore' ? 1.5 : 1);

      if (distToPlayer > stats.range * 0.8) {
        if (dir.lengthSq() > 0.001) {
          dir.normalize().multiplyScalar(speed);
        } else {
          dir.set(0, 0, 0);
        }
      } else if (type === 'tank' && distToPlayer < 15) {
        // Tank tries to keep distance
        dir.normalize().multiplyScalar(-speed * 0.5);
      } else {
        dir.set(0, 0, 0);
      }

      const velObj = bodyRef.current.linvel();
      const vy = (velObj && !isNaN(velObj.y)) ? velObj.y : 0;
      
      if (!isNaN(dir.x) && !isNaN(dir.z)) {
        bodyRef.current.setLinvel({ x: dir.x, y: vy, z: dir.z }, true);
      }

      if (distToPlayer > 0.1) {
        const angle = Math.atan2(playerPos.x - currentPos.x, playerPos.z - currentPos.z);
        const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        bodyRef.current.setRotation(quat, true);
      }

      const currentTime = performance.now() / 1000;
      // Runner Melee
      if (type === 'runner' && distToPlayer < 2 && currentTime - lastMeleeTime.current > 1) {
        lastMeleeTime.current = currentTime;
        playerState.takeDamage(stats.damage);
      }

      // Shooting logic (only for non-runners)
      if (type !== 'runner') {
        const shootCooldown = (gameMode === 'hardcore' ? 0.6 : Math.max(0.4, 1.2 - (wave - 1) * 0.1)) * (type === 'tank' ? 2 : 1);
        if (distToPlayer < stats.range && currentTime - lastShootTime.current > shootCooldown) {
          lastShootTime.current = currentTime + Math.random() * 0.5; 
          
          const shootDir = new THREE.Vector3(playerPos.x - currentPos.x, 0, playerPos.z - currentPos.z).normalize();
          shootDir.x += (Math.random() - 0.5) * 0.15;
          shootDir.z += (Math.random() - 0.5) * 0.15;
          shootDir.normalize();

          const bulletSpeed = (gameMode === 'hardcore' ? ENEMY_BULLET_SPEED * 1.5 : ENEMY_BULLET_SPEED) * (type === 'tank' ? 0.7 : 1);
          const spawnPos = currentPos.clone().addScaledVector(shootDir, 1.2).add(new THREE.Vector3(0, 0.5, 0));
          spawnBullet(spawnPos, shootDir, bulletSpeed, false, type === 'tank' ? 25 : 10, type === 'tank' ? 2 : 1);
          soundManager.playEnemyShoot();
        }
      }

    } catch (e) {}
  });

  useEffect(() => {
    if (health <= 0 && !isDead.current) {
      isDead.current = true;
      soundManager.playEnemyDie();
      const eData = enemiesData.get(id);
      if (eData && eData.pos) {
        bloodSystem.current?.emit(eData.pos.clone(), 150);
        onDie(id, true, eData.pos.clone());
      } else {
        onDie(id, true);
      }
    }
  }, [health, id, onDie, bloodSystem]);

  const healthPercent = (health / stats.health) * 100;

  return (
    <RigidBody ref={bodyRef} position={initialPos} type="dynamic" enabledRotations={[false, false, false]} colliders={false} lockRotations>
      <CapsuleCollider args={[0.6, 0.4]} />
      <group userData={{ isEnemy: true }} position={[0, 0.6, 0]}>
        <group position={[0, 1.2, 0]}>
           <Box args={[1, 0.1, 0.1]}>
              <meshBasicMaterial color="#333" />
           </Box>
           <Box args={[healthPercent / 100, 0.11, 0.11]} position={[(healthPercent / 100 - 1) / 2, 0, 0.01]}>
              <meshBasicMaterial color={stats.color} />
           </Box>
        </group>

        <Cylinder args={[0.5, 0.5, 1.2]} castShadow>
          <meshStandardMaterial color={gameMode === 'hardcore' ? "#550088" : stats.color} roughness={0.9} />
        </Cylinder>
        {type !== 'runner' && (
          <Box args={[0.15, 0.15, 1.2]} position={[0, 0, 0.6]} castShadow>
            <meshStandardMaterial color="#222" />
          </Box>
        )}
        <Sphere args={[0.1]} position={[-0.2, 0.4, 0.4]}>
          <meshBasicMaterial color="#ff0055" toneMapped={false} />
        </Sphere>
        <Sphere args={[0.1]} position={[0.2, 0.4, 0.4]}>
          <meshBasicMaterial color="#ff0055" toneMapped={false} />
        </Sphere>
      </group>
    </RigidBody>
  );
});

// --- WEAPON DROP ---
const WeaponDrop = React.memo(({ id, type, position, onPickup }: any) => {
  const ref = useRef<any>(null);
  const posVec = useMemo(() => new THREE.Vector3(...position), [position]);
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
    if (playerState.pos.distanceTo(posVec) < 1.5) {
      onPickup(id, type);
    }
  });

  const color = type === 'shotgun' ? '#ff00ff' : '#00aaff';
  return (
    <group ref={ref} position={position}>
      <Box args={[0.8, 0.2, 0.4]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </Box>
    </group>
  );
});

// --- HEALTH DROP ---
const HealthDrop = React.memo(({ id, position, onPickup }: any) => {
  const ref = useRef<any>(null);
  const posVec = useMemo(() => new THREE.Vector3(...position), [position]);
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
    if (playerState.pos.distanceTo(posVec) < 1.5) {
      onPickup(id);
    }
  });

  return (
    <group ref={ref} position={position}>
      <Box args={[0.4, 0.4, 0.4]}>
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.8} />
      </Box>
      <Box args={[0.6, 0.15, 0.15]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      <Box args={[0.15, 0.6, 0.15]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
    </group>
  );
});

// --- GAME MANAGER ---
const GameManager = ({ bloodSystem, gameMode, setScore, wave, setWave, setWaveCountdown, waveCountdown, setEnemiesRemaining, setWaveAnnouncement, setKillsInWave, killsInWave, setWeaponType, isTutorialActive, setHealth, tutorialStep, isTutorialHidden }: any) => {
  const [enemies, setEnemies] = useState<any[]>([]);
  const [weaponDrops, setWeaponDrops] = useState<any[]>([]);
  const [healthDrops, setHealthDrops] = useState<any[]>([]);
  const killGoal = useMemo(() => 10 + (wave - 1) * 5, [wave]);

  const hasSpawnedForStep = useRef<number | null>(null);

  // Tutorial Spawning Logic
  useEffect(() => {
    if (!isTutorialActive) return;

    if (!isTutorialHidden) {
      setWeaponDrops([]);
      setHealthDrops([]);
      hasSpawnedForStep.current = null;
      return;
    }

    if (hasSpawnedForStep.current === tutorialStep) return;

    if (tutorialStep === 3) {
      // Spawn a weapon drop near the player
      const pos = playerState.pos.clone().add(new THREE.Vector3(5, 0, 5));
      setWeaponDrops([{ id: 'tutorial-weapon', type: 'machinegun', pos: pos.toArray() }]);
      hasSpawnedForStep.current = tutorialStep;
    } else if (tutorialStep === 6) {
      // Spawn a health drop near the player
      const pos = playerState.pos.clone().add(new THREE.Vector3(-5, 0, 5));
      setHealthDrops([{ id: 'tutorial-health', pos: pos.toArray() }]);
      hasSpawnedForStep.current = tutorialStep;
    }
  }, [isTutorialActive, isTutorialHidden, tutorialStep]);

  // Wave Mode Logic
  useEffect(() => {
    if (gameMode !== 'waves' || isTutorialActive) return;
    setEnemiesRemaining(killGoal);
    setKillsInWave(0);
    setEnemies([]);
    setWaveAnnouncement(`WAVE ${wave}`);
    soundManager.playWaveStart();
    setTimeout(() => setWaveAnnouncement(null), 3000);
  }, [wave, killGoal, setEnemiesRemaining, setWaveAnnouncement, gameMode, setKillsInWave, isTutorialActive]);

  const killsInWaveRef = useRef(killsInWave);
  const enemiesLengthRef = useRef(enemies.length);

  useEffect(() => {
    killsInWaveRef.current = killsInWave;
    enemiesLengthRef.current = enemies.length;
  }, [killsInWave, enemies.length]);

  useEffect(() => {
    if (playerState.gameState !== 'playing' || gameMode !== 'waves' || isTutorialActive) return;
    
    // Calculate how many more we need to spawn to reach the goal
    const totalActiveAndKilled = killsInWaveRef.current + enemiesLengthRef.current;
    const maxOnScreen = Math.min(10, 5 + Math.floor(wave / 2));
    
    if (totalActiveAndKilled >= killGoal || enemiesLengthRef.current >= maxOnScreen) return;

    const spawnRate = Math.max(600, 2000 - (wave - 1) * 150);
    const interval = setInterval(() => {
      setEnemies(prev => {
        const currentTotal = killsInWaveRef.current + prev.length;
        if (currentTotal >= killGoal || prev.length >= maxOnScreen) return prev;
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 40 + Math.random() * 30;
        
        let type = 'standard';
        const rand = Math.random();
        if (wave >= 3 && rand < 0.2) type = 'runner';
        if (wave >= 5 && rand > 0.8) type = 'tank';
        if (wave >= 8 && rand > 0.6) type = Math.random() > 0.5 ? 'runner' : 'tank';

        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            type,
            pos: [Math.cos(angle) * radius, 5, Math.sin(angle) * radius]
          }
        ];
      });
    }, spawnRate);
    return () => clearInterval(interval);
  }, [wave, killGoal, gameMode, isTutorialActive]);

  // Endless Mode Logic
  useEffect(() => {
    if (playerState.gameState !== 'playing' || gameMode !== 'endless' || isTutorialActive) return;

    const interval = setInterval(() => {
      setEnemies(prev => {
        if (prev.length > 20) return prev;
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 40 + Math.random() * 40;
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            pos: [Math.cos(angle) * radius, 5, Math.sin(angle) * radius]
          }
        ];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [gameMode, isTutorialActive]);

  const handleDie = useCallback((id: number, isKill: boolean = true, pos?: THREE.Vector3) => {
    setEnemies(prev => prev.filter(e => e.id !== id));
    
    if (isKill) {
      setScore((s: number) => s + 10);

      if (pos) {
        const rand = Math.random();
        if (rand < 0.20) {
          const types = ['shotgun', 'machinegun'];
          const type = types[Math.floor(Math.random() * types.length)];
          setWeaponDrops(prev => [...prev, { id: Date.now() + Math.random(), type, pos: pos.toArray() }]);
        } else if (rand > 0.85) {
          setHealthDrops(prev => [...prev, { id: Date.now() + Math.random(), pos: pos.toArray() }]);
        }
      }

      if (gameMode === 'waves') {
        setKillsInWave((k: number) => {
          const newKills = k + 1;
          const remaining = Math.max(0, killGoal - newKills);
          setEnemiesRemaining(remaining);
          return newKills;
        });
      }
    }
  }, [gameMode, killGoal, setEnemiesRemaining, setKillsInWave, setScore]);

  const handlePickup = useCallback((id: number, type: string) => {
    setWeaponDrops(prev => prev.filter(w => w.id !== id));
    playerState.weapon = type as any;
    playerState.maxAmmo = type === 'machinegun' ? 50 : type === 'shotgun' ? 12 : 30;
    playerState.ammo = playerState.maxAmmo;
    setWeaponType(type);
    soundManager.playReload();
  }, [setWeaponType]);

  const handleHealthPickup = useCallback((id: number) => {
    setHealthDrops(prev => prev.filter(h => h.id !== id));
    setHealth((h: number) => Math.min(100, h + 25));
    soundManager.playPowerup();
  }, [setHealth]);

  const isTransitioning = useRef(false);

  // Check for wave completion
  useEffect(() => {
    if (gameMode === 'waves' && killsInWave >= killGoal && enemies.length === 0 && !isTransitioning.current) {
      isTransitioning.current = true;
      soundManager.playWaveClear();
      let count = 5;
      setWaveCountdown(count);
      const timer = setInterval(() => {
        count -= 1;
        setWaveCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          setWave((w: number) => w + 1);
          setWaveCountdown(0);
          isTransitioning.current = false;
        }
      }, 1000);
      return () => {
        clearInterval(timer);
        isTransitioning.current = false;
      };
    }
  }, [killsInWave, killGoal, enemies.length, gameMode, setWave, setWaveCountdown]);

  return (
    <>
      {enemies.map(e => (
        <Enemy key={e.id} id={e.id} type={e.type} initialPos={e.pos} bloodSystem={bloodSystem} onDie={handleDie} gameMode={gameMode} wave={wave} />
      ))}
      {weaponDrops.map(w => (
        <WeaponDrop key={w.id} id={w.id} type={w.type} position={w.pos} onPickup={handlePickup} />
      ))}
      {healthDrops.map(h => (
        <HealthDrop key={h.id} id={h.id} position={h.pos} onPickup={handleHealthPickup} />
      ))}
    </>
  );
};

// --- PLAYER ---
const Player = ({ setHealth, setDamageFlash, setAmmo, setIsReloading, bodyRef }: any) => {
  const { camera } = useThree();
  const lastShootTime = useRef(0);
  const lastActionTime = useRef(0);
  const shieldRef = useRef<any>(null);
  const flashRef = useRef<any>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);
  const [isSpeedBoosted, setIsSpeedBoosted] = useState(false);

  useEffect(() => {
    playerState.takeDamage = (amount: number) => {
      const currentTime = performance.now() / 1000;
      const isShielded = currentTime < playerState.shieldEndTime;
      if (playerState.health <= 0 || isShielded) return;
      
      playerState.health -= amount;
      setHealth(playerState.health);
      setDamageFlash(true);
      soundManager.playPlayerDamage();
      lastActionTime.current = currentTime;
      setTimeout(() => setDamageFlash(false), 150);
    };
  }, [setHealth, setDamageFlash]);

  useFrame((state, delta) => {
    if (!bodyRef.current || playerState.health <= 0 || playerState.gameState !== 'playing') return;

    const currentTime = performance.now() / 1000;

    // --- ABILITIES ---
    if ((inputRef.keys.q || (inputRef as any).abilities.q) && currentTime > playerState.abilityCooldowns.q) {
      playerState.abilityCooldowns.q = currentTime + 10;
      (inputRef as any).abilities.q = false;
      playerState.shockwaveTime = currentTime;
      soundManager.playExplosion();
      enemiesData.forEach((e: any, id) => {
        const dist = e.pos.distanceTo(playerState.pos);
        if (dist < 15) {
          const pushDir = new THREE.Vector3().subVectors(e.pos, playerState.pos).normalize().multiplyScalar(30);
          e.takeDamage(30, e.pos);
          if (e.push) e.push(pushDir);
        }
      });
    }

    if ((inputRef.keys.e || (inputRef as any).abilities.e) && currentTime > playerState.abilityCooldowns.e) {
      playerState.abilityCooldowns.e = currentTime + 20;
      (inputRef as any).abilities.e = false;
      playerState.shieldEndTime = currentTime + 4;
      soundManager.playReload(); // Reuse reload for shield sound
    }
    
    const currentlyBoosted = performance.now() < (playerState.speedBoostEndTime || 0);
    if (currentlyBoosted !== isSpeedBoosted) {
      setIsSpeedBoosted(currentlyBoosted);
    }

    // Health Regeneration (Brawl Stars style: 4 seconds of no action)
    if (currentTime - lastActionTime.current > 4 && playerState.health < 100) {
      const oldHealthInt = Math.floor(playerState.health);
      playerState.health = Math.min(100, playerState.health + delta * 15);
      const newHealthInt = Math.floor(playerState.health);
      if (oldHealthInt !== newHealthInt) {
        setHealth(playerState.health);
      }
    }

    try {
      const posObj = bodyRef.current.translation();
      if (!posObj || isNaN(posObj.x)) return;
      const px = posObj.x, py = posObj.y, pz = posObj.z;
      const playerPos = new THREE.Vector3(px, py, pz);
      playerState.pos.copy(playerPos);

      // Movement
      let mx = 0; let mz = 0;
      if (inputRef.keys.a) mx -= 1;
      if (inputRef.keys.d) mx += 1;
      if (inputRef.keys.w) mz -= 1;
      if (inputRef.keys.s) mz += 1;

      if (mx === 0 && mz === 0) {
        mx = inputRef.move.x;
        mz = inputRef.move.y;
      }

      const moveVec = new THREE.Vector2(mx, mz);
      const isSpeedBoosted = performance.now() < (playerState.speedBoostEndTime || 0);
      const currentSpeed = isSpeedBoosted ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;

      if (moveVec.lengthSq() > 0.001) {
        moveVec.normalize().multiplyScalar(currentSpeed);
      } else {
        moveVec.set(0, 0);
      }

      const velObj = bodyRef.current.linvel();
      const vy = (velObj && !isNaN(velObj.y)) ? velObj.y : 0;
      bodyRef.current.setLinvel({ x: moveVec.x, y: vy, z: moveVec.y }, true);

      // Aiming
      let angle = 0;
      if (inputRef.isMobileAiming) {
        if (inputRef.aim.x !== 0 || inputRef.aim.y !== 0) {
          angle = Math.atan2(inputRef.aim.x, inputRef.aim.y);
        }
      } else {
        raycaster.setFromCamera(inputRef.mouseNDC, camera);
        raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        angle = Math.atan2(intersectPoint.x - px, intersectPoint.z - pz);
      }

      const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      bodyRef.current.setRotation(quat, true);

      // Camera follow (Top-Down pseudo-orthographic)
      const targetCamPos = new THREE.Vector3(px, 35, pz + 15);
      camera.position.lerp(targetCamPos, delta * 5);
      camera.lookAt(px, 0, pz);

      // Reloading
      if ((inputRef.keys.r || playerState.ammo <= 0) && !playerState.isReloading && playerState.ammo < playerState.maxAmmo) {
        playerState.isReloading = true;
        setIsReloading(true);
        inputRef.keys.r = false;
        soundManager.playReload();
        
        setTimeout(() => {
          playerState.ammo = playerState.maxAmmo;
          playerState.isReloading = false;
          setAmmo(playerState.maxAmmo);
          setIsReloading(false);
        }, 2000);
      }

      // Shooting
      const isTryingToShoot = inputRef.isShooting || (inputRef.isMobileAiming && inputRef.isShooting);
      
      let cooldown = 0.15;
      let damage = 35;
      let spread = 0.02;
      let bulletsToSpawn = 1;
      
      if (playerState.weapon === 'machinegun') {
        cooldown = 0.08;
        damage = 15;
        spread = 0.08;
      } else if (playerState.weapon === 'shotgun') {
        cooldown = 0.7;
        damage = 15;
        spread = 0.2;
        bulletsToSpawn = 5;
      }

      if (isTryingToShoot && !playerState.isReloading && playerState.ammo > 0 && currentTime - lastShootTime.current > cooldown) {
        lastShootTime.current = currentTime;
        inputRef.justShot = true;
        
        playerState.ammo -= 1;
        setAmmo(playerState.ammo);
        lastActionTime.current = currentTime;

        for (let i = 0; i < bulletsToSpawn; i++) {
          const shootDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
          shootDir.x += (Math.random() - 0.5) * spread;
          shootDir.z += (Math.random() - 0.5) * spread;
          shootDir.normalize();
          const spawnPos = playerPos.clone().addScaledVector(shootDir, 1.2).add(new THREE.Vector3(0, 0.5, 0));
          
          spawnBullet(spawnPos, shootDir, BULLET_SPEED, true, damage);
        }
        soundManager.playShoot();
      } else if (isTryingToShoot && !playerState.isReloading && playerState.ammo <= 0 && currentTime - lastShootTime.current > 0.3) {
        lastShootTime.current = currentTime;
        soundManager.playEmptyAmmo();
        inputRef.justShot = false;
      } else {
        inputRef.justShot = false;
      }

      if (shieldRef.current) {
        shieldRef.current.visible = currentTime < playerState.shieldEndTime;
        if (shieldRef.current.visible) {
          shieldRef.current.rotation.y += delta * 2;
          shieldRef.current.rotation.x += delta;
        }
      }
      if (flashRef.current) {
        flashRef.current.visible = inputRef.justShot;
      }
    } catch (e) {}
  });

  return (
    <RigidBody ref={bodyRef} type="dynamic" position={[0, 5, 0]} enabledRotations={[false, false, false]} colliders={false} lockRotations friction={0} userData={{ isPlayer: true }}>
      <CapsuleCollider args={[0.5, 0.4]} friction={0} />
      <group position={[0, 0.5, 0]}>
        {/* Shield Visual */}
        <Sphere ref={shieldRef} args={[1.2, 32, 32]} visible={false}>
          <meshStandardMaterial color="#aa00ff" transparent opacity={0.3} emissive="#aa00ff" emissiveIntensity={2} wireframe />
        </Sphere>
        <Cylinder args={[0.5, 0.5, 1]} castShadow>
          <meshStandardMaterial color="#00ffcc" />
        </Cylinder>
        <Box args={[0.15, 0.15, 1.2]} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial color="#333" />
        </Box>
        {/* Flash effect when shooting */}
        <pointLight ref={flashRef} position={[0, 0, 1.5]} color="#ffff00" distance={15} intensity={5} visible={false} />
        {/* Speed boost indicator */}
        {isSpeedBoosted && (
           <pointLight position={[0, 0, 0]} color="#00ff00" distance={10} intensity={3} />
        )}
        {/* Shockwave visual */}
        {performance.now() / 1000 < (playerState.shockwaveTime || 0) + 0.5 && (
          <Sphere args={[15, 32, 32]}>
            <meshStandardMaterial color="#00ffff" transparent opacity={0.1} emissive="#00ffff" emissiveIntensity={5} />
          </Sphere>
        )}
      </group>
    </RigidBody>
  );
};

// --- MOBILE CONTROLS UI (TWIN STICK) ---
const MobileControls = ({ setGameState }: { setGameState: (state: 'menu' | 'playing' | 'gameover' | 'paused') => void }) => {
  const [leftOrigin, setLeftOrigin] = useState<{x: number, y: number} | null>(null);
  const [leftCurrent, setLeftCurrent] = useState<{x: number, y: number} | null>(null);
  const [rightOrigin, setRightOrigin] = useState<{x: number, y: number} | null>(null);
  const [rightCurrent, setRightCurrent] = useState<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent, side: 'left' | 'right') => {
    const touch = e.changedTouches[0];
    if (side === 'left') {
      setLeftOrigin({ x: touch.clientX, y: touch.clientY });
      setLeftCurrent({ x: touch.clientX, y: touch.clientY });
    } else {
      setRightOrigin({ x: touch.clientX, y: touch.clientY });
      setRightCurrent({ x: touch.clientX, y: touch.clientY });
      inputRef.isMobileAiming = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent, side: 'left' | 'right') => {
    const touch = Array.from(e.touches).find(t => 
      side === 'left' ? t.clientX < window.innerWidth / 2 : t.clientX >= window.innerWidth / 2
    );
    if (!touch) return;

    if (side === 'left' && leftOrigin) {
      setLeftCurrent({ x: touch.clientX, y: touch.clientY });
      const dx = touch.clientX - leftOrigin.x;
      const dy = touch.clientY - leftOrigin.y;
      const dist = Math.min(50, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      inputRef.move.x = (Math.cos(angle) * dist) / 50;
      inputRef.move.y = (Math.sin(angle) * dist) / 50;
    } else if (side === 'right' && rightOrigin) {
      setRightCurrent({ x: touch.clientX, y: touch.clientY });
      const dx = touch.clientX - rightOrigin.x;
      const dy = touch.clientY - rightOrigin.y;
      const dist = Math.min(50, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      inputRef.aim.x = Math.cos(angle);
      inputRef.aim.y = Math.sin(angle);
      if (dist > 20) {
         inputRef.isShooting = true;
      } else {
         inputRef.isShooting = false;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftOrigin(null);
      setLeftCurrent(null);
      inputRef.move = { x: 0, y: 0 };
    } else {
      setRightOrigin(null);
      setRightCurrent(null);
      inputRef.aim = { x: 0, y: 0 };
      inputRef.isMobileAiming = false;
      inputRef.isShooting = false;
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex pointer-events-none touch-none">
      <div 
        className="flex-1 pointer-events-auto touch-none"
        onTouchStart={e => handleTouchStart(e, 'left')}
        onTouchMove={e => handleTouchMove(e, 'left')}
        onTouchEnd={e => handleTouchEnd(e, 'left')}
        onTouchCancel={e => handleTouchEnd(e, 'left')}
      >
        {leftOrigin && leftCurrent && (
          <div className="absolute w-24 h-24 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: leftOrigin.x, top: leftOrigin.y }}>
            <div className="absolute w-10 h-10 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: 48 + (leftCurrent.x - leftOrigin.x), top: 48 + (leftCurrent.y - leftOrigin.y) }} />
          </div>
        )}
      </div>
      <div 
        className="flex-1 pointer-events-auto touch-none"
        onTouchStart={e => handleTouchStart(e, 'right')}
        onTouchMove={e => handleTouchMove(e, 'right')}
        onTouchEnd={e => handleTouchEnd(e, 'right')}
        onTouchCancel={e => handleTouchEnd(e, 'right')}
      >
        {rightOrigin && rightCurrent && (
          <div className="absolute w-24 h-24 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: rightOrigin.x, top: rightOrigin.y }}>
            <div className="absolute w-10 h-10 bg-red-500/50 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: 48 + (rightCurrent.x - rightOrigin.x), top: 48 + (rightCurrent.y - rightOrigin.y) }} />
          </div>
        )}
      </div>
      <div className="absolute bottom-8 right-[50%] translate-x-1/2 pointer-events-auto flex gap-4">
         <button 
           className="w-20 h-20 bg-blue-500/30 border-2 border-blue-300/50 rounded-full text-white font-bold active:bg-blue-600/50 backdrop-blur-sm"
           onTouchStart={() => { inputRef.keys.r = true; }}
           onTouchEnd={() => { inputRef.keys.r = false; }}
           onMouseDown={() => { inputRef.keys.r = true; }}
           onMouseUp={() => { inputRef.keys.r = false; }}
         >
           RELOAD
         </button>
         <button 
           className="w-20 h-20 bg-gray-500/30 border-2 border-gray-300/50 rounded-full text-white font-bold active:bg-gray-600/50 backdrop-blur-sm"
           onClick={() => setGameState('paused')}
         >
           PAUSE
         </button>
      </div>
    </div>
  );
};

// --- UI COMPONENTS ---
// --- UI COMPONENTS ---
const MainMenu = ({ onStart, onTutorial, highscore }: { onStart: (mode: 'endless' | 'waves') => void, onTutorial: () => void, highscore: number }) => {
  const [infoMode, setInfoMode] = useState<'endless' | 'waves' | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-purple-600 mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] tracking-widest text-center"
      >
        CYBER ARENA
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-red-400 text-xl mb-6 font-mono text-center tracking-widest"
      >
        HIGHSCORE: {highscore}
      </motion.p>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(255, 0, 0, 0.8)" }}
            whileTap={{ scale: 0.95 }}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            onClick={() => { soundManager.playMenuClick(); onStart('endless'); }}
            className="px-6 py-3 bg-gradient-to-r from-red-900 to-red-700 text-white font-black text-xl rounded-xl border-2 border-red-500 cursor-pointer pointer-events-auto w-full md:w-auto"
          >
            ENDLESS MODE
          </motion.button>
          <button 
            onClick={() => { soundManager.playMenuClick(); setInfoMode('endless'); }}
            className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white font-bold hover:bg-white/30 transition-colors z-40 pointer-events-auto"
          >
            ?
          </button>
        </div>

        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(150, 0, 255, 0.8)" }}
            whileTap={{ scale: 0.95 }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            onClick={() => { soundManager.playMenuClick(); onStart('waves'); }}
            className="px-6 py-3 bg-gradient-to-r from-purple-900 to-purple-700 text-white font-black text-xl rounded-xl border-2 border-purple-500 cursor-pointer pointer-events-auto w-full md:w-auto"
          >
            WAVE MODE
          </motion.button>
          <button 
            onClick={() => { soundManager.playMenuClick(); setInfoMode('waves'); }}
            className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white font-bold hover:bg-white/30 transition-colors z-40 pointer-events-auto"
          >
            ?
          </button>
        </div>
      </div>
      
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => { soundManager.playMenuClick(); onTutorial(); }}
        className="mt-12 text-gray-500 hover:text-cyan-400 font-mono text-sm tracking-widest transition-colors uppercase border-b border-transparent hover:border-cyan-400 pb-1 cursor-pointer pointer-events-auto"
      >
        Replay Tutorial
      </motion.button>

      <AnimatePresence>
        {infoMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-8 pointer-events-auto"
          >
            <div className="bg-gray-900 border-2 border-white/20 p-8 rounded-2xl max-w-md w-full relative shadow-[0_0_50px_rgba(0,0,0,1)]">
              <button 
                onClick={() => setInfoMode(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-2xl font-bold"
              >
                ×
              </button>
              <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase italic text-white">
                {infoMode === 'endless' ? 'Endless Mode' : 'Wave Mode'}
              </h2>
              <p className="text-gray-400 font-mono text-lg leading-relaxed">
                {infoMode === 'endless' 
                  ? "Survive as long as possible against an ever-growing horde of enemies. The difficulty increases over time. No breaks, just pure chaos."
                  : "Defeat a specific number of enemies to clear a wave. After each wave, you get a short break to recover. New enemy types appear in later waves."}
              </p>
              <button 
                onClick={() => setInfoMode(null)}
                className="mt-8 w-full py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-colors uppercase tracking-widest"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const GameOver = ({ onRestart, onMenu, score, highscore }: { onRestart: () => void, onMenu: () => void, score: number, highscore: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 1.2 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg"
  >
    <motion.h2
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
      className="text-8xl font-black text-red-600 mb-8 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] tracking-widest"
    >
      GAME OVER
    </motion.h2>
    
    <div className="flex flex-col items-center gap-4 mb-12">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-4xl font-mono text-white"
      >
        SCORE: <span className="text-yellow-400 font-bold">{score}</span>
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-mono text-gray-400"
      >
        BEST: {highscore}
      </motion.div>
    </div>

    <div className="flex gap-6">
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,0,0,0.2)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onRestart}
        className="px-8 py-4 border-2 border-red-500 text-red-500 font-bold text-xl tracking-widest hover:text-red-400 cursor-pointer pointer-events-auto"
      >
        TRY AGAIN
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={onMenu}
        className="px-8 py-4 border-2 border-gray-500 text-gray-300 font-bold text-xl tracking-widest hover:text-white cursor-pointer pointer-events-auto"
      >
        MAIN MENU
      </motion.button>
    </div>
  </motion.div>
);

const AbilityIcon = ({ label, name, cooldown, abilityKey, color, onClick }: any) => {
  const [progress, setProgress] = useState(1);
  const [remainingTime, setRemainingTime] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now() / 1000;
      const cooldownEndTime = playerState.abilityCooldowns[abilityKey as keyof typeof playerState.abilityCooldowns];
      const remaining = Math.max(0, cooldownEndTime - now);
      setRemainingTime(remaining);
      setProgress(1 - remaining / cooldown);
    }, 50);
    return () => clearInterval(interval);
  }, [cooldown, abilityKey]);

  return (
    <div className="flex flex-col items-center pointer-events-auto cursor-pointer group" onPointerDown={onClick}>
      <div className="relative w-12 h-12 md:w-10 md:h-10 bg-black/60 border-2 border-white/20 flex items-center justify-center overflow-hidden group-active:scale-90 transition-transform">
        <div 
          className="absolute bottom-0 left-0 w-full" 
          style={{ height: `${progress * 100}%`, backgroundColor: color, opacity: 0.4 }} 
        />
        {remainingTime > 0 ? (
          <span className="relative z-10 font-black text-white text-lg md:text-base">{Math.ceil(remainingTime)}</span>
        ) : (
          <span className="relative z-10 font-black text-white italic text-lg md:text-base">{label}</span>
        )}
      </div>
      <span className="text-[8px] font-mono mt-1 opacity-50 tracking-widest uppercase" style={{ color }}>{name}</span>
    </div>
  );
};

const PowerupButton = ({ label, name, count, color, onClick }: any) => (
  <div className="flex flex-col items-center pointer-events-auto cursor-pointer group" onPointerDown={onClick}>
    <div className="relative w-12 h-12 md:w-10 md:h-10 bg-black/60 border-2 border-white/20 flex items-center justify-center overflow-hidden group-active:scale-90 transition-transform">
      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: color }} />
      <span className="relative z-10 font-black text-white italic text-lg md:text-base">{label}</span>
      <div className="absolute bottom-0 right-0 bg-black/80 px-1 text-[10px] font-bold text-white border-t border-l border-white/20">
        {count}
      </div>
    </div>
    <span className="text-[8px] font-mono mt-1 opacity-50 tracking-widest uppercase" style={{ color }}>{name}</span>
  </div>
);

const HUD = ({ health, score, ammo, isReloading, wave, enemiesRemaining, waveCountdown, waveAnnouncement, gameMode, killsInWave, weaponType, powerupCharges, onUsePowerup, portalUsesLeft }: { health: number, score: number, ammo: number, isReloading: boolean, wave: number, enemiesRemaining: number, waveCountdown: number, waveAnnouncement: string | null, gameMode: 'endless' | 'waves', killsInWave: number, weaponType: string, powerupCharges: { health: number, ammo: number }, onUsePowerup: (type: 'health' | 'ammo') => void, portalUsesLeft: number }) => {
  const displayHealth = Math.round(health);
  const healthPercent = Math.max(0, Math.min(100, health));
  const killGoal = 10 + (wave - 1) * 5;
  const [speedBoostActive, setSpeedBoostActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedBoostActive(performance.now() < playerState.speedBoostEndTime);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-6"
    >
      <div className="flex justify-between items-start">
        {/* Left Side: Health & Wave */}
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <div className="w-48 md:w-64 h-12 bg-black/60 border-2 border-red-900/80 skew-x-[-15deg] overflow-hidden backdrop-blur-md shadow-[0_0_15px_rgba(255,0,0,0.3)]">
              <motion.div 
                className="h-full bg-gradient-to-r from-red-800 to-red-500"
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercent}%` }}
                transition={{ type: 'spring', bounce: 0.3 }}
              />
            </div>
            <div className="absolute inset-0 flex items-center px-6 skew-x-[-15deg]">
              <motion.span 
                animate={{ color: displayHealth < 30 ? '#ffaaaa' : '#ffffff' }}
                className="font-mono font-black text-2xl italic tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
              >
                HP {displayHealth}
              </motion.span>
            </div>
          </div>

          {speedBoostActive && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 px-4 py-1 bg-yellow-500/20 border border-yellow-500/50 skew-x-[-15deg] backdrop-blur-md"
            >
              <div className="skew-x-[15deg] flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                <span className="font-mono text-[10px] text-yellow-400 font-bold uppercase tracking-widest">Speed Boost Active</span>
              </div>
            </motion.div>
          )}

          <div className="flex gap-2">
            {gameMode === 'waves' && (
              <>
                <div className="px-4 py-1 bg-black/60 border border-white/20 skew-x-[-15deg] backdrop-blur-md">
                  <div className="skew-x-[15deg] font-mono text-xs text-white/70 uppercase tracking-widest">
                    Welle <span className="text-white font-bold text-lg">{wave}</span>
                  </div>
                </div>
                <div className="px-4 py-1 bg-black/60 border border-white/20 skew-x-[-15deg] backdrop-blur-md">
                  <div className="skew-x-[15deg] font-mono text-xs text-white/70 uppercase tracking-widest">
                    Kills <span className="text-red-500 font-bold text-lg">{killsInWave} / {killGoal}</span>
                  </div>
                </div>
              </>
            )}
            {gameMode === 'endless' && (
              <div className="px-4 py-1 bg-black/60 border border-white/20 skew-x-[-15deg] backdrop-blur-md">
                <div className="skew-x-[15deg] font-mono text-xs text-white/70 uppercase tracking-widest">
                  Modus <span className="text-white font-bold text-lg">ENDLOS</span>
                </div>
              </div>
            )}
          </div>

          {/* Abilities Display */}
          <div className="flex gap-4 mt-2">
            <AbilityIcon 
              label="Q" 
              name="SHOCK" 
              cooldown={10} 
              abilityKey="q" 
              color="#00ffff" 
              onClick={() => (inputRef as any).abilities.q = true}
            />
            <AbilityIcon 
              label="E" 
              name="SHIELD" 
              cooldown={20} 
              abilityKey="e" 
              color="#aa00ff" 
              onClick={() => (inputRef as any).abilities.e = true}
            />
            <PowerupButton 
              label="1" 
              name="MEDKIT" 
              count={powerupCharges.health} 
              color="#00ff00" 
              onClick={() => onUsePowerup('health')}
            />
            <PowerupButton 
              label="2" 
              name="AMMO" 
              count={powerupCharges.ammo} 
              color="#0088ff" 
              onClick={() => onUsePowerup('ammo')}
            />
          </div>
        </div>

        {/* Score */}
        <div className="relative">
          <div className="px-8 py-3 bg-black/60 border-2 border-white/20 skew-x-[15deg] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <div className="skew-x-[-15deg]">
              <motion.div
                key={`score-${score}`}
                initial={{ scale: 1.3, color: '#ffff00' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="font-mono font-black text-3xl italic tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
              >
                SCORE {score}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Messages */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <AnimatePresence>
          {waveAnnouncement && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              {waveAnnouncement}
            </motion.div>
          )}
          {waveCountdown > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="text-white font-mono text-xl tracking-[0.5em] uppercase mb-2">Next Wave In</div>
              <div className="text-8xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(255,255,0,0.5)]">{waveCountdown}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom HUD (Ammo) */}
      <div className="flex justify-end items-end">
        <div className="relative">
          <div className="px-6 py-2 bg-black/60 border-2 border-blue-900/80 skew-x-[-15deg] backdrop-blur-md shadow-[0_0_15px_rgba(0,100,255,0.2)]">
            <div className="skew-x-[15deg] flex flex-col items-end gap-1">
              <div className="text-white/50 text-xs font-bold uppercase tracking-wider">{weaponType}</div>
              {isReloading ? (
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="font-mono font-black text-2xl italic tracking-wider text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.6)]"
                >
                  RELOADING...
                </motion.div>
              ) : (
                <motion.div
                  key={`ammo-${ammo}`}
                  initial={{ scale: 1.3, color: '#ffffff' }}
                  animate={{ scale: 1, color: ammo <= 5 ? '#ff4444' : '#66ccff' }}
                  className="font-mono font-black text-3xl italic tracking-wider drop-shadow-[0_0_8px_rgba(100,200,255,0.6)]"
                >
                  AMMO {ammo}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {displayHealth > 0 && displayHealth < 40 && (
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,0,0,0.4)] animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
};

// --- MAIN APP ---
const PauseMenu = ({ onResume, onRestart, onQuit }: { onResume: () => void, onRestart: () => void, onQuit: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
  >
    <h2 className="text-5xl font-black text-white mb-8">PAUSED</h2>
    <div className="flex flex-col gap-4">
      <button onClick={onResume} className="px-8 py-4 bg-green-600 text-white text-xl font-bold rounded-xl">RESUME</button>
      <FullscreenButton isInline />
      <button onClick={onRestart} className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-xl">RESTART</button>
      <button onClick={onQuit} className="px-8 py-4 bg-red-600 text-white text-xl font-bold rounded-xl">QUIT</button>
    </div>
  </motion.div>
);

// --- DRONE COMPONENT ---
const Drone = ({ index, totalDrones }: { index: number, totalDrones: number }) => {
  const droneRef = useRef<THREE.Group>(null);
  const lastShootTime = useRef(0);
  
  useFrame((state, delta) => {
    if (!droneRef.current || playerState.gameState !== 'playing') return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate target position around player
    const angle = (index / totalDrones) * Math.PI * 2 + time * 1.5;
    const radius = 2.5;
    const targetX = playerState.pos.x + Math.cos(angle) * radius;
    const targetZ = playerState.pos.z + Math.sin(angle) * radius;
    const targetY = playerState.pos.y + 1.5 + Math.sin(time * 3 + index) * 0.3;
    
    // Move drone towards target position smoothly
    droneRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1);
    
    // Find closest enemy
    let closestEnemy: any = null;
    let closestDist = Infinity;
    
    enemiesData.forEach((e) => {
      const dist = e.pos.distanceTo(droneRef.current!.position);
      if (dist < 20 && dist < closestDist) {
        closestDist = dist;
        closestEnemy = e;
      }
    });
    
    if (closestEnemy) {
      // Look at enemy
      const targetRotation = new THREE.Vector3(closestEnemy.pos.x, closestEnemy.pos.y + 0.5, closestEnemy.pos.z);
      droneRef.current.lookAt(targetRotation);
      
      // Shoot
      if (time - lastShootTime.current > 1.0) { // Drone shoots every 1 second
        lastShootTime.current = time;
        const shootDir = new THREE.Vector3().subVectors(
          targetRotation,
          droneRef.current.position
        ).normalize();
        
        // Add a bit of spread
        shootDir.x += (Math.random() - 0.5) * 0.1;
        shootDir.y += (Math.random() - 0.5) * 0.1;
        shootDir.z += (Math.random() - 0.5) * 0.1;
        shootDir.normalize();
        
        spawnBullet(droneRef.current.position.clone().add(shootDir.multiplyScalar(0.5)), shootDir, 25, true, 15, 0.5);
        // We can skip sound for drone to avoid audio clutter, or play a quieter sound
      }
    } else {
      // Look at moving direction or just rotate
      droneRef.current.rotation.y += delta;
    }
  });

  return (
    <group ref={droneRef}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.8} wireframe />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <pointLight color="#00ffff" intensity={1} distance={3} />
    </group>
  );
};

export default function ShooterGame() {
  const bloodSystem = useRef(null);
  const playerBodyRef = useRef<any>(null);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'paused'>('menu');
  const [currentMap, setCurrentMap] = useState<'city' | 'military' | 'factory' | 'apartment'>('city');
  const [showMapName, setShowMapName] = useState(false);
  const [portalTransition, setPortalTransition] = useState<'idle' | 'in' | 'out'>('idle');
  const [portalUsesLeft, setPortalUsesLeft] = useState(5);
  const isTeleportingRef = useRef(false);
  const [gameKey, setGameKey] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState(() => parseInt(localStorage.getItem('cyber_arena_highscore') || '0', 10));
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isTutorialHidden, setIsTutorialHidden] = useState(false);
  const tutorialSpawnPos = useRef<THREE.Vector3 | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialLanguage, setTutorialLanguage] = useState<'en' | 'de' | null>(null);
  const [gameMode, setGameMode] = useState<'endless' | 'waves'>('endless');
  const [wave, setWave] = useState(1);
  const [waveCountdown, setWaveCountdown] = useState(0);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [killsInWave, setKillsInWave] = useState(0);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);
  const [weaponType, setWeaponType] = useState<string>('pistol');
  const [powerupCharges, setPowerupCharges] = useState({ health: 10, ammo: 10 });

  const handleUsePowerup = useCallback((type: 'health' | 'ammo') => {
    if (powerupCharges[type] <= 0) return;

    setPowerupCharges(prev => ({ ...prev, [type]: prev[type] - 1 }));
    soundManager.playReload();

    if (type === 'health') {
      playerState.health = Math.min(100, playerState.health + 30);
      setHealth(playerState.health);
    } else if (type === 'ammo') {
      playerState.ammo = playerState.maxAmmo;
      setAmmo(playerState.ammo);
    }
  }, [powerupCharges]);

  const updateHighscore = useCallback(() => {
    setHighscore(prev => {
      if (score > prev) {
        localStorage.setItem('cyber_arena_highscore', score.toString());
        return score;
      }
      return prev;
    });
  }, [score]);

  const handleTeleport = (target: [number, number, number]) => {
    if (playerBodyRef.current) {
      playerBodyRef.current.setTranslation({ x: target[0], y: target[1], z: target[2] }, true);
      soundManager.playShoot(); // Reuse shoot sound for teleport for now
    }
  };

  useEffect(() => {
    playerState.gameState = gameState;
    if (health <= 0 && gameState === 'playing' && !isTutorialActive) {
      setGameState('gameover');
      soundManager.playGameOver();
      updateHighscore();
    }
  }, [health, gameState, updateHighscore, isTutorialActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.keys.w = true;
      if (key === 'a') inputRef.keys.a = true;
      if (key === 's') inputRef.keys.s = true;
      if (key === 'd') inputRef.keys.d = true;
      if (key === 'r') inputRef.keys.r = true;
      if (key === 'q') inputRef.keys.q = true;
      if (key === 'e') inputRef.keys.e = true;
      if (key === '1') handleUsePowerup('health');
      if (key === '2') handleUsePowerup('ammo');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.keys.w = false;
      if (key === 'a') inputRef.keys.a = false;
      if (key === 's') inputRef.keys.s = false;
      if (key === 'd') inputRef.keys.d = false;
      if (key === 'r') inputRef.keys.r = false;
      if (key === 'q') inputRef.keys.q = false;
      if (key === 'e') inputRef.keys.e = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      inputRef.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      inputRef.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) inputRef.isShooting = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) inputRef.isShooting = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleUsePowerup]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'playing') {
        setGameState('paused');
      }
    };
    const handleOrientationChange = () => {
      if (window.innerHeight > window.innerWidth && gameState === 'playing') {
        setGameState('paused');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      setShowMapName(true);
      const t = setTimeout(() => setShowMapName(false), 3000);
      return () => clearTimeout(t);
    }
  }, [currentMap, gameState]);

  const handlePortalEnter = useCallback(() => {
    if (isTeleportingRef.current || portalUsesLeft <= 0) return;
    
    isTeleportingRef.current = true;
    setPortalUsesLeft(prev => prev - 1);
    setPortalTransition('in');
    
    try {
      soundManager.playPowerup(); // Play a sound for feedback
    } catch (e) {
      console.error(e);
    }
    
    setTimeout(() => {
      try {
        const mapTypes: ('city' | 'military' | 'factory' | 'apartment')[] = ['city', 'military', 'factory', 'apartment'];
        setCurrentMap(current => {
          const others = mapTypes.filter(m => m !== current);
          return others[Math.floor(Math.random() * others.length)];
        });
        if (playerBodyRef.current) {
          playerBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
          playerBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      } catch (err) {
        console.error("Error during teleport:", err);
      } finally {
        setPortalTransition('out');
        
        setTimeout(() => {
          setPortalTransition('idle');
          isTeleportingRef.current = false;
        }, 1000);
      }
    }, 1500);
  }, [portalUsesLeft]);

  const startGame = (mode: 'endless' | 'waves' = 'endless', forceTutorial = false) => {
    const mapTypes: ('city' | 'military' | 'factory' | 'apartment')[] = ['city', 'military', 'factory', 'apartment'];
    setCurrentMap(mapTypes[Math.floor(Math.random() * mapTypes.length)]);
    soundManager.init();
    setGameMode(mode);
    setScore(0);
    setHealth(100);
    setAmmo(30);
    setIsReloading(false);
    playerState.health = 100;
    playerState.ammo = 30;
    playerState.maxAmmo = 30;
    playerState.weapon = 'pistol';
    playerState.isReloading = false;
    playerState.speedBoostEndTime = 0;
    bullets.forEach(b => b.active = false);
    enemiesData.clear();
    inputRef.move = { x: 0, y: 0 };
    inputRef.aim = { x: 0, y: 0 };
    inputRef.isShooting = false;
    inputRef.isMobileAiming = false;
    inputRef.justShot = false;
    setGameKey(k => k + 1);
    setWave(1);
    setPowerupCharges({ health: 10, ammo: 10 });
    setWaveCountdown(0);
    setEnemiesRemaining(0);
    setKillsInWave(0);
    setWeaponType('pistol');
    setPortalUsesLeft(5);
    
    const tutorialCompleted = localStorage.getItem('cyber_arena_tutorial_completed') === 'true';
    if (!tutorialCompleted || forceTutorial) {
      setIsTutorialActive(true);
      setIsTutorialHidden(false);
      setTutorialStep(0);
      setTutorialLanguage(null);
    }
    
    setGameState('playing');
  };

  // Set tutorial spawn position when tutorial is hidden for an action step
  useEffect(() => {
    if (isTutorialActive && isTutorialHidden) {
      if (tutorialStep === 3) {
        tutorialSpawnPos.current = playerState.pos.clone().add(new THREE.Vector3(5, 0, 5));
      } else if (tutorialStep === 6) {
        tutorialSpawnPos.current = playerState.pos.clone().add(new THREE.Vector3(-5, 0, 5));
      } else {
        tutorialSpawnPos.current = null;
      }
    }
  }, [isTutorialActive, isTutorialHidden, tutorialStep]);

  // Tutorial Action Detection
  useEffect(() => {
    if (!isTutorialActive || !isTutorialHidden) return;

    const interval = setInterval(() => {
      let completed = false;
      const currentTime = performance.now() / 1000;

      switch (tutorialStep) {
        case 1: // Movement
          if (inputRef.move.x !== 0 || inputRef.move.y !== 0) completed = true;
          break;
        case 2: // Shooting
          if (inputRef.justShot) completed = true;
          break;
        case 3: // Weapon Pickup
          if (playerState.weapon === 'machinegun') completed = true;
          break;
        case 4: // Reloading
          if (playerState.isReloading) completed = true;
          break;
        case 5: // Abilities
          // Check if either Q or E cooldown was triggered (meaning the ability was used)
          if (playerState.abilityCooldowns.q > currentTime || playerState.abilityCooldowns.e > currentTime) completed = true;
          break;
        case 6: // Health Pickup
          if (playerState.health > 99) {
             // If health is already 100, we check if they are near the spawn point
             if (tutorialSpawnPos.current && playerState.pos.distanceTo(tutorialSpawnPos.current) < 2) completed = true;
          }
          break;
      }

      if (completed) {
        clearInterval(interval);
        soundManager.playPowerup();
        
        // Wait 2 seconds before showing the next step
        setTimeout(() => {
          setIsTutorialHidden(false);
          setTutorialStep(s => s + 1);
        }, 2000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isTutorialActive, isTutorialHidden, tutorialStep]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none cursor-crosshair">
      {gameState !== 'playing' && <FullscreenButton />}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white portrait:flex landscape:hidden">
        <svg className="w-24 h-24 mb-6 animate-pulse text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <h2 className="text-3xl font-black tracking-widest text-center px-4">PLEASE ROTATE<br/>YOUR DEVICE</h2>
        <p className="mt-4 text-gray-400 font-mono text-center px-8">This game is designed for landscape mode.</p>
      </div>

      <AnimatePresence mode="wait">
        {isTutorialActive && (
          <TutorialOverlay 
            key="tutorial"
            step={tutorialStep}
            setStep={setTutorialStep}
            language={tutorialLanguage}
            setLanguage={setTutorialLanguage}
            isHidden={isTutorialHidden}
            setIsHidden={setIsTutorialHidden}
            onComplete={() => {
              setIsTutorialActive(false);
              localStorage.setItem('cyber_arena_tutorial_completed', 'true');
              soundManager.playWaveStart();
            }} 
            onSkip={() => {
              setIsTutorialActive(false);
              setGameState('menu');
              soundManager.playMenuClick();
            }}
          />
        )}
        {gameState === 'menu' && <MainMenu key="menu" onStart={startGame} onTutorial={() => startGame('endless', true)} highscore={highscore} />}
        {gameState === 'paused' && (
          <PauseMenu 
            key="paused" 
            onResume={() => setGameState('playing')} 
            onRestart={() => { updateHighscore(); startGame(gameMode); }} 
            onQuit={() => { updateHighscore(); setGameState('menu'); }} 
          />
        )}
        {gameState === 'gameover' && <GameOver key="gameover" onRestart={() => startGame(gameMode)} onMenu={() => { updateHighscore(); setGameState('menu'); }} score={score} highscore={highscore} />}
        {gameState === 'playing' && (
          <motion.div 
            key="playing-hud"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HUD 
              key="hud" 
              health={health} 
              score={score} 
              ammo={ammo} 
              isReloading={isReloading} 
              wave={wave} 
              enemiesRemaining={enemiesRemaining} 
              waveCountdown={waveCountdown} 
              waveAnnouncement={waveAnnouncement} 
              gameMode={gameMode} 
              killsInWave={killsInWave} 
              weaponType={weaponType} 
              powerupCharges={powerupCharges}
              onUsePowerup={handleUsePowerup}
              portalUsesLeft={portalUsesLeft}
            />
            <Minimap />
            {showMapName && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse">
                  {currentMap}
                </h1>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {damageFlash && <div className="absolute inset-0 bg-red-600/40 pointer-events-none z-20 animate-pulse" />}
      {isReloading && <div className="absolute inset-0 bg-yellow-500/30 pointer-events-none z-20 animate-pulse" />}
      
      <div 
        className={`absolute inset-0 z-50 flex items-center justify-center bg-fuchsia-900/90 backdrop-blur-lg transition-opacity duration-1000 pointer-events-none ${
          portalTransition === 'in' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {portalTransition !== 'idle' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-fuchsia-400 border-t-fuchsia-100 rounded-full animate-spin mb-4"></div>
            <h2 className="text-3xl font-black text-white tracking-widest animate-pulse">WARPING DIMENSIONS...</h2>
          </div>
        )}
      </div>
      
      {useMemo(() => (
        <Canvas shadows camera={{ position: [0, 35, 15], fov: 40 }}>
          <Physics gravity={[0, -30, 0]}>
            {currentMap === 'city' && (
              <>
                <color attach="background" args={['#111111']} />
                <fog attach="fog" args={['#111111', 20, 80]} />
                <ambientLight intensity={2.0} />
                <directionalLight position={[20, 40, 20]} castShadow intensity={3} color="#ffddaa" />
                <pointLight position={[0, 20, 0]} intensity={2} color="#ff0000" distance={80} />
              </>
            )}
            {currentMap === 'military' && (
              <>
                <color attach="background" args={['#050a05']} />
                <fog attach="fog" args={['#050a05', 10, 60]} />
                <ambientLight intensity={1.5} />
                <directionalLight position={[20, 40, 20]} castShadow intensity={2} color="#aaffaa" />
                <pointLight position={[0, 20, 0]} intensity={4} color="#00ff00" distance={100} />
              </>
            )}
            {currentMap === 'factory' && (
              <>
                <color attach="background" args={['#1a0a00']} />
                <fog attach="fog" args={['#1a0a00', 15, 70]} />
                <ambientLight intensity={2.0} />
                <directionalLight position={[20, 40, 20]} castShadow intensity={3.5} color="#ffaaaa" />
                <pointLight position={[0, 20, 0]} intensity={5} color="#ff4400" distance={90} />
              </>
            )}
            {currentMap === 'apartment' && (
              <>
                <color attach="background" args={['#1a1a2a']} />
                <fog attach="fog" args={['#1a1a2a', 20, 90]} />
                <ambientLight intensity={2.5} />
                <directionalLight position={[20, 40, 20]} castShadow intensity={3} color="#ffffff" />
                <pointLight position={[0, 20, 0]} intensity={3} color="#aaaaff" distance={100} />
              </>
            )}
            <Arena onTeleport={handleTeleport} bloodSystem={bloodSystem} mapType={currentMap} onPortalEnter={handlePortalEnter} portalUsesLeft={portalUsesLeft} />
            <BulletManager bloodSystem={bloodSystem} />
            {gameState === 'playing' && (
              <group key={gameKey}>
                <Player 
                  setHealth={setHealth} 
                  setDamageFlash={setDamageFlash} 
                  setAmmo={setAmmo} 
                  setIsReloading={setIsReloading} 
                  bodyRef={playerBodyRef}
                />
                <GameManager 
                  bloodSystem={bloodSystem} 
                  gameMode={gameMode} 
                  setScore={setScore} 
                  wave={wave} 
                  setWave={setWave} 
                  setWaveCountdown={setWaveCountdown} 
                  waveCountdown={waveCountdown}
                  setEnemiesRemaining={setEnemiesRemaining} 
                  setWaveAnnouncement={setWaveAnnouncement}
                  setKillsInWave={setKillsInWave}
                  killsInWave={killsInWave}
                  setWeaponType={setWeaponType}
                  isTutorialActive={isTutorialActive}
                  setHealth={setHealth}
                  tutorialStep={tutorialStep}
                  isTutorialHidden={isTutorialHidden}
                />
                {Array.from({ length: Math.min(5, Math.floor(Math.max(score, highscore) / 100)) }).map((_, i, arr) => (
                  <Drone key={`drone-${i}`} index={i} totalDrones={arr.length} />
                ))}
              </group>
            )}
          </Physics>

          <BloodParticles ref={bloodSystem} />
        </Canvas>
      ), [gameState, gameKey, gameMode, wave, killsInWave, score, highscore, waveCountdown, currentMap, portalUsesLeft, isTutorialActive, isTutorialHidden, tutorialStep])}

      {gameState === 'playing' && <MobileControls setGameState={setGameState} />}
    </div>
  );
}
