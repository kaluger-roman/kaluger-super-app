// Restricts a global cron job to the given tutors. Production cron ticks run unscoped;
// tests pass their own tutor ids so parallel jest workers don't process each other's rows.
export type CronScope = {
  tutorIds: string[];
};
