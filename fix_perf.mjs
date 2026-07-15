import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

const oldUpdateBlock = `      // Sync state updates at highly responsive yet resource-friendly 12Hz frame-rate (approx 80ms ticks)
      if (globalTime > lastStateUpdate + 0.08) {
        setHealth(Math.round(state.health));
        setStamina(Math.round(currentStamina));
        setPx(state.position.x);
        setPz(state.position.z);
        setJumpPhase(state.jumpPhase);

        state.direction = playerRootGroup.rotation.y;

        // Network Broadcast
        state.displayName = localStorage.getItem('xyrtania_display_name') || 'Anonymous';
        state.modelUrl = animator.currentModelUrl;
        state.currentAnimation = animator.currentActionName;
        state.animationState = animator.currentActionName;
        state.isProne = isProne;
        state.isCrouching = isCrouching;

        networkManager.broadcastState(state);

        const currentCx = Math.floor((state.position.x + worldGrid.chunkSize / 2) / worldGrid.chunkSize);
        const currentCz = Math.floor((state.position.z + worldGrid.chunkSize / 2) / worldGrid.chunkSize);
        setChunkCx(currentCx);
        setChunkCz(currentCz);

        lastStateUpdate = globalTime;
      }`;

const newUpdateBlock = `      // Handle non-DOM game state networking 12Hz
      if (globalTime > lastStateUpdate + 0.08) {
        state.direction = playerRootGroup.rotation.y;

        // Network Broadcast
        state.displayName = localStorage.getItem('xyrtania_display_name') || 'Anonymous';
        state.modelUrl = animator.currentModelUrl;
        state.currentAnimation = animator.currentActionName;
        state.animationState = animator.currentActionName;
        state.isProne = isProne;
        state.isCrouching = isCrouching;

        networkManager.broadcastState(state);

        // Only update React states if diagnostics are visible! This saves MASSIVE CPU.
        if (showDiagnosticsRef.current) {
            setPx(state.position.x);
            setPz(state.position.z);
            const currentCx = Math.floor((state.position.x + worldGrid.chunkSize / 2) / worldGrid.chunkSize);
            const currentCz = Math.floor((state.position.z + worldGrid.chunkSize / 2) / worldGrid.chunkSize);
            setChunkCx(currentCx);
            setChunkCz(currentCz);
        }

        lastStateUpdate = globalTime;
      }`;

app = app.replace(oldUpdateBlock, newUpdateBlock);

app = app.replace("const [health, setHealth] = useState(100);", "");
app = app.replace("const [stamina, setStamina] = useState(100);", "");
app = app.replace("const [jumpPhase, setJumpPhase] = useState<JumpPhase>(JumpPhase.IDLE);", "");
app = app.replace("const [showDiagnostics, setShowDiagnostics] = useState(false);", "const [showDiagnostics, setShowDiagnostics] = useState(false);\n  const showDiagnosticsRef = useRef(false);\n  useEffect(() => { showDiagnosticsRef.current = showDiagnostics; }, [showDiagnostics]);");

// also limit FPS update if diagnostics not shown!
app = app.replace(`      if (nowTime > lastFpsUpdate + 500) {
        const currentFps = Math.round((frames * 1000) / (nowTime - lastTime));
        setFps(currentFps);
        frames = 0;
        lastTime = nowTime;
        lastFpsUpdate = nowTime;
      }`, `      if (nowTime > lastFpsUpdate + 500) {
        const currentFps = Math.round((frames * 1000) / (nowTime - lastTime));
        if (showDiagnosticsRef.current) setFps(currentFps);
        frames = 0;
        lastTime = nowTime;
        lastFpsUpdate = nowTime;
      }`);

fs.writeFileSync('src/App.tsx', app);
