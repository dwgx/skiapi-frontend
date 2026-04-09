import React, { useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StatusProvider } from './contexts/StatusContext';
import { router } from './pages/router';
import AiAssistant from './components/common/AiAssistant';

function SnackbarBridge({ children }) {
  const { enqueueSnackbar } = useSnackbar();
  React.useEffect(() => {
    window.__SNACKBAR__ = (variant, message) => {
      enqueueSnackbar(message, { variant, autoHideDuration: 3000 });
    };
    return () => { window.__SNACKBAR__ = null; };
  }, [enqueueSnackbar]);
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <SnackbarBridge>
          <AuthProvider>
            <StatusProvider>
              <RouterProvider router={router} />
              <AiAssistant />
            </StatusProvider>
          </AuthProvider>
        </SnackbarBridge>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
