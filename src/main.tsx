import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const isMac = /Mac/i.test(navigator.userAgent);
if (isMac) {
  document.body.classList.add('is-mac');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
