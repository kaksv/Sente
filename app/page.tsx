"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { SAMPLE_SMS } from "@/lib/samples";
import { parseSms } from "@/lib/parse";
import { analyse, money } from "@/lib/detect";
import type { Row, Summary } from "@/lib/types";

type AiState = "idle" | "loading" | "on" | "off";

const kindLabel = (k: Row["kind"]) =>
  k === "receive" ? "Received" : k === "send" ? "Sent" : "Withdrawal";

/** Resize screenshots in the browser before sending them for OCR. */
async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode failed"));
      i.src = url;
    });
    const MAX = 1200;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Page() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ai, setAi] = useState<AiState>("idle");
  const [extracting, setExtracting] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleImage = useCallback(
    async (file: File) => {
      if (extracting) return;
      if (!file.type.startsWith("image/")) {
        setUploadNote("That file isn't an image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadNote("That image is over 10 MB. Choose a smaller image or paste the text.");
        return;
      }
      setExtracting(true);
      setUploadNote("Reading screenshot…");
      try {
        const image = await downscale(file);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        const data = await res.json();
        if (data?.ok && data.text) {
          const merged = raw.trim() ? raw.trim() + "\n" + data.text : data.text;
          setRaw(merged);
          setUploadNote(null);
          run(merged);
        } else {
          setUploadNote(
            data?.reason === "no-key"
              ? "Screenshot reading is off — no model key configured. Paste the text instead."
              : "Couldn't read that image. Try a sharper crop, or paste the text."
          );
        }
      } catch {
        setUploadNote(
          "Couldn't read that image. Try a sharper crop, or paste the text."
        );
      } finally {
        setExtracting(false);
      }
    },
    [extracting, raw, run]
  );

  const loadSample = () => {
    setRaw(SAMPLE_SMS);
    setUploadNote(null);
    run(SAMPLE_SMS);
  };

  const clear = () => {
    setRaw("");
    setRows(null);
    setSummary(null);
    setAi("idle");
    setUploadNote(null);
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

      <section
        className={`composer ${dragging ? "drag" : ""}`}
        aria-busy={extracting}
        onDragOver={(e) => {
          e.preventDefault();
          if (!extracting) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (extracting) return;
          const f = e.dataTransfer.files?.[0];
          if (f) handleImage(f);
        }}
      >
        <label className="composer-label" htmlFor="sms-input">
          Paste or edit mobile-money messages
        </label>
        <textarea
          id="sms-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={extracting}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(raw);
          }}
          spellCheck={false}
          placeholder={`Paste mobile-money SMS here — one message per line.\n\n09:02 You have received UGX 50,000 from JOHN MUKASA 256772001122. Financial Transaction Id: 412300001. Your new balance is UGX 900,000.`}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImage(f);
            e.target.value = "";
          }}
        />

        <div className="actions">
          <button className="btn btn-primary" onClick={loadSample} disabled={extracting}>
            Try sample
          </button>
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            disabled={extracting}
          >
            {extracting ? "Reading…" : "Upload screenshot"}
          </button>
          <button className="btn" onClick={() => run(raw)} disabled={extracting}>
            Analyse
          </button>
          <button className="btn btn-ghost" onClick={clear} disabled={extracting}>
            Clear
          </button>
          <span className="hint">
            drop a screenshot anywhere · ⌘↵ to analyse
          </span>
        </div>

        <p className="privacy-note">
          Fraud checks run here. With a model key configured, flagged SMS text
          is sent for explanations; uploaded screenshots are sent to the
          configured provider for OCR. Sente does not save them to an app database.
        </p>
        {uploadNote && <p className="note" role="status" aria-live="polite">{uploadNote}</p>}
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
              <span className="sub">excluded from the totals above</span>
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
        <span>No accounts · no Sente database</span>
        <span>Balance-chain · replayed IDs · fee arithmetic · template drift</span>
        <span>Risk score, not proof</span>
      </footer>
    </main>
  );
}
