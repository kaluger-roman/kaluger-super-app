import { clearTutorToken } from "./tokenStorage.helpers";

const AUTH_PAGES = ["/login", "/register", "/admin"];

// The tutor's token no longer works: drop it and send the user to the login page.
export const expireTutorSession = (): void => {
  clearTutorToken();
  if (!AUTH_PAGES.includes(window.location.pathname)) {
    window.location.href = "/login";
  }
};
