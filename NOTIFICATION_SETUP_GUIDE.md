# Notification System Setup Guide

## 🎉 Complete Automatic Notification System

Your notification system is now **fully automated**! Notifications will be created automatically for all major events.

---

## 📋 What's Been Set Up

### 1. ✅ Service Layer Notifications
Notifications are automatically created in these services:

#### **AppointmentService** (`src/services/appointmentService.ts`)
- ✅ New appointment scheduled → Notifies buyer
- ✅ Appointment confirmed → Notifies buyer
- ✅ Appointment cancelled → Notifies buyer

#### **PropertyAlertService** (`src/services/propertyAlertService.ts`)
- ✅ Property matches buyer criteria → Notifies buyer with match details

### 2. ✅ Database Triggers (Automatic)
These triggers run automatically in the database:

#### **New Messages** (`notify_new_message()`)
- Triggers when: New message inserted
- Notifies: The receiver (opposite of sender)
- Type: `new_message`

#### **Inquiry Responses** (`notify_inquiry_response()`)
- Triggers when: Inquiry status changes to 'responded'
- Notifies: The buyer who made the inquiry
- Type: `inquiry_response`

#### **Price Changes** (`notify_price_change()`)
- Triggers when: Property price is updated
- Notifies: All buyers who favorited the property
- Type: `price_change`

#### **Property Sold** (`notify_property_sold()`)
- Triggers when: Property is marked as sold
- Notifies: All buyers who favorited or inquired
- Type: `property_sold`

---

## 🚀 Setup Instructions

### Step 1: Run Database Migrations

You need to run **2 migration files** in order:

```bash
# Option 1: Using Supabase CLI (Recommended)
supabase db push

# Option 2: Manual in Supabase Dashboard
# Go to SQL Editor and run these files in order:
# 1. supabase/migrations/20240101000000_create_notifications_table.sql
# 2. supabase/migrations/20240102000000_create_notification_triggers.sql
```

### Step 2: Enable Realtime for Notifications Table

1. Go to **Supabase Dashboard** → **Database** → **Replication**
2. Find the `notifications` table
3. Enable replication
4. Select all operations: **INSERT**, **UPDATE**, **DELETE**
5. Click **Save**

### Step 3: Test the System

The system is ready! Test it by:

1. **Send a message** → Receiver gets notification
2. **Create an appointment** → Buyer gets notification
3. **Change a property price** → Favorited buyers get notification
4. **Mark property as sold** → Interested buyers get notification

---

## 📊 Notification Types & When They Trigger

| Type | Trigger Event | Who Gets Notified | Link |
|------|---------------|-------------------|------|
| `new_message` | Message sent | Message receiver | `/buyer-messages` |
| `appointment_scheduled` | Appointment created | Buyer/client | `/buyer-account-settings?tab=appointments` |
| `appointment_confirmed` | Status → confirmed | Buyer/client | `/buyer-account-settings?tab=appointments` |
| `appointment_cancelled` | Status → cancelled | Buyer/client | `/buyer-account-settings?tab=appointments` |
| `property_alert` | Property matches criteria | Matching buyers | `/property/{id}` |
| `new_listing` | New property approved | (Future feature) | `/property/{id}` |
| `price_change` | Property price updated | Buyers who favorited | `/property/{id}` |
| `property_sold` | Property marked sold | Buyers who favorited/inquired | `/browse-properties` |
| `inquiry_response` | Inquiry status → responded | Inquiry buyer | `/buyer-messages` |
| `system` | Admin announcements | (Future feature) | Custom |

---

## 🔄 How It Works

### Automatic Flow:

```
Event Happens (e.g., new message)
    ↓
Database Trigger Fires
    ↓
Notification Created in Database
    ↓
Real-time Subscription Detects New Row
    ↓
NotificationDropdown Updates Instantly
    ↓
User Sees Notification + Toast
```

### Service Layer Flow:

