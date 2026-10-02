import { AiChatView } from '@/features/ai-chat/AiChatView';
import { SharePanel } from '@/features/share/SharePanel';

type SidePanelTab = 'ai-chat' | 'share';

type SidePanelContentProps = {
  activeTab: SidePanelTab;
};

export const SidePanelContent = ({ activeTab }: SidePanelContentProps) => {
  if (activeTab === 'ai-chat') {
    return <AiChatView compact />;
  }

  return <SharePanel />;
};

export type { SidePanelTab };
