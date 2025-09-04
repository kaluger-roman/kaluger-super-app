import React from "react";
import { Alert } from "@mui/material";
import { Lesson } from "../../../../../shared";

type Props = {
  startTime: Date;
  endTime: Date;
  lesson?: Lesson;
};

export const PastDateNotice: React.FC<Props> = ({
  startTime,
  endTime,
  lesson,
}) => {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const startTs = startTime ? new Date(startTime).getTime() : null;
  const endTs = endTime ? new Date(endTime).getTime() : null;

  React.useEffect(() => {
    try {
      const now = Date.now();
      const start = startTs ? new Date(startTs) : null;
      const end = endTs ? new Date(endTs) : null;

      let statusCode: "COMPLETED" | "IN_PROGRESS" | "SCHEDULED" = "SCHEDULED";

      if (end && end.getTime() < now) {
        statusCode = "COMPLETED";
      } else if (
        start &&
        start.getTime() <= now &&
        end &&
        end.getTime() > now
      ) {
        statusCode = "IN_PROGRESS";
      } else {
        statusCode = "SCHEDULED";
      }

      if (start && start.getTime() < now && lesson?.status !== "COMPLETED") {
        const ruLabel =
          statusCode === "COMPLETED"
            ? "Завершён"
            : statusCode === "IN_PROGRESS"
            ? "Идёт сейчас"
            : "Запланирован";

        const text = `Согласно указанной дате после сохранения статус будет '${ruLabel}'.`;

        setMessage(text);
        setVisible(true);
        return;
      }

      setVisible(false);
      setMessage("");
    } catch (err) {
      // ignore
    }
  }, [startTs, endTs, lesson]);

  if (!visible) return null;

  return <Alert severity="info">{message}</Alert>;
};
