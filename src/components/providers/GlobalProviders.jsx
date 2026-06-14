import { useLocation } from 'react-router-dom';
import IncomingCallModal from "../calls/IncomingCallModal";
import ToastContainer from "../notifications/ToastContainer";
import BottomNav from "../common/BottomNav";
import useIncomingCall from "../../hooks/useIncomingCall";
import useNotifications from "../../hooks/useNotifications";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Global providers that need Router and Auth context
 * Wraps around the routes to provide global modals and notifications
 */
// Pages where the global bottom nav should NOT appear
// (either they have their own nav, or are fullscreen experiences)
const HIDE_NAV_PATHS = [
  '/session/',
  '/login',
  '/register',
  '/mushaf',
  '/dashboard', // dashboards have their own integrated bottom nav
];

export default function GlobalProviders({ children }) {
  const { incomingCall, acceptCall, rejectCall, timeoutCall } = useIncomingCall();
  const { toasts, removeToast } = useNotifications();
  const { token } = useAuth();
  const { pathname } = useLocation();

  const showBottomNav = token && !HIDE_NAV_PATHS.some(p => pathname.startsWith(p));

  return (
    <>
      {children}

      {/* Mobile bottom navigation */}
      {showBottomNav && <BottomNav />}

      {/* Global incoming call modal */}
      <IncomingCallModal
        callData={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
        onTimeout={timeoutCall}
      />

      {/* Global toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
}
