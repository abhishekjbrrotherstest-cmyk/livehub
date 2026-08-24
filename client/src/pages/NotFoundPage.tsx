import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-7xl font-black text-transparent">
        404
      </p>
      <h1 className="mt-3 text-xl font-bold text-white">Page not found</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">The page you are looking for does not exist.</p>
      <Link to="/rooms">
        <Button variant="secondary">← Back to rooms</Button>
      </Link>
    </div>
  );
}
