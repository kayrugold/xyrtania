import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/const \[showDiagnostics, setShowDiagnostics\] = useState\(false\);/, "const [showDiagnostics, setShowDiagnostics] = useState(false);\n  const [hideCharacter, setHideCharacter] = useState(false);");

app = app.replace(/const localAnimatorRef = useRef<CharacterAnimator \| null>\(null\);/, "const localAnimatorRef = useRef<CharacterAnimator | null>(null);\n  const hideCharacterRef = useRef(false);\n  useEffect(() => { hideCharacterRef.current = hideCharacter; }, [hideCharacter]);");

const charUpdate = `
      // Update character logic
      if (localAnimatorRef.current) {
        localAnimatorRef.current.group.visible = !hideCharacterRef.current;
        if (!hideCharacterRef.current) {
          localAnimatorRef.current.update(state, dt);
        }
      }
`;
app = app.replace(/\/\/ Update character logic[\s\S]*?localAnimatorRef\.current\.update\(state, dt\);\n      \}/, charUpdate);

const uiCode = `
          <div className="flex justify-between"><span>Triangles:</span><span id="diag-triangles">0</span></div>
          <div className="flex justify-between"><span>CPU (ms):</span><span id="diag-cpu">0</span></div>
          <button 
            className="w-full mt-2 bg-red-900/50 hover:bg-red-700/50 text-xs py-1 rounded"
            onClick={() => setHideCharacter(!hideCharacter)}>
            {hideCharacter ? 'Show Character' : 'Hide Character'}
          </button>
        </div>
`;
app = app.replace(/<div className="flex justify-between"><span>Triangles:<\/span><span id="diag-triangles">0<\/span><\/div>\n          <div className="flex justify-between"><span>CPU \(ms\):<\/span><span id="diag-cpu">0<\/span><\/div>\n        <\/div>/, uiCode);

fs.writeFileSync('src/App.tsx', app);
