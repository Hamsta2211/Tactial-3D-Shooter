import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Box, Cylinder } from '@react-three/drei';
import { Physics, RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';

// --- GLOBAL STATE & INPUT ---
const inputRef = {
  move: { x: 0, y: 0 },
  lookDelta: { x: 0, y: 0 },
  isShooting: false,
  justShot: false,
  keys: { w: false, a: false, s: false, d: false, space: false }
};

const ENEMY_SPEED = 4;
const PLAYER_SPEED = 8;
const MAX_PARTICLES = 2000;
const BULLET_SPEED = 50;
const ENEMY_BULLET_SPEED = 25;
const MAX_BULLETS = 200;

const playerState = {
  pos: new THREE.Vector3(),
  health: 100,
  takeDamage: (amount: number) => {}
};

const enemiesData = new Map<number, { pos: THREE.Vector3, takeDamage: (amount: number, hitPos: THREE.Vector3) => void }>();

// --- BULLET SYSTEM ---
class Bullet {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  active = false;
  isPlayer = false;
  life = 0;
}
const bullets = Array.from({ length: MAX_BULLETS }, () => new Bullet());

const spawnBullet = (pos: THREE.Vector3, dir: THREE.Vector3, speed: number, isPlayer: boolean) => {
  const b = bullets.find(b => !b.active);
  if (b) {
    b.pos.copy(pos);
    b.vel.copy(dir).normalize().multiplyScalar(speed);
    b.active = true;
    b.isPlayer = isPlayer;
    b.life = 0;
  }
};

const BulletManager = ({ bloodSystem }: any) => {
  const playerMeshRef = useRef<THREE.InstancedMesh>(null);
  const enemyMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!playerMeshRef.current || !enemyMeshRef.current) return;
    
    let playerCount = 0;
    let enemyCount = 0;

    bullets.forEach((b) => {
      if (b.active) {
        b.pos.addScaledVector(b.vel, delta);
        b.life += delta;
        
        let hit = false;
        
        // Floor/Wall basic collision (y < 0 or too far)
        if (b.pos.y < -0.5 || b.pos.y > 20 || b.pos.x < -50 || b.pos.x > 50 || b.pos.z < -50 || b.pos.z > 50) {
          hit = true;
        }
        
        if (!hit && b.isPlayer) {
          // Check enemies
          for (const [id, enemy] of enemiesData.entries()) {
            if (b.pos.distanceToSquared(enemy.pos) < 2.0) { // Hit radius
              enemy.takeDamage(35, b.pos);
              hit = true;
              break;
            }
          }
        } else if (!hit && !b.isPlayer) {
          // Check player
          if (b.pos.distanceToSquared(playerState.pos) < 1.5) {
            playerState.takeDamage(10);
            bloodSystem.current?.emit(b.pos, 10);
            hit = true;
          }
        }
        
        if (b.life > 2 || hit) {
          b.active = false;
        }
        
        if (b.active) {
          dummy.position.copy(b.pos);
          dummy.lookAt(b.pos.x + b.vel.x, b.pos.y + b.vel.y, b.pos.z + b.vel.z);
          dummy.scale.set(0.15, 0.15, 2.0); // Tracer shape
          dummy.updateMatrix();
          
          if (b.isPlayer) {
            playerMeshRef.current!.setMatrixAt(playerCount++, dummy.matrix);
          } else {
            enemyMeshRef.current!.setMatrixAt(enemyCount++, dummy.matrix);
          }
        }
      }
    });

    // Hide unused instances
    dummy.position.set(0, -100, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    
    for (let i = playerCount; i < MAX_BULLETS; i++) {
      playerMeshRef.current!.setMatrixAt(i, dummy.matrix);
    }
    for (let i = enemyCount; i < MAX_BULLETS; i++) {
      enemyMeshRef.current!.setMatrixAt(i, dummy.matrix);
    }

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
    particles.forEach((p, i) => {
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
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial color="#8a0000" roughness={0.1} metalness={0.2} />
    </instancedMesh>
  );
});

// --- EPIC MAP ---
const EpicMap = () => {
  return (
    <group>
      {/* Main Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <Box args={[100, 1, 100]} receiveShadow>
          <meshStandardMaterial color="#3a3a4c" roughness={0.8} metalness={0.2} />
        </Box>
      </RigidBody>
      
      {/* Central Platform */}
      <RigidBody type="fixed" position={[0, 0.5, 0]}>
        <Cylinder args={[10, 12, 2, 32]} receiveShadow castShadow>
          <meshStandardMaterial color="#4a4a5c" roughness={0.7} metalness={0.4} />
        </Cylinder>
      </RigidBody>

      {/* Ramps */}
      <RigidBody type="fixed" position={[0, 0.75, 14.5]} rotation={[0.149, 0, 0]} friction={0}>
        <Box args={[6, 0.5, 10]} receiveShadow castShadow>
          <meshStandardMaterial color="#5a5a6c" roughness={0.7} metalness={0.4} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[14.5, 0.75, 0]} rotation={[0, 0, -0.149]} friction={0}>
        <Box args={[10, 0.5, 6]} receiveShadow castShadow>
          <meshStandardMaterial color="#5a5a6c" roughness={0.7} metalness={0.4} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 0.75, -14.5]} rotation={[-0.149, 0, 0]} friction={0}>
        <Box args={[6, 0.5, 10]} receiveShadow castShadow>
          <meshStandardMaterial color="#5a5a6c" roughness={0.7} metalness={0.4} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[-14.5, 0.75, 0]} rotation={[0, 0, 0.149]} friction={0}>
        <Box args={[10, 0.5, 6]} receiveShadow castShadow>
          <meshStandardMaterial color="#5a5a6c" roughness={0.7} metalness={0.4} />
        </Box>
      </RigidBody>

      {/* Pillars with Neon */}
      {[-20, 20].map(x => 
        [-20, 20].map(z => (
          <RigidBody key={`${x}-${z}`} type="fixed" position={[x, 5, z]}>
            <Box args={[4, 10, 4]} receiveShadow castShadow>
              <meshStandardMaterial color="#2a2a38" roughness={0.9} metalness={0.8} />
            </Box>
            {/* Neon accent */}
            <Box args={[4.2, 0.5, 4.2]} position={[0, 3, 0]}>
              <meshBasicMaterial color="#ff0055" toneMapped={false} />
            </Box>
            <pointLight position={[0, 3, 0]} color="#ff0055" intensity={2} distance={15} />
          </RigidBody>
        ))
      )}

      {/* Boundary Walls */}
      <RigidBody type="fixed" position={[0, 5, -50]}>
        <Box args={[100, 10, 2]} receiveShadow castShadow>
          <meshStandardMaterial color="#1f1f2e" roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 5, 50]}>
        <Box args={[100, 10, 2]} receiveShadow castShadow>
          <meshStandardMaterial color="#1f1f2e" roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[-50, 5, 0]}>
        <Box args={[2, 10, 100]} receiveShadow castShadow>
          <meshStandardMaterial color="#1f1f2e" roughness={1} />
        </Box>
      </RigidBody>
      <RigidBody type="fixed" position={[50, 5, 0]}>
        <Box args={[2, 10, 100]} receiveShadow castShadow>
          <meshStandardMaterial color="#1f1f2e" roughness={1} />
        </Box>
      </RigidBody>
    </group>
  );
};

