import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/common/Toasts';
import { Navbar } from './components/layout/Navbar';
import { useAppSocket } from './hooks/useAppSocket';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomPage } from './pages/RoomPage';
import { RoomsPage } from './pages/RoomsPage';
import { bootstrapAuth } from './store/authSlice';
import { store } from './store';
import { useAppDispatch } from './store/hooks';

function AppShell() {
  const dispatch = useAppDispatch();
  useAppSocket();

  useEffect(() => {
    void dispatch(bootstrapAuth());
  }, [dispatch]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-6">
        <Routes>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoomsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </Provider>
  );
}
