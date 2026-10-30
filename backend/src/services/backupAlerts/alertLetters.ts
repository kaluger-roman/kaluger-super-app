import { dispatchAlertEmails, getErrorMessage } from "../adminAlerts";

// An admin's HTTP request must not wait for Resend: letters go out after the response.
export const sendLettersInBackground = (): void => {
  dispatchAlertEmails().catch((error: unknown) => {
    console.error("Alert letters dispatch failed:", { message: getErrorMessage(error) });
  });
};
