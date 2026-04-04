// 智能助手主入口

import React from 'react';
import { Bot, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

interface SmartAssistantProps {
  onNavigate: (page: string) => void;
  onClose: () => void;
  knowledgeBaseReady?: boolean;
}

const SmartAssistant: React.FC<SmartAssistantProps> = ({
  onNavigate,
  onClose,
  knowledgeBaseReady = false
}) => {
  const handleNavigate = (page: string) => {
    onNavigate(page);
  };

  return (
    <ChatWindow
      onClose={onClose}
      onNavigate={handleNavigate}
      knowledgeBaseReady={knowledgeBaseReady}
    />
  );
};

export default SmartAssistant;