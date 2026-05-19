export type LessonForBroadcast = {
  id: string;
  subject: "MATHEMATICS" | "PHYSICS";
  startTime: Date;
  endTime: Date;
  status:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "IN_PROGRESS";
};
