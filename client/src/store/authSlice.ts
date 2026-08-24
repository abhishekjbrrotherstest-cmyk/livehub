import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api';
import type { AuthData, User } from '../types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  bootstrapped: boolean;
  error: string | null;
}

interface Credentials {
  email: string;
  password: string;
}

interface RegisterPayload extends Credentials {
  name: string;
}

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  status: getStoredToken() ? 'loading' : 'idle',
  bootstrapped: false,
  error: null
};

export const loginUser = createAsyncThunk<AuthData, Credentials, { rejectValue: string }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api<AuthData>('/auth/login', { method: 'POST', body: { email, password } });
      return res.data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk<AuthData, RegisterPayload, { rejectValue: string }>(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await api<AuthData>('/auth/register', { method: 'POST', body: { name, email, password } });
      return res.data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Registration failed');
    }
  }
);

export const bootstrapAuth = createAsyncThunk<User | null>('auth/bootstrap', async () => {
  const token = getStoredToken();
  if (!token) return null;
  const res = await api<User>('/users/me');
  return res.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      clearStoredToken();
    },
    clearAuthError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthData>) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.token = action.payload.token;
        setStoredToken(action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Login failed';
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthData>) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.token = action.payload.token;
        setStoredToken(action.payload.token);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Registration failed';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action: PayloadAction<User | null>) => {
        state.bootstrapped = true;
        if (action.payload) {
          state.user = action.payload;
          state.status = 'authenticated';
        } else if (!state.token) {
          state.status = 'idle';
        }
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.bootstrapped = true;
        state.user = null;
        state.token = null;
        state.status = 'idle';
        clearStoredToken();
      });
  }
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