// --- ENEMY ---
const Enemy = ({ id, initialPos, onDie, bloodSystem, gameMode }: any) => {
  const bodyRef = useRef<any>(null);
  const [health, setHealth] = useState(100);
  const lastShootTime = useRef(0);

  useEffect(() => {
    const takeDamage = (amount: number, hitPos: THREE.Vector3) => {
      setHealth(h => {
        const newH = h - amount;
        if (newH > 0) {
          bloodSystem.current?.emit(hitPos, 15);
        }
        return newH;
      });
    };
    enemiesData.set(id, { pos: new THREE.Vector3(...initialPos), takeDamage });
    return () => { enemiesData.delete(id); };
  }, [id, bloodSystem, initialPos]);

  useFrame((state, delta) => {
    if (!bodyRef.current || health <= 0) return;

    try {
      const posObj = bodyRef.current.translation();
      if (!posObj || isNaN(posObj.x)) return;
      const px = posObj.x, py = posObj.y, pz = posObj.z;
      
      const currentPos = new THREE.Vector3(px, py, pz);
      
      // Update global pos for bullets
      const eData = enemiesData.get(id);
      if (eData) eData.pos.copy(currentPos);

      const playerPos = playerState.pos;
      const distToPlayer = currentPos.distanceTo(playerPos);

      const dir = new THREE.Vector3().subVectors(playerPos, currentPos);
      dir.y = 0;
      
      const speed = gameMode === 'hardcore' ? ENEMY_SPEED * 1.5 : ENEMY_SPEED;

      // Stop moving if close enough to shoot
      if (distToPlayer > 12) {
        if (dir.lengthSq() > 0.001) {
          dir.normalize().multiplyScalar(speed);
        } else {
          dir.set(0, 0, 0);
        }
      } else {
        dir.set(0, 0, 0); // Stop to shoot
      }

      const velObj = bodyRef.current.linvel();
      const vy = (velObj && !isNaN(velObj.y)) ? velObj.y : 0;
      
      if (!isNaN(dir.x) && !isNaN(dir.z)) {
        bodyRef.current.setLinvel({ x: dir.x, y: vy, z: dir.z }, true);
      }

      // Look at player
      if (distToPlayer > 0.1) {
        const lookAtRot = new THREE.Matrix4().lookAt(
          currentPos,
          new THREE.Vector3(playerPos.x, py, playerPos.z),
          new THREE.Vector3(0, 1, 0)
        );
        const quat = new THREE.Quaternion().setFromRotationMatrix(lookAtRot);
        if (!isNaN(quat.x)) {
          bodyRef.current.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
        }
      }

      // Shooting logic
      const shootCooldown = gameMode === 'hardcore' ? 0.5 : 1.0;
      if (distToPlayer < 20 && state.clock.elapsedTime - lastShootTime.current > shootCooldown) {
        // Add some randomness to shooting interval
        lastShootTime.current = state.clock.elapsedTime + Math.random() * shootCooldown; 
        
        const shootDir = new THREE.Vector3().subVectors(
          new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z), // aim at player body
          new THREE.Vector3(px, py + 1, pz) // shoot from enemy body
        ).normalize();
        
        // Add slight inaccuracy
        shootDir.x += (Math.random() - 0.5) * 0.1;
        shootDir.y += (Math.random() - 0.5) * 0.1;
        shootDir.z += (Math.random() - 0.5) * 0.1;
        shootDir.normalize();

        const bulletSpeed = gameMode === 'hardcore' ? ENEMY_BULLET_SPEED * 1.5 : ENEMY_BULLET_SPEED;
        spawnBullet(new THREE.Vector3(px, py + 1, pz).addScaledVector(shootDir, 1), shootDir, bulletSpeed, false);
      }

    } catch (e) {}
  });

  useEffect(() => {
    if (health <= 0) {
      const eData = enemiesData.get(id);
      if (eData && eData.pos) {
        bloodSystem.current?.emit(eData.pos.clone(), 150);
      }
      setTimeout(() => onDie(id), 50);
    }
  }, [health, id, onDie, bloodSystem]);

  return (
    <RigidBody ref={bodyRef} position={initialPos} type="dynamic" enabledRotations={[false, false, false]} colliders={false}>
      <CapsuleCollider args={[0.6, 0.3]} />
      <group userData={{ isEnemy: true }}>
        <Cylinder args={[0.35, 0.25, 1.2]} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color={gameMode === 'hardcore' ? "#550088" : "#8a1111"} roughness={0.9} />
        </Cylinder>
        <Sphere args={[0.25]} position={[0, 0.85, 0]} castShadow>
          <meshStandardMaterial color={gameMode === 'hardcore' ? "#7700aa" : "#aa2222"} roughness={0.7} />
        </Sphere>
        <Sphere args={[0.04]} position={[-0.1, 0.9, 0.22]}>
          <meshBasicMaterial color="#ff0055" toneMapped={false} />
        </Sphere>
        <Sphere args={[0.04]} position={[0.1, 0.9, 0.22]}>
          <meshBasicMaterial color="#ff0055" toneMapped={false} />
        </Sphere>
        {/* Gun arm */}
        <Box args={[0.1, 0.1, 0.8]} position={[0.4, 0.2, 0.4]} castShadow>
          <meshStandardMaterial color="#222" />
        </Box>
      </group>
    </RigidBody>
  );
};

