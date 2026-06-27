import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlayerState, JumpPhase } from './types';

export const MODEL_SCALE_CONFIG: Record<string, { targetDepth?: number; targetWidth?: number; targetHeight?: number; scaleOverride?: number }> = {
  'bob.fbx': { targetDepth: 1.2 }, // Stylized reference (Z-depth of 54.6 scaled to 1.2)
  'base_male.fbx': { targetDepth: 1.2 },
  'Unarmed_Idle.fbx': { targetDepth: 1.2 },
  'Breathing_Idle.fbx': { targetDepth: 1.2 },
  'default': { targetDepth: 1.2 }
};

export class CharacterAnimator {
  public group: THREE.Group;
  public mixer: THREE.AnimationMixer | null = null;
  
  private actions: Record<string, THREE.AnimationAction> = {};
  private activeAction: THREE.AnimationAction | null = null;
  private modelLoaded = false;
  
  private basePrefix = '';
  private currentNametag = '';
  private nametagSprite: THREE.Sprite | null = null;
  private innerMesh: THREE.Object3D | null = null;
  private baseYOffset = 0;
  public targetHeight = 2.2;
  public currentModelUrl: string = '';
  
  private static modelCache = new Map<string, Promise<THREE.Group>>();
  private static animCache = new Map<string, Promise<THREE.Group>>();
  private static textureCache = new Map<string, Promise<THREE.Texture>>();

