import { http, HttpResponse } from "msw";

// What a signed-in tutor's app loads in the background after boot or on resume: the push key, the
// reminder settings and the unread-news flag.
export const signedInBackgroundHandlers = [
  http.get("*/api/push/vapid-key", () =>
    HttpResponse.json({ vapidPublicKey: null, configured: false })
  ),
  http.get("*/api/reminder-settings", () =>
    HttpResponse.json({ enabled: false, intervals: [], muteWhenInLesson: false })
  ),
  http.get("*/api/news/has-unread", () => HttpResponse.json({ hasUnread: false })),
];
