import fs from "fs";
import type { DiskSpace } from "./backupAlerts.types";

// `bavail`, not `bfree`: blocks reserved for root are not available to the backend.
export const getDiskSpace = async (dir: string): Promise<DiskSpace> => {
  const stats = await fs.promises.statfs(dir);
  return { freeBytes: stats.bavail * stats.bsize, totalBytes: stats.blocks * stats.bsize };
};
