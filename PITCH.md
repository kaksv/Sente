# PITCH — Sente

## Positioning line

> "Sente tells a shop owner which mobile-money payments are real — before the
> customer walks out of the door."

Pick **one** of these for the title slide. Don't stack them.

---

## The 2-minute demo script

Rehearse this out loud three times. Timings are for a 2:00 video; live pitch you
get roughly the same.

### 0:00–0:15 — The problem, no setup

> "Every shop in Kampala runs on mobile money. Two hundred messages a day.
> You reconcile them by scrolling.
>
> And there's a scam: someone shows you a 'You have received UGX 180,000'
> message, you hand over the goods, and the money never comes. It's a screenshot.
> Or it's a fake SMS."

*No slides. Say it straight.*

### 0:15–0:30 — The product

> "This is Sente. You paste your messages in — or upload a screenshot — and it
> gives you the day's ledger."

**Click `Try sample`.** Table populates instantly.

### 0:30–0:50 — The ledger

> "Money in: 600,500. Money out: 678,800. Fees and tax: 13,800. Closing balance:
> 771,700 — which matches the last message on the phone exactly."

*Point at the closing balance matching. This proves it's a real ledger, not a toy.*

### 0:50–1:25 — The kill shot

> "Now — three of these payments are fake. 610,000 shillings."

*Red banner is already visible. Open the first flag.*

> "This one claims a balance of 1,102,000. The previous real message closed at
> 780,080. Add 180,000 and you get 960,080. Real mobile money never jumps by
> 141,920. It's arithmetic — the fake can't do it."

*Open the second flag. This is the sophisticated one — save it.*

> "This one is smarter. It got the arithmetic right, because it was copied from a
> real message. But look — transaction ID 412300027. That ID was already used at
> 9:47 this morning for a different payment. It's a replay."

*Open the third.*

> "And this one — 'You have **recieved**' — misspelled. 'Your balance is now'
> instead of 'Your new balance is'. The template is off. A model catches that;
> regex never would."

### 1:25–1:50 — Why it's built this way

> "Two layers. Deterministic rules do the arithmetic — balance chain, duplicate
> IDs, fee checks. That's explainable: every flag says *why*.
>
> The language model does what rules can't: it reads messy forwarded text, and it
> catches the forgeries that are *almost* the right template.
>
> And it reads screenshots too — drop one on the page and it goes through the
> exact same checks. The model is only the eyes. It never decides.
>
> It runs entirely in the browser with no server state — so it works on a
> shopkeeper's phone with no install."

### 1:50–2:00 — Close

> "This is a risk score, not proof — SMS sender IDs can be spoofed, screenshots
> can be forged. But a shop owner who checks the balance chain catches almost all
> of them, and right now they're checking nothing.
>
> Built in 75 minutes with Cursor. Repo and live link are in the submission."

---

## Q&A defence — prepare for these five

**"Can't a scammer just get the balance right?"**
> Yes — and that's exactly why there are three more signals. Balance chain,
> replayed transaction ID, fee arithmetic, template drift. A forger has to get
> *all* of them right, and the transaction ID is issued by the telco — they can't
> invent a fresh valid one that isn't already used.

**"Isn't this just a regex?"**
> The arithmetic is a regex plus a running total. The third fake is why the model
> is there — 'recieved' and a reworded balance line. Rules score it; the model
> explains it in a sentence a shopkeeper understands.

**"What about screenshots?"**
> Built. Drop a screenshot on the page and it goes through the same pipeline.
> The model is used strictly as OCR — it never decides anything. And the OCR
> prompt explicitly forbids correcting spelling, because "recieved" is one of
> our fraud signals. A model that tidied the text would destroy the evidence.

**"Privacy — people's transaction data?"**
> The fraud checks run in the browser, and Sente has no accounts or database.
> Without a model key, messages stay on the device. If one is configured, flagged
> SMS text is sent to that provider for explanations, and an uploaded, downscaled
> screenshot is sent for OCR. Sente doesn't save them to an app database;
> provider data handling depends on its terms.

**"Would a shop actually use this?"**
> They already do the reconciliation by hand, every evening, in a paper book.
> This is the same job, 20× faster, plus a fraud check they currently don't have
> at all. The wedge is the fraud check — that's what makes them open it.

---

## Judging-rubric mapping

Most local hackathon rubrics weight roughly like this. Hit each explicitly.

| Criterion | How Sente scores |
|---|---|
| **Problem relevance** | The judges personally use MoMo and personally know the scam. Zero education needed. |
| **Technical execution** | Working ledger that reconciles to the shilling; hybrid deterministic + LLM architecture with a stated reason for each layer. |
| **AI use** | AI does *verification*, not generation. Rare, and harder to fake. Model catches language-level forgery. |
| **Demo quality** | Paste → result in 3 seconds. Red flags already on screen. No login, no spinner, no setup. |
| **Completeness** | Everything demoed actually works. Nothing is "and then it would…". |
| **Ambition** | Deliberately narrow. You shipped one thing properly. |

---

## Things that lose points — avoid them

- Saying "it's like ChatGPT for shops." It isn't, and it undersells the detection.
- Apologising for what's missing. State the scope as a decision, not a gap.
- Overclaiming: never say "this detects all fraud." Say "this catches most, and
  here's the limit."
- Demo drift — if a click doesn't work, move on in one second. Don't debug live.
- Reading from slides. The screen is the slide.

---

## Recording the 2-minute video

- Screen record, 1080p, cursor visible.
- Use the **sample data**, not live typing. Live typing wastes 20 seconds.
- Record 3 takes, keep the best. Do not edit fancy — cut dead air only.
- First frame: the app already loaded, sample already pasted. No loading screen.
- Upload unlisted to YouTube or Loom. Put the link in the submission form.
- **Record it by 3:55**, not 4:04. Forms close.
