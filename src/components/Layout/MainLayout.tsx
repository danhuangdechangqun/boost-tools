import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';

const MainLayout: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState('ai');
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        currentGroup={currentGroup}
        onGroupChange={(group) => {
          setCurrentGroup(group);
          setCurrentPage(null);
        }}
        onSettingsClick={() => setCurrentPage('settings')}
      />
      <ContentArea
        currentGroup={currentGroup}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onBack={() => setCurrentPage(null)}
      />
    </div>
  );
};

export default MainLayout;