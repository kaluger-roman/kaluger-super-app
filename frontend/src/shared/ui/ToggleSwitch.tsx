import React from "react";
import { Checkbox, Box } from "@mui/material";

type ToggleSwitchProps = {
  checked: boolean;
  onToggle: (next: boolean) => void;
  size?: "small" | "medium";
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onToggle,
  size = "medium",
}) => {
  return (
    <Checkbox
      checked={checked}
      onChange={() => onToggle(!checked)}
      sx={{
        "& .MuiSvgIcon-root": {
          borderRadius: "16px",
          width: 40,
          height: 24,
          backgroundColor: checked ? "success.main" : "error.main",
          transition: "background-color 0.2s",
        },
        "& .Mui-checked .MuiSvgIcon-root": {
          backgroundColor: "success.main",
        },
        "& .MuiCheckbox-root": {
          padding: 0,
        },
      }}
      icon={
        <Box
          sx={{
            width: 40,
            height: 24,
            borderRadius: "16px",
            backgroundColor: "error.main",
            position: "relative",
            transition: "background-color 0.2s",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 2,
              top: 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "common.white",
              boxShadow: 1,
              transition: "left 0.2s",
            }}
          />
        </Box>
      }
      checkedIcon={
        <Box
          sx={{
            width: 40,
            height: 24,
            borderRadius: "16px",
            backgroundColor: "success.main",
            position: "relative",
            transition: "background-color 0.2s",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 18,
              top: 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "common.white",
              boxShadow: 1,
              transition: "left 0.2s",
            }}
          />
        </Box>
      }
      size={size}
    />
  );
};

export default ToggleSwitch;
