import { generateAdminToken, generateToken } from "../../../utils/auth";
import { generateStudentToken } from "../../../utils/studentAuth";
import { authenticateStudentWebSocket } from "../studentAuth";

describe("authenticateStudentWebSocket", () => {
  it("returns payload when student JWT is valid", async () => {
    const token = generateStudentToken({
      studentUserId: "su-1",
      email: "s@example.com",
      isStudent: true,
    });

    const ws: any = { close: jest.fn() };
    const request: any = { url: `/?token=${encodeURIComponent(token)}` };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toEqual({
      studentUserId: "su-1",
      email: "s@example.com",
    });
    expect(ws.close).not.toHaveBeenCalled();
  });

  it("rejects when token query parameter is missing", async () => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: "/" };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "No token provided");
  });

  it("rejects a tutor JWT signed with the wrong secret", async () => {
    const tutorToken = generateToken({
      userId: "u-1",
      email: "t@example.com",
    });
    const ws: any = { close: jest.fn() };
    const request: any = {
      url: `/?token=${encodeURIComponent(tutorToken)}`,
    };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("rejects an admin JWT signed with the admin secret", async () => {
    const adminToken = generateAdminToken({
      email: "admin@example.com",
      isAdmin: true,
    });
    const ws: any = { close: jest.fn() };
    const request: any = {
      url: `/?token=${encodeURIComponent(adminToken)}`,
    };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("rejects a malformed token", async () => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: "/?token=not.a.jwt" };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });
});
