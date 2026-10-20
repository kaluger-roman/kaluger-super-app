import { revokeTutorSessions } from "../tokenRevocation";
import { getCachedTokenVersion, setCachedTokenVersion } from "../tokenVersionCache";

const mockDisconnectUser = jest.fn();
jest.mock("../wsManager", () => ({
  getWebSocketManager: jest.fn(() => ({ disconnectUser: mockDisconnectUser })),
}));

describe("revokeTutorSessions", () => {
  beforeEach(() => {
    mockDisconnectUser.mockReset();
  });

  it("should prime the cache with the new version and close the tutor's socket", () => {
    setCachedTokenVersion("user-1", 3);

    revokeTutorSessions("user-1", 4);

    expect(getCachedTokenVersion("user-1")).toBe(4);
    expect(mockDisconnectUser).toHaveBeenCalledWith("user-1");
  });

  it("should clear the cached version when no fresh token is issued", () => {
    setCachedTokenVersion("user-2", 3);

    revokeTutorSessions("user-2", null);

    expect(getCachedTokenVersion("user-2")).toBeUndefined();
    expect(mockDisconnectUser).toHaveBeenCalledWith("user-2");
  });
});
