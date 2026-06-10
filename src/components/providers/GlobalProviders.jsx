import IncomingCallModal from "../calls/IncomingCallModal";
import ToastContainer from "../notifications/ToastContainer";
import useIncomingCall from "../../hooks/useIncomingCall";
import useNotifications from "../../hooks/useNotifications";

/**
 * Global providers that need Router and Auth context
 * Wraps around the routes to provide global modals and notifications
 */
export default function GlobalProviders({ children }) {
  const { incomingCall, acceptCall, rejectCall, timeoutCall } = useIncomingCall();
  const { toasts, removeToast } = useNotifications();

  return (
    <>
      {children}

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
