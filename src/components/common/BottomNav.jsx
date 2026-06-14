import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaBook, FaComments, FaUser } from 'react-icons/fa';

const NAV_ITEMS = [
  { icon: FaHome,     label: 'Home',     path: '/dashboard' },
  { icon: FaBook,     label: 'Classes',  path: '/dashboard', tab: 'classes' },
  { icon: FaComments, label: 'Messages', path: '/chat' },
  { icon: FaUser,     label: 'Profile',  path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNav = (item) => {
    if (item.tab) {
      // dashboard pages with internal tabs: go to dashboard and let it handle tab
      navigate(item.path);
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white sm:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const { icon: Icon, label, path } = item;
          const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
          return (
            <button
              key={label}
              onClick={() => handleNav(item)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active ? 'text-[#2d5a56]' : 'text-gray-400'
              }`}
            >
              <Icon className={`text-xl transition-transform ${active ? 'scale-110' : ''}`} />
              <span className={`text-xs ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
