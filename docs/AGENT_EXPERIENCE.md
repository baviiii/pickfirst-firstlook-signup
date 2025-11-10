# PickFirst Agent Experience – Feature Guide

This document summarizes everything an agent can do in PickFirst. Use it to train new team members, keep customer success in sync, and confirm that the product continues to operate as expected after changes.

---

## 1. Authentication & Branding
- Shared auth form (logo displayed on sign‑in/sign‑up/forgot/reset screens).
- Password reset:
  - Forgot-password rate limits requests and sends branded emails.
  - Reset page establishes session via `setSession`, so valid links never immediately fail.

## 2. Agent Dashboard Overview
- `AgentDashboard` highlights:
  - Leads, messages, appointments, analytics cards.
  - Cards pulse/bounce when there are unread notifications, using `useCardNotifications`.
  - Clicking a card clears its notification count (`clearCardNotifications`).
- Notification dropdown in the header shows new inquiries, message notifications, appointment updates, etc.

## 3. Lead Management & Messaging
- **Leads tab / AgentInquiries**
  - Real-time subscription to `property_inquiries` so new leads appear instantly.
  - Inquiry cards display buyer name (using `buyer_public_profiles` view/RPC bypassing RLS), status, last message, and conversation link.
  - Duplicate conversation issues resolved; every inquiry uses one conversation, created at inquiry time.
  - “Start Chat” brings the agent directly into the thread, marks the lead as viewed, and clears notifications.
- **Messaging**
  - Unified conversation list (`ConversationList`) shows property details (title/address/price) and other participant.
  - Agent replies trigger buyer email (`messageNotification`) and in-app notifications; duplicates prevented via DB trigger migration.
  - Conversation subtitle uses `PropertyService.getDisplayPrice` for consistent price text (“Best Offers”, sold).

## 4. Notifications & Emails
- **Email notifications**
  - New inquiries send `agentInquiryNotification` to the agent who owns the listing.
  - Agent replies send `messageNotification` to the buyer.
  - New listings notify all super admins (via `get_admin_notification_emails` RPC), plus the submitting agent.
  - Appointment creation/update triggers buyer & agent emails.
  - Client invite & weekly digest use branded templates (`send-email` function).
- **In-app notifications**
  - All new messages, appointments, lead status updates feed into the notification dropdown and card counters.
  - Triggers remain RLS-aware (notification inserts run with service role or DB triggers).

## 5. Listing Management
- **Create Listing**
  - Uploads images + floor plans (storage buckets: `property-images`, `property-floorplans`).
  - `PropertyService.getDisplayPrice` determines price labeling across all surfaces (cards, maps, admin views).
  - Admin & agent emails send display price text instead of default `$0`.
- **Edit Listing**
  - Agents reuse the full creation form inside `MyListings` dialog.
  - Floor plans support removal and re-upload.
- **Mark as Sold**
  - Agents can mark a property sold, set price/date, and optionally attach the buyer (client).
  - Migration re-pointed `sold_to_client_id` to `clients.id` so either registered or offline clients work.
  - When sold, array of inquiries triggers buyer notification that the property has sold.
- **Admin notification**
  - Super admin card in `SuperAdminDashboard` now displays display price text for off-market.

## 6. Client & Lead Conversion
- **Lead Conversion Dialog**
  - Pulls buyer email via `buyer_public_profiles` view/RPC (bypasses RLS).
  - Converts lead to client + optionally schedules an appointment.
  - On conversion, agent automatically creates client record (if it doesn’t exist) and links to appointment leads.
- **Automatic client creation**
  - When scheduling appointments from a lead, the system creates/links a client record and normalizes email to lowercase.
  - Appointments set `client_id` if the buyer has a registered profile; otherwise link by email and send email notifications.

## 7. Appointment Management
- Agents can:
  - Schedule new appointments (auto-creates clients if needed).
  - View upcoming appointments via analytics dashboard + appointment list.
  - Receive email notifications for bookings, status updates, cancellations.
- Buyers automatically receive appointment notifications, and the appointment is visible on their side.

## 8. Analytics & Goals
- **Agent Analytics Page**
  - Aggregates listings, leads, appointments, revenue, and performance charts.
  - Revenue calculations fixed to avoid duplicates; monthly revenue reflects sold listings in past 30 days.
  - Agents can edit monthly revenue goal from the card (`updateMonthlyRevenueGoal`), and the progress bar updates immediately.
  - Weekly activity and property type breakdown show aggregated stats.
- **Dashboard metrics (legacy)**
  - `getAgentMetrics` still returns counts used in quick cards (e.g., total listings, clients).

## 9. Notifications/Email Templates Summary (Agent)
- Inquiry email: new buyer interest.
- Message email: buyer responds.
- Property submission email: agent receives confirmation; super_admins receive summary mail.
- Property approval email: either approved or rejected, with display price text.
- Appointment emails: confirmation, status updates, reminders (if enabled).
- Weekly digest (if agent is also a buyer) – handled via buyer subscription preference.

## 10. Feature Gating / Role RLS (Agent)
- Listing creation limited to agent role.
- `property_inquiries` selects use explicit foreign keys to avoid ambiguous relationships.
- `property_favorites` triggers and views updated to reference new table names.
- `area_insights` write policies permit authenticated agents to seed cache.
- RPC functions:
  - `get_agent_public_profile`, `get_buyer_public_profile` bypass RLS for public data sharing.
  - `get_admin_notification_emails` ensures admin contact list accessible even with RLS enabled.

---

### Agent Support Checklist
1. Verify new inquiry → lead card updates (animation + link to conversation).
2. Confirm new listing sends email to agent + super admins (check template subject + price display).
3. Mark property as sold with client: ensure saved price, appointment + client updates.
4. Update monthly revenue goal and confirm analytics chart progress > goal updated.
5. Schedule an appointment from a lead; verify email notifications to agent + buyer, buyer sees appointment.
6. Messages send email + in-app notification; duplicates do not appear.

Keep this doc updated when we add new agent features (e.g., bulk listings, campaign emails). Include reminder to run pending migrations whenever analytics views or RLS policies change.


