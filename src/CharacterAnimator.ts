import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlayerState, JumpPhase } from './types';

export const MODEL_SCALE_CONFIG: Record<string, { targetDepth?: number; targetWidth?: number; targetHeight?: number; scaleOverride?: number }> = {
  '/assets/character/peter/peteridle.fbx': { targetHeight: 2.14 },
  'base_male_0.fbx': { targetHeight: 2.14 },
  'default': { targetHeight: 2.14 }
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
  public currentActionName: string = 'neutral_idle';
  public isRemote: boolean = false;
  private blinkInterval: any = null;
  
  public customColor: string | null = null;
  public customScale: number = 1.0;
  
  private static modelCache = new Map<string, Promise<THREE.Group>>();
  private static animCache = new Map<string, Promise<THREE.Group>>();
  private static textureCache = new Map<string, Promise<THREE.Texture>>();
  public static onError: ((error: string) => void) | null = null;

  public static async preloadCharacters(characterUrls: string[]) {
      const animations = [
        '/assets/character/peter/peteridle.fbx',
        '/assets/character/animations/walk.fbx',
        '/assets/character/animations/jog.fbx',
        '/assets/character/animations/run.fbx',
        '/assets/character/animations/jump.fbx',
        '/assets/character/animations/pushing.fbx',
        '/assets/character/animations/swim.fbx',
        '/assets/character/animations/tread.fbx',
        '/assets/character/peter/peteridle.fbx',
        '/assets/character/animations/crouch_idle.fbx',
        '/assets/character/peter/peteridle.fbx',
        '/assets/character/animations/prone_forward.fbx',
        '/assets/character/peter/peteridle.fbx',
      ];

      // Preload animations silently in the background
      for (const anim of animations) {
          this.getAnimation(anim).catch(() => {});
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }

      // Preload character models
      for (const url of characterUrls) {
          this.getModel(url).catch(() => {});
          
          if (url.includes('humanoid') || url.includes('explorer_clone') || url.includes('base_male_0')) {
              const basePath = url.substring(0, url.lastIndexOf('/'));
              this.getTexture(`${basePath}/Color.png`).catch(() => {});
              this.getTexture(`${basePath}/Normal.png`).catch(() => {});
              this.getTexture(`${basePath}/Metallic.png`).catch(() => {});
              this.getTexture(`${basePath}/Roughness.png`).catch(() => {});
          }
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }
  }

  constructor(isRemote: boolean = false) {
    this.isRemote = isRemote;
    this.group = new THREE.Group();
    this.group.name = 'explorer';
  }

  private static getTexture(url: string): Promise<THREE.Texture> {
    if (!this.textureCache.has(url)) {
      const loader = new THREE.TextureLoader();
      const fetchUrl = url.includes('?') ? url : `${url}?v=3`;
      const promise = loader.loadAsync(fetchUrl).catch((err) => {
        this.textureCache.delete(url);
        throw err;
      });
      this.textureCache.set(url, promise);
    }
    return this.textureCache.get(url)!;
  }

  private static getModel(url: string): Promise<THREE.Group> {
    if (!this.modelCache.has(url)) {
      const isGltf = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf') || url.includes('.glb') || url.includes('.gltf');
      if (isGltf) {
        const loader = new GLTFLoader();
        const fetchUrl = url.includes('?') ? url : `${url}?v=3`;
        const promise = loader.loadAsync(fetchUrl).then((gltf) => {
          return gltf.scene;
        }).catch((err) => {
          this.modelCache.delete(url);
          throw err;
        });
        this.modelCache.set(url, promise as any);
      } else {
        const loader = new FBXLoader();
        const fetchUrl = url.includes('?') ? url : `${url}?v=3`;
        const promise = loader.loadAsync(fetchUrl).catch((err) => {
          this.modelCache.delete(url);
          throw err;
        });
        this.modelCache.set(url, promise);
      }
    }
    return this.modelCache.get(url)!;
  }

  private static getAnimation(url: string): Promise<THREE.Group> {
    if (!this.animCache.has(url)) {
      const loader = new FBXLoader();
      const fetchUrl = url.includes('?') ? url : `${url}?v=3`;
      const promise = loader.loadAsync(fetchUrl).catch((err) => {
        this.animCache.delete(url);
        throw err;
      });
      this.animCache.set(url, promise);
    }
    return this.animCache.get(url)!;
  }

  public static disposeHierarchy(obj: THREE.Object3D) {
      obj.traverse((child: any) => {
          if (child.isMesh) {
              if (child.geometry) {
                  child.geometry.dispose();
              }
              if (child.material) {
                  if (Array.isArray(child.material)) {
                      child.material.forEach((mat) => mat.dispose());
                  } else {
                      child.material.dispose();
                  }
              }
          }
      });
  }

  public async loadModelAndAnimations(modelUrl: string = '/assets/character/peter/peteridle.fbx') {
    const requestedUrl = modelUrl;
    this.currentModelUrl = modelUrl;
    // Clear old group children except nametag
    const toRemove: THREE.Object3D[] = [];
    this.group.children.forEach(c => {
        if (c !== this.nametagSprite) {
            toRemove.push(c);
        }
    });
    toRemove.forEach(c => {
        this.group.remove(c);
        c.traverse((child: any) => {
            if (child.name === 'proceduralFace') {
                CharacterAnimator.disposeHierarchy(child);
            }
        });
    });
    
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
      // First load the base mesh using cache, with a robust fallback to base_male_0.fbx
      let modelToLoad = modelUrl;

      let cachedObject: THREE.Group;
      try {
        cachedObject = await CharacterAnimator.getModel(modelToLoad);
      } catch (loadErr) {
        console.warn(`Failed to load requested model ${modelToLoad}, falling back to peteridle.fbx`, loadErr);
        if (modelToLoad !== '/assets/character/peter/peteridle.fbx') {
          this.currentModelUrl = '/assets/character/peter/peteridle.fbx';
          cachedObject = await CharacterAnimator.getModel('/assets/character/peter/peteridle.fbx');
        } else {
          throw loadErr;
        }
      }

      const object = SkeletonUtils.clone(cachedObject) as THREE.Group;
      object.name = 'explorerInner';
      
      let config = MODEL_SCALE_CONFIG['default'];
      for (const key in MODEL_SCALE_CONFIG) {
        if (requestedUrl.includes(key)) {
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

      if (requestedUrl.includes('base_male_0')) {
        // Broaden width (X) and increase depth (Z) to match the explorer's robust bulk and chest depth
        object.scale.x *= scaleAmount * 1.35;
        object.scale.y *= scaleAmount;
        object.scale.z *= scaleAmount * 1.55;
      } else {
        object.scale.multiplyScalar(scaleAmount);
      }
      
      const boxScaled = new THREE.Box3().setFromObject(object);
      const sizeScaled = boxScaled.getSize(new THREE.Vector3());
      
      this.targetHeight = sizeScaled.y;
      if (this.nametagSprite) {
        this.nametagSprite.position.set(0, this.targetHeight + 0.4, 0);
      }

      this.baseYOffset = -boxScaled.min.y;
      
      const innerWrapper = new THREE.Group();
      innerWrapper.name = 'explorerInnerWrapper';
      innerWrapper.add(object);
      innerWrapper.position.set(0, this.baseYOffset, 0);
      this.innerMesh = innerWrapper;

      const isGltf = requestedUrl.toLowerCase().endsWith('.glb') || requestedUrl.toLowerCase().endsWith('.gltf') || requestedUrl.includes('.glb') || requestedUrl.includes('.gltf');
      const isCustomTripoModel = !isGltf && (requestedUrl.includes('base_male_0') || requestedUrl.includes('peter'));
      let colorMap: THREE.Texture | null = null;
      let normalMap: THREE.Texture | null = null;
      let metallicMap: THREE.Texture | null = null;
      let roughnessMap: THREE.Texture | null = null;
      
      if (isCustomTripoModel) {
          let basePath = requestedUrl.substring(0, requestedUrl.lastIndexOf('/'));
          if (requestedUrl.includes('base_male_0.fbx') && !requestedUrl.includes('base_male_0/')) {
              basePath = '/assets/character/base_male_0';
          } else if (requestedUrl.includes('peteridle.fbx')) {
              basePath = '/assets/character/peter';
          }
          try {
              colorMap = await CharacterAnimator.getTexture(`${basePath}/Color.png`);
              colorMap.colorSpace = THREE.SRGBColorSpace;
          } catch (e) {
              console.warn(`Could not load color map for ${requestedUrl}:`, e);
          }
          try {
              normalMap = await CharacterAnimator.getTexture(`${basePath}/Normal.png`);
          } catch (e) {
              console.warn(`Could not load normal map for ${requestedUrl}:`, e);
          }
          try {
              metallicMap = await CharacterAnimator.getTexture(`${basePath}/Metallic.png`);
          } catch (e) {
              console.warn(`Could not load metallic map for ${requestedUrl}:`, e);
          }
          try {
              roughnessMap = await CharacterAnimator.getTexture(`${basePath}/Roughness.png`);
          } catch (e) {
              console.warn(`Could not load roughness map for ${requestedUrl}:`, e);
          }
      }
      
      let foundBone = false;
      let rootMeshName = '';
      let meshHipsRestingPosition = new THREE.Vector3();
      object.traverse((child: any) => {
        if (child.isMesh) {
          if (!rootMeshName) rootMeshName = child.name;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false; // Prevent culling when animated/scaled
          
          if (isCustomTripoModel && child.material) {
              const applyMaps = (origMat: any) => {
                  let mat: any;
                  if (origMat.isMeshStandardMaterial || origMat.isMeshPhysicalMaterial) {
                      mat = origMat.clone();
                  } else {
                      // Convert Phong/Basic material to Standard material to support PBR textures
                      mat = new THREE.MeshStandardMaterial();
                      // Copy basic properties from the original material
                      if (origMat.color) mat.color.copy(origMat.color);
                      if (origMat.map) mat.map = origMat.map;
                      if (origMat.opacity !== undefined) mat.opacity = origMat.opacity;
                      if (origMat.transparent !== undefined) mat.transparent = origMat.transparent;
                      if (origMat.side !== undefined) mat.side = origMat.side;
                  }
                  
                  if (colorMap) {
                      mat.map = colorMap;
                      mat.color.setRGB(1, 1, 1);
                  }
                  if (normalMap) mat.normalMap = normalMap;
                  if (metallicMap) mat.metalnessMap = metallicMap;
                  if (roughnessMap) mat.roughnessMap = roughnessMap;
                  
                  mat.needsUpdate = true;
                  return mat;
              };
              if (Array.isArray(child.material)) {
                  child.material = child.material.map(applyMaps);
              } else {
                  child.material = applyMaps(child.material);
              }
          } else if (child.material) {
              // Polish non-custom standard FBX models while properly keeping original embedded textures
              const polishStandardMat = (origMat: any) => {
                  if (origMat.map) {
                      if (origMat.isMeshStandardMaterial || origMat.isMeshPhysicalMaterial) {
                          origMat.roughness = 0.6;
                          origMat.metalness = 0.1;
                          return origMat;
                      }
                      const newMat = new THREE.MeshStandardMaterial();
                      newMat.map = origMat.map;
                      if (origMat.normalMap) newMat.normalMap = origMat.normalMap;
                      newMat.roughness = 0.6;
                      newMat.metalness = 0.1;
                      if (origMat.color) newMat.color.copy(origMat.color);
                      newMat.needsUpdate = true;
                      return newMat;
                  }
                  return new THREE.MeshStandardMaterial({
                      color: requestedUrl.includes('female') ? 0xfecdd3 : 0xbae6fd, // Soft pink for female, soft blue for male
                      roughness: 0.6,
                      metalness: 0.1,
                  });
              };
              if (Array.isArray(child.material)) {
                  child.material = child.material.map(polishStandardMat);
              } else {
                  child.material = polishStandardMat(child.material);
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

      // Add procedural nose and blinking eyes
      let headBone: THREE.Object3D | null = null;
      object.traverse((child: any) => {
          if (!headBone && child.isBone && child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('top')) {
              headBone = child;
          }
      });
      
      const faceGroup = new THREE.Group();
      faceGroup.name = 'proceduralFace';
      
      // We scale faceGroup inversely so that the child meshes (eyes/nose)
      // will be in absolute world meters (e.g. 0.03m radius).
      faceGroup.scale.setScalar(1 / scaleAmount);
      
      // Eyes - Chibi style
      const scleraGeo = new THREE.SphereGeometry(0.08, 16, 16);
      scleraGeo.scale(1, 1, 0.4); // Flatten
      const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      const pupilGeo = new THREE.SphereGeometry(0.04, 16, 16);
      pupilGeo.scale(1, 1, 0.3); // Flatten
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

      const leftEyeGroup = new THREE.Group();
      leftEyeGroup.position.set(-0.09, 0.10, 0.15);
      const leftSclera = new THREE.Mesh(scleraGeo, scleraMat);
      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.position.set(0, 0, 0.035);
      leftEyeGroup.add(leftSclera, leftPupil);

      const rightEyeGroup = new THREE.Group();
      rightEyeGroup.position.set(0.09, 0.10, 0.15);
      const rightSclera = new THREE.Mesh(scleraGeo, scleraMat);
      const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
      rightPupil.position.set(0, 0, 0.035);
      rightEyeGroup.add(rightSclera, rightPupil);
      
      // Nose - Organic
      const noseGeo = new THREE.SphereGeometry(0.05, 16, 16);
      noseGeo.scale(1, 0.7, 1.2); // Organic oblong shape
      const noseMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.6 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.set(0, 0.02, 0.19);

      faceGroup.add(leftEyeGroup);
      faceGroup.add(rightEyeGroup);
      faceGroup.add(nose);
      
      if (headBone) {
          // In world space equivalent: 15cm up, 10cm forward from head bone origin
          faceGroup.position.set(0, 0.15 / scaleAmount, 0.10 / scaleAmount); 
          faceGroup.rotation.x = -0.10; // Tilt back slightly
          headBone.add(faceGroup);
      } else {
          // Fallback if no head bone
          faceGroup.position.set(0, 1.6 / scaleAmount, 0.14 / scaleAmount);
          faceGroup.rotation.x = -0.10; // Tilt back slightly
          object.add(faceGroup);
      }
      
      // Blinking logic
      if (this.blinkInterval) {
          clearInterval(this.blinkInterval);
      }
      this.blinkInterval = setInterval(() => {
          // Close eyes
          leftEyeGroup.scale.y = 0.1;
          rightEyeGroup.scale.y = 0.1;
          setTimeout(() => {
              // Open eyes
              leftEyeGroup.scale.y = 1;
              rightEyeGroup.scale.y = 1;
          }, 150); // Blink duration
      }, 3000 + Math.random() * 2000) as any;


      // Safeguard against concurrent loads: clear any children that might have loaded in parallel
      const concurrentToRemove: THREE.Object3D[] = [];
      this.group.children.forEach(c => {
          if (c !== this.nametagSprite) {
              concurrentToRemove.push(c);
          }
      });
      concurrentToRemove.forEach(c => {
          this.group.remove(c);
          c.traverse((child: any) => {
              if (child.name === 'proceduralFace') {
                  CharacterAnimator.disposeHierarchy(child);
              }
          });
      });

      this.group.add(this.innerMesh);
      this.mixer = new THREE.AnimationMixer(object);
      
      let animationsToLoad = [
        { name: 'idle', url: '/assets/character/peter/peteridle.fbx' },
        { name: 'walk', url: '/assets/character/animations/walk.fbx' },
        { name: 'jog', url: '/assets/character/animations/jog.fbx' },
        { name: 'run', url: '/assets/character/animations/run.fbx' },
        { name: 'jump', url: '/assets/character/animations/jump.fbx' },
        { name: 'pushing', url: '/assets/character/animations/pushing.fbx' },
        { name: 'swim', url: '/assets/character/animations/swim.fbx' },
        { name: 'tread', url: '/assets/character/animations/tread.fbx' },
        { name: 'neutral_idle', url: '/assets/character/peter/peteridle.fbx' },
        { name: 'crouch_idle', url: '/assets/character/animations/crouch_idle.fbx' },
        { name: 'crouched_walking', url: '/assets/character/peter/peteridle.fbx' },
        { name: 'prone_forward', url: '/assets/character/animations/prone_forward.fbx' },
        { name: 'breathing_idle', url: '/assets/character/peter/peteridle.fbx' },
      ];
      
      await Promise.all(animationsToLoad.map(async (anim) => {
        try {
          const animObject = await CharacterAnimator.getAnimation(anim.url);
          if (animObject.animations && animObject.animations.length > 0) {
            // Deep clone tracks to isolate track mutations entirely from shared cache
            const tracks = animObject.animations[0].tracks.map(t => t.clone());
            const clip = new THREE.AnimationClip(anim.name, animObject.animations[0].duration, tracks);
            
            const isCustomAnim = false;
            clip.tracks.forEach((track) => {
               if (!isCustomAnim) {
                  if (foundBone) {
                      track.name = track.name.replace(/^(mixamorig[a-zA-Z0-9_]*:|mixamorig\d*)/, this.basePrefix);
                      if (this.basePrefix === '' && track.name.includes(':')) {
                         track.name = track.name.replace(/^.*:/, ''); 
                      }
                  } else {
                      // Fallback for static models like bob.fbx that have no bones:
                      // apply Hips translation/rotation directly to the root mesh!
                      if (track.name.includes('Hips')) {
                          track.name = rootMeshName + '.' + track.name.split('.')[1];
                      } else {
                          track.name = 'ignored.' + track.name.split('.')[1];
                      }
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
               }
            
            });
            
            // Remove ignored tracks to prevent console warnings
            clip.tracks = clip.tracks.filter(t => !t.name.startsWith('ignored.'));
            
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
      if (CharacterAnimator.onError) {
        CharacterAnimator.onError('');
      }
      // Triggers stored animation state, defaulting to 'neutral_idle' or 'idle'
      this.playAction(this.currentActionName || 'idle', 0);
      
      this.setCustomization(this.customColor, this.customScale);
      
    } catch (err: any) {
      console.error('Error loading base mesh', err);
      if (CharacterAnimator.onError) {
        CharacterAnimator.onError(`Failed to load ${modelUrl}: ${err?.message || err}`);
      }
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
    this.currentActionName = name;
    if (!this.modelLoaded) return;

    // Map animation names dynamically if not found in Mixer actions
    let mappedName = name;
    if (!this.actions[mappedName]) {
       if (name === 'idle') {
          if (this.actions['neutral_idle']) mappedName = 'neutral_idle';
          else if (this.actions['breathing_idle']) mappedName = 'breathing_idle';
       } else if (name === 'neutral_idle') {
          if (this.actions['breathing_idle']) mappedName = 'breathing_idle';
          else if (this.actions['idle']) mappedName = 'idle';
       } else if (name === 'crouch') {
          mappedName = 'crouch_idle';
       } else if (name === 'prone') {
          mappedName = 'prone_forward';
       } else if (name === 'walk') {
          mappedName = 'walk';
       } else if (name === 'jog') {
          mappedName = 'jog';
       } else if (name === 'run') {
          mappedName = 'run';
       } else if (name === 'jump') {
          mappedName = 'jump';
       } else if (name === 'pushing') {
          mappedName = 'pushing';
       } else if (name === 'swim') {
          mappedName = 'swim';
       } else if (name === 'tread') {
          mappedName = 'tread';
       }
    }

    let nextAction = this.actions[mappedName];
    if (!nextAction) {
       if (mappedName === 'neutral_idle' || mappedName === 'breathing_idle' || mappedName === 'idle') {
          nextAction = this.actions['neutral_idle'] || this.actions['breathing_idle'] || this.actions['idle'];
       }
    }
    if (!nextAction) return;
    if (nextAction === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    nextAction.reset();
    
    // Mixamo standard jump animations have a long crouch build-up.
    // Our game jump is snappy (0.05s delay), so we skip the crouch buildup (about 0.4s)
    // and speed up the mid-air portion so it looks like a responsive leap.
    if (mappedName === 'jump') {
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

  private lastAppliedColor: string | null = null;
  private lastAppliedScale: number | null = null;

  public setCustomization(color: string | null, scale: number) {
    if (this.lastAppliedColor === color && this.lastAppliedScale === scale) return;

    this.customColor = color;
    this.customScale = scale;
    this.lastAppliedColor = color;
    this.lastAppliedScale = scale;

    // Apply scale directly to the main group
    if (this.innerMesh) {
      this.group.scale.setScalar(scale);
    }

    // Apply color to materials
    if (this.innerMesh && color) {
      const c = new THREE.Color(color);
      this.innerMesh.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat: any) => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshPhongMaterial) {
              mat.color.copy(c);
              mat.needsUpdate = true;
            }
          });
        }
      });
    } else if (this.innerMesh && !color) {
        // Reset color if removed (optional improvement)
        this.innerMesh.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat: any) => {
                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshPhongMaterial) {
                  mat.color.setHex(0xffffff);
                  mat.needsUpdate = true;
                }
              });
            }
          });
    }
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
           // Scale prone offset proportionally to hip height (baseYOffset)
           targetY = this.baseYOffset - (this.baseYOffset * 0.793);
       } else if (isCrouching) {
           // Lower slightly more and tilt forward so heels touch ground
           // If moving, don't lower as much to avoid clipping into the ground
           const crouchFactor = state.speed > 0.1 ? 0.264 : 0.462;
           targetY = this.baseYOffset - (this.baseYOffset * crouchFactor);
           targetRotX = 0.12; 
       }
       
       this.innerMesh.position.y = THREE.MathUtils.lerp(this.innerMesh.position.y, targetY, dt * 10);
       this.innerMesh.rotation.x = THREE.MathUtils.lerp(this.innerMesh.rotation.x, targetRotX, dt * 10);
    }

    if (!this.modelLoaded) return;
    
    if (this.isRemote && (state.animationState || state.currentAnimation)) {
      this.playAction(state.animationState || state.currentAnimation || 'neutral_idle');
      return;
    }

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
