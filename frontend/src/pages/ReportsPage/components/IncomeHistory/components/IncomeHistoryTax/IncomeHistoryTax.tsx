import type { FC } from "react";

import { TaxExemptBadge } from "@shared";
import type { IncomeHistoryTax as IncomeHistoryTaxData } from "@shared";

import { formatEntryTax } from "./IncomeHistoryTax.helpers";
import * as Styled from "./IncomeHistoryTax.styled";

type IncomeHistoryTaxProps = {
  tax: IncomeHistoryTaxData | null;
};

export const IncomeHistoryTax: FC<IncomeHistoryTaxProps> = ({ tax }) => {
  if (!tax) return null;
  if (tax.kind === "EXEMPT") return <TaxExemptBadge isTaxExempt />;

  return <Styled.TaxText variant="body2">{formatEntryTax(tax)}</Styled.TaxText>;
};
