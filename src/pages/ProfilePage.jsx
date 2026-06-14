import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaBell, FaCog, FaLock, FaSignOutAlt, FaChevronRight
} from 'react-icons/fa';

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition active:scale-98 hover:bg-gray-50 ${danger ? 'border border-red-100' : ''}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
      <span className={`flex-1 text-left font-semibold ${danger ? 'text-red-600' : 'text-gray-800'}`}>{label}</span>
      <FaChevronRight className="text-gray-400" />
    </button>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Member';

  return (
    <div className="min-h-screen bg-gray-50 pb-32 sm:pb-8">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4 space-y-4">

        {/* Avatar card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#2d5a56] text-4xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'User'}</h2>
          <p className="mt-1 text-gray-500">{user?.email}</p>
          <span className="mt-3 inline-block rounded-full bg-[#e7f3ef] px-4 py-1 text-sm font-semibold text-[#234946]">
            {roleLabel}
          </span>
        </div>

        {/* Menu items */}
        <div className="space-y-2">
          <MenuItem
            icon={<FaUser />}
            label="Edit Profile"
            onClick={() => {}}
          />
          <MenuItem
            icon={<FaBell />}
            label="Notifications"
            onClick={() => {}}
          />
          <MenuItem
            icon={<FaCog />}
            label="Settings"
            onClick={() => {}}
          />
          <MenuItem
            icon={<FaLock />}
            label="Privacy"
            onClick={() => {}}
          />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 py-4 font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-98"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );
}
