const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

// The public address of the web app: links in emails and student invitations point here.
export const getFrontendUrl = (): string => {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error("FRONTEND_URL is not set");
  }
  return url.replace(/\/$/, "");
};

// Why the URL cannot be the public address of a production app, or null when it can.
export const findPublicUrlProblem = (url: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "is not an absolute URL";
  }
  if (parsed.protocol !== "https:") return "must use https";
  if (LOCAL_HOSTNAMES.includes(parsed.hostname)) return "points to the local machine";
  return null;
};

// A real production server, as opposed to the QA stack that runs a production build on localhost.
export const isPublicProductionServer = (): boolean =>
  process.env.NODE_ENV === "production" &&
  findPublicUrlProblem(process.env.FRONTEND_URL ?? "") === null;
