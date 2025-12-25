import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Schedule as RescheduleIcon,
} from "@mui/icons-material";
import { MenuItem } from "@mui/material";

import { styled } from "../../../lib/styled.helpers";

export const StyledMenuItem = styled(MenuItem)();

export const DeleteMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const StyledEditIcon = styled(EditIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

export const StyledDeleteIcon = styled(DeleteIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

export const StyledCancelIcon = styled(CancelIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

export const StyledRestoreIcon = styled(RestoreIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

export const StyledRescheduleIcon = styled(RescheduleIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));
