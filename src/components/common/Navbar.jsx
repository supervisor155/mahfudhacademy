import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-full px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <img src="/logo.svg" alt="Mahfudh Academy" className="w-8 h-8 sm:w-10 sm:h-10" />
          <span className="font-bold text-xl hidden sm:inline">Mahfudh Academy</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3">
            <FaUser className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-blue-100 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition"
          >
            <FaSignOutAlt size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