// --- GAME MANAGER ---
const GameManager = ({ bloodSystem, gameMode, setScore }: any) => {
  const [enemies, setEnemies] = useState([{ id: 1, pos: [0, 5, -20] }]);

  useEffect(() => {
    const spawnRate = gameMode === 'hardcore' ? 1500 : 3000;
    const maxEnemies = gameMode === 'hardcore' ? 20 : 12;

    const interval = setInterval(() => {
      setEnemies(prev => {
        if (prev.length > maxEnemies) return prev; // Max enemies
        if (playerState.health <= 0) return prev;

        const angle = Math.random() * Math.PI * 2;
        const radius = 25 + Math.random() * 15;
        return [
          ...prev,
          {
            id: Date.now(),
            pos: [Math.cos(angle) * radius, 5, Math.sin(angle) * radius]
          }
        ];
      });
    }, spawnRate);
    return () => clearInterval(interval);
  }, [gameMode]);

  const handleDie = (id: number) => {
    setEnemies(prev => prev.filter(e => e.id !== id));
    setScore((s: number) => s + (gameMode === 'hardcore' ? 20 : 10));
  };

  return (
    <>
      {enemies.map(e => (
        <Enemy key={e.id} id={e.id} initialPos={e.pos} bloodSystem={bloodSystem} onDie={handleDie} gameMode={gameMode} />
      ))}
    </>
  );
};

