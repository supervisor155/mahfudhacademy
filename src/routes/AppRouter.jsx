import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GlobalProviders from "../components/providers/GlobalProviders";
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const Welcome = lazy(() => import("../pages/Welcome"));
const OwnerDashboard = lazy(() => import("../pages/dashboard/OwnerDashboard"));
const ManagerDashboard = lazy(() => import("../pages/dashboard/ManagerDashboard"));
const TeacherDashboard = lazy(() => import("../pages/dashboard/TeacherDashboard"));
const StudentDashboard = lazy(() => import("../pages/dashboard/StudentDashboard"));
const ClassHome = lazy(() => import("../pages/class/ClassHome"));
const Videos = lazy(() => import("../pages/class/Videos"));
const Reels = lazy(() => import("../pages/class/Reels"));
const LiveSessions = lazy(() => import("../pages/class/LiveSessions"));
const Files = lazy(() => import("../pages/class/Files"));
const Notes = lazy(() => import("../pages/class/Notes"));
const Chat = lazy(() => import("../pages/class/Chat"));
const Announcements = lazy(() => import("../pages/class/Announcements"));
const Assignments = lazy(() => import("../pages/class/Assignments"));
const Members = lazy(() => import("../pages/class/Members"));
const Curriculum = lazy(() => import("../pages/class/Curriculum"));
const InboxChat = lazy(() => import("../pages/chat/InboxChat"));
const ReelsPage = lazy(() => import("../pages/reels/ReelsPage"));
const ReelsDemo = lazy(() => import("../pages/reels/ReelsDemo"));
const MushafViewer = lazy(() =>
  import("../pages/mushaf/MushafViewer").then((m) => ({ default: m.MushafViewer }))
);
const LiveSessionRoom = lazy(() => import("../components/live/LiveSessionRoom"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const NotFound = lazy(() => import("../pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent"></div>
        <p className="text-sm font-medium text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Role-locked dashboard route — redirects to the user's own dashboard if wrong role
function RoleRoute({ allowedRole, children }) {
  const { loading, token, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  // If the user's role doesn't match, redirect to their correct dashboard
  if (user?.role && user.role !== allowedRole) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return children;
}

export default function AppRouter() {
  const { loading, token, user } = useAuth();

  const dashboardPath = user?.role ? `/dashboard/${user.role}` : null;

  return (
    <BrowserRouter>
      <GlobalProviders>
        <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based dashboards — each locked to its own role */}
        <Route path="/dashboard/owner"   element={<RoleRoute allowedRole="owner"><OwnerDashboard /></RoleRoute>} />
        <Route path="/dashboard/manager" element={<RoleRoute allowedRole="manager"><ManagerDashboard /></RoleRoute>} />
        <Route path="/dashboard/teacher" element={<RoleRoute allowedRole="teacher"><TeacherDashboard /></RoleRoute>} />
        <Route path="/dashboard/student" element={<RoleRoute allowedRole="student"><StudentDashboard /></RoleRoute>} />

        {/* Default dashboard based on role */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {dashboardPath ? <Navigate to={dashboardPath} replace /> : <Navigate to="/login" replace />}
          </ProtectedRoute>
        } />

        {/* Class-based navigation */}
        <Route path="/class/:classId" element={<ProtectedRoute><ClassHome /></ProtectedRoute>}>
          <Route path="videos" element={<Videos />} />
          <Route path="reels" element={<Reels />} />
          <Route path="live" element={<LiveSessions />} />
          <Route path="chat" element={<Chat />} />
          <Route path="files" element={<Files />} />
          <Route path="notes" element={<Notes />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="members" element={<Members />} />
          <Route path="curriculum" element={<Curriculum />} />
        </Route>

        {/* Full-screen Reels */}
        <Route path="/reels" element={<ProtectedRoute><ReelsPage /></ProtectedRoute>} />
        <Route path="/reels-demo" element={<ProtectedRoute><ReelsDemo /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><InboxChat /></ProtectedRoute>} />

        {/* Live Session Room */}
        <Route path="/session/:sessionId" element={<ProtectedRoute><LiveSessionRoom /></ProtectedRoute>} />

        {/* Profile page */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Muṣḥaf Viewer — open to all, no login required */}
        <Route path="/mushaf" element={<MushafViewer />} />
        <Route path="/mushaf/:surahId" element={<MushafViewer />} />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            loading ? null : token ? <Navigate to="/dashboard" replace /> : <Welcome />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </GlobalProviders>
    </BrowserRouter>
  );
}
