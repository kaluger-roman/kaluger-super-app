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

  it("should keep the revoked version when an older lookup tries to cache its result later", () => {
    revokeTutorSessions("user-2", 5);

    setCachedTokenVersion("user-2", 4);

    expect(getCachedTokenVersion("user-2")).toBe(5);
  });
});
