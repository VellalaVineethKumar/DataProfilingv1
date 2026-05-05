// frontend/src/hooks/useToast.ts
import { useStore, type Toast } from '../store';

type ToastInput = Omit<Toast, 'id'>;

export function useToast() {
  const addToast = useStore((state) => state.addToast);
  const removeToast = useStore((state) => state.removeToast);
  const toasts = useStore((state) => state.toasts);

  const toast = (input: ToastInput) => addToast(input);
  const success = (message: string) => toast({ severity: 'success', message });
  const error = (message: string) => toast({ severity: 'error', message });
  const warning = (message: string) => toast({ severity: 'warning', message });
  const info = (message: string) => toast({ severity: 'info', message });

  return { toast, success, error, warning, info, toasts, removeToast };
}
