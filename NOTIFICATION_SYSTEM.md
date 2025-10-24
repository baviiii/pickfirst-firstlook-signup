# Notification System Documentation

## Overview
The PickFirst notification system provides real-time notifications to buyers about messages, appointments, property alerts, and other important events.

## Features

### ✅ Implemented Features
- **Notification Dropdown**: Modern dropdown UI that appears when clicking the bell icon
- **Real-time Updates**: Automatically receives new notifications via Supabase real-time subscriptions
- **Unread Badge**: Shows count of unread notifications on the bell icon
- **Notification Types**: Supports multiple notification types with custom icons and colors
- **Mark as Read**: Click any notification to mark it as read and navigate to relevant page
- **Mark All as Read**: Bulk action to mark all notifications as read
- **Delete Notifications**: Individual notification deletion
- **Synthetic Notifications**: Generates notifications from existing data (messages, appointments, alerts)
- **Time Display**: Shows relative time (e.g., "5 minutes ago") using date-fns
- **Responsive Design**: Works on mobile and desktop with smooth animations

### 📋 Notification Types
1. **New Message** - Unread messages from agents
2. **Appointment Scheduled** - New appointment created
3. **Appointment Confirmed** - Appointment confirmed by agent
4. **Appointment Cancelled** - Appointment cancelled
5. **Property Alert** - New property matches your criteria
6. **New Listing** - New property added to platform
7. **Price Change** - Property price updated
8. **Property Sold** - Property marked as sold
9. **Inquiry Response** - Agent responded to your inquiry
10. **System** - System announcements

## Files Created

### 1. Notification Service
**File**: `src/services/notificationService.ts`

**Key Methods**:
- `getNotifications(limit)` - Fetch notifications for current user
- `getUnreadCount()` - Get count of unread notifications
- `markAsRead(id)` - Mark single notification as read
- `markAllAsRead()` - Mark all notifications as read
- `deleteNotification(id)` - Delete a notification
- `createNotification()` - Create new notification (backend use)
- `subscribeToNotifications()` - Real-time subscription
- `generateSyntheticNotifications()` - Generate from existing data

### 2. Notification Dropdown Component
**File**: `src/components/notifications/NotificationDropdown.tsx`

**Features**:
- Dropdown panel with notifications list
- Unread badge on bell icon
- Click outside to close
- Smooth animations and transitions
- Color-coded notification types
- Action buttons (mark all read, settings, delete)
- "View All Notifications" link to settings page

### 3. Database Migration
**File**: `supabase/migrations/20240101000000_create_notifications_table.sql`

**Table Structure**:
```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type TEXT,
  title TEXT,
  message TEXT,
  link TEXT,
  read BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Integration

### In BuyerDashboardNew.tsx
```tsx
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

// Replace the old bell button with:
<NotificationDropdown 
  unreadCount={totalNotifications}
  onUnreadCountChange={(count) => {
    // Handle count updates
  }}
/>
```

## Usage

### For Users
1. **View Notifications**: Click the bell icon in the header
2. **Read Notification**: Click any notification to mark as read and navigate
3. **Mark All Read**: Click the checkmark icon in dropdown header
4. **Delete Notification**: Hover over notification and click trash icon
5. **View All**: Click "View All Notifications" at bottom of dropdown
6. **Settings**: Click gear icon to go to notification settings

### For Developers

#### Create a Notification
```typescript
import { notificationService } from '@/services/notificationService';

await notificationService.createNotification(
  userId,
  'new_message',
  'New Message',
  'You have a new message from Agent Smith',
  '/buyer-messages',
  { conversationId: '123' }
);
```

#### Subscribe to Real-time Notifications
```typescript
const channel = notificationService.subscribeToNotifications((notification) => {
  console.log('New notification:', notification);
  // Show toast, update UI, etc.
});

// Cleanup
channel.unsubscribe();
```

#### Generate Synthetic Notifications
```typescript
// Useful for populating notifications from existing data
const notifications = await notificationService.generateSyntheticNotifications();
```

## Database Setup

### Run Migration
```bash
# If using Supabase CLI
supabase db push

# Or run the SQL manually in Supabase Dashboard
```

### Enable Realtime
In Supabase Dashboard:
1. Go to Database > Replication
2. Enable replication for `notifications` table
3. Select all operations (INSERT, UPDATE, DELETE)

## Styling

The notification system uses:
- **TailwindCSS** for styling
- **Lucide React** for icons
- **date-fns** for time formatting
- **Sonner** for toast notifications
- **PickFirst brand colors** (pickfirst-yellow, amber)

### Color Scheme
- Unread notifications: Yellow highlight (`bg-pickfirst-yellow/5`)
- Read notifications: Transparent with hover effect
- Badge: Red with pulse animation
- Icons: Color-coded by notification type

## Best Practices

### 1. Creating Notifications
- Always provide a meaningful title and message
- Include a link to the relevant page when possible
- Add metadata for additional context
- Use appropriate notification type

### 2. Performance
- Limit notification queries (default: 50)
- Use indexes for fast queries
- Clean up old notifications periodically
- Use synthetic notifications as fallback

### 3. User Experience
- Show toast for new notifications
- Auto-mark as read when clicked
- Provide clear navigation paths
- Keep messages concise and actionable

## Future Enhancements

### Potential Additions
- [ ] Push notifications (browser/mobile)
- [ ] Email digest of notifications
- [ ] Notification preferences per type
- [ ] Notification grouping/threading
- [ ] Search/filter notifications
- [ ] Archive functionality
- [ ] Notification sound effects
- [ ] Desktop notifications API
- [ ] Notification analytics
- [ ] Scheduled notifications

### Backend Triggers
Consider creating database triggers to auto-generate notifications:
- New message received
- Appointment status changed
- Property alert matched
- Price change detected
- Property sold

## Troubleshooting

### Notifications Not Showing
1. Check if notifications table exists
2. Verify RLS policies are correct
3. Check user authentication
4. Inspect browser console for errors
5. Verify Supabase realtime is enabled

### Badge Count Wrong
1. Refresh notifications manually
2. Check synthetic notification generation
3. Verify unread count calculation
4. Clear browser cache

### Real-time Not Working
1. Check Supabase replication settings
2. Verify subscription channel is active
3. Check network connection
4. Inspect WebSocket connection

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database schema matches migration
3. Test with synthetic notifications first
4. Check Supabase dashboard for data

## License
Part of the PickFirst Real Estate Platform
