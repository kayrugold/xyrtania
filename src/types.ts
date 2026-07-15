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
  modelUrl?: string;
  currentAnimation?: string;
  animationState?: string;
  customColor?: string;
  customScale?: number;
  torsoVisible?: boolean;
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
  customHeadUrl?: string;
  headStyle?: number;
  morphTargets?: Record<string, number>;
}

export interface Chunk {
  cx: number;
  cz: number;
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  clutterMeshes: THREE.Object3D[];
}

export function resolveAssetUrl(url: string): string {
  if (!url) return url;
  
  // If the url is already an absolute http/https url or a blob url, return it directly
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  
  const githubRawUrl = localStorage.getItem('xyrtania_github_raw_url');
  if (githubRawUrl) {
    let base = githubRawUrl.trim();
    if (!base.endsWith('/')) {
      base += '/';
    }
    // Remove leading slash of the asset url to prevent double slashes
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    return base + cleanUrl;
  }
  
  return url;
}

