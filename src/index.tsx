import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    document.documentElement.classList.toggle('light', savedTheme === 'light');
    return;
  }

  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.classList.toggle('light', prefersLight);
  localStorage.setItem('theme', prefersLight ? 'light' : 'dark');
};

initializeTheme();

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
