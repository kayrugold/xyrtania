
window.addEventListener('error', (e) => {
  fetch('/api/log_error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: e.message, filename: e.filename, lineno: e.lineno, type: 'error' }) }).catch(()=>console.log('failed'));
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('/api/log_error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: e.reason ? (e.reason.message || e.reason.toString()) : 'Unknown', type: 'unhandledrejection' }) }).catch(()=>console.log('failed'));
});

window.addEventListener('unhandledrejection', (e) => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.zIndex = '9999';
  div.style.top = '0';
  div.style.left = '0';
  div.style.backgroundColor = 'orange';
  div.style.color = 'black';
  div.style.padding = '10px';
  div.innerHTML = 'Promise: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown');
  document.body.appendChild(div);
});

window.addEventListener('error', (e) => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.zIndex = '9999';
  div.style.top = '0';
  div.style.left = '0';
  div.style.backgroundColor = 'red';
  div.style.color = 'white';
  div.style.padding = '10px';
  div.innerHTML = e.message + '<br>' + e.filename + ':' + e.lineno;
  document.body.appendChild(div);
});
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known THREE.js FBXLoader warnings that do not affect functionality
const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  if (typeof args[0] === 'string' && args[0].includes('THREE.FBXLoader:')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
