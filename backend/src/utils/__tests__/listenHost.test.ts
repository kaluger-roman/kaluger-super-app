import { getListenHost } from "../listenHost";

describe("getListenHost", () => {
  const snapshot = process.env.HOST;

  afterEach(() => {
    if (snapshot === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = snapshot;
    }
  });

  it("listens on loopback only when HOST is not set", () => {
    delete process.env.HOST;
    expect(getListenHost()).toBe("127.0.0.1");
  });

  it.each(["", "   "])("falls back to loopback when HOST is %j", (value) => {
    process.env.HOST = value;
    expect(getListenHost()).toBe("127.0.0.1");
  });

  it("uses HOST when it is set", () => {
    process.env.HOST = " 0.0.0.0 ";
    expect(getListenHost()).toBe("0.0.0.0");
  });
});
