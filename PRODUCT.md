# Product

## Register

product

## Platform

web

## Users

Golden Valley's owner/operator, working solo. They key in every water delivery transaction themselves, either right after a call or in a short end-of-day batch, on a phone most of the time and occasionally a desktop. They are not a data-entry clerk by trade, so the tool has to be fast and forgiving, not powerful and dense. The two drivers never touch the app; they're a dimension the owner selects, not a second user role.

## Product Purpose

A single-owner operations tool for a small water delivery business: log gallons delivered per customer per driver, compute each driver's salary from those logs over a date range, and surface which customers are due for their next delivery based on a learned (but overridable) delivery cadence. It exists to replace a paper log or spreadsheet with something that opens fast, survives one-thumb use, and never loses a transaction. Success is zero missed or duplicate transaction entries, salary numbers the owner trusts without recomputing by hand, and a due-list that reliably flags the next call to make.

## Positioning

The fastest way to log a delivery and always know who's due next, without ever feeling like a spreadsheet.

## Brand Personality

Calm, precise, utilitarian, a little bit tactile: closer to a well-made field instrument than a SaaS dashboard. Confident and quiet rather than playful. Every screen should feel like it trusts the owner to do their job, not like it's trying to sell them something.

## Anti-references

Not generic dashboard-SaaS (cold, over-cluttered, spreadsheet-in-a-browser). Not playful or cutesy. No AI-purple gradients, no stock hero-metric cards, no decorative motion that gets in the way of a one-handed data-entry task performed dozens of times a day.

## Design Principles

- Speed over completeness: the transaction screen is the whole product to the owner; every other screen is in service of it.
- One-thumb first: large tap targets, no required scrolling to complete the primary action, works while standing.
- Status at a glance: the droplet motif carries schedule state consistently everywhere a customer appears, so the owner never has to read a table to know who's overdue.
- Reversible by default: every write is optimistic but undoable or confirmable, because a stray gallon entry costs real money in a small business.
- Quiet automation: the frequency algorithm and salary math run in the background and stay overridable, never opaque.

## Accessibility & Inclusion

WCAG AA minimum. Full one-handed mobile operation with visible focus states and large (>=44px) touch targets, since the primary user often works this app with wet or gloved hands mid-delivery. Respect `prefers-reduced-motion` throughout; no motion required to understand state (droplet fill and color both encode status, not color alone).
