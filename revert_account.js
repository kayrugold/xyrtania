const fs = require('fs');
let code = fs.readFileSync('src/components/AccountUI.tsx', 'utf8');

const target = `<div className="flex flex-col gap-1">
                      <button`;

const replace = `<div className="flex flex-col gap-1">
                      <button
                        onClick={() => onChangeConnectionMode?.('colyseus_render')}
                        className={\`w-full py-1 px-2 rounded text-[10px] font-bold border transition-all cursor-pointer text-left flex justify-between items-center \${
                          connectionMode === 'colyseus_render'
                            ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                            : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
                        }\`}
                      >
                        <span>Render Production Server</span>
                        <span className="text-[9px] font-mono opacity-80">Render</span>
                      </button>
                      <button`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/AccountUI.tsx', code);
