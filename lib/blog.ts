/**
 * Blog articles. Bodies use a tiny markdown subset rendered by components/markdown.tsx:
 * "## " / "### " headings, "- " bullets, "1. " numbered lists, "> " callouts, **bold**, [links](/path).
 */
export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;       // ISO
  readMins: number;
  tag: string;
  body: string;
};

export const POSTS: Post[] = [
  {
    slug: "collect-rent-mpesa-paybill-kenya",
    title: "How to Collect Rent with M-Pesa Paybill in Kenya (The Right Way)",
    description:
      "A practical guide for Kenyan landlords: set up a Paybill, give every unit its own account number, and stop chasing tenants for M-Pesa messages.",
    date: "2026-09-20",
    readMins: 6,
    tag: "M-Pesa",
    body: `
Most Kenyan tenants already pay rent through M-Pesa. The problem isn't getting paid — it's knowing **who** paid, **for which house**, and **how much is still owed**. If your system is "send money to my number and forward the message", you already know how quickly that turns into a mess.

This guide covers how to set up rent collection on an M-Pesa Paybill so that every shilling lands in the right place.

## Why a Paybill beats a personal number or Till

When tenants send money to your personal line, your M-Pesa statement mixes rent with school fees, shopping and family transfers. You end up scrolling through messages at the end of the month trying to match names to houses.

A **Lipa na M-Pesa Paybill** gives you three things a personal number doesn't:

- **An account number field.** The tenant types a reference (like the house number) with every payment, so the payment tells you where it belongs.
- **A business statement.** Rent is separated from your personal money, which makes records and audits far easier.
- **Automation.** A Paybill can be connected to software through Safaricom's Daraja platform, so payments are recorded the moment they arrive.

A Till number (Buy Goods) is great for shops, but it has no account number field. For rent, where you need to know which unit is paying, a Paybill is the better fit.

## Step 1: Get a Paybill

Apply for a Lipa na M-Pesa Paybill through Safaricom — as a business, or through an agent or property manager that already has one. You'll need your business or personal registration documents and a bank account for settlement. Safaricom's requirements change from time to time, so confirm the current list with them before you apply.

## Step 2: Give every unit a unique account number

This is the step most landlords skip, and it's the one that matters most. Don't let tenants type their name or "rent" as the account. Give each unit a short, unique code, for example:

- **KAR-A1** for Riverside Court, house A1
- **KAR-B3** for Riverside Court, house B3
- **KAR-SHOP1** for the shop on the ground floor

A consistent prefix (here "KAR") plus the unit label means every payment can be traced to exactly one house — even when a relative or employer pays on the tenant's behalf.

> Tip: print the Paybill number and each unit's account number on the tenancy agreement, the monthly reminder and a sticker inside the door. Tenants copy what they see.

## Step 3: Expect imperfect typing

Tenants will type "kar b3", "KARB3", "b3" or leave the account blank. A good system tolerates this: it ignores spaces, dashes and capital letters, falls back to the payer's phone number, and only asks you when it truly can't place a payment. A bad system forces you to fix every one by hand.

## Step 4: Send a receipt every time

A receipt with a reference number protects you and your tenant. It ends "I paid, check again" arguments and gives you a clean paper trail if a dispute ever reaches an agent, a lawyer or the tribunal.

## Step 5: Reconcile automatically

With a Paybill connected to rent software, each payment is matched to the right unit, the balance updates, and overpayments are carried forward as credit. At the end of the month you already know who is up to date and who owes what — no spreadsheets, no scrolling through SMS.

That's exactly what [NyumbaPay](/#features) does: every unit gets its own account number, payments are matched automatically, and anything unclear is parked for you to assign in one tap.
`,
  },
  {
    slug: "reduce-rent-arrears-kenya-landlords",
    title: "7 Proven Ways Kenyan Landlords Can Reduce Rent Arrears",
    description:
      "Late rent is the biggest cash-flow problem for small landlords. Here are seven practical habits that get tenants paying on time — without the awkward phone calls.",
    date: "2026-09-16",
    readMins: 7,
    tag: "Rent collection",
    body: `
Rent arrears rarely start with a tenant who refuses to pay. They start with small delays that nobody follows up — a few days here, a partial payment there — until the balance is too big to clear. The fix is mostly **process**, not confrontation.

## 1. Set one clear due date, in writing

"Early in the month" is not a due date. Pick a specific day — the 5th is common — and put it in the tenancy agreement, on every invoice and in every reminder. When everyone knows the date, a late payment is obvious to both sides.

## 2. Make paying effortless

Every extra step is a reason to delay. Tenants should never have to ask "which number?" or "what account?". Share the Paybill and the unit's account number once, then repeat them on every reminder. A simple payment link that shows the exact amount due removes the last bit of friction.

## 3. Remind before the due date, not after

A friendly reminder two or three days before rent is due works better than a stern message after it's late. Keep it short, include the amount, the Paybill and the account number, and send it in the language the tenant prefers — many tenants respond faster to Kiswahili.

## 4. Follow up consistently

Decide your follow-up rhythm and stick to it: for example, a reminder on the due date, another three days later, and a call after a week. Consistency matters more than tone. Tenants quickly learn which landlords follow up and which ones forget.

## 5. Record partial payments properly

Partial payments are fine — as long as the balance is tracked. The danger is when KSh 5,000 of a KSh 15,000 rent gets recorded as "paid" in your head. Always know the exact outstanding amount per unit, and show it on the tenant's receipt.

## 6. Issue a receipt for every payment

Receipts build trust and remove arguments. When a tenant can see every payment and the running balance, disputes drop — and so does the "I already paid" excuse.

## 7. Look at your arrears list every week

Arrears grow in the dark. A five-minute weekly check — who owes, how much, since when — lets you act while balances are small. Sort by the largest amount owed and start there.

> Rule of thumb: a balance you chase in week one is a conversation. A balance you discover in month three is a dispute.

## Put it on autopilot

Most of these habits are about doing small things reliably, which is exactly what software is good at. [NyumbaPay](/#features) raises invoices automatically, shows your arrears list on the home screen, and lets you send a pre-written WhatsApp reminder in English or Kiswahili with one tap.
`,
  },
  {
    slug: "paybill-vs-till-number-for-rent",
    title: "Paybill vs Till Number: Which Is Better for Collecting Rent?",
    description:
      "Should landlords use an M-Pesa Paybill or a Buy Goods Till for rent? We compare the two for tracking, reconciliation and tenant experience.",
    date: "2026-09-12",
    readMins: 5,
    tag: "M-Pesa",
    body: `
Both Paybill and Till (Buy Goods) numbers let tenants pay you through M-Pesa without using your personal line. But they're built for different jobs, and for rent the difference matters.

## The key difference: the account number

When a customer pays a **Paybill**, M-Pesa asks for a business number **and an account number**. When they pay a **Till**, they only enter the till number and amount.

For a shop, that's perfect — nobody needs to say which customer they are. For rent, it's a problem. If ten tenants pay the same Till, you only see ten amounts and ten names. You then have to work out which name belongs to which house, and what to do when someone's brother or employer pays instead.

## Side by side

- **Identifies the unit:** Paybill — yes, via the account number. Till — no.
- **Works when someone else pays:** Paybill — yes, the account number still points to the house. Till — hard to trace.
- **Automatic reconciliation:** Paybill — straightforward, because each payment carries a reference. Till — needs guesswork on names and amounts.
- **Tenant experience:** both are familiar to Kenyan tenants and work from any phone.

## When a Till can still work

If you have one or two tenants who always pay from their own line, a Till is manageable. You'll recognise the names. Once you're past a handful of units — or you manage property for other landlords — the lack of an account number becomes the thing you spend most of your time fixing.

## Our recommendation

For rent, use a **Paybill** and give every unit its own account number, such as **KAR-A1**. It costs you nothing in tenant convenience, and it turns every payment into a self-describing record that software can match automatically.

Read our step-by-step guide: [How to collect rent with M-Pesa Paybill](/blog/collect-rent-mpesa-paybill-kenya).
`,
  },
  {
    slug: "reconcile-mpesa-rent-payments",
    title: "How to Reconcile M-Pesa Rent Payments Without a Spreadsheet",
    description:
      "Matching M-Pesa messages to tenants every month wastes hours and causes mistakes. Here's how reconciliation should work — and how to automate it.",
    date: "2026-09-08",
    readMins: 6,
    tag: "Operations",
    body: `
Reconciliation is the unglamorous job of checking that the money you received matches the rent you expected — unit by unit. For many Kenyan landlords it looks like this: open the M-Pesa statement, open a spreadsheet, and match names to houses one line at a time.

It works for five units. It breaks at twenty.

## Where manual reconciliation goes wrong

- **Wrong or missing account numbers.** "Rent", "August", a phone number, or nothing at all.
- **Someone else pays.** A parent, spouse or employer sends the money, so the name on the message doesn't match your tenant list.
- **Partial and split payments.** KSh 10,000 on the 3rd and KSh 5,000 on the 12th for the same house.
- **Overpayments.** A tenant pays two months at once, and next month you forget they're already covered.
- **Duplicates.** The same transaction gets entered twice, and suddenly your totals don't add up.

Each of these is small. Together they cost hours every month and create the disputes that damage tenant relationships.

## What good reconciliation looks like

1. **Every payment is matched to a unit the moment it arrives**, using the account number first, then the unit label, then the payer's phone number.
2. **Duplicates are ignored automatically**, using the M-Pesa transaction code as a unique reference.
3. **Payments that can't be matched are parked, not lost**, in a short queue you clear with one tap.
4. **Money is applied to the oldest balance first**, so arrears are always accurate.
5. **Overpayments become credit** that is applied to next month's invoice automatically.
6. **Cash and bank payments go through the same process**, so your ledger is complete.

## Keep an audit trail

Whenever something is changed by hand — a payment assigned, reversed or an invoice cancelled — it should be recorded with who did it and why. That trail protects you if a tenant or co-owner ever questions the numbers.

## Automate it

[NyumbaPay](/#how-it-works) does all of the above. Connect your Paybill, give each unit an account number, and the app keeps every balance up to date on its own. Your monthly reconciliation becomes a quick look at the "Needs assigning" list — usually empty.
`,
  },
  {
    slug: "outgrown-spreadsheet-rent-tracking",
    title: "5 Signs You've Outgrown a Spreadsheet for Tracking Rent",
    description:
      "Spreadsheets are a great start for small landlords — until they aren't. Five warning signs it's time to move your rent tracking to proper software.",
    date: "2026-09-04",
    readMins: 5,
    tag: "Growth",
    body: `
Almost every landlord starts with a notebook or a spreadsheet, and there's nothing wrong with that. But as you add units, properties or staff, the spreadsheet quietly becomes the bottleneck. Here are five signs you've reached that point.

## 1. You spend more than an hour a month reconciling

If month-end means scrolling through M-Pesa messages and typing amounts into cells, you're doing work a computer should do. That hour grows with every unit you add.

## 2. You can't answer "who owes what?" in ten seconds

A landlord or agent should be able to see the full arrears list instantly — sorted by amount, with how long each balance has been open. If answering that question means opening a file and adding up columns, it's time to change.

## 3. More than one person updates the file

The moment a caretaker, agent or family member also records payments, spreadsheets start to break: overwritten cells, duplicated rows, and nobody sure which copy is current. You need shared access with a clear record of who changed what.

## 4. Tenants dispute their balances

"I paid in March" is hard to disprove from a spreadsheet. Proper software keeps a receipt for every payment, the M-Pesa reference, and a running balance the tenant can see — which ends most disputes before they start.

## 5. You're adding properties

Managing two or three buildings from one spreadsheet gets messy fast. Growth should mean more rent, not more admin.

## What to look for in rent software

- Works with **M-Pesa Paybill** and unique account numbers per unit
- **Automatic invoices** every month and automatic matching of payments
- Handles **partial payments, overpayments and cash**
- A clear **arrears list** and receipts for every payment
- Works well **on your phone**, because that's where you are
- **Simple pricing** that doesn't punish you for growing

[NyumbaPay](/#pricing) was built for exactly this — one simple annual price, and everything included.
`,
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
