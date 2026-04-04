import React from 'react';
import { Bot, Code2, AlignLeft, Wrench, Database, Settings, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentGroup: string;
  onGroupChange: (group: string) => void;
  onSettingsClick: () => void;
  onAssistantClick: () => void;
}

const groups = [
  { id: 'ai', icon: Bot, name: 'AI' },
  { id: 'expr', icon: Code2, name: '表达式' },
  { id: 'fmt', icon: AlignLeft, name: '格式化' },
  { id: 'tools', icon: Wrench, name: '工具' },
  { id: 'data', icon: Database, name: '数据' }
];

const Sidebar: React.FC<SidebarProps> = ({ currentGroup, onGroupChange, onSettingsClick, onAssistantClick }) => {
  return (
    <nav style={{
      width: 80,
      background: '#F9FAFB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      gap: 8,
      borderRight: '1px solid #E5E7EB'
    }}>
      {/* 智能助手入口 */}
      <button
        onClick={onAssistantClick}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          transition: 'all 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        }}
      >
        <Sparkles size={20} color="#FFFFFF" />
        <span style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 600 }}>助手</span>
      </button>

      <div style={{ width: 32, height: 1, background: '#E5E7EB', margin: '4px 0' }} />

      {groups.map(g => {
        const isActive = currentGroup === g.id;
        return (
          <button
            key={g.id}
            onClick={() => onGroupChange(g.id)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              background: isActive ? '#EFF6FF' : 'transparent',
              border: `2px solid ${isActive ? '#3B82F6' : 'transparent'}`,
              transition: 'all 150ms ease'
            }}
          >
            <g.icon size={20} color={isActive ? '#3B82F6' : '#6B7280'} />
            <span style={{
              fontSize: 12,
              color: isActive ? '#3B82F6' : '#6B7280',
              fontWeight: 500
            }}>
              {g.name}
            </span>
          </button>
        );
      })}

      <div style={{ width: 32, height: 1, background: '#E5E7EB', margin: 8 }} />

      <button
        onClick={onSettingsClick}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          background: 'transparent',
          border: '2px solid transparent',
          transition: 'all 150ms ease'
        }}
      >
        <Settings size={20} color="#6B7280" />
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>设置</span>
      </button>
    </nav>
  );
};

export default Sidebar;