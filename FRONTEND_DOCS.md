# Qur'an E-Learning Platform - Frontend Documentation

## 🎯 Project Overview

A production-ready, scalable React.js frontend for a Qur'an E-Learning platform with role-based dashboards, real-time features, offline-first capability, and Smart Muṣḥaf.

**Live Dev Server:** http://localhost:5175/

## 📋 Technology Stack

- **Framework:** React.js (Functional Components + Hooks)
- **Build Tool:** Vite v8.0.10
- **Styling:** Tailwind CSS v4 (CDN)
- **Routing:** React Router v6+
- **State Management:** React Context API
- **Offline Storage:** Dexie.js (IndexedDB)
- **API Client:** Axios
- **Real-Time:** Socket.io-client
- **Icons:** React Icons (FontAwesome, etc.)

## 🏗️ Project Structure

```
frontend/
├── public/
│   └── index.html                 # Tailwind CSS v4 CDN entry point
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx        # Authentication state management
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx          # Login page with API integration
│   │   │   └── Register.jsx       # Registration with role selection
│   │   ├── dashboard/
│   │   │   ├── StudentDashboard.jsx      # Student view (join classes, stats)
│   │   │   ├── TeacherDashboard.jsx      # Teacher view (create classes, upload)
│   │   │   ├── ManagerDashboard.jsx      # Manager view (system overview)
│   │   │   └── OwnerDashboard.jsx        # Owner view (full control)
│   │   ├── class/
│   │   │   ├── ClassHome.jsx      # Class overview with tabs
│   │   │   ├── Videos.jsx         # Video library
│   │   │   ├── Reels.jsx          # Short-form content
│   │   │   ├── LiveSessions.jsx   # Live streaming interface
│   │   │   └── Chat.jsx           # Real-time chat
│   │   ├── mushaf/
│   │   │   └── MushafPage.jsx     # Smart Muṣḥaf with notes/highlighting
│   │   └── NotFound.jsx           # 404 page
│   ├── components/
│   │   └── common/
│   │       ├── Navbar.jsx         # Top navigation bar
│   │       └── Sidebar.jsx        # Side navigation (icon-based)
│   ├── layouts/
│   │   └── DashboardLayout.jsx    # Main layout wrapper
│   ├── routes/
│   │   └── AppRouter.jsx          # Centralized routing with protected routes
│   ├── services/
│   │   └── api.js                 # Axios instance with auth headers
│   ├── db/
│   │   └── dexie.js               # IndexedDB setup for offline storage
│   ├── styles/
│   │   └── tailwind.css           # Tailwind directives
│   ├── App.jsx                    # Root component with AuthProvider
│   ├── App.css                    # Global styles
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Base styles
├── index.html                     # HTML template with Tailwind CDN
├── vite.config.js                 # Vite configuration
├── package.json                   # Dependencies
└── README.md                      # This file
```

## 🔑 Key Features

### Authentication System
- **Login/Register Pages** with email/password validation
- **Role Selection** (Student, Teacher, Manager, Owner)
- **JWT Token Management** with localStorage persistence
- **Protected Routes** with automatic redirects

### Role-Based Dashboards
1. **Student Dashboard**
   - View enrolled classes
   - Join classes with invite code
   - Stats: classes, videos watched, reels completed, learning hours

2. **Teacher Dashboard**
   - Create and manage classes
   - Upload videos and reels
   - View student enrollment

3. **Manager Dashboard**
   - System overview and analytics
   - Class and user management
   - Performance metrics

4. **Owner Dashboard**
   - Full system control
   - Revenue tracking
   - System health monitoring

### Class Navigation
- **Tab-based Interface** (Overview, Videos, Reels, Live, Chat)
- **Video Library** with progress tracking
- **Reels** (short-form vertical content)
- **Live Sessions** with join functionality
- **Real-Time Chat** with message history

### Smart Muṣḥaf
- Browse Qur'an Surahs
- Add and save personal notes
- Search notes by keyword
- Pin and archive important notes
- Share notes with classmates

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend API running on `http://localhost:4000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:4000
```

