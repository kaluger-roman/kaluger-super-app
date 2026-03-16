import type { FC } from "react";
import { useEffect } from "react";

import { CssBaseline, CircularProgress } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";
import { useUnit } from "effector-react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";

import { userModel } from "@entities";
import { theme, NotificationProvider, setNavigate } from "@shared";

import * as Styled from "./App.styled";
import { AppContent, OfflineIndicator } from "./components";
import { appInitModel, blockingModel, webSocketModel } from "./model";

const AppRouter: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  const isAuthenticated = useUnit(userModel.$isAuthenticated);
  const user = useUnit(userModel.$user);

  return <AppContent isLoggedIn={isAuthenticated} user={user} />;
};

const App: FC = () => {
  const appInitialized = useUnit(appInitModel.$appInitialized);
  const isBlocking = useUnit(blockingModel.$isBlocking);
  const isAuthenticated = useUnit(userModel.$isAuthenticated);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      userModel.setAuthToken(token);
      userModel.getProfileFx().finally(() => appInitModel.initializeApp({}));
    } else {
      appInitModel.initializeApp({});
    }

    const handleOnline = () => appInitModel.onlineStatusChanged(true);
    const handleOffline = () => appInitModel.onlineStatusChanged(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      webSocketModel.connectWebSocket();
    } else {
      webSocketModel.disconnectWebSocket();
    }

    return () => {
      webSocketModel.disconnectWebSocket();
    };
  }, [isAuthenticated]);

  if (!appInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Styled.StyledBackdrop open={true}>
          <CircularProgress color="inherit" />
        </Styled.StyledBackdrop>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Router>
          <AppRouter />
          <NotificationProvider />
          <OfflineIndicator />
          <Styled.ModalBackdrop open={isBlocking}>
            <CircularProgress color="inherit" />
          </Styled.ModalBackdrop>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export { App };
