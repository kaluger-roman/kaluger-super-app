import { describe, it, expect } from "vitest";

import { extractAxiosError } from "../error.helpers";

describe("extractAxiosError", () => {
  it("should return server error from response.data.error", () => {
    const error = {
      response: { data: { error: "Серверная ошибка" } },
      message: "Request failed",
    };

    expect(extractAxiosError(error, "Дефолт")).toBe("Серверная ошибка");
  });

  it("should return fallback when response.data.error is missing, ignoring error.message", () => {
    const error = {
      response: { data: {} },
      message: "Network Error",
    };

    expect(extractAxiosError(error, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when response and message are absent", () => {
    expect(extractAxiosError({}, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when error is null", () => {
    expect(extractAxiosError(null, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when error is undefined", () => {
    expect(extractAxiosError(undefined, "Дефолт")).toBe("Дефолт");
  });

  it("should return fallback when response.data is null", () => {
    const error = { response: { data: null } };

    expect(extractAxiosError(error, "Дефолт")).toBe("Дефолт");
  });

  it("should return response.data.error even when message is also set", () => {
    const error = {
      response: { data: { error: "Сервер" } },
      message: "Network Error",
    };

    expect(extractAxiosError(error, "Дефолт")).toBe("Сервер");
  });

  it("should use default fallback when none provided", () => {
    expect(extractAxiosError({})).toBe("Произошла ошибка. Попробуйте позже");
  });
});
