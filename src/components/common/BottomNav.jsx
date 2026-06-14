import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaBook, FaComments, FaUser, FaBars } from 'react-icons/fa';

const NAV_ITEMS = [
  { icon: FaHome, label: 'Home', path: '/dashboard' },
  { icon: FaBook, label: 'Classes', path: '/classes' },
  { icon: FaComments, label: 'Messages', path: '/messages' },
  { icon: FaUser, label: 'Profile', path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white sm:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = pathname === path || pathname.startsWith(path + '/');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active ? 'text-[#2d5a56]' : 'text-gray-400'
              }`}
            >
              <Icon className={`text-xl ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-semibold ${active ? 'font-bold' : ''}`}>{label}</span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[#2d5a56]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
