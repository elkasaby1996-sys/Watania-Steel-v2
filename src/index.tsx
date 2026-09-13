import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './workspace.css';
import './mobile.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
