// frontend/src/components/ToastProvider.tsx
import { Snackbar, Alert, Stack } from '@mui/material';
import { useToast } from '../hooks/useToast';

export default function ToastProvider() {
  const { toasts, removeToast } = useToast();

  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open
          autoHideDuration={4000}
          onClose={() => removeToast(t.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ position: 'relative', bottom: 'auto', right: 'auto' }}
        >
          <Alert
            severity={t.severity}
            onClose={() => removeToast(t.id)}
            variant="filled"
            sx={{ minWidth: 280 }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
}
