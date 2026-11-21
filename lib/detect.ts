import type { Tx, Row, Signal, Summary, Verdict } from "./types";

const signed = (t: Tx) =>
  t.direction === "in" ? t.amount : -(t.amount + t.fee + t.tax);

function push(r: Row, s: Signal) {
  if (!r.signals.some((x) => x.code === s.code)) r.signals.push(s);
}

/**
 * The core idea:
 *
 * Real mobile-money SMS carry a running balance, so consecutive genuine
 * messages chain arithmetically:
 *
 *     previous_balance + amount - fee - tax = new_balance
 *
 * We walk the list keeping a "trusted" balance. A message that breaks the
 * chain is flagged AND does not update the trusted balance, so the genuine
 * messages after a forgery still reconcile perfectly.
 */
export function analyse(txs: Tx[]): { rows: Row[]; summary: Summary } {
  const rows: Row[] = txs
    .slice()
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
    .map((t) => ({
      ...t,
      score: 0,
      verdict: "real" as Verdict,
      signals: [],
      expectedBalance: null,
      balanceDelta: null,
      explanation: null,
    }));

  const seenRefs = new Map<string, Row>();

  // Derive the opening balance from the first message, so the user never has
  // to type it in.
  let trusted: number | null = null;
  if (rows.length && rows[0].balance !== null) {
    trusted = (rows[0].balance as number) - signed(rows[0]);
  }
  const opening = trusted;

  for (const r of rows) {
    // 1. Replayed transaction ID
    if (r.ref) {
      const first = seenRefs.get(r.ref);
      if (first) {
        push(r, {
          code: "REF_REPLAY",
          label: "Replayed transaction ID",
          weight: 70,
          detail: `Transaction ID ${r.ref} was already used at ${
            first.time ?? "an earlier time"
          } for a different payment. A telco-issued ID is unique — this one is a copy.`,
        });
      } else {
        seenRefs.set(r.ref, r);
      }
    }

    // 2. Balance chain
    if (trusted !== null && r.balance !== null) {
      const expected = trusted + signed(r);
      r.expectedBalance = expected;
      r.balanceDelta = r.balance - expected;
      if (r.balanceDelta !== 0) {
        push(r, {
          code: "BALANCE_BREAK",
          label: "Balance chain broken",
          weight: 60,
          detail: `Claims a balance of ${money(r.balance)}, but the last verified balance plus this amount is ${money(
            expected
          )} — a gap of ${money(Math.abs(r.balanceDelta))}.`,
        });
      } else {
        trusted = r.balance;
      }
    }

    // 3. Missing transaction ID on an inbound payment
    if (!r.ref && r.direction === "in") {
      push(r, {
        code: "NO_REF",
        label: "No transaction ID",
        weight: 20,
        detail:
          "Every genuine mobile-money receipt carries a Financial Transaction Id. This message has none.",
      });
    }

    // 4. Template drift
    if (/recieved|resevied|recived|receved/i.test(r.raw)) {
      push(r, {
        code: "TYPO",
        label: "Template typo",
        weight: 20,
        detail:
          "'received' is misspelled. The telco's template never misspells it — a forger typed this by hand.",
      });
    }
    if (r.balance !== null && !/your new balance is/i.test(r.raw)) {
      push(r, {
        code: "PHRASING",
        label: "Non-standard phrasing",
        weight: 15,
        detail:
          "The balance line doesn't match the standard 'Your new balance is' template.",
      });
    }

    // 5. Fee arithmetic
    if (r.kind !== "receive" && r.fee === 0 && r.amount > 5000) {
      push(r, {
        code: "NO_FEE",
        label: "No fee charged",
        weight: 15,
        detail:
          "Genuine sends and withdrawals above UGX 5,000 always carry a fee plus excise tax. This one has neither.",
      });
    }

    r.score = Math.min(
      100,
      r.signals.reduce((s, x) => s + x.weight, 0)
    );
    r.verdict = r.score >= 70 ? "fake" : r.score >= 40 ? "suspect" : "real";
  }

  const real = rows.filter((r) => r.verdict !== "fake");
  const fakes = rows.filter((r) => r.verdict === "fake");
  const lastReal = [...real].reverse().find((r) => r.balance !== null);

  const summary: Summary = {
    moneyIn: real
      .filter((r) => r.direction === "in")
      .reduce((s, r) => s + r.amount, 0),
    moneyOut: real
      .filter((r) => r.direction === "out")
      .reduce((s, r) => s + r.amount + r.fee + r.tax, 0),
    fees: real.reduce((s, r) => s + r.fee + r.tax, 0),
    closing: lastReal?.balance ?? null,
    opening,
    realCount: rows.filter((r) => r.verdict === "real").length,
    fakeCount: fakes.length,
    suspectCount: rows.filter((r) => r.verdict === "suspect").length,
    atRisk: fakes.reduce((s, r) => s + r.amount, 0),
  };

  return { rows, summary };
}

export const money = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-US");
