import type { FC } from "react";

import type { CallHistoryRecord } from "@entities";

import { CallHistoryEmpty } from "./CallHistoryEmpty";
import { CallHistoryError } from "./CallHistoryError";
import * as Styled from "./CallHistoryList.styled";
import { CallHistoryRow } from "./CallHistoryRow";

type CallHistoryListProps = {
  records: CallHistoryRecord[];
  loadFailed: boolean;
  loading: boolean;
  onRetry: () => void;
};

export const CallHistoryList: FC<CallHistoryListProps> = ({
  records,
  loadFailed,
  loading,
  onRetry,
}) => {
  if (loadFailed) {
    return <CallHistoryError retrying={loading} onRetry={onRetry} />;
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
