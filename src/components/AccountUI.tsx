import React, { useState, useEffect } from 'react';
import { useCryptoAuth } from '../auth/useCryptoAuth';
import { Settings, Copy, Check } from 'lucide-react';

export const AccountUI: React.FC = () => {
  const { session, displayName, isSyncing, lastSyncTime, recover, createNew, resetLocal, updateCharacter } = useCryptoAuth();
  
  const [isRecovering, setIsRecovering] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [nameInput, setNameInput] = useState('');
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(() => {
    return localStorage.getItem('xyrtania_setup_complete') === 'true';
  });

  useEffect(() => {
    if (!isSetupComplete) {
      setIsPanelOpen(true);
    }
    if (displayName && !nameInput) {
      setNameInput(displayName);
    }
  }, [isSetupComplete, displayName]);

  if (!session) {
    return null; 
  }

  const handleRecover = () => {
    if (recover(phraseInput)) {
      setIsRecovering(false);
      setPhraseInput('');
      setErrorMsg('');
      setHasCopied(false);
      setHasConfirmed(false);
      setIsSetupComplete(false);
      localStorage.removeItem('xyrtania_setup_complete');
    } else {
      setErrorMsg('Invalid 12-word passphrase.');
    }
  };

  const handleCreateNew = () => {
    createNew();
    setHasCopied(false);
    setHasConfirmed(false);
    setIsSetupComplete(false);
    setIsPanelOpen(true);
    localStorage.removeItem('xyrtania_setup_complete');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(session.mnemonic);
    setHasCopied(true);
  };

  const handleSyncAndStart = async () => {
    await updateCharacter({ displayName: nameInput, level: 1, gold: 0, currentChunk: '0,0' });
    if (!isSetupComplete) {
      localStorage.setItem('xyrtania_setup_complete', 'true');
      setIsSetupComplete(true);
      setIsPanelOpen(false); // Auto-hide
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto flex flex-col items-end gap-2">
      {/* Background Syncing Indicator HUD */}
      {isSyncing && (
        <div className="bg-emerald-900/80 border border-emerald-500 rounded px-3 py-1 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          <span className="text-emerald-100 text-xs font-mono">Syncing to Cloudflare D1...</span>
        </div>
      )}

      {/* Toggle Button for Returning Players */}
      {isSetupComplete && !isPanelOpen && (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPanelOpen(true)}
            className="bg-black/80 hover:bg-black p-2 rounded-full border border-gray-700 text-gray-400 hover:text-white transition-colors shadow-lg backdrop-blur-md"
            title="Account Settings"
          >
            <Settings size={20} />
          </button>
          
          {/* Debug / Status Indicator for Peers */}
          <div className="bg-black/60 px-3 py-1 rounded-full text-xs font-mono border border-emerald-900/50 backdrop-blur-sm text-emerald-400 flex items-center gap-1.5" title="Connected Peers">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Online
          </div>
        </div>
      )}

      {isPanelOpen && (
        <div className="bg-black/90 text-white p-4 sm:p-5 rounded shadow-2xl w-[90vw] sm:w-80 max-w-sm max-h-[85vh] overflow-y-auto text-sm font-mono border border-emerald-900/50 backdrop-blur-md scrollbar-thin scrollbar-thumb-gray-700">
          <div className="flex justify-between items-start mb-2 sm:mb-4 border-b border-gray-800 pb-2">
              <h2 className="text-emerald-400 font-bold">{isSetupComplete ? 'Account Settings' : 'Welcome to Xyrtania'}</h2>
              {isSetupComplete && (
                <button onClick={() => setIsPanelOpen(false)} className="text-gray-500 hover:text-white text-xs">
                  Close [X]
                </button>
              )}
          </div>
          
          <div className="mb-2 sm:mb-4">
            <p className="text-gray-400 text-xs mb-1">Player ID (Public):</p>
            <p className="truncate text-gray-200 select-all bg-gray-900 p-1 rounded font-mono text-[11px]" title={session.playerId}>
              {session.playerId.substring(0, 14)}...{session.playerId.slice(-10)}
            </p>
          </div>
          
          <div className="mb-2 sm:mb-4 relative">
            <p className="text-gray-400 text-xs mb-1">Display Name (Visible to others):</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={nameInput} 
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs w-full outline-none focus:border-emerald-500 transition-colors"
                placeholder="Enter name..."
              />
              {isSetupComplete && (
                <button 
                  onClick={handleSyncAndStart}
                  disabled={isSyncing || nameInput === displayName}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded px-3 py-1.5 text-xs whitespace-nowrap transition-colors"
                >
                  {isSyncing ? '...' : 'Update'}
                </button>
              )}
            </div>
          </div>

          {isRecovering ? (
            <div className="flex flex-col gap-2 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-800">
              <p className="text-xs text-yellow-500">Enter your 12-word recovery phrase:</p>
              <textarea
                className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-xs w-full h-16 sm:h-20 outline-none resize-none focus:border-blue-500"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="word word word..."
              />
              {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
              <div className="flex gap-2">
                <button onClick={handleRecover} className="bg-emerald-600 hover:bg-emerald-500 rounded px-2 py-1.5 flex-1 transition-colors">Recover</button>
                <button onClick={() => setIsRecovering(false)} className="bg-gray-700 hover:bg-gray-600 rounded px-2 py-1.5 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {!isSetupComplete ? (
                <div className="bg-gray-900 p-2 sm:p-3 rounded border border-yellow-900/50">
                  <p className="text-xs text-yellow-500 mb-1 sm:mb-2 font-bold">1. Backup Your Passphrase</p>
                  <p className="text-[10px] text-gray-400 mb-1 sm:mb-2 leading-tight">This is the ONLY way to recover your account if you clear your browser data or switch devices.</p>
                  
                  <div className="bg-black p-2 rounded relative group cursor-pointer border border-gray-800 mb-2">
                    <p className="text-[11px] text-emerald-200 select-all leading-relaxed font-bold tracking-wide">
                      {session.mnemonic}
                    </p>
                  </div>
                  
                  <button 
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 rounded py-1.5 text-xs text-white transition-colors mb-2"
                  >
                    {hasCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {hasCopied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>

                  <label className="flex items-start gap-2 cursor-pointer mt-2 sm:mt-3">
                    <input 
                      type="checkbox" 
                      checked={hasConfirmed}
                      onChange={(e) => setHasConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-[10px] text-gray-300 leading-tight">
                      I have securely written down or saved my 12-word passphrase.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-gray-900 p-2 sm:p-3 rounded relative group cursor-pointer border border-gray-800">
                    <span className="text-xs text-gray-500 absolute -top-2 left-2 bg-black px-1">12-Word Passphrase</span>
                    <p className="text-[11px] text-gray-400 select-all leading-relaxed blur-sm hover:blur-none transition-all duration-300">
                      {session.mnemonic}
                    </p>
                </div>
              )}
              
              {!isSetupComplete && (
                <button 
                  onClick={handleSyncAndStart}
                  disabled={!hasConfirmed || !nameInput || isSyncing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded py-1.5 sm:py-2 text-sm font-bold text-white shadow-lg transition-colors mt-1 sm:mt-2"
                >
                  {isSyncing ? 'Syncing...' : 'Start Game'}
                </button>
              )}

              <div className="flex justify-between gap-2 mt-1 sm:mt-2 border-t border-gray-800 pt-2 sm:pt-3">
                <button onClick={() => setIsRecovering(true)} className="bg-blue-900/30 hover:bg-blue-800/50 rounded px-2 py-1 text-[10px] text-blue-300 border border-blue-900/50 transition-colors">
                  Recover Device
                </button>
                <button onClick={handleCreateNew} className="bg-red-900/30 hover:bg-red-800/50 rounded px-2 py-1 text-[10px] text-red-300 border border-red-900/50 transition-colors" title="Generates a whole new ID">
                  New Identity
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
