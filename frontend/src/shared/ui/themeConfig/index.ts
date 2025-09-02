import { createTheme } from "@mui/material/styles";
import { palette } from "./palette";
import { typography } from "./typography";
import { componentOverrides } from "./components";
import { moreComponentOverrides } from "./moreComponents";

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
