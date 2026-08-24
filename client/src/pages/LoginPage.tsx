import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthError, loginUser } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function LoginPage() {
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/rooms';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(loginUser({ email: email.trim(), password }))
      .unwrap()
      .then(() => navigate(from, { replace: true }));
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full animate-slideUp rounded-2xl border border-white/10 bg-surface-raised p-8 shadow-card">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-glow">
            LH
          </span>
          <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to join live rooms</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" fullWidth loading={status === 'loading'}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-indigo-400 transition hover:text-indigo-300">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
