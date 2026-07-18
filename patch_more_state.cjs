const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [torsoVisible, setTorsoVisible] = useState<boolean>(true);
  const [morphTargets, setMorphTargets] = useState<Record<string, number>>({});
  const [headStyle, setHeadStyle] = useState<number>(0);
  const [uploadedHeadName, setUploadedHeadName] = useState<string | null>(null);
  const [uploadedCharName, setUploadedCharName] = useState<string | null>(null);`;

const replace = `  const [torsoVisible, setTorsoVisible] = useState<boolean>(() => localStorage.getItem('xy_torsoVisible') !== 'false');
  const [morphTargets, setMorphTargets] = useState<Record<string, number>>(() => JSON.parse(localStorage.getItem('xy_morphTargets') || '{}'));
  const [headStyle, setHeadStyle] = useState<number>(() => parseInt(localStorage.getItem('xy_headStyle') || '0'));
  const [uploadedHeadName, setUploadedHeadName] = useState<string | null>(() => localStorage.getItem('xy_uploadedHeadName'));
  const [uploadedCharName, setUploadedCharName] = useState<string | null>(() => localStorage.getItem('xy_uploadedCharName'));

  useEffect(() => {
    localStorage.setItem('xy_torsoVisible', torsoVisible.toString());
    localStorage.setItem('xy_morphTargets', JSON.stringify(morphTargets));
    localStorage.setItem('xy_headStyle', headStyle.toString());
    if (uploadedHeadName) localStorage.setItem('xy_uploadedHeadName', uploadedHeadName);
    else localStorage.removeItem('xy_uploadedHeadName');
    if (uploadedCharName) localStorage.setItem('xy_uploadedCharName', uploadedCharName);
    else localStorage.removeItem('xy_uploadedCharName');
  }, [torsoVisible, morphTargets, headStyle, uploadedHeadName, uploadedCharName]);`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
