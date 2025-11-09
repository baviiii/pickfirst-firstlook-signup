import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { notificationService, Notification, NotificationType } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';

export type CardActionType = 
  | 'messages'
  | 'listings'
  | 'clients'
  | 'appointments'
  | 'leads'
  | 'inquiries'
  | 'properties'
  | 'alerts'
  | 'favorites';

// Helper function to map notification types to card action types based on user role
const getNotificationToCardMap = (userRole: 'agent' | 'buyer' | 'super_admin' | null): Record<NotificationType, CardActionType | null> => {
  const baseMap: Record<NotificationType, CardActionType | null> = {
    new_message: 'messages',
    appointment_scheduled: 'appointments',
    appointment_confirmed: 'appointments',
    appointment_cancelled: 'appointments',
    property_alert: 'alerts',
    inquiry_response: 'inquiries',
    new_inquiry: 'inquiries',
    system: null,
  };

  // Role-specific mappings
  if (userRole === 'agent') {
    return {
      ...baseMap,
      new_inquiry: 'leads', // Agents see new inquiries on "Leads" card
      new_listing: 'listings', // Agents see new listings on "My Listings" card
      price_change: 'listings',
      property_sold: 'listings',
    };
  } else {
    // For buyers and others
    return {
      ...baseMap,
      new_listing: 'properties', // Buyers see new listings on "Browse Properties" card
      price_change: 'properties',
      property_sold: 'properties',
    };
  }
};

interface CardNotificationCounts {
  [key: string]: number;
}

interface UseCardNotificationsReturn {
  cardCounts: CardNotificationCounts;
  hasNewNotification: (cardType: CardActionType) => boolean;
  clearCardNotifications: (cardType: CardActionType) => void;
  totalUnread: number;
  setTotalUnread: Dispatch<SetStateAction<number>>;
}

export const useCardNotifications = (): UseCardNotificationsReturn => {
  const { profile } = useAuth();
  const [cardCounts, setCardCounts] = useState<CardNotificationCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Set<string>>(new Set());
  
  // Get user role from profile (check both profile.role and user_roles table)
  const userRole = profile?.role as 'agent' | 'buyer' | 'super_admin' | null;

  useEffect(() => {
    if (!userRole) return; // Wait for role to be loaded

    const notificationToCardMap = getNotificationToCardMap(userRole);

    // Fetch initial unread count
    const fetchInitialCount = async () => {
      const count = await notificationService.getUnreadCount();
      setTotalUnread(count);
      
      // Fetch recent notifications to map to cards
      const { data: notifications } = await notificationService.getNotifications(50);
      if (notifications) {
        const counts: CardNotificationCounts = {};
        notifications.forEach(notif => {
          if (!notif.read) {
            const cardType = notificationToCardMap[notif.type];
            if (cardType) {
              counts[cardType] = (counts[cardType] || 0) + 1;
            }
            // Debug log for new_inquiry notifications
            if (notif.type === 'new_inquiry') {
              console.log(`[CardNotifications] Found new_inquiry notification, mapping to card: "${cardType}"`);
            }
          }
        });
        console.log(`[CardNotifications] Initial card counts:`, counts);
        setCardCounts(counts);
      }
    };

    fetchInitialCount();

    // Subscribe to real-time notifications
    const channel = notificationService.subscribeToNotifications((newNotification: Notification) => {
      setTotalUnread(prev => prev + 1);
      
      // Add to recent notifications for animation
      setRecentNotifications(prev => new Set([...prev, newNotification.id]));
      
      // Remove from recent after animation completes (3 seconds)
      setTimeout(() => {
        setRecentNotifications(prev => {
          const next = new Set(prev);
          next.delete(newNotification.id);
          return next;
        });
      }, 3000);

      // Get fresh mapping in case userRole changed
      const currentMap = getNotificationToCardMap(userRole);
      // Map notification to card type
      const cardType = currentMap[newNotification.type];
      if (cardType) {
        console.log(`[CardNotifications] Mapping notification type "${newNotification.type}" to card "${cardType}"`);
        setCardCounts(prev => ({
          ...prev,
          [cardType]: (prev[cardType] || 0) + 1,
        }));
      } else {
        console.log(`[CardNotifications] No card mapping for notification type "${newNotification.type}"`);
      }
    });

    // Poll for updates every 30 seconds as backup
    const pollInterval = setInterval(async () => {
      const count = await notificationService.getUnreadCount();
      setTotalUnread(count);
    }, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [userRole]);

  const hasNewNotification = (cardType: CardActionType): boolean => {
    // Check if there's a recent notification for this card type
    // This is used for animation triggers - show animation if there are unread notifications
    const count = cardCounts[cardType] || 0;
    return count > 0;
  };

  const clearCardNotifications = async (cardType: CardActionType) => {
    if (!userRole) return;
    
    const notificationToCardMap = getNotificationToCardMap(userRole);
    
    // When user clicks on a card, mark related notifications as read
    const { data: notifications } = await notificationService.getNotifications(100);
    if (notifications) {
      const relatedNotifications = notifications.filter(notif => 
        !notif.read && notificationToCardMap[notif.type] === cardType
      );
      
      // Mark all related notifications as read
      await Promise.all(
        relatedNotifications.map(notif => notificationService.markAsRead(notif.id))
      );
      
      // Update counts
      setCardCounts(prev => {
        const next = { ...prev };
        delete next[cardType];
        return next;
      });
      
      setTotalUnread(prev => Math.max(0, prev - relatedNotifications.length));
    }
  };

  return {
    cardCounts,
    hasNewNotification,
    clearCardNotifications,
    totalUnread,
    setTotalUnread,
  };
};

