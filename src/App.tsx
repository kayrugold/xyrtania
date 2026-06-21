import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WorldGrid } from './WorldGrid';
import { generateProceduralExplorerMesh, updateMascotAnimation } from './MascotEngine';
import { PlayerState, JumpPhase } from './types';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const lookRef = useRef<HTMLDivElement | null>(null);
  const lookKnobRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadModelRef = useRef<(file: File) => void>(() => {});

  // High-fidelity active React HUD states synced with the WebGL gameplay loop
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [px, setPx] = useState(0);
  const [pz, setPz] = useState(0);
  const [heading, setHeading] = useState('N');
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [fps, setFps] = useState(60);
  const [jumpPhase, setJumpPhase] = useState<JumpPhase>(JumpPhase.IDLE);
  const [isRidingHorse, setIsRidingHorse] = useState(false);
  const [chunkCx, setChunkCx] = useState(0);
  const [chunkCz, setChunkCz] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);

  // References to invoke in-game actions from absolute HTML DOM target elements
  const triggerJumpRef = useRef<() => void>(() => {});
  const toggleHorseRef = useRef<() => void>(() => {});

  // Fullscreen support state detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Native fullscreen blocked. Using fixed page overlay instead.", err);
      // Fallback to fake fullscreen (CSS fixed overlay)
      setIsFakeFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // --- 1. RENDERER INITIALIZATION ---
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true, // Transparent WebGL background reveals the beautiful radial galaxy grid underneath!
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // CRITICAL: Prevent auto-clearing to enable dual-scene overlay pipeline
    renderer.autoClear = false;

    // --- 2. MULTI-SCENE DIRECTORY SETUP ---
    // Scene A: Main 3D Perspective World
    const scene = new THREE.Scene();
    scene.background = null; // No static background color - allows transparent canvas overlay!
    scene.fog = new THREE.FogExp2(0x050508, 0.015); // Deep slate fog gradients fade to black void in distance

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 500);
    // Camera starts behind the player character in a beautiful third-person orbital angle
    camera.position.set(0, 10, 14);

    // Scene B: Orthographic HUD Scene
    const hudScene = new THREE.Scene();
    const hudCamera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      1,
      100
    );
    hudCamera.position.z = 15;

    // --- 3. LIGHTING PIPELINE ---
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.85); // Slate blue ambient fill
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x22d3ee, 1.4); // Cool cyan futuristic moonlight spotlight beams!
    sunLight.position.set(35, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const sCamDist = 60;
    sunLight.shadow.camera.left = -sCamDist;
    sunLight.shadow.camera.right = sCamDist;
    sunLight.shadow.camera.top = sCamDist;
    sunLight.shadow.camera.bottom = -sCamDist;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0x0e172c, 0x050508, 0.45);
    scene.add(hemisphereLight);

    // Dynamic point light following the player for a warm golden safety aura
    const lanternLight = new THREE.PointLight(0xf59e0b, 2.5, 14);
    lanternLight.position.set(0, 2.5, 0);
    scene.add(lanternLight);

    // Warm high-intensity camera headlight to make the player pop and look perfectly illuminated
    const headLight = new THREE.PointLight(0xfff7e6, 3.2, 30, 0.45);
    scene.add(headLight);

    // --- 4. ENGINE INITIALIZATION ---
    const worldGrid = new WorldGrid(scene);

    // Player State Tracker
    const state: PlayerState = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      direction: 0,
      speed: 0,
      health: 100,
      isRidingHorse: false,
      jumpPhase: JumpPhase.IDLE,
      jumpProgress: 0,
      isGrounded: true,
      verticalVelocity: 0,
    };

    // Shared Group containing both the Explorer character and the procedural Horse mount
    const playerRootGroup = new THREE.Group();
    playerRootGroup.position.set(0, 0, 0);
    scene.add(playerRootGroup);

    // Explorer Character Mesh
    const explorerMesh = generateProceduralExplorerMesh();
    playerRootGroup.add(explorerMesh);

    // Procedural Voxel Horse Mount Group
    const horseMesh = generateProceduralHorseMesh();
    playerRootGroup.add(horseMesh);
    horseMesh.visible = false; // Hidden initially on foot
    
    // Wire up the loadModelRef to handle FBX/GLTF model uploads
    loadModelRef.current = (file: File) => {
      const url = URL.createObjectURL(file);
      const extension = file.name.split('.').pop()?.toLowerCase();

      const onModelLoaded = (object: THREE.Object3D) => {
        // Find existing explorer and remove it
        const oldExplorer = playerRootGroup.getObjectByName('explorer');
        if (oldExplorer) {
          playerRootGroup.remove(oldExplorer);
        }
        
        object.name = 'explorer';
        
        // Auto scale to reasonable human size roughly (~2 units)
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          // Normal explorer is roughly 2.5 tall including hat
          const scaleAmount = 2.5 / maxDim;
          object.scale.setScalar(scaleAmount);
        }
        
        // Re-calculate box after scale to adjust pivot to ground at Y=0
        const boxScaled = new THREE.Box3().setFromObject(object);
        const center = boxScaled.getCenter(new THREE.Vector3());
        object.position.set(-center.x, -boxScaled.min.y, -center.z);
        
        // Wrap it in a parent so we don't mess up its internal translations when animating
        const wrapper = new THREE.Group();
        wrapper.name = 'explorer';
        // Give wrapper same cast shadows config as original
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        wrapper.add(object);
        playerRootGroup.add(wrapper);
      };

      if (extension === 'fbx') {
        const loader = new FBXLoader();
        loader.load(url, onModelLoaded, undefined, (err) => console.error("FBX load error", err));
      } else if (extension === 'glb' || extension === 'gltf') {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => onModelLoaded(gltf.scene), undefined, (err) => console.error("GLTF load error", err));
      }
    };

    // --- 5. NATIVE 3D HUD COMPONENT GENERATION (HUD Scene) ---
    const hudElementsGroup = new THREE.Group();
    hudScene.add(hudElementsGroup);

    const hudMaterials = {
      darkGrey: new THREE.MeshBasicMaterial({ color: 0x1f2937, depthTest: false, transparent: true, opacity: 0.85 }),
      solidGreen: new THREE.MeshBasicMaterial({ color: 0x10b981, depthTest: false }),
      dangerRed: new THREE.MeshBasicMaterial({ color: 0xef4444, depthTest: false }),
      white: new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
      gold: new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false }),
      goldPressed: new THREE.MeshBasicMaterial({ color: 0xd97706, depthTest: false }),
      copper: new THREE.MeshBasicMaterial({ color: 0x92400e, depthTest: false }),
      compassBase: new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6 }),
      compassN: new THREE.MeshStandardMaterial({ color: 0xd9383a, roughness: 0.4 }),
      compassS: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.4 }),
      compassEW: new THREE.MeshStandardMaterial({ color: 0xfab226, roughness: 0.4 }),
    };

    // (A) HEALTH BAR OVERLAY SYSTEM
    const healthContainer = new THREE.Group();
    healthContainer.name = 'healthContainer';

    // Red Cross medical shield emblem
    const emblemBg = new THREE.Mesh(new THREE.CircleGeometry(16, 24), hudMaterials.dangerRed);
    emblemBg.position.set(-110, 0, 1);
    healthContainer.add(emblemBg);

    const plusVert = new THREE.Mesh(new THREE.PlaneGeometry(6, 20), hudMaterials.white);
    plusVert.position.set(-110, 0, 2);
    const plusHoriz = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), hudMaterials.white);
    plusHoriz.position.set(-110, 0, 2);
    healthContainer.add(plusVert);
    healthContainer.add(plusHoriz);

    // Frame backplate
    const healthBack = new THREE.Mesh(new THREE.PlaneGeometry(168, 24), hudMaterials.darkGrey);
    healthBack.position.set(-10, 0, 0);
    healthContainer.add(healthBack);

    // Inner green scale-aligned health fill. Align geometry to left edge to make scale operation direct.
    const healthFillGeom = new THREE.PlaneGeometry(160, 16);
    healthFillGeom.translate(80, 0, 0); // Translate half width to make pivot left-aligned
    const healthFill = new THREE.Mesh(healthFillGeom, hudMaterials.solidGreen);
    healthFill.position.set(-90, 0, 2);
    healthContainer.add(healthFill);

    hudElementsGroup.add(healthContainer);

    // (B) 3D ROTATING COMPASS DIAL
    // This is a gorgeous 3D disk placed at top center, lit in the orthographic HUD overlay
    const compassSystem = new THREE.Group();
    compassSystem.name = 'compassSystem';

    // Compass dial frame
    const dialCylinder = new THREE.Mesh(new THREE.CylinderGeometry(44, 45, 12, 16), hudMaterials.compassBase);
    dialCylinder.rotation.x = 0.3; // Tilt forward so player sees detail
    compassSystem.add(dialCylinder);

    // static indicator arrow floating in front of dial
    const staticArrowGeom = new THREE.ConeGeometry(5, 12, 4);
    const staticArrow = new THREE.Mesh(staticArrowGeom, hudMaterials.dangerRed);
    staticArrow.position.set(0, 52, 6);
    staticArrow.rotation.z = Math.PI; // point down towards the dial
    compassSystem.add(staticArrow);

    // Add cardinal markers directly as structural parts of the rotating dial
    // North Pointer: Red cone
    const pN = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassN);
    pN.position.set(0, 0, -32);
    pN.rotation.x = -Math.PI / 2;
    dialCylinder.add(pN);

    // South Pointer: White cone
    const pS = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassS);
    pS.position.set(0, 0, 32);
    pS.rotation.x = Math.PI / 2;
    dialCylinder.add(pS);

    // East Pointer: Golden cone
    const pE = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassEW);
    pE.position.set(32, 0, 0);
    pE.rotation.z = -Math.PI / 2;
    dialCylinder.add(pE);

    // West Pointer: Golden cone
    const pW = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassEW);
    pW.position.set(-32, 0, 0);
    pW.rotation.z = Math.PI / 2;
    dialCylinder.add(pW);

    // Add lighting to the HUD scene because the compass dial is a Standard material
    const hudDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    hudDirLight.position.set(10, 30, 20);
    hudScene.add(hudDirLight);
    const hudAmbLight = new THREE.AmbientLight(0xffffff, 0.45);
    hudScene.add(hudAmbLight);

    hudElementsGroup.add(compassSystem);


    // (C) GOLDEN JUMP TRIGGER CIRCLE BUTTON
    const jumpButton = new THREE.Group();
    jumpButton.name = 'btn_jump';

    // Outer backing golden ring
    const btnOuter = new THREE.Mesh(new THREE.RingGeometry(52, 58, 32), hudMaterials.gold);
    btnOuter.position.z = 1;
    jumpButton.add(btnOuter);

    // Touch circular interaction zone plane
    const btnInner = new THREE.Mesh(new THREE.CircleGeometry(48, 32), hudMaterials.darkGrey);
    btnInner.position.z = 0;
    jumpButton.add(btnInner);

    // Generous transparent touch hit target (Industry standard)
    const btnHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(90, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    btnHitArea.position.z = -1;
    jumpButton.add(btnHitArea);

    // Stylized Up Arrow indicators inside button
    const arrowStem = new THREE.Mesh(new THREE.PlaneGeometry(12, 28), hudMaterials.gold);
    arrowStem.position.set(0, -6, 2);
    jumpButton.add(arrowStem);

    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(18, 20, 3), hudMaterials.gold);
    arrowTip.position.set(0, 14, 2);
    arrowTip.rotation.z = Math.PI / 2; // point up relative to cone coordinates
    jumpButton.add(arrowTip);

    hudElementsGroup.add(jumpButton);


    // (D) MOBILE HORSE MOUNT 'H' TOGGLE BUTTON
    const horseButton = new THREE.Group();
    horseButton.name = 'btn_horse';

    const hOuter = new THREE.Mesh(new THREE.RingGeometry(42, 48, 32), hudMaterials.gold);
    hOuter.position.z = 1;
    horseButton.add(hOuter);

    const hInner = new THREE.Mesh(new THREE.CircleGeometry(38, 32), hudMaterials.darkGrey);
    hInner.position.z = 0;
    horseButton.add(hInner);

    // Generous transparent touch hit target (Industry standard)
    const horseHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(75, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    horseHitArea.position.z = -1;
    horseButton.add(horseHitArea);

    // Draw the capital letter 'H' inside the horse mount toggle button using raw primitives
    const letterGroup = new THREE.Group();
    letterGroup.position.set(0, 0, 2);

    const hLegL = new THREE.Mesh(new THREE.PlaneGeometry(6, 24), hudMaterials.gold);
    hLegL.position.set(-9, 0, 0);
    const hLegR = new THREE.Mesh(new THREE.PlaneGeometry(6, 24), hudMaterials.gold);
    hLegR.position.set(9, 0, 0);
    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), hudMaterials.gold);
    hCross.position.set(0, 0, 0);

    letterGroup.add(hLegL);
    letterGroup.add(hLegR);
    letterGroup.add(hCross);
    horseButton.add(letterGroup);

    hudElementsGroup.add(horseButton);


    // (E) TEXT GRAPHIC NOTICES IN WEBGL (Simple UI guide plates constructed out of meshes)
    const noticePlate = new THREE.Group();
    noticePlate.name = 'noticePlate';
    
    // Background bar
    const npBg = new THREE.Mesh(new THREE.PlaneGeometry(280, 22), hudMaterials.darkGrey);
    noticePlate.add(npBg);

    // Decorative pixels spelling keys: "WASD" keys to Move
    const keySymbolGroup = new THREE.Group();
    keySymbolGroup.position.set(0, 0, 1);
    noticePlate.add(keySymbolGroup);

    // Create a horizontal white pixel indicator representing control bindings
    const controlGuideLine = new THREE.Mesh(new THREE.PlaneGeometry(240, 2), hudMaterials.gold);
    controlGuideLine.position.y = -8;
    noticePlate.add(controlGuideLine);

    hudElementsGroup.add(noticePlate);


    // (F) WEBGL FULLSCREEN BUTTON drawn directly to the canvas using primitives
    const fullscreenButton = new THREE.Group();
    fullscreenButton.name = 'btn_fullscreen';

    // Outer backing golden ring
    const fsOuter = new THREE.Mesh(new THREE.RingGeometry(42, 48, 32), hudMaterials.gold);
    fsOuter.position.z = 1;
    fullscreenButton.add(fsOuter);

    // Inner backplate (dark grey)
    const fsInner = new THREE.Mesh(new THREE.CircleGeometry(44, 32), hudMaterials.darkGrey);
    fsInner.position.z = 0;
    fullscreenButton.add(fsInner);

    // Generous transparent touch hit target (Industry standard)
    const fsHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(75, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    fsHitArea.position.z = -1;
    fullscreenButton.add(fsHitArea);

    // Draw clean fullscreen brackets on the canvas with Plane geometries:
    const bracketGroup = new THREE.Group();
    bracketGroup.position.z = 2;

    const bSize = 10;
    const bThick = 2.5;
    const bOff = 12;

    // Top-left
    const tlH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    tlH.position.set(-bOff + bSize / 2, bOff - bThick / 2, 0);
    const tlV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    tlV.position.set(-bOff + bThick / 2, bOff - bSize / 2, 0);
    bracketGroup.add(tlH, tlV);

    // Top-right
    const trH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    trH.position.set(bOff - bSize / 2, bOff - bThick / 2, 0);
    const trV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    trV.position.set(bOff - bThick / 2, bOff - bSize / 2, 0);
    bracketGroup.add(trH, trV);

    // Bottom-left
    const blH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    blH.position.set(-bOff + bSize / 2, -bOff + bThick / 2, 0);
    const blV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    blV.position.set(-bOff + bThick / 2, -bOff + bSize / 2, 0);
    bracketGroup.add(blH, blV);

    // Bottom-right
    const brH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    brH.position.set(bOff - bSize / 2, -bOff + bThick / 2, 0);
    const brV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    brV.position.set(bOff - bThick / 2, -bOff + bSize / 2, 0);
    bracketGroup.add(brH, brV);

    fullscreenButton.add(bracketGroup);
    hudElementsGroup.add(fullscreenButton);


    // --- RE-ENABLE FULL RICH HUD PARTS FOR INTUITIVE USER CONTROLS ---
    healthContainer.visible = true;
    compassSystem.visible = false;
    horseButton.visible = false;
    noticePlate.visible = true;


    // --- 6. WINDOW RESIZING ENGINE ---
    const layoutUI = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Update basic viewport systems
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Update HUD Camera projection mapping
      hudCamera.left = -w / 2;
      hudCamera.right = w / 2;
      hudCamera.top = h / 2;
      hudCamera.bottom = -h / 2;
      hudCamera.updateProjectionMatrix();

      // Reposition all HUD group elements elegantly relative to anchors
      healthContainer.position.set(-w / 2 + 130, h / 2 - 45, 0);
      compassSystem.position.set(0, h / 2 - 55, 0);
      jumpButton.position.set(w / 2 - 95, -h / 2 + 95, 0);
      
      // Make fullscreen a tiny button at the top right
      fullscreenButton.position.set(w / 2 - 35, h / 2 - 35, 0);
      fullscreenButton.scale.set(0.42, 0.42, 0.42);
      
      horseButton.position.set(-w / 2 + 85, -h / 2 + 95, 0);
      noticePlate.position.set(0, -h / 2 + 30, 0);
    };
    window.addEventListener('resize', layoutUI);
    // Initial dynamic layout binding
    layoutUI();


    // --- 7. INPUT & STEERING INTERACTORS ---
    let currentStamina = 100;

    const keys: { [key: string]: boolean } = {};
    const keyPressHandler = (e: KeyboardEvent) => {
      // Prevent scrolling when pressing Spacebar
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
      }
      keys[e.key.toLowerCase()] = true;

      // Mount/Dismount keyboard horse trigger ('h')
      if (e.key.toLowerCase() === 'h') {
        toggleHorseMount();
      }

      // Space Trigger JUMP
      if (e.key === ' ' || e.code === 'Space') {
        initiateJump();
      }
    };
    const keyReleaseHandler = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', keyPressHandler);
    window.addEventListener('keyup', keyReleaseHandler);

    function toggleHorseMount() {
      state.isRidingHorse = !state.isRidingHorse;
      horseMesh.visible = state.isRidingHorse;

      // Pulse the horse button on screen
      horseButton.scale.set(0.72, 0.72, 0.72);

      // Mutate explorer leg stances when sitting on saddle
      const lowerLegs = explorerMesh.getObjectByName('lowerBodyGroup') as THREE.Group;
      if (lowerLegs) {
        if (state.isRidingHorse) {
          lowerLegs.rotation.set(0.12, 0, 0); // clamp legs
          lowerLegs.scale.set(1.4, 0.8, 1.4); // widen legs
          explorerMesh.position.y = 0.58; // lift trunk above saddle
        } else {
          lowerLegs.rotation.set(0, 0, 0);
          lowerLegs.scale.set(1, 1, 1);
          explorerMesh.position.y = 0;
        }
      }
    }

    function initiateJump() {
      // Allow jump if player is on the ground
      if (state.isGrounded && state.jumpPhase !== JumpPhase.PREP) {
        state.jumpPhase = JumpPhase.PREP;
        state.jumpProgress = 0;

        // Pulse the gold jump button on screen
        jumpButton.scale.set(0.75, 0.75, 0.75);
      }
    }

    // Connect refs to make these actions callable from the outer React DOM HUD
    triggerJumpRef.current = initiateJump;
    toggleHorseRef.current = toggleHorseMount;

    // Split-screen touch/mouse active tracking states
    let moveActive = false;
    let moveTouchId: number | null = null;
    let moveStartX = 0;
    let moveStartY = 0;
    let moveCurrentX = 0;
    let moveCurrentY = 0;

    let camActive = false;
    let camTouchId: number | null = null;
    let camStartX = 0;
    let camStartY = 0;
    let camCurrentX = 0;
    let camCurrentY = 0;

    // Camera orbit parameters (starts behind player looking forward)
    let cameraYaw = 0;
    let cameraPitch = 0.55;
    const cameraDistance = 8.5;

    const handlePointerDown = (clientX: number, clientY: number, touchId: number | null) => {
      // 1. Raycast into flat Hud Scene to verify circular buttons hits
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, hudCamera);
      const intersects = raycaster.intersectObjects(hudElementsGroup.children, true);

      let buttonHit = false;
      for (const hit of intersects) {
        let parent: THREE.Object3D | null = hit.object;
        while (parent && parent !== hudScene) {
          if (parent.name === 'btn_jump') {
            initiateJump();
            buttonHit = true;
            break;
          }
          if (parent.name === 'btn_fullscreen') {
            toggleFullscreen();
            buttonHit = true;
            break;
          }
          if (parent.name === 'btn_horse') {
            toggleHorseMount();
            buttonHit = true;
            break;
          }
          parent = parent.parent;
        }
        if (buttonHit) break;
      }

      // 2. If no button is hit, use split-screen inputs (left side for steer, right side for camera orbit look)
      if (!buttonHit) {
        const isLeftHalf = clientX < window.innerWidth / 2;
        if (isLeftHalf) {
          moveActive = true;
          moveTouchId = touchId;
          moveStartX = clientX;
          moveStartY = clientY;
          moveCurrentX = clientX;
          moveCurrentY = clientY;
          
          // Display and position virtual joystick DOM container
          if (joystickRef.current) {
            joystickRef.current.style.display = 'block';
            joystickRef.current.style.left = `${clientX}px`;
            joystickRef.current.style.top = `${clientY}px`;
          }
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
          }
        } else {
          camActive = true;
          camTouchId = touchId;
          camStartX = clientX;
          camStartY = clientY;
          camCurrentX = clientX;
          camCurrentY = clientY;

          // Position look pointer ring visual
          if (lookRef.current) {
            lookRef.current.style.display = 'block';
            lookRef.current.style.left = `${clientX}px`;
            lookRef.current.style.top = `${clientY}px`;
          }
          if (lookKnobRef.current) {
            lookKnobRef.current.style.transform = `translate(0px, 0px)`;
          }
        }
      }
    };

    const handlePointerMove = (clientX: number, clientY: number, touchId: number | null) => {
      if (moveActive && moveTouchId === touchId) {
        moveCurrentX = clientX;
        moveCurrentY = clientY;
        const dx = clientX - moveStartX;
        const dy = clientY - moveStartY;
        // Clamp virtual knob graphics within 45px radius boundary
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(45, Math.sqrt(dx*dx + dy*dy));
        const knobX = dist * Math.cos(angle);
        const knobY = dist * Math.sin(angle);
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      }
      if (camActive && camTouchId === touchId) {
        camCurrentX = clientX;
        camCurrentY = clientY;
        const dx = clientX - camStartX;
        const dy = clientY - camStartY;
        // Clamp camera knob graphics within 45px radius boundary
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(45, Math.sqrt(dx*dx + dy*dy));
        const knobX = dist * Math.cos(angle);
        const knobY = dist * Math.sin(angle);
        if (lookKnobRef.current) {
          lookKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      }
    };

    const handlePointerUp = (touchId: number | null) => {
      if (touchId === null) {
        moveActive = false;
        moveTouchId = null;
        camActive = false;
        camTouchId = null;
        if (joystickRef.current) {
          joystickRef.current.style.display = 'none';
        }
        if (lookRef.current) {
          lookRef.current.style.display = 'none';
        }
      } else {
        if (moveActive && moveTouchId === touchId) {
          moveActive = false;
          moveTouchId = null;
          if (joystickRef.current) {
            joystickRef.current.style.display = 'none';
          }
        }
        if (camActive && camTouchId === touchId) {
          camActive = false;
          camTouchId = null;
          if (lookRef.current) {
            lookRef.current.style.display = 'none';
          }
        }
      }
    };

    // Canvas listeners
    const el = canvasRef.current;
    
    const onMouseDown = (e: MouseEvent) => {
      handlePointerDown(e.clientX, e.clientY, null);
    };
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY, null);
    };
    const onWindowMouseUp = () => {
      handlePointerUp(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Stop mobile scrolling/pinch effects on WebGL frame canvas
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerDown(t.clientX, t.clientY, t.identifier);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerMove(t.clientX, t.clientY, t.identifier);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerUp(t.identifier);
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });


    // --- 8. THE MAIN GAMEPLAY SIMULATION LOOP ---
    const clock = new THREE.Clock();
    let playerDirectionAngle = 0;
    let cameraShake = 0;

    // Telemetry and high-performance State tracking clocks
    let lastTime = performance.now();
    let frames = 0;
    let lastFpsUpdate = 0;
    let lastStateUpdate = 0;

    const gameLoop = () => {
      const dt = Math.min(clock.getDelta(), 0.1); // Clamp dt to prevent massive jumps on page switch
      const globalTime = clock.getElapsedTime();

      // Gradual decay of HUD click scale pulses
      jumpButton.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);
      horseButton.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);

      // --- MOVEMENT STEERING DECODER ---
      const moveVec = new THREE.Vector3(0, 0, 0);

      if (keys['w'] || keys['arrowup']) moveVec.z = -1;
      if (keys['s'] || keys['arrowdown']) moveVec.z = 1;
      if (keys['a'] || keys['arrowleft']) moveVec.x = -1;
      if (keys['d'] || keys['arrowright']) moveVec.x = 1;

      // Steer via touch movement vector (Split Screen Joystick style)
      if (moveActive) {
        const screenDx = moveCurrentX - moveStartX;
        const screenDz = moveCurrentY - moveStartY;

        // Apply a small deadzone to prevent jittery inputs
        if (Math.abs(screenDx) > 4 || Math.abs(screenDz) > 4) {
          // Angle on screen relative to starting touch position
          const screenAngle = Math.atan2(screenDx, screenDz);
          
          // Project relative to camera forward vector
          const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          camForward.y = 0;
          camForward.normalize();

          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          camRight.y = 0;
          camRight.normalize();

          // Mix vectors scaled by cam orientation
          const touchDir = camForward.multiplyScalar(-Math.cos(screenAngle)).add(camRight.multiplyScalar(Math.sin(screenAngle)));
          touchDir.normalize();

          moveVec.copy(touchDir);
        }
      }

      // Convert local keyboard inputs into world spaces aligned relative to camera facing heading
      if (moveVec.lengthSq() > 0.01 && !moveActive) {
        moveVec.normalize();
        // Camera yaw angles projection
        const camYAngle = Math.atan2(
          camera.position.x - state.position.x,
          camera.position.z - state.position.z
        );
        // Rotate moveVec relative to camera viewpoint
        const rotatedX = moveVec.x * Math.cos(camYAngle) - moveVec.z * Math.sin(camYAngle);
        const rotatedZ = moveVec.x * Math.sin(camYAngle) + moveVec.z * Math.cos(camYAngle);
        moveVec.set(rotatedX, 0, rotatedZ).normalize();
      }

      // Decides movement speed scale depending on analog touch joystick drag pull
      let speedScale = 1.0;
      if (moveActive) {
        const screenDx = moveCurrentX - moveStartX;
        const screenDz = moveCurrentY - moveStartY;
        const dragDist = Math.sqrt(screenDx * screenDx + screenDz * screenDz);
        speedScale = Math.min(1.0, dragDist / 45);
      }

      // Decides movement speed factor depending on Mount state and analog deflection
      const targetSpeed = (state.isRidingHorse ? 38 : 22) * speedScale;
      const accelFactor = state.isRidingHorse ? 18 : 16;

      if (moveVec.lengthSq() > 0.01) {
        // Lock player head orientation yaw
        playerDirectionAngle = Math.atan2(moveVec.x, moveVec.z);
        // Interpolate velocity
        state.velocity.lerp(moveVec.multiplyScalar(targetSpeed), dt * accelFactor);
        state.speed = state.velocity.length();

        // Animate legs run cycle
        if (state.jumpPhase === JumpPhase.IDLE) {
          state.jumpPhase = JumpPhase.RUNNING;
        }
      } else {
        // Slow down to a stop
        state.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * 10);
        state.speed = state.velocity.length();
        if (state.speed < 0.1) {
          state.speed = 0;
          if (state.jumpPhase === JumpPhase.RUNNING) {
            state.jumpPhase = JumpPhase.IDLE;
          }
        }
      }

      // Align model rotation smoothly to the movement velocity axis
      if (state.speed > 0.1) {
        // Handle wrapping angles cleanly with lerp
        let diff = playerDirectionAngle - playerRootGroup.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        playerRootGroup.rotation.y += diff * dt * 14;
      }

      // --- PHYSICAL JUMP STATE TICKER ---
      if (state.jumpPhase === JumpPhase.PREP) {
        state.jumpProgress += dt;
        if (state.jumpProgress >= 0.05) {
          // LAUNCH OFF GROUND
          state.jumpPhase = JumpPhase.LAUNCH;
          state.verticalVelocity = state.isRidingHorse ? 16 : 13;
          state.isGrounded = false;
        }
      } else if (!state.isGrounded) {
        const gravityConst = state.isRidingHorse ? 45 : 35;
        state.verticalVelocity -= gravityConst * dt;
        state.position.y += state.verticalVelocity * dt;

        // Transition launch to apex once falling starts
        if (state.verticalVelocity < 2 && state.jumpPhase === JumpPhase.LAUNCH) {
          state.jumpPhase = JumpPhase.APEX;
        }

        // Detect touchdown impact
        if (state.position.y <= 0) {
          state.position.y = 0;
          state.verticalVelocity = 0;
          state.isGrounded = true;
          state.jumpPhase = JumpPhase.IMPACT;
        }
      }

      // Apply horizontal displacements to coordinate position
      state.position.addScaledVector(state.velocity, dt);

      // --- MAP BOUNDS CLAMPING (84,000 bounds) ---
      worldGrid.clampPositionToBounds(state.position);

      // Update actual visual group coordinates inside scene
      playerRootGroup.position.copy(state.position);

      // Lantern light bobbing on explorer
      lanternLight.position.set(state.position.x, state.position.y + 2, state.position.z);

      // --- CHUNK INITIALIZATION & GC PASS ---
      worldGrid.update(state.position);

      // --- COLLISION DETECTION SYSTEM ---
      // Scrutinize surrounding objects in loaded chunks
      const activeChunks = worldGrid.getActiveChunks();
      const playerRadiusSq = 1.35 * 1.35; // collision cylinder size

      for (const chunk of activeChunks.values()) {
        for (const object of chunk.clutterMeshes) {
          // Distance checks
          const dx = state.position.x - object.position.x;
          const dz = state.position.z - object.position.z;
          const distanceSq = dx * dx + dz * dz;

          // If inside collision capsule we trigger pushback bounce & damage
          if (distanceSq < playerRadiusSq) {
            const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
            
            // Push player out of obstacle bounds
            state.position.addScaledVector(pushDir, 0.45);
            playerRootGroup.position.copy(state.position);

            // Halt velocity
            state.velocity.set(0, 0, 0);
            state.speed = 0;

            // Trigger damage & screen shake
            state.health = Math.max(0, state.health - 6);
            cameraShake = 0.5; // Start camera rumble shake
          }
        }
      }

      // Gradual natural health auto-recovery on green grass plains (regenerate 3 health per second)
      if (state.health < 100) {
        state.health = Math.min(100, state.health + dt * 3.5);
      }

      // Mutate HUD Green Health Scale based trace
      healthFill.scale.x = state.health / 100;
      if (state.health < 25) {
        // Warning flashing when low health
        healthFill.material = hudMaterials.dangerRed;
      } else {
        healthFill.material = hudMaterials.solidGreen;
      }

      // --- CAM ORBIT CAMERA LOGIC ---
      if (camActive) {
        const dx = camCurrentX - camStartX;
        const dy = camCurrentY - camStartY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
          // Analog Stick ratio normalized over standard 45px knob deflection threshold
          const ratioX = Math.min(1, Math.max(-1, dx / 45));
          const ratioY = Math.min(1, Math.max(-1, dy / 45));
          
          // Snappy, incredibly responsive continuous orbital speeds
          cameraYaw -= ratioX * 2.8 * dt;
          cameraPitch = Math.max(0.05, Math.min(1.4, cameraPitch + ratioY * 1.8 * dt));
        }
      }

      const dynamicOffset = new THREE.Vector3(
        cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch),
        cameraDistance * Math.sin(cameraPitch),
        cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch)
      );
      
      const targetCamPos = state.position.clone().add(dynamicOffset);
      camera.position.lerp(targetCamPos, dt * 6.5);
      
      // Keep orbital focus locked on explorer chest height
      const focalPoint = state.position.clone().add(new THREE.Vector3(0, 1.6, 0));
      camera.lookAt(focalPoint);

      // Lock our custom warm headlight directly to the camera center
      headLight.position.copy(camera.position);

      // Apply screen shake effect on collision with stones
      if (cameraShake > 0.01) {
        camera.position.x += (Math.random() - 0.5) * cameraShake * 1.2;
        camera.position.y += (Math.random() - 0.5) * cameraShake * 1.2;
        cameraShake = THREE.MathUtils.lerp(cameraShake, 0, dt * 6);
      }

      // --- ANIMATE VISUAL MASCOT JOINT COMPOSITIONS ---
      updateMascotAnimation(explorerMesh, state, dt, globalTime);

      // Animate Horse limbs as well if riding
      if (state.isRidingHorse && horseMesh.visible) {
        const hBL = horseMesh.getObjectByName('legBL') as THREE.Mesh;
        const hBR = horseMesh.getObjectByName('legBR') as THREE.Mesh;
        const hFL = horseMesh.getObjectByName('legFL') as THREE.Mesh;
        const hFR = horseMesh.getObjectByName('legFR') as THREE.Mesh;

        if (hBL && hBR && hFL && hFR) {
          if (state.speed > 0.1) {
            const legSpeed = 16;
            const swing = Math.sin(globalTime * legSpeed) * 0.45;
            hBL.rotation.x = -swing;
            hBR.rotation.x = swing;
            hFL.rotation.x = swing;
            hFR.rotation.x = -swing;
            
            // Trot body lift
            horseMesh.position.y = Math.abs(Math.sin(globalTime * legSpeed)) * 0.1;
          } else {
            hBL.rotation.x = 0;
            hBR.rotation.x = 0;
            hFL.rotation.x = 0;
            hFR.rotation.x = 0;
            horseMesh.position.y = 0;
          }
        }
      }

      // --- ROTATE COMPASS OVERLAY DIAL ---
      // The compass dial rotation copies camera viewport yaw precisely so that the red arrow always faces absolute North!
      const forwardVec = new THREE.Vector3();
      camera.getWorldDirection(forwardVec);
      const viewHeading = Math.atan2(forwardVec.x, forwardVec.z);
      // Rotate cylinder
      dialCylinder.rotation.y = viewHeading;

      // --- STAMINA NATURAL RECOVERY TICK ---
      if (state.isGrounded && state.jumpPhase !== JumpPhase.PREP) {
        const staminaRegenSpeed = state.isRidingHorse ? 30 : 18; // mount helps recover faster!
        currentStamina = Math.min(100, currentStamina + staminaRegenSpeed * dt);
      }

      // --- CHRONO SPEED/FPS & TELEMETRY SYNC ---
      frames++;
      const nowTime = performance.now();
      if (nowTime > lastFpsUpdate + 500) {
        const currentFps = Math.round((frames * 1000) / (nowTime - lastTime));
        setFps(currentFps);
        frames = 0;
        lastTime = nowTime;
        lastFpsUpdate = nowTime;
      }

      // Sync state updates at highly responsive yet resource-friendly 12Hz frame-rate (approx 80ms ticks)
      if (globalTime > lastStateUpdate + 0.08) {
        setHealth(Math.round(state.health));
        setStamina(Math.round(currentStamina));
        setPx(state.position.x);
        setPz(state.position.z);
        setJumpPhase(state.jumpPhase);
        setIsRidingHorse(state.isRidingHorse);

        // Derive cardinal heading direction
        let deg = Math.round((viewHeading * 180) / Math.PI);
        if (deg < 0) deg += 360;
        setHeadingDegrees(deg);

        const directions = [
          { name: 'N', min: 337.5, max: 22.5 },
          { name: 'NE', min: 22.5, max: 67.5 },
          { name: 'E', min: 67.5, max: 112.5 },
          { name: 'SE', min: 112.5, max: 157.5 },
          { name: 'S', min: 157.5, max: 202.5 },
          { name: 'SW', min: 202.5, max: 247.5 },
          { name: 'W', min: 247.5, max: 292.5 },
          { name: 'NW', min: 292.5, max: 337.5 }
        ];
        let card = 'N';
        for (const d of directions) {
          if (d.name === 'N') {
            if (deg >= d.min || deg < d.max) { card = d.name; break; }
          } else {
            if (deg >= d.min && deg < d.max) { card = d.name; break; }
          }
        }
        setHeading(card);

        // Surrounding dynamic chunks tracker
        const cx = Math.floor((state.position.x + 20) / 40);
        const cz = Math.floor((state.position.z + 20) / 40);
        setChunkCx(cx);
        setChunkCz(cz);

        lastStateUpdate = globalTime;
      }

      // --- 9. DUAL RENDER PASS EXECUTION ---
      // Clear viewport canvas colors
      renderer.clear();

      // PASS 1: Render 3D World (Main scene)
      renderer.render(scene, camera);

      // PASS 2: Render our canvas-primitives HUD overlays on top of the 3D main viewport
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);

      requestAnimationFrame(gameLoop);
    };

    // Kickstart recursive request frames
    let frameId = requestAnimationFrame(gameLoop);

    // Clean up memory allocations on component unmount
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', keyPressHandler);
      window.removeEventListener('keyup', keyReleaseHandler);
      window.removeEventListener('resize', layoutUI);

      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);

      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);

      worldGrid.disposeAll();
      renderer.dispose();
      
      // Dispose HUD materials
      Object.values(hudMaterials).forEach((m) => m.dispose());
    };
  }, []);

  function generateProceduralHorseMesh(): THREE.Group {
    const horse = new THREE.Group();
    horse.name = 'horse';

    const horseMaterial = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, flatShading: true }); // Chestnut brown horse
    const maneMaterial = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8, flatShading: true });  // Dark mane
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x5c2d13, roughness: 0.8, flatShading: true });   // Legs
    const saddleMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, flatShading: true }); // Saddle grey/black

    // Torso/Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.1), horseMaterial);
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    horse.add(body);

    // Saddle representation on body
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.2, 0.45), saddleMaterial);
    saddle.position.set(0, 0.65, -0.05);
    saddle.castShadow = true;
    horse.add(saddle);

    // Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.32), horseMaterial);
    neck.position.set(0, 0.95, 0.4);
    neck.rotation.x = -0.4;
    neck.castShadow = true;
    horse.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.28, 0.5), horseMaterial);
    head.position.set(0, 1.15, 0.52);
    head.rotation.x = 0.2;
    head.castShadow = true;
    horse.add(head);

    // Ears
    const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), horseMaterial);
    leftEar.position.set(-0.08, 1.32, 0.45);
    leftEar.rotation.x = -0.2;
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.08;
    horse.add(leftEar);
    horse.add(rightEar);

    // Mane
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), maneMaterial);
    mane.position.set(0, 1.05, 0.22);
    mane.rotation.x = -0.4;
    horse.add(mane);

    // 4 legs
    const legGeom = new THREE.BoxGeometry(0.14, 0.45, 0.14);
    
    // Back Left
    const legBL = new THREE.Mesh(legGeom, legMaterial);
    legBL.name = 'legBL';
    legBL.position.set(-0.2, 0.22, -0.38);
    legBL.castShadow = true;
    horse.add(legBL);

    // Back Right
    const legBR = new THREE.Mesh(legGeom, legMaterial);
    legBR.name = 'legBR';
    legBR.position.set(0.2, 0.22, -0.38);
    legBR.castShadow = true;
    horse.add(legBR);

    // Front Left
    const legFL = new THREE.Mesh(legGeom, legMaterial);
    legFL.name = 'legFL';
    legFL.position.set(-0.2, 0.22, 0.38);
    legFL.castShadow = true;
    horse.add(legFL);

    // Front Right
    const legFR = new THREE.Mesh(legGeom, legMaterial);
    legFR.name = 'legFR';
    legFR.position.set(0.2, 0.22, 0.38);
    legFR.castShadow = true;
    horse.add(legFR);

    return horse;
  }

  return (
    <div className={isFakeFullscreen ? "fixed inset-0 z-[99999] w-full h-[100dvh] bg-[#050508] text-slate-300 font-sans overflow-hidden" : "w-screen h-[100dvh] bg-[#050508] text-slate-300 font-sans relative overflow-hidden"}>
      {/* Cinematic Background Grid Underlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050508 100%)' }}></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Visual Translucent Virtual Joystick */}
      <div 
        ref={joystickRef}
        className="absolute w-24 h-24 rounded-full bg-black/45 backdrop-blur-md border border-cyan-500/25 shadow-2xl z-40 pointer-events-none transition-opacity duration-150"
        style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-2 border border-cyan-400/10 rounded-full"></div>
        <div 
          ref={joystickKnobRef}
          className="absolute w-10 h-10 left-[28px] top-[28px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center transition-transform duration-75"
        >
          <div className="w-3" style={{ borderTop: '2px solid rgba(255, 255, 255, 0.35)' }}></div>
        </div>
      </div>

      {/* Visual Translucent Virtual Look Joystick */}
      <div 
        ref={lookRef}
        className="absolute w-24 h-24 rounded-full bg-black/45 backdrop-blur-md border border-amber-500/25 shadow-2xl z-40 pointer-events-none transition-opacity duration-150"
        style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-2 border border-amber-400/10 rounded-full"></div>
        <div 
          ref={lookKnobRef}
          className="absolute w-10 h-10 left-[28px] top-[28px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center transition-transform duration-75"
        >
          <div className="w-3" style={{ borderTop: '2px solid rgba(255, 255, 255, 0.45)' }}></div>
        </div>
      </div>

      {/* Load 3D Model HUD Element */}
      <div className="absolute top-4 left-4 z-50 pointer-events-auto">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".fbx,.glb,.gltf" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadModelRef.current(file);
          }} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg backdrop-blur-md font-mono text-xs tracking-wider transition-colors shadow-lg flex items-center gap-2"
        >
          <span className="text-amber-400">⌘</span> LOAD CUSTOM MESH (.FBX/.GLTF)
        </button>
      </div>

      {/* Main Viewport Content - WebGL Canvas inside the underlaid layout */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block select-none touch-none cursor-pointer pointer-events-auto"
          style={{ width: '100%', height: '100%', display: 'block' }}
          id="game-canvas"
        />
      </div>
    </div>
  );
}
