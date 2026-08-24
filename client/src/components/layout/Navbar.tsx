import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

export function Navbar() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/rooms" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-glow">
            LH
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Live<span className="text-indigo-400">Hub</span>
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
              <Avatar name={user.name} src={user.profileImage ?? undefined} size="sm" online />
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-200 sm:block">
                {user.name}
              </span>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
