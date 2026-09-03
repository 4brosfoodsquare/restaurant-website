# Business Information Needed Before Launch

Everything below is currently a clearly-marked placeholder (in the seed
data, or literally the text `[Placeholder]` / `[Address line 1 — placeholder]`
in the UI). None of it was invented as if it were real — per the build
instructions, real business, legal, and financial details are for you to
provide, not for the build to guess.

Most of these are edited directly in the **Admin Dashboard**, no code
changes or redeploy needed — the site reads them live from the database.

## Restaurant details — Admin → Settings

- [ ] Confirmed restaurant name (currently "4 Bros Food Square")
- [ ] Tagline / one-line description
- [ ] Longer description (used on the homepage and About page)
- [ ] Phone number
- [ ] Email address
- [ ] Full address (line 1, line 2, postcode)
- [ ] Opening hours for each day of the week
- [ ] Instagram / Facebook URLs (optional — leave blank to hide)

## Ordering configuration — Admin → Settings

- [ ] Pickup enabled? Delivery enabled? (Both are on by default.)
- [ ] Delivery fee, if any (entered in paise — e.g. ₹49.00 = `4900`)
- [ ] Tax rate, if applicable (entered in basis points — e.g. 5% = `500`)
- [ ] Minimum order amount, if any

## Menu — Admin → Categories, Admin → Menu

- [ ] Real dish names, descriptions, and prices (every current menu item is
      literally named `[Placeholder] ...` with a placeholder description)
- [ ] Real photos for each dish and category (upload via the menu item
      form — the uploads API validates file type/size and stores them)
- [ ] Which categories beyond Biriyani / Kabab / Chilli Chicken you actually
      offer (Starters / Breads / Beverages are seeded as examples — rename,
      remove, or add categories freely)
- [ ] Dietary markings (veg/non-veg/egg) and spice levels per dish
- [ ] Which dishes are "Featured" / "Popular" for the homepage

## Policies — need a decision on where these live

Not yet built anywhere in the app, because the content itself doesn't
exist yet:

- [ ] Cancellation / refund policy — what happens if a customer cancels an
      order, and by when
- [ ] Any allergen / food-safety disclaimers required in your jurisdiction
- [ ] Privacy policy / terms of service, if you want them — the app
      currently collects name, phone, optional email, and delivery address
      at checkout, stored in the orders table

Once you've decided on the actual wording, these are a small addition
(either static pages or Settings fields) — flag it and it can be built.

## Payment

No online payment provider is integrated (checkout is "pay on
collection/delivery" only, by design for this initial build — see the
README's Payment Architecture section). When you're ready to add one:

- [ ] Which provider (Razorpay, Stripe, PhonePe, etc. — availability
      varies by country)
- [ ] Their account/API credentials (never share these in chat or commit
      them to the repo — they'd go in `backend/.env`, which is gitignored)

## Staff accounts — Admin → Staff

- [ ] Real names/emails for anyone beyond the owner who needs dashboard
      access, and which role each should have (Manager or Staff — see the
      README's Admin Access section for what each can do)

## Deployment — see docs/DEPLOYMENT.md

- [ ] Where the backend will actually run (needs persistent disk — see the
      deployment guide)
- [ ] The real domain name(s) this will be served from
