import { createTheme } from "@mui/material/styles";

import { componentOverrides } from "./components.constants";
import { moreComponentOverrides } from "./moreComponents.constants";
import { palette } from "./palette.constants";
import { typography } from "./typography.constants";

export const theme = createTheme({
  palette,
  typography,
  shape: {
    borderRadius: 12,
  },
  components: {
    ...componentOverrides,
    ...moreComponentOverrides,
  },
});
