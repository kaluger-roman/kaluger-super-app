import type { FC } from "react";

import { Chip, ListItem } from "@mui/material";
import { useUnit } from "effector-react";

import { CommissionBadge, ReceivedAmountHint, formatCurrency } from "@shared";
import type { IncomeHistoryEntry } from "@shared";

import {
  formatEntryLessonLine,
  getEntryName,
  getEntryStatusColor,
  getEntryStatusLabel,
} from "./IncomeHistoryRow.helpers";
import * as Styled from "./IncomeHistoryRow.styled";
import { incomeHistoryReloadModel } from "../../../../model";
import { IncomeHistoryTax } from "../IncomeHistoryTax";

type IncomeHistoryRowProps = {
  entry: IncomeHistoryEntry;
};

export const IncomeHistoryRow: FC<IncomeHistoryRowProps> = ({ entry }) => {
  const actions = useUnit({ lessonOpened: incomeHistoryReloadModel.incomeHistoryLessonOpened });

  return (
    <ListItem disablePadding>
      <Styled.RowButton onClick={() => actions.lessonOpened(entry.lessonId)}>
        <Styled.Name>
          <Styled.StudentName variant="body1">{getEntryName(entry)}</Styled.StudentName>
          {entry.student?.archived && <Chip label="Архив" size="small" />}
          {!entry.student && <Chip label="Пробный урок" size="small" color="info" />}
        </Styled.Name>

        <Styled.Amount>
          <ReceivedAmountHint receivedAmount={entry.receivedAmount} price={entry.price} />
          <Styled.AmountValue variant="subtitle1">
            {formatCurrency(entry.receivedAmount, { withKopecks: true })}
          </Styled.AmountValue>
        </Styled.Amount>

        <Styled.Meta>
          <Styled.MetaText variant="body2">{formatEntryLessonLine(entry)}</Styled.MetaText>
          {entry.lessonStatus !== "COMPLETED" && (
            <Chip
              label={getEntryStatusLabel(entry.lessonStatus)}
              color={getEntryStatusColor(entry.lessonStatus)}
              size="small"
              variant="outlined"
            />
          )}
          {!entry.hasPaymentDate && (
            <Chip label="дата оплаты не указана" color="warning" size="small" variant="outlined" />
          )}
        </Styled.Meta>

        <Styled.Extras>
          <IncomeHistoryTax tax={entry.tax} />
          <CommissionBadge
            credit={
              entry.commissionCredit ? { amount: entry.commissionCredit, state: "FACT" } : null
            }
            variant="full"
          />
        </Styled.Extras>
      </Styled.RowButton>
    </ListItem>
  );
};
