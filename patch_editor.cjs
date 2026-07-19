const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add lastTouchAngle
code = code.replace(
  'let lastTouchCenter = { x: 0, y: 0 };',
  'let lastTouchCenter = { x: 0, y: 0 };\n    let lastTouchAngle: number | null = null;'
);

// 2. onTouchStart init lastTouchAngle
code = code.replace(
  'lastTouchCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };',
  'lastTouchCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };\n          lastTouchAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);'
);

// 3. onTouchMove for 2 fingers
const oldPanTouch = `
          const dx = center.x - lastTouchCenter.x;
          const dy = center.y - lastTouchCenter.y;
          const panSpeed = editorCameraZoom * 0.003;
          editorCameraTargetRef.current.x -= dx * panSpeed;
          editorCameraTargetRef.current.z -= dy * panSpeed;
          lastTouchCenter = center;
`;

const newPanTouch = `
          const dx = center.x - lastTouchCenter.x;
          const dy = center.y - lastTouchCenter.y;
          const panSpeed = editorCameraZoom * 0.003;
          editorCameraTargetRef.current.x -= (Math.cos(editorCameraYaw) * dx + Math.sin(editorCameraYaw) * dy) * panSpeed;
          editorCameraTargetRef.current.z -= (-Math.sin(editorCameraYaw) * dx + Math.cos(editorCameraYaw) * dy) * panSpeed;
          lastTouchCenter = center;

          const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
          if (lastTouchAngle !== null) {
              let dAngle = angle - lastTouchAngle;
              while (dAngle < -Math.PI) dAngle += Math.PI * 2;
              while (dAngle > Math.PI) dAngle -= Math.PI * 2;
              // If the twist is significant, apply it
              if (Math.abs(dAngle) > 0.01) {
                  editorCameraYaw -= dAngle;
                  lastTouchAngle = angle;
              }
          } else {
              lastTouchAngle = angle;
          }
`;
code = code.replace(oldPanTouch, newPanTouch);

// 4. onMouseMove for mouse pan
const oldPanMouse = `
           const mx = e.movementX || 0;
           const my = e.movementY || 0;
           const panSpeed = editorCameraZoom * 0.003;
           editorCameraTargetRef.current.x -= mx * panSpeed;
           editorCameraTargetRef.current.z -= my * panSpeed;
`;

const newPanMouse = `
           const mx = e.movementX || 0;
           const my = e.movementY || 0;
           const panSpeed = editorCameraZoom * 0.003;
           editorCameraTargetRef.current.x -= (Math.cos(editorCameraYaw) * mx + Math.sin(editorCameraYaw) * my) * panSpeed;
           editorCameraTargetRef.current.z -= (-Math.sin(editorCameraYaw) * mx + Math.cos(editorCameraYaw) * my) * panSpeed;
`;
code = code.replace(oldPanMouse, newPanMouse);

// 5. Add UI buttons
const oldUI = `
             <div className="flex gap-2">
                 <button onClick={() => setEditorTool('raise')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'raise' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Raise</button>
                 <button onClick={() => setEditorTool('lower')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'lower' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Lower</button>
                 <button onClick={() => setEditorTool('flatten')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'flatten' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Flat</button>
             </div>
`;

const newUI = `
             <div className="flex gap-2">
                 <button onClick={() => setEditorTool('raise')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'raise' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Raise</button>
                 <button onClick={() => setEditorTool('lower')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'lower' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Lower</button>
                 <button onClick={() => setEditorTool('flatten')} className={\`flex-1 py-1 rounded text-xs font-mono \${editorTool === 'flatten' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-400 hover:bg-gray-700'}\`}>Flat</button>
             </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <label className="text-amber-300 font-mono text-xs">Camera Rotation</label>
             <div className="flex gap-2">
                 <button onPointerDown={() => window.dispatchEvent(new CustomEvent('editorRotate', {detail: Math.PI/8}))} className="flex-1 py-2 bg-gray-800 text-amber-400 hover:bg-gray-700 rounded text-lg">↶</button>
                 <button onPointerDown={() => window.dispatchEvent(new CustomEvent('editorRotate', {detail: -Math.PI/8}))} className="flex-1 py-2 bg-gray-800 text-amber-400 hover:bg-gray-700 rounded text-lg">↷</button>
             </div>
`;
code = code.replace(oldUI, newUI);

// 6. Add event listener for editorRotate
const eventListenerHook = `
    const onContextMenu = (e: MouseEvent) => {
        if (isEditorModeRef.current) {
            e.preventDefault();
        }
    };
`;
const newEventListenerHook = `
    const onEditorRotate = (e: any) => {
        editorCameraYaw += (e as CustomEvent).detail;
    };
    window.addEventListener('editorRotate', onEditorRotate);
    
    const onContextMenu = (e: MouseEvent) => {
        if (isEditorModeRef.current) {
            e.preventDefault();
        }
    };
`;
code = code.replace(eventListenerHook, newEventListenerHook);

const removeHook = `
      window.removeEventListener('mouseup', onWindowMouseUp);
`;
const newRemoveHook = `
      window.removeEventListener('editorRotate', onEditorRotate);
      window.removeEventListener('mouseup', onWindowMouseUp);
`;
code = code.replace(removeHook, newRemoveHook);

fs.writeFileSync('src/App.tsx', code);
