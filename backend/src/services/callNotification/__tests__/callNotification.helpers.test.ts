import {
  toCallUrl,
  toTopic,
  toWebPushOptions,
  toWebPushPayload,
} from "../callNotification.helpers";

describe("callNotification helpers", () => {
  it("should derive a 32-character URL-safe topic per call", () => {
    const topic = toTopic("8c4f9d5e-0a1b-4c2d-9e3f-123456789abc");

    expect(topic).toHaveLength(32);
    expect(topic).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(toTopic("8c4f9d5e-0a1b-4c2d-9e3f-123456789abc")).toBe(topic);
    expect(toTopic("another-call")).not.toBe(topic);
  });

  it("should open the incoming call on the recipient's own page", () => {
    expect(toCallUrl("tutor", "incoming_call", "c-1")).toBe("/dashboard?call=c-1");
    expect(toCallUrl("student", "incoming_call", "c-1")).toBe("/student/cabinet/schedule?call=c-1");
  });

  it("should lead a missed call to the call history and a closed one home", () => {
    expect(toCallUrl("tutor", "missed_call", "c-1")).toBe("/call/history");
    expect(toCallUrl("student", "missed_call", "c-1")).toBe("/student/cabinet/calls");
    expect(toCallUrl("tutor", "call_closed", "c-1")).toBe("/dashboard");
    expect(toCallUrl("student", "call_closed", "c-1")).toBe("/student/cabinet/schedule");
  });

  it("should build the incoming call notification", () => {
    expect(
      toWebPushPayload({
        kind: "incoming_call",
        callId: "c-1",
        callerName: "Анна Петрова",
        recipientKind: "student",
      })
    ).toEqual({
      title: "Входящий видеозвонок",
      body: "Анна Петрова",
      tag: "call-c-1",
      data: { type: "incoming_call", callId: "c-1", url: "/student/cabinet/schedule?call=c-1" },
    });
  });

  it("should replace the incoming call notification with the missed or the closed one", () => {
    const missed = toWebPushPayload({
      kind: "missed_call",
      callId: "c-1",
      callerName: "Иван",
      recipientKind: "tutor",
    });
    const closed = toWebPushPayload({
      kind: "call_closed",
      callId: "c-1",
      callerName: "Иван",
      recipientKind: "tutor",
    });

    expect(missed).toMatchObject({
      title: "Пропущенный звонок",
      body: "Пропущенный звонок от Иван",
      tag: "call-c-1",
      data: { type: "missed_call", url: "/call/history" },
    });
    expect(closed).toMatchObject({
      title: "Вызов завершён",
      body: "Звонок принят или отклонён на другом устройстве",
      tag: "call-c-1",
      data: { type: "call_closed", url: "/dashboard" },
    });
  });

  it("should send an incoming call urgently and only while it rings", () => {
    const message = { callId: "c-1", callerName: "Иван", recipientKind: "tutor" } as const;

    expect(toWebPushOptions({ ...message, kind: "incoming_call" })).toEqual({
      TTL: 40,
      urgency: "high",
      topic: toTopic("c-1"),
    });
    expect(toWebPushOptions({ ...message, kind: "missed_call" })).toEqual({
      TTL: 86400,
      urgency: "normal",
      topic: toTopic("c-1"),
    });
    expect(toWebPushOptions({ ...message, kind: "call_closed" })).toEqual({
      TTL: 60,
      urgency: "normal",
      topic: toTopic("c-1"),
    });
  });
});
