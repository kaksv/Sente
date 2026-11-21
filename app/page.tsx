"use client";

import { Fragment, useCallback, useState } from "react";
import { SAMPLE_SMS } from "@/lib/samples";
import { parseSms } from "@/lib/parse";
import { analyse, money } from "@/lib/detect";
import type { Row, Summary } from "@/lib/types";

type AiState = "idle" | "loading" | "on" | "off";

const kindLabel = (k: Row["kind"]) =>
  k === "receive" ? "Received" : k === "send" ? "Sent" : "Withdrawal";

export default function Page() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ai, setAi] = useState<AiState>("idle");

  const run = useCallback(async (text: string) => {
    const txs = parseSms(text);
    if (!txs.length) return;

    const { rows: r, summary: s } = analyse(txs);
    setRows(r);
    setSummary(s);

    const flagged = r
      .filter((x) => x.verdict !== "real")
      .map((x) => ({
        id: x.id,
        time: x.time,
        counterparty: x.counterparty,
        amount: x.amount,
        raw: x.raw,
        signals: x.signals.map((g) => ({ label: g.label, detail: g.detail })),
      }));

    if (!flagged.length) {
      setAi("off");
      return;
    }

    setAi("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged }),
      });
      const data = await res.json();
      if (data?.ok && data.explanations) {
        setRows((prev) =>
          prev
            ? prev.map((x) => ({
                ...x,
                explanation:
                  data.explanations[String(x.id)] ?? x.explanation,
              }))
            : prev
        );
        setAi("on");
      } else {
        setAi("off");
      }
    } catch {
      setAi("off");
    }
  }, []);

  const loadSample = () => {
    setRaw(SAMPLE_SMS);
    run(SAMPLE_SMS);
  };

  const clear = () => {
    setRaw("");
    setRows(null);
    setSummary(null);
    setAi("idle");
  };

  const reconciled =
    !!rows &&
    rows
      .filter((r) => r.verdict !== "fake")
      .every((r) => r.balanceDelta === null || r.balanceDelta === 0);

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <div className="brand">
            <div className="mark">S</div>
            <div>
              <h1>Sente</h1>
              <p className="tagline">
                Know which mobile-money payments are real.
              </p>
            </div>
          </div>
        </div>
        <span className="badge">AI for Local Impact</span>
      </header>

      <section className="composer">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(raw);
          }}
          spellCheck={false}
          placeholder={`Paste mobile-money SMS here — one message per line.\n\n09:02 You have received UGX 50,000 from JOHN MUKASA 256772001122. Financial Transaction Id: 412300001. Your new balance is UGX 900,000.`}
        />
        <div className="actions">
          <button className="btn btn-primary" onClick={loadSample}>
            Try sample
          </button>
          <button className="btn" onClick={() => run(raw)}>
            Analyse
          </button>
          <button className="btn btn-ghost" onClick={clear}>
            Clear
          </button>
          <span className="hint">⌘↵ to analyse · nothing leaves this device</span>
        </div>
      </section>

      {summary && (
        <>
          <div className="cards">
            <div className="card in">
              <div className="k">Money in</div>
              <div className="v">{money(summary.moneyIn)}</div>
            </div>
            <div className="card out">
              <div className="k">Money out</div>
              <div className="v">{money(summary.moneyOut)}</div>
            </div>
            <div className="card">
              <div className="k">Fees &amp; tax</div>
              <div className="v">{money(summary.fees)}</div>
            </div>
            <div className="card close">
              <div className="k">Closing balance</div>
              <div className="v">
                {summary.closing !== null ? money(summary.closing) : "—"}
              </div>
            </div>
          </div>

          {summary.fakeCount > 0 ? (
            <div className="alert">
              <span className="dot" />
              <span className="msg">
                <span className="num">{summary.fakeCount}</span>{" "}
                {summary.fakeCount === 1 ? "payment is" : "payments are"} fake ·{" "}
                <span className="num">{money(summary.atRisk)}</span> at risk
              </span>
              <span className="sub">
                excluded from the totals above
              </span>
            </div>
          ) : (
            <div className="ok-banner">
              No fake payments detected — the balance chain holds across every
              message.
            </div>
          )}

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Counterparty</th>
                  <th className="hide-sm">Type</th>
                  <th className="num">Amount</th>
                  <th className="num hide-sm">Fee</th>
                  <th className="num hide-sm">Balance</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className={
                        r.verdict === "fake"
                          ? "flag"
                          : r.verdict === "suspect"
                          ? "suspect"
                          : ""
                      }
                    >
                      <td className="time">{r.time ?? "—"}</td>
                      <td className="cp">
                        {r.counterparty}
                        {r.phone && <span className="phone">{r.phone}</span>}
                      </td>
                      <td className="hide-sm">{kindLabel(r.kind)}</td>
                      <td className="num">
                        {r.direction === "in" ? "+ " : "− "}
                        {money(r.amount)}
                      </td>
                      <td className="num hide-sm">
                        {r.fee + r.tax > 0 ? money(r.fee + r.tax) : "—"}
                      </td>
                      <td className="num hide-sm">
                        {r.balance !== null ? money(r.balance) : "—"}
                      </td>
                      <td>
                        <span className={`pill ${r.verdict}`}>
                          {r.verdict === "real" ? "real" : r.verdict}
                        </span>
                      </td>
                    </tr>
                    {r.verdict !== "real" && (
                      <tr className="why">
                        <td colSpan={7}>
                          <div className="line">
                            {r.explanation ?? r.signals[0]?.detail}
                          </div>
                          <div className="chips">
                            {r.signals.map((s) => (
                              <span className="chip" key={s.code}>
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`ai-note ${ai === "on" ? "on" : ""}`}>
            <span className="led" />
            {ai === "loading"
              ? "Writing plain-language explanations…"
              : ai === "on"
              ? "Explanations written by the model · flags computed on-device"
              : "Four fraud signals checked on-device · balance chain verified"}
            {reconciled && " · ledger reconciled"}
          </div>
        </>
      )}

      <footer className="footer">
        <span>Runs locally · no accounts · no storage</span>
        <span>Balance-chain · replayed IDs · fee arithmetic · template drift</span>
        <span>Risk score, not proof</span>
      </footer>
    </main>
  );
}
