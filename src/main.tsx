
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('Offset is outside the bounds') || msg.includes('Failed to load') || msg.includes('Unexpected token') || msg.includes('draco') || msg.includes('DRACO')) {
    e.preventDefault();
    return;
  }
  fetch('/api/log_error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: e.message, filename: e.filename, lineno: e.lineno, type: 'error' }) }).catch(()=>console.log('failed'));
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason ? (e.reason.message || e.reason.toString()) : 'Unknown';
  if (msg.includes('WebSocket closed') || msg.includes('Offset is outside the bounds') || msg.includes('Failed to load') || msg.includes('Unexpected token') || msg.includes('Failed to fetch')) { e.preventDefault(); return; }
  fetch('/api/log_error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, type: 'unhandledrejection' }) }).catch(()=>console.log('failed'));
});

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import * as THREE from 'three';

import './index.css';

// Suppress known THREE.js FBXLoader warnings that do not affect functionality
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.map(a => String(a?.message || a?.reason?.message || a)).join(' ');
  if (msg.includes('Offset is outside the bounds') || msg.includes('Failed to load') || msg.includes('DataView') || msg.includes('draco') || msg.includes('DRACO')) {
    return;
  }
  originalConsoleError.apply(console, args);
};
const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  if (typeof args[0] === 'string' && args[0].includes('THREE.FBXLoader:')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// We patch THREE.ImageLoader to never set crossOrigin for blob: URLs.
// Setting crossOrigin on blob URLs causes modern browsers to reject loading them inside iframe contexts.
if (THREE.ImageLoader && THREE.ImageLoader.prototype) {
  const originalLoad = THREE.ImageLoader.prototype.load;
  THREE.ImageLoader.prototype.load = function (url: string, onLoad?: any, onProgress?: any, onError?: any) {
    if (url && url.startsWith('blob:')) {
      const originalCrossOrigin = this.crossOrigin;
      this.crossOrigin = undefined;
      const result = originalLoad.call(this, url, onLoad, onProgress, onError);
      this.crossOrigin = originalCrossOrigin;
      return result;
    }
    return originalLoad.call(this, url, onLoad, onProgress, onError);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
