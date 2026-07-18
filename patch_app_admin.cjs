const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `const [devEditSecret, setDevEditSecret] = useState<string>('');`;
const replace1 = `const [devEditSecret, setDevEditSecret] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);`;
code = code.replace(target1, replace1);

const target2 = `    networkManager.onTerrainEdit = (edits) => {`;
const replace2 = `    networkManager.onAdminStatus = (status) => {
      setIsAdmin(status);
    };
    networkManager.onTerrainEdit = (edits) => {`;
code = code.replace(target2, replace2);

const target3 = `        <button
          onClick={() => {
              if (isEditorMode) {`;
const replace3 = `        {(isAdmin || devEditSecret) && (
        <button
          onClick={() => {
              if (isEditorMode) {`;
              
const target4 = `          MAP EDITOR
        </button>
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`;
const replace4 = `          MAP EDITOR
        </button>
        )}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`;
code = code.replace(target3, replace3);
code = code.replace(target4, replace4);

fs.writeFileSync('src/App.tsx', code);
