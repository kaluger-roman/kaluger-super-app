export const isIos = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

export const isInStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return "standalone" in window.navigator &&
    (window.navigator as unknown as { standalone: boolean }).standalone === true;
};
