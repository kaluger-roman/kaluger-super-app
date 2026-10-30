import { apiRequest } from "./api";

export const runAlertChecks = async (types: string[]): Promise<void> => {
  await apiRequest("/api/__test__/admin/run-alert-checks", {
    method: "POST",
    body: { types },
    expectStatus: 200,
  });
};

export const clearAdminAlerts = async (): Promise<void> => {
  await apiRequest("/api/__test__/admin/alerts", { method: "DELETE", expectStatus: 200 });
};
