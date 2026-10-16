import type { FC } from "react";

import { CallHistoryEmpty } from "./CallHistoryEmpty";
import * as Styled from "./CallHistoryList.styled";
import { CallHistoryRow } from "./CallHistoryRow";
import type { CallHistoryRecord } from "../../videoCall.types";

type CallHistoryListProps = {
  records: CallHistoryRecord[];
};

export const CallHistoryList: FC<CallHistoryListProps> = ({ records }) => {
  if (records.length === 0) {
    return <CallHistoryEmpty />;
  }

  return (
    <Styled.ListBox>
      {records.map((record) => (
        <CallHistoryRow key={record.id} record={record} />
      ))}
    </Styled.ListBox>
  );
};
