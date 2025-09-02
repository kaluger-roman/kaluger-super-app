export const moreComponentOverrides = {
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
};
