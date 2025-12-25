import { styled as muiStyled } from "@mui/material/styles";

type MuiStyledArgs = Parameters<typeof muiStyled>;

export const styled: typeof muiStyled = (component: MuiStyledArgs[0], options?: MuiStyledArgs[1]) =>
  muiStyled(component, {
    shouldForwardProp: (prop: string) => !prop.startsWith("$"),
    ...(options ?? {}),
  } as MuiStyledArgs[1]);
