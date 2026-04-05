import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import SmartAssistant from '../SmartAssistant';
import { initStorage, initLLM } from '@/services/api';

const MainLayout: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState('ai');
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initStorage();
      await initLLM();
      setInitialized(true);
    };
    init();
  }, []);

  // 监听托盘打开设置事件
  useEffect(() => {
    const unlisten = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        return win.listen('open-settings', () => {
          setCurrentPage('settings');
        });
      } catch {
        // 非 Tauri 环境
      }
    };

    let cleanup: (() => void) | undefined;
    unlisten().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  if (!initialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        currentGroup={currentGroup}
        onGroupChange={(group) => {
          setCurrentGroup(group);
          setCurrentPage(null);
        }}
        onSettingsClick={() => setCurrentPage('settings')}
        onAssistantClick={() => setAssistantOpen(!assistantOpen)}
        assistantOpen={assistantOpen}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ContentArea
          currentGroup={currentGroup}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onBack={() => setCurrentPage(null)}
        />
      </div>

      {/* 智能助手弹窗 */}
      {assistantOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 1000,
          height: '100vh'
        }}>
          <SmartAssistant
            onNavigate={(page) => {
              setCurrentPage(page);
              setAssistantOpen(false);
            }}
            onClose={() => setAssistantOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MainLayout;