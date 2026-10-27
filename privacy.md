---
title: Privacy Policy
---

<!--
  ============================================================
  REVIEW BEFORE PUBLISHING - this block does not render.

  This document is a drafting aid, not legal advice. Every
  [BRACKETED] value must be filled in, and every factual claim
  must be checked against what the app actually does, before
  this is submitted to Pinterest or shown to users. A privacy
  policy that misdescribes the product is worse than none:
  "privacy policy is inaccurate or not accessible" is one of
  Pinterest's own stated denial reasons.

  Specifically verify:
   - Section 7 commits you to NOT training or fine-tuning any
     model on Pinterest content. If that is not your plan, do
     not reword this section - obtain Pinterest's express
     written consent, or source training images elsewhere.
   - Section 6: name the actual model provider(s) in use.
   - Section 3: re-check against db/schema.sql after any
     migration. This table was written against the schema as
     of 2026-10-27.
  ============================================================
-->

# Privacy Policy

**Effective date:** [EFFECTIVE DATE]

**Last updated:** 27 October 2026

## 0. Development status

Fitcheck is **pre-release software under active development.** It is not
offered to the general public. At present it is used only by its
developer(s) and a small number of invited testers, on test data. This
policy describes the practices in place now and the practices intended at
launch; where the two differ, that is stated.

## 1. Who we are

Fitcheck ("the app", "we", "us") is operated by **[OPERATOR / LEGAL ENTITY
NAME]**, located in **[JURISDICTION]**. We are the data controller for the
personal information described in this policy.

Contact: **[CONTACT EMAIL]**

## 2. What this policy covers

This policy covers personal information processed by the Fitcheck
application, its backend service, and its outfit-recommendation agent. It
also describes our handling of content accessed through the Pinterest API
(section 7).

