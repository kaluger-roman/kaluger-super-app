import type { FC } from "react";

import { TextField } from "@mui/material";

import * as Styled from "./PaymentFields.styled";
import { ReceivedAmountField } from "../ReceivedAmountField";

type PaymentFieldsProps = {
  paymentDate: string;
  receivedAmount: string;
  receivedAmountError: string | null;
  onPaymentDateChange: (value: string) => void;
  onReceivedAmountChange: (value: string) => void;
};

export const PaymentFields: FC<PaymentFieldsProps> = ({
  paymentDate,
  receivedAmount,
  receivedAmountError,
  onPaymentDateChange,
  onReceivedAmountChange,
}) => (
  <Styled.Container>
    <TextField
      autoFocus
      margin="dense"
      label="Дата оплаты"
      type="date"
      fullWidth
      value={paymentDate}
      onChange={(e) => onPaymentDateChange(e.target.value)}
      InputLabelProps={{ shrink: true }}
    />
    <ReceivedAmountField
      value={receivedAmount}
      error={receivedAmountError}
      helperText="Сколько реально пришло за урок"
      onChange={onReceivedAmountChange}
    />
  </Styled.Container>
);
