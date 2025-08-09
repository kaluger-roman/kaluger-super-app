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
  useMediaQuery,
  useTheme,
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
import { initializeApp, $appInitialized } from "../shared/model/appInit";
import {
  connectWebSocket,
  disconnectWebSocket,
} from "../shared/model/webSocket";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setSidebarOpen(true)}
            sx={{ mr: { xs: 1, sm: 2 } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant={isMobile ? "h6" : "h5"}
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: { xs: 1, sm: 2 },
              color: "white",
              textShadow: "0 2px 8px rgba(76, 110, 245, 0.18)",
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 1 },
              userSelect: "none",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: { xs: 24, sm: 32 },
                mr: { xs: 0.5, sm: 1 },
                filter: "drop-shadow(0 2px 4px #764ba2aa)",
              }}
              aria-label="graduation cap"
            >
              🎓
            </Box>
            {isMobile ? (
              "Kaluger"
            ) : (
              <>
                Kaluger{" "}
                <Box
                  component="span"
                  sx={{
                    color: "#42a5f5",
                    ml: 0.5,
                    fontSize: { xs: 20, sm: 28 },
                  }}
                >
                  Tutor
                </Box>
              </>
            )}
          </Typography>

          {user && (
            <Box
              display="flex"
              alignItems="center"
              sx={{
                ml: { xs: 1, sm: 2 },
                px: { xs: 1, sm: 2 },
                py: 0.5,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.08)",
                boxShadow: 1,
                gap: { xs: 0.5, sm: 1 },
              }}
            >
              <Box
                sx={{
                  width: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  borderRadius: "50%",
                  bgcolor: "#42a5f5",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: { xs: 14, sm: 18 },
                  textTransform: "uppercase",
                  boxShadow: 2,
                  mr: { xs: 0.5, sm: 1 },
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
              {!isMobile && (
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
              )}
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
          mt: { xs: 7, sm: 8 }, // Account for AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: isMobile ? "100vh" : "auto", // Фиксированная высота на мобильных
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.50",
        p: isMobile ? 1 : 3, // Уменьшаем отступы на мобильных
        overflow: isMobile ? "hidden" : "auto", // Убираем прокрутку на мобильных
        position: isMobile ? "fixed" : "static", // Фиксируем на мобильных
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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

const AppRoutes: React.FC = () => {
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
  const appInitialized = useStore($appInitialized);
  const isAuthenticated = useStore($isAuthenticated);

  // Initialize app data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !appInitialized) {
      initializeApp();
      connectWebSocket();
    } else if (!isAuthenticated) {
      disconnectWebSocket();
    }
  }, [isAuthenticated, appInitialized]);

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
    };

    initializeAuth();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Router>
          <AppRoutes />
        </Router>
        <NotificationProvider />
      </LocalizationProvider>
    </ThemeProvider>
  );
};