// --- PLAYER & WEAPON ---
const Player = ({ setHealth, setDamageFlash }: any) => {
  const bodyRef = useRef<any>(null);
  const { camera } = useThree();
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const lastShootTime = useRef(0);

  useEffect(() => {
    playerState.takeDamage = (amount: number) => {
      if (playerState.health <= 0) return;
      playerState.health -= amount;
      setHealth(playerState.health);
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 150);
    };
  }, [setHealth, setDamageFlash]);

  useFrame((state, delta) => {
    if (!bodyRef.current || playerState.health <= 0) return;

    try {
      // Rotation
      euler.y -= inputRef.lookDelta.x;
      euler.x -= inputRef.lookDelta.y;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      camera.quaternion.setFromEuler(euler);

      inputRef.lookDelta.x = 0;
      inputRef.lookDelta.y = 0;

      // Movement
      const velObj = bodyRef.current.linvel();
      if (!velObj || isNaN(velObj.y)) return;
      const vy = velObj.y;
      
      let moveX = inputRef.move.x;
      let moveY = inputRef.move.y;

      if (inputRef.keys.w) moveY = -1;
      if (inputRef.keys.s) moveY = 1;
      if (inputRef.keys.a) moveX = -1;
      if (inputRef.keys.d) moveX = 1;

      const direction = new THREE.Vector3(moveX, 0, moveY);
      if (direction.lengthSq() > 0.001) {
        direction.applyEuler(new THREE.Euler(0, euler.y, 0));
        direction.normalize().multiplyScalar(PLAYER_SPEED);
      } else {
        direction.set(0, 0, 0);
      }

      if (!isNaN(direction.x) && !isNaN(direction.z)) {
        bodyRef.current.setLinvel({ x: direction.x, y: vy, z: direction.z }, true);
      }

      // Jumping
      if (inputRef.keys.space && Math.abs(vy) < 0.5) {
        bodyRef.current.setLinvel({ x: direction.x, y: 8, z: direction.z }, true);
        inputRef.keys.space = false;
      }

      // Sync camera position
      const posObj = bodyRef.current.translation();
      if (posObj && !isNaN(posObj.x)) {
        const px = posObj.x, py = posObj.y, pz = posObj.z;
        camera.position.set(px, py + 0.6, pz);
        playerState.pos.set(px, py, pz);
      }

      // Shooting
      if (inputRef.isShooting && state.clock.elapsedTime - lastShootTime.current > 0.12) {
        lastShootTime.current = state.clock.elapsedTime;
        inputRef.justShot = true;

        const shootDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        // Spawn bullet slightly in front and below camera (gun barrel)
        const spawnPos = camera.position.clone().addScaledVector(shootDir, 1.0).add(new THREE.Vector3(0, -0.2, 0));
        
        spawnBullet(spawnPos, shootDir, BULLET_SPEED, true);
      } else {
        inputRef.justShot = false;
      }
    } catch (e) {}
  });

  return (
    <RigidBody ref={bodyRef} type="dynamic" position={[0, 5, 20]} enabledRotations={[false, false, false]} colliders={false} friction={0}>
      <CapsuleCollider args={[0.5, 0.3]} friction={0} />
    </RigidBody>
  );
};

