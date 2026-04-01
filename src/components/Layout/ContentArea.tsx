import React from 'react';
import GroupView from '../GroupView';
import TodoPage from '../../views/ai/TodoPage';
import FileReadPage from '../../views/ai/FileReadPage';
import FakeDataPage from '../../views/ai/FakeDataPage';
import PromptsPage from '../../views/ai/PromptsPage';
import AviatorPage from '../../views/expression/AviatorPage';
import CronPage from '../../views/expression/CronPage';
import RegexPage from '../../views/expression/RegexPage';
import JsonPage from '../../views/format/JsonPage';
import XmlPage from '../../views/format/XmlPage';
import TextComparePage from '../../views/format/TextComparePage';
import UuidPage from '../../views/tools/UuidPage';
import CryptoPage from '../../views/tools/CryptoPage';
import TemplatePage from '../../views/tools/TemplatePage';
import NotesPage from '../../views/data/NotesPage';
import PasswordsPage from '../../views/data/PasswordsPage';
import SettingsPage from '../../views/settings/SettingsPage';

interface ContentAreaProps {
  currentGroup: string;
  currentPage: string | null;
  onPageChange: (page: string) => void;
  onBack: () => void;
}

const pageComponents: Record<string, React.FC<{ onBack: () => void }>> = {
  'settings': SettingsPage,
  'todo': TodoPage,
  'file-read': FileReadPage,
  'fake-data': FakeDataPage,
  'prompts': PromptsPage,
  'aviator': AviatorPage,
  'cron': CronPage,
  'regex': RegexPage,
  'json': JsonPage,
  'xml': XmlPage,
  'diff': TextComparePage,
  'uuid': UuidPage,
  'crypto': CryptoPage,
  'template': TemplatePage,
  'notes': NotesPage,
  'passwords': PasswordsPage
};

const ContentArea: React.FC<ContentAreaProps> = ({ currentGroup, currentPage, onPageChange, onBack }) => {
  if (currentPage && pageComponents[currentPage]) {
    const PageComponent = pageComponents[currentPage];
    return <PageComponent onBack={onBack} />;
  }

  return <GroupView group={currentGroup} onPageChange={onPageChange} />;
};

export default ContentArea;