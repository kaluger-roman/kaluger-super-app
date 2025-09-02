import React from "react";
import { Box, Typography } from "@mui/material";
import type { User } from "../../shared";

type UserAvatarProps = {
  user: User;
  isMobile: boolean;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, isMobile }) => {
  return (
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
  );
};
