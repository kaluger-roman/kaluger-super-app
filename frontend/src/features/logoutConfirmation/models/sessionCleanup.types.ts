export type SessionRole = "tutor" | "student";

export type CleanupParams = {
  role: SessionRole;
  registration: ServiceWorkerRegistration | null;
};
