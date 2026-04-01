import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initStorage, initLLM, initHolidays } from './services/api';

// 初始化存储、LLM和节假日服务
initStorage().then(() => {
  initLLM();
  initHolidays();
});

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);