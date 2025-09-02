export const componentOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        padding: "12px 24px",
        fontWeight: 600,
        textTransform: "none" as const,
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
};
