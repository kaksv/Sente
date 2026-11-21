export type Direction = "in" | "out";
export type Kind = "receive" | "send" | "withdraw";
export type Verdict = "real" | "suspect" | "fake";

export interface Tx {
  id: number;
  raw: string;
  time: string | null;
  direction: Direction;
  kind: Kind;
  amount: number;
  fee: number;
  tax: number;
  balance: number | null;
  ref: string | null;
  counterparty: string;
  phone: string | null;
}

export interface Signal {
  code: string;
  label: string;
  weight: number;
  detail: string;
}

export interface Row extends Tx {
  score: number;
  verdict: Verdict;
  signals: Signal[];
  expectedBalance: number | null;
  balanceDelta: number | null;
  explanation: string | null;
}

export interface Summary {
  moneyIn: number;
  moneyOut: number;
  fees: number;
  closing: number | null;
  opening: number | null;
  realCount: number;
  fakeCount: number;
  suspectCount: number;
  atRisk: number;
}
