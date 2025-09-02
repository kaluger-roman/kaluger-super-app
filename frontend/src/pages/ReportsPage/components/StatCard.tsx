import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
}) => (
  <Card sx={{ height: "100%", backgroundColor: "#f8f9fa" }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box
          sx={{
            color: color,
            mr: 1,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ color: color, fontWeight: "bold" }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);
