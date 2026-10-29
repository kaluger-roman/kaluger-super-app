import webpush from "web-push";

export type PushDelivery = jest.Mock<Promise<unknown>, [string, string, Record<string, string>]>;

// For a test file that mocks web-push: `jest.mock("web-push", () => ({ sendNotification:
// jest.fn() }))`. Every push reaches `delivery(endpoint, payloadJson, headers)`: resolved → sent,
// rejected with `{ statusCode }` → that HTTP status from the push service, rejected otherwise →
// a network error.
export const installWebPushDelivery = (): PushDelivery => {
  const delivery: PushDelivery = jest.fn();
  delivery.mockResolvedValue(undefined);
  jest
    .mocked(webpush.sendNotification)
    .mockImplementation(async (subscription, payload, options) => {
      await delivery(subscription.endpoint, String(payload), {
        ...(options?.TTL !== undefined ? { TTL: String(options.TTL) } : {}),
        ...(options?.urgency ? { Urgency: options.urgency } : {}),
        ...(options?.topic ? { Topic: options.topic } : {}),
      });
      return { statusCode: 201, body: "", headers: {} };
    });
  return delivery;
};
