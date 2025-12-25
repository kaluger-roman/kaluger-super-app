import { createTheme } from "@mui/material/styles";

import { componentOverrides } from "./components";
import { moreComponentOverrides } from "./moreComponents";
import { palette } from "./palette";
import { typography } from "./typography";

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
