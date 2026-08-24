import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface UiState {
  toasts: Toast[];
}

const initialState: UiState = { toasts: [] };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    pushToast(state, action: PayloadAction<{ type: ToastType; message: string }>) {
      state.toasts.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: action.payload.type,
        message: action.payload.message
      });
      if (state.toasts.length > 4) state.toasts.shift();
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    }
  }
});

export const { pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
