import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
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
import { LoginForm, RegisterForm } from "../features/auth";
import {
  DashboardPage,
  StudentsPage,
  LessonsPage,
  ReportsPage,
} from "../pages";
import { Sidebar } from "../widgets";
import { theme } from "../shared";
import { NotificationProvider } from "../shared/ui/NotificationProvider";

const DRAWER_WIDTH = 280;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useStore($user);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setSidebarOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: 2,
              color: "white",
              textShadow: "0 2px 8px rgba(76, 110, 245, 0.18)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              userSelect: "none",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: 32,
                mr: 1,
                filter: "drop-shadow(0 2px 4px #764ba2aa)",
              }}
              aria-label="graduation cap"
            >
              🎓
            </Box>
            Kaluger{" "}
            <Box
              component="span"
              sx={{ color: "#42a5f5", ml: 0.5, fontSize: 28 }}
            >
              Tutor
            </Box>
          </Typography>

          {user && (
            <Box
              display="flex"
              alignItems="center"
              sx={{
                ml: 2,
                px: 2,
                py: 0.5,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.08)",
                boxShadow: 1,
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "#42a5f5",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  textTransform: "uppercase",
                  boxShadow: 2,
                  mr: 1,
                  letterSpacing: 1,
                  userSelect: "none",
                }}
              >
                {user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: "white",
                  textShadow: "0 1px 4px rgba(66,165,245,0.18)",
                  letterSpacing: 0.5,
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={user.name}
              >
                {user.name}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          mt: 8, // Account for AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.50",
      }}
    >
      {children}
    </Box>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isAuthenticated = useStore($isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Store current location for redirect after login
    if (
      location.pathname !== "/" &&
      location.pathname !== "/login" &&
      location.pathname !== "/register"
    ) {
      sessionStorage.setItem(
        "redirectAfterLogin",
        location.pathname + location.search
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useStore($isAuthenticated);

  if (isAuthenticated) {
    // Redirect to stored location or home page
    const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/";
    sessionStorage.removeItem("redirectAfterLogin");
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

const AppInitializer: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        setAuthToken(token);
        try {
          await getProfileFx();
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem("authToken");
        }
      }
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  if (!isInitialized) {
    return (
      <Backdrop
        open
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <AuthLayout>
              <LoginForm />
            </AuthLayout>
          </AuthRoute>
        }
      />

      <Route
        path="/register"
        element={
          <AuthRoute>
            <AuthLayout>
              <RegisterForm />
            </AuthLayout>
          </AuthRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StudentsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/lessons"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LessonsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Router>
          <AppInitializer />
        </Router>
        <NotificationProvider />
      </LocalizationProvider>
    </ThemeProvider>
  );
};