const Weapon = () => {
  const { camera } = useThree();
  const weaponRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (!weaponRef.current) return;
    
    const targetPos = new THREE.Vector3(0.3, -0.3, -0.6).applyQuaternion(camera.quaternion).add(camera.position);
    const targetQuat = camera.quaternion.clone();

    if (inputRef.justShot) {
      targetPos.add(new THREE.Vector3(0, 0, 0.15).applyQuaternion(camera.quaternion));
      targetQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.08));
      if (flashRef.current) flashRef.current.intensity = 8 + Math.random() * 4;
    } else {
      if (flashRef.current) flashRef.current.intensity = THREE.MathUtils.lerp(flashRef.current.intensity, 0, delta * 20);
    }

    weaponRef.current.position.lerp(targetPos, delta * 15);
    weaponRef.current.quaternion.slerp(targetQuat, delta * 15);
  });

  return (
    <group ref={weaponRef}>
      <Box args={[0.06, 0.08, 0.7]} castShadow>
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </Box>
      <Box args={[0.05, 0.2, 0.15]} position={[0, -0.15, 0.2]} rotation={[0.2, 0, 0]} castShadow>
        <meshStandardMaterial color="#222" roughness={0.9} />
      </Box>
      <pointLight ref={flashRef} position={[0, 0, -0.4]} color="#ffff00" distance={15} intensity={0} />
      <pointLight position={[0, 0, 0]} color="#ffffff" distance={30} intensity={1.5} />
    </group>
  );
};

// --- MOBILE CONTROLS UI ---
const MobileControls = () => {
  const [joystickRenderPos, setJoystickRenderPos] = useState({ x: 0, y: 0 });
  const [joystickRenderCenter, setJoystickRenderCenter] = useState({ x: 0, y: 0 });
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  
  const joystickCenter = useRef({ x: 0, y: 0 });
  const leftTouchId = useRef<number | null>(null);
  const rightTouchId = useRef<number | null>(null);
  const lastLook = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < window.innerWidth / 2 && leftTouchId.current === null) {
        leftTouchId.current = touch.identifier;
        joystickCenter.current = { x: touch.clientX, y: touch.clientY };
        setJoystickRenderCenter({ x: touch.clientX, y: touch.clientY });
        setJoystickRenderPos({ x: touch.clientX, y: touch.clientY });
        setIsDraggingLeft(true);
      } else if (touch.clientX >= window.innerWidth / 2 && rightTouchId.current === null) {
        rightTouchId.current = touch.identifier;
        lastLook.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      
      if (touch.identifier === leftTouchId.current) {
        const dx = touch.clientX - joystickCenter.current.x;
        const dy = touch.clientY - joystickCenter.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 50;

        let nx = dx;
        let ny = dy;
        if (distance > maxDist) {
          nx = (dx / distance) * maxDist;
          ny = (dy / distance) * maxDist;
        }

        setJoystickRenderPos({ x: joystickCenter.current.x + nx, y: joystickCenter.current.y + ny });
        inputRef.move.x = nx / maxDist;
        inputRef.move.y = ny / maxDist;
      } else if (touch.identifier === rightTouchId.current) {
        const dx = touch.clientX - lastLook.current.x;
        const dy = touch.clientY - lastLook.current.y;
        inputRef.lookDelta.x += dx * 0.005;
        inputRef.lookDelta.y += dy * 0.005;
        lastLook.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === leftTouchId.current) {
        leftTouchId.current = null;
        setIsDraggingLeft(false);
        inputRef.move.x = 0;
        inputRef.move.y = 0;
      } else if (touch.identifier === rightTouchId.current) {
        rightTouchId.current = null;
      }
    }
  };

  return (
    <div 
      className="absolute inset-0 z-10 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={() => {
        if (!document.pointerLockElement) {
          document.body.requestPointerLock?.();
        }
      }}
    >
      {isDraggingLeft && (
        <div
          className="absolute w-28 h-28 bg-white/10 rounded-full border-2 border-white/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: joystickRenderCenter.x, top: joystickRenderCenter.y }}
        >
          <div
            className="absolute w-12 h-12 bg-white/60 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
            style={{
              left: 56 + (joystickRenderPos.x - joystickRenderCenter.x),
              top: 56 + (joystickRenderPos.y - joystickRenderCenter.y),
            }}
          />
        </div>
      )}
      <button
        className="absolute bottom-12 right-12 w-24 h-24 bg-red-600/60 rounded-full border-4 border-red-400 active:bg-red-500 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(255,0,0,0.6)] select-none pointer-events-auto"
        onTouchStart={(e) => { e.stopPropagation(); inputRef.isShooting = true; }}
        onTouchEnd={(e) => { e.stopPropagation(); inputRef.isShooting = false; }}
        onMouseDown={(e) => { e.stopPropagation(); inputRef.isShooting = true; }}
        onMouseUp={(e) => { e.stopPropagation(); inputRef.isShooting = false; }}
        onMouseLeave={() => { inputRef.isShooting = false; }}
      >
        FIRE
      </button>
    </div>
  );
};

