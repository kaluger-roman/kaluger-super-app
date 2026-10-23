import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const unhandledRequests: string[] = [];

// Unit tests never reach the network: a request no test handler (`server.use(...)`) answers gets a
// network error and is recorded, and setup.ts fails the test that made it.
export const server = setupServer(
  http.all("*", ({ request }) => {
    unhandledRequests.push(`${request.method} ${request.url}`);
    return HttpResponse.error();
  })
);

export const takeUnhandledRequests = () => unhandledRequests.splice(0);
