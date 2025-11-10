# PickFirst Buyer Experience – Feature Guide

This document gives a high–level walkthrough of everything a buyer can do inside PickFirst today. Use it as a quick reference when onboarding new buyers, answering support tickets, or verifying that the experience matches product expectations.

---

## 1. Authentication & On‑Boarding
- Buyers sign up through the shared auth form.
- Password reset now works end‑to‑end:
  - Forgot‑password validates email format, rate limits attempts, and sends a Supabase recovery link (plus branded follow‑up email).
  - Reset page establishes the recovery session via `supabase.auth.setSession`, so valid links no longer show “Invalid Reset Link”.
- All auth screens display the PickFirst logo for consistent branding.

## 2. Dashboard & Notifications
- `BuyerDashboard` shows:
  - New inquiries, favourites count, appointments, and real‑time messaging alerts.
  - Card notifications pulse using `useCardNotifications`; when the buyer reads notifications, counts drop to zero.
- Notification bell pulls from the unified notification dropdown; clearing the dropdown also resets the badge.

## 3. Browsing Properties
- **Browse Properties / Simple list / Map view**
  - Uses feature gating + subscription tier to filter off‑market listings for free buyers; premium buyers get access (and messaging warns free users why they cannot see certain listings).
  - Cards show PickFirst display price (supports numeric prices, textual labels such as “Best Offers”, and sold states).
  - Floor plan quick viewer opens if available; vendor details respect feature gating.
- **Area Insights (PropertyInsights)**
  - On first load, fetches area amenities + optional air‑quality data from Google Maps & caches results in `area_insights`.
  - Subsequent loads within 30 days use cached insights. RLS policies now allow authenticated users to insert/update cache rows.

## 4. Inquiries & Messaging
- Buyers can inquire directly from property cards.
  - If the buyer already inquired, the UI offers a “View Conversation” toast rather than throwing an error.
  - Creating an inquiry triggers immediate conversation creation, sends the agent email notification, and adds a `new_inquiry` notification on both sides.
- Unified Messages:
  - Real‑time updates via Supabase subscriptions.
  - Conversations show property title, address, display price, and participants.
  - Message notifications avoid duplicates; clicking a notification opens the thread and clears the badge.
  - When an agent responds, the buyer receives both in‑app notification and `messageNotification` email.

## 5. Favourites & Saved Lists
- Buyers can favourite properties (limits depend on subscription tier: free/basics 10, premium unlimited).
- Favourites are stored in `property_favorites`; RLS ensures buyers only manage their records.
- Favourite actions feed the dashboard counter and off‑market gating checks.
- `SavedProperties` page displays price, sold states, floor plan prompts, and “off-market” badges as needed.

## 6. Buyer Preferences & Alerts
- Buyers edit preferences via `BuyerPreferencesManager`:
  - Subscription gating determines whether property alerts can be enabled.
  - Saving preferences no longer triggers duplicate emails (only the confirmation email remains).
- Weekly Digest emails:
  - Tailored to each buyer’s preferences, using `weekly-digest` Edge Function.
  - Template now displays real property content (subject/HTML, no more fallback text), uses a rolling 7‑day window, checks feature gates, and filters off‑market visibility by subscription tier.

## 7. Appointments & Lead Conversion (Buyer side)
- Buyers can see appointments scheduled by agents:
  - `getMyAppointments` returns appointments via matching by email (case normalized).
  - Linked notifications include direct link to buyer settings > appointments tab.
- When a buyer is converted via an inquiry, agent automatically creates a client record and links appointments; buyers receive confirmation emails when new appointments are created/updated.

## 8. Emails Buyers Receive
- Inquiry receipt (acknowledge new inquiry + conversation link).
- Agent response emails (copies the message and conversation URL).
- Appointment confirmation/updates.
- Weekly digest.
- Password reset follow‑up + security alerts (if triggered).

## 9. Feature Gating / Subscription Hooks (Buyer)
- `useSubscription` centralizes gating logic:
  - Helpers such as `canAccessOffMarketListings`, `canUseFavorites`, `canUseAdvancedSearch`, etc.
  - Real‑time subscription updates ensure UI reflects admin feature toggles immediately.
- Feature gates drive map, browse pages, off‑market notifications, and alerts.

## 10. Visual/UX Touch Points
- All auth pages show the PickFirst logo.
- Browse/map cards use consistent price display helper.
- Notifications / toast messages offer “View Conversation” CTA for quick navigation.
- Off‑market sections display upgrade prompts for non‑premium users.
- Property map removes unused icons (settings/zoom) and warns free/basics that off‑market isn’t visible without upgrade.

---

### Support Checklist
When helping a buyer, confirm:
1. They can sign in/reset password (logo visible, email triggered).
2. Dashboard counters match actual favourites/inquiries.
3. Property cards respect feature gating, display correct price text (“Best Offers”, sold, etc.).
4. Messaging shows correct participant info and price, email notifications arrive.
5. Weekly digest contains actual properties and renders subject/HTML (no fallback).
6. Area insights load (cache or fetch) without RLS errors.

For follow‑ups or new features, update this document with the change, associated migrations, and support caveats.


