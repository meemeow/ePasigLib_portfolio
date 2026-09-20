export interface FaqTurn {
  id: string;
  role: "patron" | "mutya";
  text: string;
}

let log: FaqTurn[] = [];

export function readFaqLog(): FaqTurn[] {
  return log;
}

export function writeFaqLog(turns: FaqTurn[]): void {
  log = turns;
}

export function clearFaqLog(): void {
  log = [];
}
