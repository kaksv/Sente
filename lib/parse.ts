import type { Tx, Direction, Kind } from "./types";

const num = (s: string) => Number(s.replace(/,/g, ""));

function parseLine(line: string, id: number): Tx {
  const timeMatch = line.match(/(\d{1,2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : null;

  // Balance must be pulled out FIRST, otherwise the principal-amount regex
  // would grab the closing balance instead of the transaction amount.
  const balMatch = line.match(/balance[^0-9]{0,24}UGX\s*([\d,]+)/i);
  const balance = balMatch ? num(balMatch[1]) : null;

  let body = line;
  if (balMatch) body = body.replace(balMatch[0], " ");

  const feeMatch = line.match(/Fee[:\s]*UGX\s*([\d,]+)/i);
  const taxMatch = line.match(/Tax[:\s]*UGX\s*([\d,]+)/i);
  const fee = feeMatch ? num(feeMatch[1]) : 0;
  const tax = taxMatch ? num(taxMatch[1]) : 0;
  if (feeMatch) body = body.replace(feeMatch[0], " ");
  if (taxMatch) body = body.replace(taxMatch[0], " ");

  const refMatch = line.match(
    /(?:Financial Transaction Id|Transaction Id|TID|Ref)[:\s#]*([A-Za-z0-9]+)/i
  );
  const ref = refMatch ? refMatch[1] : null;

  const amountMatch = body.match(/UGX\s*([\d,]+)/i);
  const amount = amountMatch ? num(amountMatch[1]) : 0;

  const isWithdraw = /withdraw/i.test(line);
  const isOut = /\bsent\b|\bpaid\b|withdraw|recieved\s+from\s+you/i.test(line);
  const direction: Direction = isOut ? "out" : "in";
  const kind: Kind = isWithdraw ? "withdraw" : direction === "out" ? "send" : "receive";

  // NOTE: the character class must not include "." — otherwise the lazy match
  // eats the sentence's full stop and runs on into the transaction ID.
  const cpMatch = line.match(
    /\b(?:from|to|at)\s+([A-Za-z0-9 &'\-]+?)(?=\s+\d{9,}|\s*\.|\s*,\s*Fee)/i
  );
  const counterparty = cpMatch ? cpMatch[1].trim() : "Unknown";

  // Ugandan formats only (256XXXXXXXXX or 0XXXXXXXXX). A bare 9-digit number
  // is a transaction ID, not a phone number.
  const phoneMatch = line.match(/\b((?:256|0)\d{9})\b/);

  return {
    id,
    raw: line,
    time,
    direction,
    kind,
    amount,
    fee,
    tax,
    balance,
    ref,
    counterparty,
    phone: phoneMatch ? phoneMatch[1] : null,
  };
}

/** Split a pasted blob into individual messages (one per non-empty line). */
export function parseSms(raw: string): Tx[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => parseLine(line, i))
    .filter((t) => t.amount > 0 || t.balance !== null);
}
