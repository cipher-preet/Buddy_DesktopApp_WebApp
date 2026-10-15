import { AiChatView } from '@/features/ai-chat/AiChatView';
import { SharePanel } from '@/features/share/SharePanel';

type SidePanelTab = 'ai-chat' | 'share';

type SidePanelContentProps = {
  activeTab: SidePanelTab;
  /** Defer chat/spaces API until the side panel is open. */
  queriesEnabled?: boolean;
};

export const SidePanelContent = ({
  activeTab,
  queriesEnabled = true,
}: SidePanelContentProps) => {
  if (activeTab === 'ai-chat') {
    return <AiChatView compact queriesEnabled={queriesEnabled} />;
  }

  return <SharePanel />;
};

export type { SidePanelTab };
