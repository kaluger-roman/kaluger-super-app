import type { FC } from "react";

import { List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import { MOCKUP_LINKS } from "../../CallBackgroundMockupPage.constants";
import { MockFrame } from "../MockFrame";

export const MockupIndex: FC = () => (
  <MockFrame title="Макеты 039: звонок в фоне">
    <Typography variant="body2" color="text.secondary">
      Временная страница макетов, данные захардкожены
    </Typography>
    <List>
      {MOCKUP_LINKS.map((link) => (
        <ListItemButton key={link.state} component={Link} to={`?state=${link.state}`}>
          <ListItemText primary={link.title} secondary={link.state} />
        </ListItemButton>
      ))}
    </List>
  </MockFrame>
);
