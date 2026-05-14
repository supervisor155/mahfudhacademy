import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-2xl text-gray-700 mb-2">Page Not Found</p>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mx-auto transition"
        >
          <FaHome /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}
