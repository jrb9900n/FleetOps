import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset browser defaults
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f9fafb; color: #111827; }
  input, select, textarea, button { font-family: inherit; }
  input:focus, select:focus, textarea:focus { border-color: #f97316 !important; outline: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App/></React.StrictMode>);
