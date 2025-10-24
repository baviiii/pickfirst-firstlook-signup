import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  X, 
  MessageSquare, 
  Calendar, 
  Home, 
  AlertCircle,
  DollarSign,
  Mail,
  Settings,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { notificationService, Notification, NotificationType } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDropdown = ({ unreadCount: externalUnreadCount, onUnreadCountChange }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(externalUnreadCount || 0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = notificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      onUnreadCountChange?.(unreadCount + 1);
      
      // Show toast for new notification
      toast.info(newNotification.title, {
        description: newNotification.message,
        action: newNotification.link ? {
          label: 'View',
          onClick: () => navigate(newNotification.link!)
        } : undefined
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [navigate, unreadCount, onUnreadCountChange]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Try to get real notifications first
      const { data: realNotifications } = await notificationService.getNotifications(20);
      
      // If no real notifications, generate synthetic ones from existing data
      if (!realNotifications || realNotifications.length === 0) {
        const syntheticNotifications = await notificationService.generateSyntheticNotifications();
        setNotifications(syntheticNotifications);
        const unread = syntheticNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        onUnreadCountChange?.(unread);
      } else {
        setNotifications(realNotifications);
        const unread = realNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        onUnreadCountChange?.(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
      new_message: <MessageSquare className="h-4 w-4 text-blue-400" />,
      appointment_scheduled: <Calendar className="h-4 w-4 text-yellow-400" />,
      appointment_confirmed: <Check className="h-4 w-4 text-green-400" />,
      appointment_cancelled: <X className="h-4 w-4 text-red-400" />,
      property_alert: <AlertCircle className="h-4 w-4 text-pickfirst-yellow" />,
      new_listing: <Home className="h-4 w-4 text-green-400" />,
      price_change: <DollarSign className="h-4 w-4 text-orange-400" />,
      property_sold: <Home className="h-4 w-4 text-red-400" />,
      inquiry_response: <Mail className="h-4 w-4 text-purple-400" />,
      system: <Settings className="h-4 w-4 text-gray-400" />
    };
    return iconMap[type] || <Bell className="h-4 w-4 text-gray-400" />;
  };

  const getNotificationColor = (type: NotificationType) => {
    const colorMap: Record<NotificationType, string> = {
      new_message: 'bg-blue-500/10 border-blue-500/20',
      appointment_scheduled: 'bg-yellow-500/10 border-yellow-500/20',
      appointment_confirmed: 'bg-green-500/10 border-green-500/20',
      appointment_cancelled: 'bg-red-500/10 border-red-500/20',
      property_alert: 'bg-pickfirst-yellow/10 border-pickfirst-yellow/20',
      new_listing: 'bg-green-500/10 border-green-500/20',
      price_change: 'bg-orange-500/10 border-orange-500/20',
      property_sold: 'bg-red-500/10 border-red-500/20',
      inquiry_response: 'bg-purple-500/10 border-purple-500/20',
      system: 'bg-gray-500/10 border-gray-500/20'
    };
    return colorMap[type] || 'bg-gray-500/10 border-gray-500/20';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10"
        onClick={() => setIsOpen(!isOpen)}
        title={`${unreadCount} notification${unreadCount !== 1 ? 's' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-gradient-to-b from-gray-900/98 to-black/98 backdrop-blur-xl border border-pickfirst-yellow/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-pickfirst-yellow/20 bg-gradient-to-r from-pickfirst-yellow/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-pickfirst-yellow" />
                  Notifications
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-pickfirst-yellow hover:text-amber-400 hover:bg-pickfirst-yellow/10"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigate('/buyer-account-settings?tab=notifications');
                    setIsOpen(false);
                  }}
                  className="text-xs text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-pickfirst-yellow/20 scrollbar-track-transparent">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
                <span className="ml-3 text-gray-400">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3 opacity-50" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
                <p className="text-gray-500 text-xs mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-all cursor-pointer group relative ${
                      !notification.read 
                        ? 'bg-pickfirst-yellow/5 hover:bg-pickfirst-yellow/10' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-pickfirst-yellow animate-pulse"></div>
                    )}

                    <div className={`flex gap-3 ${!notification.read ? 'ml-4' : ''}`}>
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)} flex-shrink-0 h-fit`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto hover:bg-red-500/20 hover:text-red-400"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-pickfirst-yellow/20 bg-gradient-to-r from-pickfirst-yellow/5 to-transparent">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate('/buyer-account-settings?tab=notifications');
                  setIsOpen(false);
                }}
                className="w-full text-sm text-pickfirst-yellow hover:text-amber-400 hover:bg-pickfirst-yellow/10"
              >
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
