import type { FC } from "react";

import { TextField } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./PaidDetailsFields.styled";
import { lessonFormModel } from "../../../../models";
import { ReceivedAmountField } from "../../../ReceivedAmountField";
import type { LessonFormData } from "../../LessonForm.types";

type PaidDetailsFieldsProps = {
  formData: LessonFormData;
  isLoading: boolean;
  isMobile: boolean;
  setFormData: (updater: (prev: LessonFormData) => LessonFormData) => void;
};

export const PaidDetailsFields: FC<PaidDetailsFieldsProps> = ({
  formData,
  isLoading,
  isMobile,
  setFormData,
}) => {
  const receivedAmountError = useUnit(lessonFormModel.$receivedAmountError);

  return (
    <Styled.Row $isMobile={isMobile}>
      <TextField
        label="Дата оплаты"
        type="date"
        fullWidth
        value={formData.paymentDate || ""}
        onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
        disabled={isLoading}
        size={isMobile ? "small" : "medium"}
        InputLabelProps={{ shrink: true }}
      />
      <ReceivedAmountField
        value={formData.receivedAmount}
        error={receivedAmountError}
        disabled={isLoading}
        size={isMobile ? "small" : "medium"}
        onChange={(receivedAmount) => setFormData((prev) => ({ ...prev, receivedAmount }))}
      />
    </Styled.Row>
  );
};
