import React from "react";
import { Box, FormControlLabel, Switch } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $onlyUnpaid,
  $onlyWithoutHomework,
  setOnlyUnpaid,
  setOnlyWithoutHomework,
} from "../model/filters";

export const LessonsFilters: React.FC = () => {
  const onlyUnpaid = useUnit($onlyUnpaid);
  const onlyWithoutHomework = useUnit($onlyWithoutHomework);

  return (
    <Box mt={2} display="flex" gap={2} alignItems="center">
      <FormControlLabel
        control={
          <Switch
            checked={onlyUnpaid}
            onChange={(e) => setOnlyUnpaid(e.target.checked)}
          />
        }
        label="Только неоплаченные"
      />

      <FormControlLabel
        control={
          <Switch
            checked={onlyWithoutHomework}
            onChange={(e) => setOnlyWithoutHomework(e.target.checked)}
          />
        }
        label="Только без Д/З"
      />
    </Box>
  );
};
