import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2E7D47", // Основной зелёный
      light: "#4CAF50", // Светло-зелёный
      dark: "#1B5E20", // Тёмно-зелёный
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#66BB6A", // Вторичный зелёный
      light: "#81C784",
      dark: "#4CAF50",
      contrastText: "#ffffff",
    },
    success: {
      main: "#4CAF50",
      light: "#81C784",
      dark: "#388E3C",
    },
    background: {
      default: "#F8FDF8", // Очень светло-зелёный фон
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1B4332", // Тёмно-зелёный для текста
      secondary: "#2D5A3D",
    },
    grey: {
      50: "#F8FDF8",
      100: "#E8F5E8",
      200: "#C8E6C8",
      300: "#A5D6A7",
      400: "#81C784",
      500: "#66BB6A",
      600: "#4CAF50",
      700: "#43A047",
      800: "#388E3C",
      900: "#2E7D47",
    },
  },
  typography: {
    fontFamily: [
      '"Roboto"',
      '"Inter"',
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
      fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
      lineHeight: 1.2,
      color: "#1B4332",
    },
    h2: {
      fontWeight: 600,
      fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
      lineHeight: 1.3,
      color: "#1B4332",
    },
    h3: {
      fontWeight: 600,
      fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
      lineHeight: 1.3,
      color: "#1B4332",
    },
    h4: {
      fontWeight: 600,
      fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)",
      lineHeight: 1.4,
      color: "#1B4332",
    },
    h5: {
      fontWeight: 600,
      fontSize: "clamp(1rem, 2vw, 1.25rem)",
      lineHeight: 1.4,
      color: "#1B4332",
    },
    h6: {
      fontWeight: 600,
      fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
      lineHeight: 1.4,
      color: "#1B4332",
    },
    body1: {
      fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
      lineHeight: 1.6,
      color: "#2D5A3D",
    },
    body2: {
      fontSize: "clamp(0.75rem, 1vw, 0.875rem)",
      lineHeight: 1.6,
      color: "#2D5A3D",
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
      fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "12px 24px",
          fontWeight: 600,
          textTransform: "none",
          boxShadow: "none",
          "@media (max-width: 600px)": {
            padding: "8px 16px",
            fontSize: "0.875rem",
          },
          "&:hover": {
            boxShadow: "0 4px 12px rgba(46, 125, 71, 0.2)",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #2E7D47 0%, #4CAF50 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #1B5E20 0%, #388E3C 100%)",
          },
        },
        sizeLarge: {
          "@media (max-width: 600px)": {
            padding: "10px 20px",
            fontSize: "0.875rem",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          border: "1px solid #E8F5E8",
          "&:hover": {
            boxShadow: "0 8px 30px rgba(46, 125, 71, 0.15)",
            transform: "translateY(-2px)",
            transition: "all 0.3s ease-in-out",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        },
        elevation3: {
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.12)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            "& fieldset": {
              borderColor: "#C8E6C8",
            },
            "&:hover fieldset": {
              borderColor: "#4CAF50",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#2E7D47",
              borderWidth: 2,
            },
            "@media (max-width: 600px)": {
              fontSize: "0.875rem",
            },
          },
          "& .MuiInputLabel-root": {
            "@media (max-width: 600px)": {
              fontSize: "0.875rem",
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #2E7D47 0%, #4CAF50 100%)",
          boxShadow: "0 4px 20px rgba(46, 125, 71, 0.2)",
          borderRadius: 0,
          color: "#ffffff",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "1px solid #E8F5E8",
          background: "#FFFFFF",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "4px 8px",
          "&.Mui-selected": {
            backgroundColor: "#E8F5E8",
            color: "#2E7D47",
            "&:hover": {
              backgroundColor: "#C8E6C8",
            },
          },
          "&:hover": {
            backgroundColor: "#F8FDF8",
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #2E7D47 0%, #4CAF50 100%)",
          boxShadow: "0 8px 25px rgba(46, 125, 71, 0.3)",
          "&:hover": {
            background: "linear-gradient(135deg, #1B5E20 0%, #388E3C 100%)",
            boxShadow: "0 12px 35px rgba(46, 125, 71, 0.4)",
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          "@media (min-width: 600px)": {
            paddingLeft: 32,
            paddingRight: 32,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          "@media (max-width: 600px)": {
            margin: 16,
            maxHeight: "calc(100vh - 32px)",
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          "@media (max-width: 600px)": {
            fontSize: "1.125rem",
            padding: "16px 20px 8px",
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          "@media (max-width: 600px)": {
            padding: "8px 20px",
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          "@media (max-width: 600px)": {
            padding: "16px 20px 20px",
          },
        },
      },
    },
  },
});
