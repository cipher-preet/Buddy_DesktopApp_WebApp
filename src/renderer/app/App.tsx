import { useState } from 'react';
import { FiGrid, FiHome, FiSettings } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

import { AppLayout } from '@/components/layout/AppLayout';
import { AiChatPage } from '@/features/ai-chat/AiChatPage';
import { AuthPage } from '@/features/auth/AuthPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

type AppRoute = 'auth' | 'home' | 'ai-chat' | 'integrations' | 'settings';

export const App = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>('auth');

  const navigationItems = [
    { label: 'Home', icon: FiHome, isActive: activeRoute === 'home', onSelect: () => setActiveRoute('home') },
    {
      label: 'AI Chat',
      icon: RiRobot2Line,
      isActive: activeRoute === 'ai-chat',
      onSelect: () => setActiveRoute('ai-chat'),
    },
    {
      label: 'Integrations',
      icon: FiGrid,
      isActive: activeRoute === 'integrations',
      onSelect: () => setActiveRoute('integrations'),
    },
    {
      label: 'Settings',
      icon: FiSettings,
      isActive: activeRoute === 'settings',
      onSelect: () => setActiveRoute('settings'),
    },
  ];

  const page = {
    auth: <AuthPage onContinue={() => setActiveRoute('home')} />,
    home: <DashboardPage />,
    'ai-chat': <AiChatPage />,
    integrations: <IntegrationsPage />,
    settings: <SettingsPage onNavigateHome={() => setActiveRoute('home')} />,
  }[activeRoute];

  if (activeRoute === 'auth') {
    return page;
  }

  return (
    <AppLayout navigationItems={navigationItems} viewMode={activeRoute === 'ai-chat' ? 'chat' : 'default'}>
      {page}
    </AppLayout>
  );
};
