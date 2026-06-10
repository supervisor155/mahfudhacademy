import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import ToastContainer from "./components/notifications/ToastContainer";
import useIncomingCall from "./hooks/useIncomingCall";
import useNotifications from "./hooks/useNotifications";

export default function App() {
  const { incomingCall, acceptCall, rejectCall, timeoutCall } = useIncomingCall();
  const { toasts, removeToast } = useNotifications();

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