It does not cover Pinterest's own practices. Pinterest's handling of its
users' data is governed by
[Pinterest's Privacy Policy](https://policy.pinterest.com/en/privacy-policy).

## 3. Information we collect

Fitcheck is a wardrobe app: it records the clothes you own and the outfits
you wear, so that it can suggest what to wear. The information below is
what the app stores in order to do that.

### Information you give us

| What | Why we need it | Required? |
| --- | --- | --- |
| Display name | To address you in the app | Yes |
| Gender identity | To inform garment and outfit suggestions | **No - optional** |
| Photographs of your garments | To show your wardrobe back to you, and to read a garment's colour, material and shape | No, but most features depend on it |
| Garment details - type, colour, material/texture, shape, warmth, formality, when you acquired it, laundry thresholds | To decide what is appropriate to suggest | Yes, for garments you add |
| Free-text labels you add to garments | Your own descriptors (e.g. "vintage") | No |

### Information generated as you use the app

| What | Why we need it |
| --- | --- |
| Outfits proposed to you, and whether you accepted, rejected or wore them | To learn your preferences and to show your wear history |
| Per-garment reactions ("love" / "not this") within a specific outfit | To learn which combinations you like, not only which items |
| A reason you give for rejecting an outfit | To improve later suggestions |
| Dates you wore an outfit | To avoid repetition and to track laundry state |
| Wear and wash counts per garment | To tell you what is due a wash |
| The occasion, mood or weather you asked us to dress for | To judge later whether the suggestion was a good one |

### Device location

If you permit it, the app stores your device's **latitude and longitude** so
that it can retrieve a local weather forecast and dress you for the actual
conditions.

- Location is **optional.** If you decline, the app falls back to a default
  forecast and continues to work.
- We store a single current location, not a location history.
- We use it for weather lookup only. We do not use it for advertising,
  profiling, or tracking your movements.

### What we do not collect

We do not collect contacts, calendars, browsing history, advertising
identifiers, or payment information. We do not use third-party advertising
or analytics SDKs. We do not buy personal information from data brokers.

## 4. Sensitive information

Three categories deserve explicit mention, because some privacy laws treat
them as sensitive:

1. **Gender identity.** Optional, used only to inform suggestions, never
   shared, and removable at any time by clearing the field.
2. **Precise geolocation.** Optional, used only for weather, stored as a
   single current value.
3. **Photographs.** Garment photos may incidentally include you, other
   people, or your home. We recommend photographing garments on their own.
   Image files may carry embedded metadata such as capture time and GPS
   coordinates; we strip location metadata from uploaded images on receipt.

We do not use any of these to infer health, religion, political views, or
sexual orientation, and we do not sell or share them.

## 5. How we use your information

We use it to:

- show you your wardrobe and your wear history;
- generate outfit suggestions appropriate to the weather, the occasion and
  the state of your laundry;
- learn your taste from your reactions, so that later suggestions are
  better;
- operate, debug and improve the app.

We do not use your information for advertising, and we do not sell it.

## 6. Automated processing and AI

Outfit suggestions are produced by an automated system that includes a
large language model.

- **What is sent.** To generate a suggestion, a description of your
  candidate garments - their type, colour, material, shape, warmth and
  formality - together with the weather and the occasion you asked about,
  is sent to our model provider, **[MODEL PROVIDER NAME]**. Your name and
  your location coordinates are not sent; the weather is resolved before
  the request is made.
- **Photographs.** [STATE WHETHER GARMENT PHOTOS ARE SENT TO A THIRD-PARTY
  VISION MODEL. If they are, name the provider and say so plainly here.]
- **Training.** We do not permit our model provider to use your information
  to train their general-purpose models. [CONFIRM AGAINST YOUR PROVIDER'S
  TERMS AND YOUR RETENTION SETTINGS.]
- **What it means for you.** These decisions are suggestions about
  clothing. They have no legal or similarly significant effect, and you are
  free to reject any of them.

## 7. Pinterest data

We use the Pinterest API during development to evaluate our image-analysis
software against real photographs of clothing.

**What we access.** Publicly available Pin images and their associated
metadata, retrieved through the official Pinterest API under our registered
developer application, using credentials authorised by the Pinterest
account holder.

**What we do with it.** Pinterest content is used solely for the internal,
non-public evaluation of our colour, material and shape detection, by our
own development team.

**What we do not do with it:**

- We do not use Pinterest content to **train, fine-tune, or otherwise
  develop or improve any artificial-intelligence or machine-learning
  model.**
- We do not display Pinterest content to Fitcheck users, nor incorporate it
  into any user-facing feature.
- We do not redistribute, publish, sell, license or share Pinterest content
  with any third party.
- We do not scrape Pinterest or access it by any means other than the
  official API.
- We do not attempt to identify any Pinterest user, and we do not build
  profiles of Pinterest users.
- We do not combine Pinterest data with Fitcheck user data.

**Retention.** Pinterest content is retained only for as long as an
evaluation run requires, and is deleted afterwards. We do not maintain a
standing local copy of Pinterest data.

**Pinterest users.** We do not collect personal information about Pinterest
users. If you believe content associated with you has been accessed by our
application and you want it removed from our evaluation set, contact us at
**[CONTACT EMAIL]** and we will delete it.

## 8. Who we share information with

We do not sell your personal information, and we do not share it for
cross-context behavioural advertising.

We share it only with service providers who process it on our behalf, under
contract, for the purposes above:

| Provider | Purpose |
| --- | --- |
| [HOSTING / DATABASE PROVIDER] | Running the service and storing your data |
| [IMAGE STORAGE PROVIDER] | Storing garment photographs |
| [MODEL PROVIDER] | Generating outfit suggestions |

We may also disclose information where we are legally required to, or to
protect the rights and safety of our users or the public.

## 9. How long we keep it

- **Your account and wardrobe** - for as long as your account is active.
- **Retired garments** - garments you retire are kept, not deleted, so that
  your past outfits remain intact. You can delete them permanently.
- **Outfit and wear history** - kept for as long as your account is active,
  because it is the record the app's suggestions are built on.
- **Garment photographs** - until you delete the garment or your account.
- **On deletion** - when you delete your account we erase your personal
  information within **[N] days**, except where we must retain something to
  meet a legal obligation.

## 10. Your choices and rights

You can, at any time:

- see and correct everything the app holds about your wardrobe, from within
  the app;
- delete individual garments, outfits, photographs or reactions;
- turn location off, in your device settings, and clear your stored
  coordinates;
- clear your gender identity field;
- delete your account and all associated data.

Depending on where you live, you may also have the right to a copy of your
data in a portable form, to object to or restrict processing, to withdraw
consent, and to lodge a complaint with your data protection authority. To
exercise any of these, contact **[CONTACT EMAIL]**. We will respond within
the period required by applicable law, and we will not discriminate against
you for exercising a right.

Our legal bases for processing, where the GDPR or UK GDPR applies, are:
performance of our contract with you (operating the app), your consent
(optional fields, location, photographs), and our legitimate interests
(security, debugging, improving the service).

## 11. Security

Access to the production database is restricted to authorised operators.
Data is encrypted in transit. Garment photographs are stored under
non-guessable keys. We review access as part of ongoing development.

No system is perfectly secure. If we become aware of a breach affecting
your personal information, we will notify you and any required regulator as
the law requires.

## 12. International transfers

Your information may be processed in **[COUNTRY / REGION]** and by the
service providers listed in section 8, who may operate elsewhere. Where we
transfer personal information out of the UK, EEA or Switzerland, we rely on
**[TRANSFER MECHANISM - e.g. Standard Contractual Clauses]**.

## 13. Children

Fitcheck is not directed at children and is not intended for anyone under
**[AGE]**. We do not knowingly collect personal information from children.
If you believe a child has provided us information, contact us and we will
delete it.

## 14. Changes to this policy

We will update this page when our practices change, and revise the "last
updated" date above. For material changes we will give notice in the app
before they take effect.

## 15. Contact

Questions, requests or complaints:

**[OPERATOR / LEGAL ENTITY NAME]**

**[CONTACT EMAIL]**

**[POSTAL ADDRESS, if required in your jurisdiction]**
