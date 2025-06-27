import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import Catalog from './components/Catalog';
import AdminPanel from './components/AdminPanel';
import './App.css';

// Telegram Web App инициализация
const initTelegramApp = () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Устанавливаем тему
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f1f1f1');
    
    return tg;
  }
  return null;
};

function App() {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const telegramApp = initTelegramApp();
    setTg(telegramApp);
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/catalog" element={<Catalog tg={tg} />} />
          <Route path="/admin" element={<AdminPanel tg={tg} />} />
          <Route path="/" element={<Catalog tg={tg} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 