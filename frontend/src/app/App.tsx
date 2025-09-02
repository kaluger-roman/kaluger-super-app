import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Backdrop, CircularProgress } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { useStore } from "effector-react";

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

const App: React.FC = () => {
  const isAuthenticated = useStore($isAuthenticated);
  const user = useStore($user);
  const appInitialized = useStore($appInitialized);

  useEffect(() => {
    // Set auth token from localStorage on app start
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
      getProfileFx();
    }

    // Initialize app
    initializeApp();
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
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