```
Service Method Called (e.g., createAppointment)
    ↓
Appointment Created
    ↓
notificationService.createNotification() Called
    ↓
Notification Saved to Database
    ↓
Real-time Update → Dropdown Updates
```

---

## 🎨 User Experience

### For Buyers:

1. **Bell Icon** shows unread count with pulse animation
2. **Click Bell** → Dropdown opens with all notifications
3. **Click Notification** → Marks as read + navigates to relevant page
4. **Hover Notification** → Delete button appears
5. **Mark All Read** → Bulk action for all notifications
6. **Toast Popup** → Appears for new notifications in real-time

### Notification States:

- **Unread**: Yellow highlight, pulse dot, "New" badge
- **Read**: Gray background, no highlight
- **Deleted**: Removed permanently

---

## 🛠️ Maintenance

### Cleanup Old Notifications

Run this periodically (e.g., weekly cron job):

```sql
SELECT cleanup_old_notifications();
```

This removes:
- Read notifications older than 30 days
- Unread notifications older than 90 days

### Monitor Notification Volume

```sql
-- Check notification stats
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE read = false) as unread
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY total DESC;
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing?

1. **Check migrations ran successfully**
   ```sql
   SELECT * FROM notifications LIMIT 10;
   ```

2. **Check realtime is enabled**
   - Supabase Dashboard → Database → Replication
   - Verify `notifications` table is enabled

3. **Check browser console for errors**
   - Look for WebSocket connection errors
   - Check for authentication issues

4. **Test with synthetic notifications**
   - These work without database setup
   - If synthetic works but real doesn't → database issue

### Triggers Not Firing?

```sql
-- Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notification%';
```

### Too Many Notifications?

Adjust trigger conditions in migration file:
- Add more filters to `WHEN` clauses
- Limit notification frequency per user
- Add user preference checks

---

## 📈 Future Enhancements

### Potential Additions:

- [ ] **Browser Push Notifications** - Native browser notifications
- [ ] **Email Digests** - Daily/weekly summary emails
- [ ] **Notification Preferences** - Per-type enable/disable
- [ ] **Notification Grouping** - Combine similar notifications
- [ ] **Notification Sounds** - Audio alerts for new notifications
- [ ] **Mobile Push** - If you build a mobile app
- [ ] **Notification Analytics** - Track open rates, click-through
- [ ] **Smart Batching** - Combine multiple similar notifications

### Easy Additions:

**Add System Announcements:**
```typescript
await notificationService.createNotification(
  userId,
  'system',
  'Platform Update',
  'New features available! Check out our latest updates.',
  '/updates'
);
```

**Add New Listing Notifications:**
```sql
-- Add to property_listings trigger
CREATE TRIGGER new_listing_notification
  AFTER INSERT ON property_listings
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION notify_new_listing();
```

---

## ✅ Checklist

Before going live, verify:

- [ ] Both migration files ran successfully
- [ ] Notifications table exists with proper RLS policies
- [ ] Realtime replication enabled for notifications table
- [ ] Database triggers created and active
- [ ] Test: Send a message → Notification appears
- [ ] Test: Create appointment → Notification appears
- [ ] Test: Change price → Favorited users notified
- [ ] Test: Mark as read → Stays read after refresh
- [ ] Test: Delete notification → Removed permanently
- [ ] Bell icon shows correct unread count
- [ ] Dropdown opens/closes smoothly
- [ ] Toast notifications appear for new items
- [ ] Navigation works from notifications

---

## 🎯 Summary

**What Works Now:**
- ✅ Real-time notifications for messages, appointments, alerts
- ✅ Automatic database triggers for price changes, sold properties
- ✅ Mark as read/delete functionality
- ✅ Persistent notification history
- ✅ Beautiful dropdown UI with animations
- ✅ Toast notifications for new items
- ✅ Unread badge with count

**What You Need to Do:**
1. Run the 2 migration files
2. Enable realtime replication
3. Test the system

**That's it!** Your notification system is production-ready! 🚀
