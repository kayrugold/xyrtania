import * as THREE from 'three';

export enum JumpPhase {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PREP = 'PREP', // Crunching down, knee bend
  LAUNCH = 'LAUNCH', // In air, ascending, forward pitch lean, vertical stretch
  APEX = 'APEX', // Turning downward, smooth scale return
  IMPACT = 'IMPACT', // Touchdown squash (exactly 4 frames)
}

export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  direction: number; // yaw angle in radians
  speed: number;
  health: number; // 0 to 100
  isRidingHorse: boolean;
  jumpPhase: JumpPhase;
  jumpProgress: number; // animation timer/phase progress
  isGrounded: boolean;
  verticalVelocity: number;
}

export interface Chunk {
  cx: number;
  cz: number;
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  clutterMeshes: THREE.Object3D[];
}
