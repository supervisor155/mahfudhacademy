import { createPortal } from 'react-dom';
import Toast from './Toast';

/**
 * Toast Container - Portal for rendering toast notifications
 */
export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9998] flex flex-col items-end justify-start gap-3 p-6">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
}
