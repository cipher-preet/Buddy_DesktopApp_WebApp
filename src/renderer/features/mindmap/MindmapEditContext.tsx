import { createContext, useContext, type ReactNode } from 'react';

export type MindmapEditContextValue = {
  mindmapId: string | null;
  removeNode: (nodeId: string) => Promise<void>;
};

const MindmapEditContext = createContext<MindmapEditContextValue>({
  mindmapId: null,
  removeNode: async () => {
    throw new Error('Mind map editor is not ready.');
  },
});

export const MindmapEditProvider = ({
  value,
  children,
}: {
  value: MindmapEditContextValue;
  children: ReactNode;
}) => <MindmapEditContext.Provider value={value}>{children}</MindmapEditContext.Provider>;

export const useMindmapEdit = () => useContext(MindmapEditContext);
