const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [customScale, setCustomScale] = useState<number>(1.0);
  const [customWidth, setCustomWidth] = useState<number>(1.0);
  const [customHeight, setCustomHeight] = useState<number>(1.0);
  const [customDepth, setCustomDepth] = useState<number>(1.0);
  const [customMetalness, setCustomMetalness] = useState<number>(0.0);
  const [customRoughness, setCustomRoughness] = useState<number>(0.8);
  const [customHeadScale, setCustomHeadScale] = useState<number>(1.0);
  const [customLegLength, setCustomLegLength] = useState<number>(1.0);
  const [customArmLength, setCustomArmLength] = useState<number>(1.0);
  const [customTorsoThickness, setCustomTorsoThickness] = useState<number>(1.0);
  const [glowIntensity, setGlowIntensity] = useState<number>(0.0);
  const [glowColor, setGlowColor] = useState<string>('#00ffff');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [hologram, setHologram] = useState<boolean>(false);`;

const replace = `  const [customColor, setCustomColor] = useState<string>(() => localStorage.getItem('xy_customColor') || '#ffffff');
  const [customScale, setCustomScale] = useState<number>(() => parseFloat(localStorage.getItem('xy_customScale') || '1.0'));
  const [customWidth, setCustomWidth] = useState<number>(() => parseFloat(localStorage.getItem('xy_customWidth') || '1.0'));
  const [customHeight, setCustomHeight] = useState<number>(() => parseFloat(localStorage.getItem('xy_customHeight') || '1.0'));
  const [customDepth, setCustomDepth] = useState<number>(() => parseFloat(localStorage.getItem('xy_customDepth') || '1.0'));
  const [customMetalness, setCustomMetalness] = useState<number>(() => parseFloat(localStorage.getItem('xy_customMetalness') || '0.0'));
  const [customRoughness, setCustomRoughness] = useState<number>(() => parseFloat(localStorage.getItem('xy_customRoughness') || '0.8'));
  const [customHeadScale, setCustomHeadScale] = useState<number>(() => parseFloat(localStorage.getItem('xy_customHeadScale') || '1.0'));
  const [customLegLength, setCustomLegLength] = useState<number>(() => parseFloat(localStorage.getItem('xy_customLegLength') || '1.0'));
  const [customArmLength, setCustomArmLength] = useState<number>(() => parseFloat(localStorage.getItem('xy_customArmLength') || '1.0'));
  const [customTorsoThickness, setCustomTorsoThickness] = useState<number>(() => parseFloat(localStorage.getItem('xy_customTorsoThickness') || '1.0'));
  const [glowIntensity, setGlowIntensity] = useState<number>(() => parseFloat(localStorage.getItem('xy_glowIntensity') || '0.0'));
  const [glowColor, setGlowColor] = useState<string>(() => localStorage.getItem('xy_glowColor') || '#00ffff');
  const [wireframe, setWireframe] = useState<boolean>(() => localStorage.getItem('xy_wireframe') === 'true');
  const [hologram, setHologram] = useState<boolean>(() => localStorage.getItem('xy_hologram') === 'true');

  useEffect(() => {
    localStorage.setItem('xy_customColor', customColor);
    localStorage.setItem('xy_customScale', customScale.toString());
    localStorage.setItem('xy_customWidth', customWidth.toString());
    localStorage.setItem('xy_customHeight', customHeight.toString());
    localStorage.setItem('xy_customDepth', customDepth.toString());
    localStorage.setItem('xy_customMetalness', customMetalness.toString());
    localStorage.setItem('xy_customRoughness', customRoughness.toString());
    localStorage.setItem('xy_customHeadScale', customHeadScale.toString());
    localStorage.setItem('xy_customLegLength', customLegLength.toString());
    localStorage.setItem('xy_customArmLength', customArmLength.toString());
    localStorage.setItem('xy_customTorsoThickness', customTorsoThickness.toString());
    localStorage.setItem('xy_glowIntensity', glowIntensity.toString());
    localStorage.setItem('xy_glowColor', glowColor);
    localStorage.setItem('xy_wireframe', wireframe.toString());
    localStorage.setItem('xy_hologram', hologram.toString());
  }, [customColor, customScale, customWidth, customHeight, customDepth, customMetalness, customRoughness, customHeadScale, customLegLength, customArmLength, customTorsoThickness, glowIntensity, glowColor, wireframe, hologram]);`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
