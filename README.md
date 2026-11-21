# Sente

**Know which mobile-money payments are real.**

A mobile-money ledger and fake-payment detector for Ugandan small shops.
Paste your MoMo / Airtel Money SMS and get the day's books back — with every
forged payment flagged in red and the reason spelled out.

Built solo in 75 minutes at **Cursor Hackathon Kampala** (SpaceXSI), theme:
*AI for Local Impact*.

---

## The problem

A shop in Kampala takes a couple of hundred mobile-money messages a day and
reconciles them by scrolling through SMS in the evening.

Meanwhile the fake-payment scam is everywhere: someone shows a forged
"You have received UGX 180,000" confirmation, walks out with the goods, and the
money never arrives. The message is a screenshot. Or a hand-typed SMS.

## The insight

Real mobile-money SMS carry a **running balance**. So consecutive genuine
messages chain arithmetically:

```
previous_balance + amount − fee − tax = new_balance
```

A forged message almost never gets this right. And because the check is
arithmetic, the result is *explainable* — every flag can say exactly how much
money is missing from the chain.

The detector walks the messages keeping a **trusted** balance. A message that
breaks the chain is flagged and **does not** update the trusted balance, so the
genuine messages *after* a forgery still reconcile perfectly. That's what makes
it usable on a messy real-world inbox rather than a clean synthetic one.

## What it checks

| Signal | Weight | Catches |
|---|---|---|
| **Balance chain broken** | 60 | Forged messages with an invented closing balance |
| **Replayed transaction ID** | 70 | A forged message that copies a real ID already used earlier that day |
| **No transaction ID** | 20 | Hand-typed messages that omit the `Financial Transaction Id` line |
| **Template typo / phrasing** | 20 / 15 | "recieved", "Your balance is now" — language-level forgery |
| **No fee charged** | 15 | Sends/withdrawals with no fee or excise tax |

Score ≥ 70 → **fake**, 40–69 → **suspect**, below → **real**.
Flagged messages are excluded from the totals, and the amount at risk is shown
separately.

## Architecture

```
lib/parse.ts    SMS → structured transactions (regex, runs on-device)
lib/detect.ts   the fraud signals + balance-chain walk (pure functions)
app/page.tsx    the whole UI, one screen
app/api/analyze OPTIONAL model layer: rewrites reasons into plain English
```

The detection core is **deterministic and local**. The language model is a
thin, optional layer on top that turns the rule output into one sentence a shop
owner would understand, and can catch language drift the rules miss.

If there is no API key, the model is slow, or the network dies — **the app still
works**. The flags, the totals and the reasoning are all computed on-device.
The demo cannot fail because of an API.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and press **Try sample**.

Optional — nicer written explanations:

```bash
cp .env.example .env.local   # add OPENAI_API_KEY / XAI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY
```

## The sample data reconciles

The 28-message demo dataset is a real ledger, not filler:

```
opening  850,000
+ in     600,500
− out    678,800   (includes 13,800 in fees and excise tax)
= closing 771,700   ← matches the final message exactly
```

Three messages are fake, each failing in a **different** way:

| Time | Amount | Why it fails |
|---|---|---|
| 13:20 | 180,000 | Balance chain gap of 141,920 · no transaction ID |
| 15:52 | 250,000 | Replays transaction ID `412300004` from 09:47 · balance gap of 50,000 |
| 16:50 | 180,000 | Balance gap of 40,000 · typo "recieved" · non-standard phrasing |

UGX 610,000 at risk in one afternoon.

## Deploy

```bash
npx vercel        # or import the repo at vercel.com
```

No database, no environment variables required.

## Limits — stated plainly

This is a **risk score, not proof**.

- SMS sender IDs can be spoofed at the network level.
- A screenshot can be forged more convincingly than an SMS.
- A forger who gets the balance arithmetic, the fee arithmetic *and* a
  genuinely unused transaction ID right would pass — but that requires a real
  telco-issued ID, which is the hard part.
- The chain check needs a message with a balance; statements without running
  balances fall back to the other signals.

The point isn't certainty. It's that shop owners currently check *nothing*, and
a balance chain catches the overwhelming majority of what they actually see.

## Roadmap

- Screenshot upload (vision extraction → same detection pipeline)
- Airtel Money and bank SMS templates
- Customer credit book — who owes what
- Offline PWA so it works on a shop phone with no data

## License

MIT
