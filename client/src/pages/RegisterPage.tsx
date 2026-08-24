import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { clearAuthError, registerUser } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function RegisterPage() {
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (status === 'authenticated') return <Navigate to="/rooms" replace />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setClientError(null);
    if (name.trim().length < 2) {
      setClientError('Name must be at least 2 characters');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setClientError('Password needs 8+ characters with a letter and a number');
      return;
    }
    void dispatch(registerUser({ name: name.trim(), email: email.trim(), password }))
      .unwrap()
      .then(() => navigate('/rooms', { replace: true }));
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full animate-slideUp rounded-2xl border border-white/10 bg-surface-raised p-8 shadow-card">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-glow">
            LH
          </span>
          <h1 className="text-2xl font-extrabold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Start hosting in under a minute</p>
        </div>

        {(clientError || error) && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {clientError ?? error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            placeholder="Abhishek"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
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
            placeholder="8+ chars, letter + number"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <Button type="submit" fullWidth loading={status === 'loading'}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 transition hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
