import { CABLE_NUMBER_PREFIX, CABLE_NUMBER_WIDTH } from "@wireframe-av/shared/src/constants";

export function nextCableNumber(existingCableNumbers: string[]) {
  const max = existingCableNumbers.reduce((highest, cableNumber) => {
    const match = cableNumber.match(/^C-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `${CABLE_NUMBER_PREFIX}-${String(max + 1).padStart(CABLE_NUMBER_WIDTH, "0")}`;
}