## 📡 API Integration

All API calls go through `src/services/api.js` (Axios instance with Bearer token):

```javascript
// Authentication
POST /api/auth/register
POST /api/auth/login

// Classes
GET /api/classes
POST /api/classes
GET /api/classes/:id
PATCH /api/classes/:id
DELETE /api/classes/:id
POST /api/classes/join

// Videos
GET /api/videos
POST /api/videos
GET /api/videos/:id
DELETE /api/videos/:id

// Reels
GET /api/reels
POST /api/reels
DELETE /api/reels/:id

// Live Sessions
GET /api/sessions
POST /api/sessions
GET /api/sessions/:id
PATCH /api/sessions/:id/end

// Notes (Smart Muṣḥaf)
GET /api/notes
POST /api/notes
PATCH /api/notes/:id
DELETE /api/notes/:id
GET /api/notes/search
POST /api/notes/:id/pin
POST /api/notes/:id/share
```

## 🔐 Authentication Flow

1. User registers/logs in on Auth pages
2. Backend returns JWT token
3. Token stored in localStorage
4. AuthContext provides token to all API calls
5. Protected routes check for token and redirect to login if missing
6. On logout, token is cleared and user redirected to login

## 💾 Offline-First Architecture

Using Dexie.js (IndexedDB):

```javascript
// Example: Store class data locally
await db.classes.add({ id, name, description, syncedAt });

// Sync when online
if (navigator.onLine) {
  await syncLocalDataWithServer();
}
```

Features:
- Cache API responses automatically
- Queue mutations offline
- Sync when connection restored
- Conflict resolution

## 🎨 Tailwind CSS v4 (CDN)

All styling uses Tailwind CSS v4 via CDN in `public/index.html`:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

No PostCSS needed! Utilities applied directly via className attributes.

## 📱 Responsive Design

- **Mobile-First Approach**
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Sidebar hidden on mobile (icon-based)
- Full-width layout on small screens

## 🔄 State Management

### AuthContext (Global)
```javascript
const { user, token, login, register, logout } = useAuth();
```

### Local Component State
```javascript
const [classes, setClasses] = useState([]);
const [loading, setLoading] = useState(true);
```

### Real-Time Updates
```javascript
useEffect(() => {
  socket.on('classUpdated', (data) => {
    setClasses(prev => prev.map(c => c.id === data.id ? data : c));
  });
}, []);
```

## 🧪 Component Examples

### Protected Route
```javascript
<ProtectedRoute>
  <StudentDashboard />
</ProtectedRoute>
```

### API Call with Loading State
```javascript
const fetchClasses = async () => {
  setLoading(true);
  try {
    const res = await api.get('/api/classes');
    setClasses(res.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## 🐛 Debugging

### Browser DevTools
- React DevTools extension (inspect props, state)
- Network tab (monitor API calls)
- Application tab (check localStorage, IndexedDB)

### Console Logs
```javascript
console.log('Current user:', user);
console.log('API error:', err.response);
```

## 📦 Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "axios": "^1.x",
  "dexie": "^3.x",
  "socket.io-client": "^4.x",
  "react-icons": "^4.x"
}
```

## 🔗 Backend Integration

Backend URL: `http://localhost:4000`

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

## 📈 Performance Optimizations

- ✅ Code splitting with React Router lazy loading
- ✅ Component memoization (React.memo)
- ✅ Image optimization
- ✅ API response caching
- ✅ Indexed DB for offline data
- ✅ Vite bundling

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Environment Variables for Production
```env
VITE_API_URL=https://api.yourdomain.com
```

## 📝 Notes

- All pages are mobile-responsive
- Tailwind CSS v4 CDN is used (no PostCSS setup required)
- Backend must be running for full functionality
- JWT tokens expire after a set time (implement refresh logic if needed)
- Database migrations and schema on backend must match frontend expectations

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📞 Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Contact development team

---

**Last Updated:** May 6, 2026
**Frontend Version:** 1.0.0
**Backend Version:** 1.0.0
