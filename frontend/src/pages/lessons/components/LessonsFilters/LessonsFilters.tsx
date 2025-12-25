import type { FC } from "react";

import { Box, FormControlLabel, Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonsModel } from "@features";

export const LessonsFilters: FC = () => {
  const onlyUnpaid = useUnit(lessonsModel.$onlyUnpaid);
  const onlyWithoutHomework = useUnit(lessonsModel.$onlyWithoutHomework);

  return (
    <Box mt={2} display="flex" gap={2} alignItems="center">
      <FormControlLabel
        control={
          <Switch
            checked={onlyUnpaid}
            onChange={(e) => lessonsModel.setOnlyUnpaid(e.target.checked)}
          />
        }
        label="Только неоплаченные"
      />

      <FormControlLabel
        control={
          <Switch
            checked={onlyWithoutHomework}
            onChange={(e) => lessonsModel.setOnlyWithoutHomework(e.target.checked)}
          />
        }
        label="Только без Д/З"
      />
    </Box>
  );
};