// --- UI COMPONENTS ---
const MainMenu = ({ onStart, highscore }: { onStart: (mode: 'normal' | 'hardcore') => void, highscore: number }) => (
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
      className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-purple-600 mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] tracking-widest text-center"
    >
      CYBER ARENA
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-red-400 text-2xl mb-12 font-mono text-center tracking-widest"
    >
      HIGHSCORE: {highscore}
    </motion.p>
    <div className="flex flex-col md:flex-row gap-6">
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(255, 0, 0, 0.8)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => onStart('normal')}
        className="px-10 py-5 bg-gradient-to-r from-red-900 to-red-700 text-white font-black text-2xl rounded-xl border-2 border-red-500 cursor-pointer pointer-events-auto"
      >
        NORMAL
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(128, 0, 128, 0.8)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        onClick={() => onStart('hardcore')}
        className="px-10 py-5 bg-gradient-to-r from-purple-900 to-purple-700 text-white font-black text-2xl rounded-xl border-2 border-purple-500 cursor-pointer pointer-events-auto"
      >
        HARDCORE
      </motion.button>
    </div>
  </motion.div>
);

const GameOver = ({ onRestart, onMenu, score, highscore }: { onRestart: () => void, onMenu: () => void, score: number, highscore: number }) => (
  <motion.div
    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
    animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90"
  >
    <motion.h1
      initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
      className="text-8xl font-black text-red-600 mb-8 drop-shadow-[0_0_30px_rgba(255,0,0,1)] text-center"
    >
      GAME OVER
    </motion.h1>
    
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="bg-red-950/50 p-8 rounded-2xl border border-red-500/30 mb-12 flex flex-col items-center min-w-[300px]"
    >
      <p className="text-white text-4xl mb-2 font-mono font-bold text-center">SCORE: {score}</p>
      <p className="text-red-400 text-xl font-mono text-center">HIGHSCORE: {highscore}</p>
    </motion.div>

    <div className="flex flex-col sm:flex-row gap-6">
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(255, 0, 0, 0.6)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring' }}
        onClick={onRestart}
        className="px-8 py-4 bg-red-900 hover:bg-red-700 text-white font-bold text-xl rounded-xl border-2 border-red-500 cursor-pointer pointer-events-auto shadow-[0_0_20px_rgba(255,0,0,0.3)]"
      >
        NOCHMAL SPIELEN
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        onClick={onMenu}
        className="px-8 py-4 bg-transparent text-white font-bold text-xl rounded-xl border-2 border-white/30 hover:border-white cursor-pointer pointer-events-auto transition-colors"
      >
        HAUPTMENÜ
      </motion.button>
    </div>
  </motion.div>
);

