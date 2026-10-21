import { AUTH_PAGES } from "./session.constants";
import { clearTutorToken } from "./tokenStorage.helpers";

// The tutor's token no longer works: drop it and send the user to the login page.
export const expireTutorSession = (): void => {
  clearTutorToken();
  if (!AUTH_PAGES.includes(window.location.pathname)) {
    window.location.href = "/login";
  }
};
