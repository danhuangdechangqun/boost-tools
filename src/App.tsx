import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/Layout/MainLayout';

const theme = {
  token: {
    colorPrimary: '#3B82F6',
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  }
};

const App: React.FC = () => {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <MainLayout />
    </ConfigProvider>
  );
};

export default App;