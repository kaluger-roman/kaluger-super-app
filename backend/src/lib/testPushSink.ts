import webpush from "web-push";
import type { PushSubscription, RequestOptions } from "web-push";

// What the e2e push sink received: the web-push request of every push the backend sent to it,
// and the payload the service worker would get, so a test opens what the notification opens.
export type TestPushEntry = {
  ttl: string | null;
  urgency: string | null;
  topic: string | null;
  payload: unknown;
  receivedAt: Date;
};

const SINK_PATH = /\/api\/__test__\/push-sink\/([^/?#]+)$/;

const sink = new Map<string, TestPushEntry[]>();

const readHeader = (headers: Record<string, unknown>, name: string): string | null =>
  headers[name] === undefined ? null : String(headers[name]);

// In tests a subscription whose endpoint is the sink gets the push here instead of over the
// network: web-push still signs and encrypts it, only the request is not sent.
export const deliverToTestPushSink = (
  subscription: PushSubscription,
  body: string,
  options: RequestOptions
): boolean => {
  const key = new URL(subscription.endpoint).pathname.match(SINK_PATH)?.[1];
  if (!key) return false;
  const { headers } = webpush.generateRequestDetails(subscription, body, options);
  const entry = {
    ttl: readHeader(headers, "TTL"),
    urgency: readHeader(headers, "Urgency"),
    topic: readHeader(headers, "Topic"),
    payload: JSON.parse(body) as unknown,
    receivedAt: new Date(),
  };
  sink.set(key, [...(sink.get(key) ?? []), entry]);
  return true;
};

export const listTestPushes = (key: string): TestPushEntry[] => sink.get(key) ?? [];

export const clearTestPushSink = (): void => {
  sink.clear();
};
