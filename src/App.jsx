import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import ToastContainer from "./components/notifications/ToastContainer";
import useIncomingCall from "./hooks/useIncomingCall";
import useNotifications from "./hooks/useNotifications";

// Wrapper component that uses auth-dependent hooks
function AppContent() {
  const { incomingCall, acceptCall, rejectCall, timeoutCall } = useIncomingCall();
  const { toasts, removeToast } = useNotifications();

  return (
    <>
      <AppRouter />

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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
