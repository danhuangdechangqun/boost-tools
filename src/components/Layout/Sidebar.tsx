import React from 'react';
import { Bot, Code2, AlignLeft, Wrench, Database, Settings } from 'lucide-react';

interface SidebarProps {
  currentGroup: string;
  onGroupChange: (group: string) => void;
  onSettingsClick: () => void;
}

const groups = [
  { id: 'ai', icon: Bot, name: 'AI' },
  { id: 'expr', icon: Code2, name: '表达式' },
  { id: 'fmt', icon: AlignLeft, name: '格式化' },
  { id: 'tools', icon: Wrench, name: '工具' },
  { id: 'data', icon: Database, name: '数据' }
];

const Sidebar: React.FC<SidebarProps> = ({ currentGroup, onGroupChange, onSettingsClick }) => {
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