import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { setUnauthenticated } from '@/features/auth/authSlice';
import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';

type ShareState = {
  /** Space currently selected on Home; drives the side panel Share tab. */
  activeSpace: WorkspaceSpace | null;
};

const initialState: ShareState = {
  activeSpace: null,
};

const shareSlice = createSlice({
  name: 'share',
  initialState,
  reducers: {
    setShareSpace(state, action: PayloadAction<WorkspaceSpace | null>) {
      state.activeSpace = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setUnauthenticated, () => initialState);
  },
});

export const { setShareSpace } = shareSlice.actions;
export const shareReducer = shareSlice.reducer;
