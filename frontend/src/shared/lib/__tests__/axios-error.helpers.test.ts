import { describe, it, expect } from "vitest";

import { extractAxiosErrorMessage } from "../axios-error.helpers";

describe("extractAxiosErrorMessage", () => {
  it("should return server error from response.data.error", () => {
    const error = {
      response: { data: { error: "Серверная ошибка" } },
      message: "Request failed",
    };

    expect(extractAxiosErrorMessage(error, "Дефолт")).toBe("Серверная ошибка");
  });

  it("should return fallback when response.data.error is missing, ignoring error.message", () => {
    // We deliberately skip `.message` because for network/timeout errors it is
    // typically English ("Network Error") and not user-friendly.
    const error = {
      response: { data: {} },
      message: "Network Error",
    };

    expect(extractAxiosErrorMessage(error, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when response and message are absent", () => {
    expect(extractAxiosErrorMessage({}, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when error is null", () => {
    expect(extractAxiosErrorMessage(null, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when error is undefined", () => {
    expect(extractAxiosErrorMessage(undefined, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when response.data is null", () => {
    const error = { response: { data: null } };

    expect(extractAxiosErrorMessage(error, "Дефолт")).toBe("Дефолт");
  });

  it("should return response.data.error even when message is also set", () => {
    const error = {
      response: { data: { error: "Сервер" } },
      message: "Network Error",
    };

    expect(extractAxiosErrorMessage(error, "Дефолт")).toBe("Сервер");
  });
});