  public static async preloadCharacters(characterUrls: string[]) {
      const animations = [
        '/assets/character/animations/idle.fbx',
        '/assets/character/animations/walk.fbx',
        '/assets/character/animations/jog.fbx',
        '/assets/character/animations/run.fbx',
        '/assets/character/animations/jump.fbx',
        '/assets/character/animations/pushing.fbx',
        '/assets/character/animations/swim.fbx',
        '/assets/character/animations/tread.fbx',
        '/assets/character/animations/neutral_idle.fbx',
        '/assets/character/animations/climbing.fbx',
        '/assets/character/animations/crouch_idle.fbx',
        '/assets/character/animations/crouched_walking.fbx',
        '/assets/character/animations/prone_forward.fbx',
      ];

      // Preload animations silently in the background
      for (const anim of animations) {
          this.getAnimation(anim).catch(() => {});
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }

      // Preload character models
      for (const url of characterUrls) {
          this.getModel(url).catch(() => {});
          
          if (url.includes('humanoid') || url.includes('explorer_clone')) {
              const basePath = url.substring(0, url.lastIndexOf('/'));
              this.getTexture(`${basePath}/Color.png`).catch(() => {});
              this.getTexture(`${basePath}/Normal.png`).catch(() => {});
              this.getTexture(`${basePath}/Metallic.png`).catch(() => {});
              this.getTexture(`${basePath}/Roughness.png`).catch(() => {});
          }
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }
  }

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'explorer';
  }

  private static getTexture(url: string): Promise<THREE.Texture> {
    if (!this.textureCache.has(url)) {
      const loader = new THREE.TextureLoader();
      this.textureCache.set(url, loader.loadAsync(url));
    }
    return this.textureCache.get(url)!;
  }

  private static getModel(url: string): Promise<THREE.Group> {
    if (!this.modelCache.has(url)) {
      const loader = new FBXLoader();
      this.modelCache.set(url, loader.loadAsync(url));
    }
    return this.modelCache.get(url)!;
  }

  private static getAnimation(url: string): Promise<THREE.Group> {
    if (!this.animCache.has(url)) {
      const loader = new FBXLoader();
      this.animCache.set(url, loader.loadAsync(url));
    }
    return this.animCache.get(url)!;
  }

  public async loadModelAndAnimations(modelUrl: string = '/assets/character/base_male.fbx') {
    this.currentModelUrl = modelUrl;
    // Clear old group children except nametag
    const toRemove: THREE.Object3D[] = [];
    this.group.children.forEach(c => {
        if (c !== this.nametagSprite) {
            toRemove.push(c);
        }
    });
    toRemove.forEach(c => this.group.remove(c));
    
    if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
    }
    this.actions = {};
    this.activeAction = null;
    this.modelLoaded = false;
    this.basePrefix = '';

    const fbxLoader = new FBXLoader();
    
    try {
      // First load the base mesh using cache
      const cachedObject = await CharacterAnimator.getModel(modelUrl);
      const object = SkeletonUtils.clone(cachedObject) as THREE.Group;
      object.name = 'explorerInner';
      
      let config = MODEL_SCALE_CONFIG['default'];
      for (const key in MODEL_SCALE_CONFIG) {
        if (modelUrl.includes(key)) {
          config = MODEL_SCALE_CONFIG[key];
          break;
        }
      }

      // Auto scale using volumetric mass (depth/width) as a fallback rather than purely height
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      
      let scaleAmount = 1;
      if (config.scaleOverride) {
        scaleAmount = config.scaleOverride;
      } else if (config.targetDepth && size.z > 0) {
        scaleAmount = config.targetDepth / size.z;
      } else if (config.targetWidth && size.x > 0) {
        scaleAmount = config.targetWidth / size.x;
      } else if (config.targetHeight && size.y > 0) {
        scaleAmount = config.targetHeight / size.y;
      } else {
        scaleAmount = 1.2 / (size.z || 1);
      }

      object.scale.setScalar(scaleAmount);
      
      const boxScaled = new THREE.Box3().setFromObject(object);
      const sizeScaled = boxScaled.getSize(new THREE.Vector3());
      
      this.targetHeight = sizeScaled.y;
      if (this.nametagSprite) {
        this.nametagSprite.position.set(0, this.targetHeight + 0.4, 0);
      }

      this.baseYOffset = -boxScaled.min.y;
      object.position.set(0, this.baseYOffset, 0);
      this.innerMesh = object;

      const isCustomTripoModel = modelUrl.includes('humanoid') || modelUrl.includes('explorer_clone');
      let colorMap: THREE.Texture | null = null;
      let normalMap: THREE.Texture | null = null;
      let metallicMap: THREE.Texture | null = null;
      let roughnessMap: THREE.Texture | null = null;
      
      if (isCustomTripoModel) {
          const basePath = modelUrl.substring(0, modelUrl.lastIndexOf('/'));
          colorMap = await CharacterAnimator.getTexture(`${basePath}/Color.png`);
          colorMap.colorSpace = THREE.SRGBColorSpace;
          normalMap = await CharacterAnimator.getTexture(`${basePath}/Normal.png`);
          metallicMap = await CharacterAnimator.getTexture(`${basePath}/Metallic.png`);
          roughnessMap = await CharacterAnimator.getTexture(`${basePath}/Roughness.png`);
      }
      
      let foundBone = false;
      let meshHipsRestingPosition = new THREE.Vector3();
      object.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (isCustomTripoModel && child.material) {
              const applyMaps = (origMat: any) => {
                  const mat = origMat.clone(); // Clone material to avoid mutating shared cache
                  mat.map = colorMap;
                  mat.normalMap = normalMap;
                  if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                      mat.metalnessMap = metallicMap;
                      mat.roughnessMap = roughnessMap;
                      mat.color = new THREE.Color(1, 1, 1);
                  } else if (mat.isMeshPhongMaterial) {
                      const newMat = new THREE.MeshStandardMaterial({
                          map: colorMap,
                          normalMap: normalMap,
                          metalnessMap: metallicMap,
                          roughnessMap: roughnessMap,
                          color: new THREE.Color(1, 1, 1)
                      });
                      return newMat;
                  }
                  mat.needsUpdate = true;
                  return mat;
              };
              if (Array.isArray(child.material)) {
                  child.material = child.material.map(applyMaps);
              } else {
                  child.material = applyMaps(child.material);
              }
          }
        }
         if (!foundBone && child.isBone) {
           const name = child.name;
           if (name.includes('Hips')) {
             this.basePrefix = name.replace('Hips', '');
             meshHipsRestingPosition.copy(child.position);
             foundBone = true;
           }
         }
      });
      
      if (!foundBone) {
          console.warn("Model has no bones. Rotating to stand up.");
          object.rotation.set(0, 0, 0); 
      }

      // Safeguard against concurrent loads: clear any children that might have loaded in parallel
      const concurrentToRemove: THREE.Object3D[] = [];
      this.group.children.forEach(c => {
          if (c !== this.nametagSprite) {
              concurrentToRemove.push(c);
          }
      });
      concurrentToRemove.forEach(c => this.group.remove(c));

      this.group.add(object);
      this.mixer = new THREE.AnimationMixer(object);
      
      const animationsToLoad = [
        { name: 'idle', url: '/assets/character/animations/idle.fbx' },
        { name: 'walk', url: '/assets/character/animations/walk.fbx' },
        { name: 'jog', url: '/assets/character/animations/jog.fbx' },
        { name: 'run', url: '/assets/character/animations/run.fbx' },
        { name: 'jump', url: '/assets/character/animations/jump.fbx' },
        { name: 'pushing', url: '/assets/character/animations/pushing.fbx' },
        { name: 'swim', url: '/assets/character/animations/swim.fbx' },
        { name: 'tread', url: '/assets/character/animations/tread.fbx' },
        { name: 'neutral_idle', url: '/assets/character/animations/neutral_idle.fbx' },
        { name: 'climbing', url: '/assets/character/animations/climbing.fbx' },
        { name: 'crouch_idle', url: '/assets/character/animations/crouch_idle.fbx' },
        { name: 'crouched_walking', url: '/assets/character/animations/crouched_walking.fbx' },
        { name: 'prone_forward', url: '/assets/character/animations/prone_forward.fbx' },
      ];
      
      await Promise.all(animationsToLoad.map(async (anim) => {
        try {
          const animObject = await CharacterAnimator.getAnimation(anim.url);
          if (animObject.animations && animObject.animations.length > 0) {
            const clip = animObject.animations[0].clone(); // Clone clip to prevent shared mutation
            clip.name = anim.name;
            
            clip.tracks.forEach((track) => {
               track.name = track.name.replace(/^(mixamorig[a-zA-Z0-9_]*:|mixamorig\d*)/, this.basePrefix);
               if (this.basePrefix === '' && track.name.includes(':')) {
                  track.name = track.name.replace(/^.*:/, ''); 
               }
               if (track.name.includes('Hips.position') && track.values.length >= 3) {
                  const diffX = meshHipsRestingPosition.x - track.values[0];
                  const diffY = meshHipsRestingPosition.y - track.values[1];
                  const diffZ = meshHipsRestingPosition.z - track.values[2];
                  for (let i = 0; i < track.values.length; i += 3) {
                     track.values[i] += diffX;
                     track.values[i+1] += diffY;
                     track.values[i+2] += diffZ;
                  }
               }
            });
            
            const action = this.mixer!.clipAction(clip);
            if (anim.name === 'jump') {
              action.setLoop(THREE.LoopOnce, 1);
              action.clampWhenFinished = true;
            }
            this.actions[anim.name] = action;
          }
        } catch (e) {
          console.error('Error loading animation', anim.url, e);
        }
      }));

      this.modelLoaded = true;
      this.playAction('idle', 0);
      
    } catch (err) {
      console.error('Error loading base mesh', err);
      // Fallback placeholder mesh
      const geo = new THREE.CapsuleGeometry(0.5, 1, 4, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.modelLoaded = true;
    }
  }

  public playAction(name: string, duration: number = 0.2) {
    const nextAction = this.actions[name];
    if (!nextAction || nextAction === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    nextAction.reset();
    
    // Mixamo standard jump animations have a long crouch build-up.
    // Our game jump is snappy (0.05s delay), so we skip the crouch buildup (about 0.4s)
    // and speed up the mid-air portion so it looks like a responsive leap.
    if (name === 'jump') {
        nextAction.time = 0.4;
        nextAction.setEffectiveTimeScale(1.5);
        nextAction.timeScale = 1.0;
    } else {
        nextAction.setEffectiveTimeScale(1.0);
        nextAction.timeScale = 1.0;
    }
    
    nextAction.fadeIn(duration);
    nextAction.play();
    
    this.activeAction = nextAction;
  }

  public updateNametag(name: string) {
    if (!name || name === this.currentNametag) return;
    this.currentNametag = name;

    if (!this.nametagSprite) {
        this.nametagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
        this.group.add(this.nametagSprite);
    }
    // Put text above head, scale should map to canvas aspect ratio
    this.nametagSprite.position.set(0, this.targetHeight + 0.4, 0); 
    this.nametagSprite.scale.set(1.5, 0.4, 1);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background pill shape
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 128, 64);
    ctx.fill();

    // Text Name
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#10b981'; // Emerald standard PWA theme
    ctx.fillText(name, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    // Needs minFilter linear to prevent mipmap glitches for UI text
    texture.minFilter = THREE.LinearFilter;
    
    // Cleanup old texture to prevent memory leak
    if (this.nametagSprite.material.map) {
      this.nametagSprite.material.map.dispose();
    }
    
    this.nametagSprite.material.map = texture;
    this.nametagSprite.material.needsUpdate = true;
  }

  public update(state: PlayerState, dt: number) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
    
    if (this.innerMesh) {
       // Fix sideways swimming animation
       // const isSwimAnim = this.activeAction?.getClip().name === 'swim' || this.activeAction?.getClip().name === 'tread';
       // const targetRotY = isSwimAnim ? -Math.PI / 2 : 0;
       // this.innerMesh.rotation.y = THREE.MathUtils.lerp(this.innerMesh.rotation.y, targetRotY, dt * 10);
       this.innerMesh.rotation.y = 0;
       
       const isProne = (state as any).isProne || false;
       const isCrouching = (state as any).isCrouching || false;
       
       let targetY = this.baseYOffset;
       let targetRotX = 0;
       if (isProne) {
           targetY = this.baseYOffset - 0.60;
       } else if (isCrouching) {
           // Lower slightly more and tilt forward so heels touch ground
           // If moving, don't lower as much to avoid clipping into the ground
           targetY = this.baseYOffset - (state.speed > 0.1 ? 0.20 : 0.35);
           targetRotX = 0.12; 
       }
       
       this.innerMesh.position.y = THREE.MathUtils.lerp(this.innerMesh.position.y, targetY, dt * 10);
       this.innerMesh.rotation.x = THREE.MathUtils.lerp(this.innerMesh.rotation.x, targetRotX, dt * 10);
    }

    if (!this.modelLoaded) return;
    
    const isSwimming = (state as any).isSwimming || false;
    const isCrouching = (state as any).isCrouching || false;
    const isProne = (state as any).isProne || false;

    if (isSwimming) {
      if (state.speed > 0.1) {
        this.playAction('swim');
      } else {
        this.playAction('tread');
      }
      return;
    }

    if (isProne) {
      this.playAction('prone_forward');
      if (this.activeAction) {
         // Pause animation if not moving
         if (state.speed > 0.1) {
            this.activeAction.timeScale = 1.0;
         } else {
            this.activeAction.timeScale = 0.0;
         }
      }
      return;
    }

    if (isCrouching) {
      if (state.speed > 0.1) {
        this.playAction('crouched_walking');
      } else {
        this.playAction('crouch_idle');
      }
      return;
    }

    if (state.jumpPhase === JumpPhase.PUSHING) {
      this.playAction('pushing');
    } else if (state.jumpPhase !== JumpPhase.IDLE && state.jumpPhase !== JumpPhase.RUNNING) {
      this.playAction('jump');
    } else {
      if (state.speed > 9.5) { // Run speed (user wanted walk -> jog -> run)
        this.playAction('run');
      } else if (state.speed > 5) {
        this.playAction('jog');
      } else if (state.speed > 0.1) {
        this.playAction('walk');
      } else {
        this.playAction('neutral_idle');
      }
    }
  }
}