const HUD = ({ health, score }: { health: number, score: number }) => {
  const displayHealth = Math.max(0, health);
  const healthPercent = Math.max(0, Math.min(100, health));
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6"
    >
      <div className="flex justify-between items-start">
        {/* Health Bar */}
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
              key={`health-${displayHealth}`}
              initial={{ scale: 1.5, color: '#ffffff' }}
              animate={{ scale: 1, color: displayHealth < 30 ? '#ffaaaa' : '#ffffff' }}
              className="font-mono font-black text-2xl italic tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
            >
              HP {displayHealth}
            </motion.span>
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
      {displayHealth > 0 && displayHealth < 40 && (
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,0,0,0.4)] animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
};

const MenuCamera = () => {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.2;
    camera.position.set(Math.cos(t) * 40, 20, Math.sin(t) * 40);
    camera.lookAt(0, 5, 0);
  });
  return null;
};

// --- MAIN APP ---
export default function ShooterGame() {
  const bloodSystem = useRef(null);
  const [health, setHealth] = useState(100);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameKey, setGameKey] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState(() => parseInt(localStorage.getItem('cyber_arena_highscore') || '0', 10));
  const [gameMode, setGameMode] = useState<'normal' | 'hardcore'>('normal');

  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('gameover');
      if (score > highscore) {
        setHighscore(score);
        localStorage.setItem('cyber_arena_highscore', score.toString());
      }
      document.exitPointerLock?.();
    }
  }, [health, gameState, score, highscore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.keys.w = true;
      if (key === 'a') inputRef.keys.a = true;
      if (key === 's') inputRef.keys.s = true;
      if (key === 'd') inputRef.keys.d = true;
      if (key === ' ') inputRef.keys.space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.keys.w = false;
      if (key === 'a') inputRef.keys.a = false;
      if (key === 's') inputRef.keys.s = false;
      if (key === 'd') inputRef.keys.d = false;
      if (key === ' ') inputRef.keys.space = false;
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) {
        inputRef.isShooting = true;
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) inputRef.isShooting = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        inputRef.lookDelta.x += e.movementX * 0.002;
        inputRef.lookDelta.y += e.movementY * 0.002;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const startGame = (mode: 'normal' | 'hardcore' = 'normal') => {
    setGameMode(mode);
    setScore(0);
    setHealth(100);
    playerState.health = 100;
    bullets.forEach(b => b.active = false);
    enemiesData.clear();
    inputRef.move = { x: 0, y: 0 };
    inputRef.lookDelta = { x: 0, y: 0 };
    inputRef.isShooting = false;
    inputRef.justShot = false;
    setGameKey(k => k + 1);
    setGameState('playing');
  };

  return (
    <div 
      className="w-full h-screen bg-black overflow-hidden relative"
      onClick={() => {
        if (gameState === 'playing' && !document.pointerLockElement) {
          document.body.requestPointerLock?.();
        }
      }}
    >
      <AnimatePresence mode="wait">
        {gameState === 'menu' && <MainMenu key="menu" onStart={startGame} highscore={highscore} />}
        {gameState === 'gameover' && <GameOver key="gameover" onRestart={() => startGame(gameMode)} onMenu={() => setGameState('menu')} score={score} highscore={highscore} />}
        {gameState === 'playing' && <HUD key="hud" health={health} score={score} />}
      </AnimatePresence>
      {damageFlash && <div className="absolute inset-0 bg-red-600/40 pointer-events-none z-20 animate-pulse" />}
      
      <Canvas shadows>
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 15, 120]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[20, 40, 20]} castShadow intensity={3} color="#ffffff" />
        <pointLight position={[0, 20, 0]} intensity={4} color="#ff0055" distance={80} />

        {gameState !== 'playing' && <MenuCamera />}

        <Physics gravity={[0, -20, 0]}>
          <EpicMap />
          {gameState === 'playing' && (
            <group key={gameKey}>
              <Player setHealth={setHealth} setDamageFlash={setDamageFlash} />
              <GameManager bloodSystem={bloodSystem} gameMode={gameMode} setScore={setScore} />
            </group>
          )}
        </Physics>

        {gameState === 'playing' && <Weapon />}
        <BulletManager bloodSystem={bloodSystem} />
        <BloodParticles ref={bloodSystem} />
      </Canvas>

      {gameState === 'playing' && <MobileControls />}

      {gameState === 'playing' && (
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference" />
      )}
    </div>
  );
}
