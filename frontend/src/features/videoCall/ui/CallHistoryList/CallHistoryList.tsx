import type { FC } from "react";

import { useUnit } from "effector-react";

import { callHistoryModel } from "@entities";

import { CallHistoryEmpty } from "./CallHistoryEmpty";
import { CallHistoryError } from "./CallHistoryError";
import * as Styled from "./CallHistoryList.styled";
import { CallHistoryRow } from "./CallHistoryRow";

export const CallHistoryList: FC = () => {
  const records = useUnit(callHistoryModel.$callHistory);
  const loadFailed = useUnit(callHistoryModel.$loadFailed);
  const loading = useUnit(callHistoryModel.$isLoading);

  if (loadFailed) {
    return <CallHistoryError />;
  }

  // The first load is shown by the global blocking overlay.
  if (records.length === 0) {
    return loading ? null : <CallHistoryEmpty />;
  }

  return (
    <Styled.ListBox>
      {records.map((record) => (
        <CallHistoryRow key={record.id} record={record} />
      ))}
    </Styled.ListBox>
  );
};
