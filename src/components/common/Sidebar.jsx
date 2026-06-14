import { useNavigate } from 'react-router-dom';
import { FaHome, FaBook, FaUsers, FaCog, FaSignOutAlt, FaVideo } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="w-20 bg-white border-r border-gray-200 h-screen flex flex-col items-center py-6 shadow-sm space-y-4 sticky top-0 overflow-y-auto shrink-0">
      {/* Dashboard */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-blue-600 transition"
        title="Dashboard"
      >
        <FaHome size={20} />
      </button>

      {/* Classes */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
        title="Classes"
      >
        <FaBook size={20} />
      </button>

      {/* Videos */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
        title="Videos"
      >
        <FaVideo size={20} />
      </button>

      {/* Smart Mushaf */}
      <button
        onClick={() => navigate('/mushaf')}
        className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
        title="Smart Mushaf"
      >
        
      </button>

      {/* Admin/Manager - only show for appropriate roles */}
      {(user.role === 'owner' || user.role === 'manager') && (
        <button
          onClick={() => navigate('/dashboard')}
          className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
          title="Users"
        >
          <FaUsers size={20} />
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Settings */}
      <button
        onClick={() => navigate('/settings')}
        className="w-14 h-14 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
        title="Settings"
      >
        <FaCog size={20} />
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-14 h-14 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-600 hover:text-red-600 transition"
        title="Logout"
      >
        <FaSignOutAlt size={20} />
      </button>
    </aside>
  );
}
