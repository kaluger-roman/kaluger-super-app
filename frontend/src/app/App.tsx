import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Backdrop, CircularProgress } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { useStore, useUnit } from "effector-react";

import {
  $isAuthenticated,
  $user,
  getProfileFx,
  setAuthToken,
} from "../entities";
import { initializeApp, $appInitialized } from "../shared/model/appInit";
import {
  connectWebSocket,
  disconnectWebSocket,
} from "../shared/model/webSocket";
import { theme } from "../shared";
import { NotificationProvider } from "../shared/ui/NotificationProvider";
import { AppContent } from "./components";
import { $isBlocking } from "../shared/model/blocking";

const App: React.FC = () => {
  const isAuthenticated = useStore($isAuthenticated);
  const user = useStore($user);
  const appInitialized = useStore($appInitialized);
  const isBlocking = useUnit($isBlocking);

  useEffect(() => {
    // Set auth token from localStorage on app start and restore profile
    (async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        setAuthToken(token);
        try {
          // Wait for profile to be fetched before initializing the rest of the app
          await getProfileFx();
        } catch (e) {
          // Ignore profile fetch errors here; initialize app anyway
          // (getProfileFx will set stores on success/fail)
          // eslint-disable-next-line no-console
          console.error("Failed to restore profile:", e);
        }
      }

      // Initialize app (load students, upcoming lessons etc.)
      initializeApp();
    })();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated]);

  if (!appInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={true}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Router>
          <AppContent isLoggedIn={isAuthenticated} user={user} />
          <NotificationProvider />
          <Backdrop
            sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
            open={isBlocking}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
