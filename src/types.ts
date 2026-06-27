import * as THREE from 'three';

export enum JumpPhase {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PREP = 'PREP', // Crunching down, knee bend
  LAUNCH = 'LAUNCH', // In air, ascending, forward pitch lean, vertical stretch
  APEX = 'APEX', // Turning downward, smooth scale return
  IMPACT = 'IMPACT', // Touchdown squash (exactly 4 frames)
  PUSHING = 'PUSHING', // Pushing heavy object
}

export interface PlayerState {
  displayName?: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  direction: number; // yaw angle in radians
  speed: number;
  health: number; // 0 to 100
  jumpPhase: JumpPhase;
  jumpProgress: number; // animation timer/phase progress
  isGrounded: boolean;
  verticalVelocity: number;
  blinkTimer?: number;
  isRidingHorse?: boolean;
  isSwimming?: boolean;
  isCrouching?: boolean;
  isProne?: boolean;
  wetness?: number;
}

export interface Chunk {
  cx: number;
  cz: number;
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  clutterMeshes: THREE.Object3D[];
}
