import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace("const [health, setHealth] = useState(100);", "");
app = app.replace("const [stamina, setStamina] = useState(100);", "");
app = app.replace("const [jumpPhase, setJumpPhase] = useState<JumpPhase>(JumpPhase.IDLE);", "");

fs.writeFileSync('src/App.tsx', app);
