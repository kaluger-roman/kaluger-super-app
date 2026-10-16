import { Chip } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const ArchivedChip = styled(Chip)`
  margin-left: ${({ theme }) => theme.spacing(1)};
`;
