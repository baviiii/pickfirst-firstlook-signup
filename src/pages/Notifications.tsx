import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  CheckCheck,
  Filter
} from 'lucide-react';
import { notificationService, Notification, NotificationType } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { withErrorBoundary } from '@/components/ui/error-boundary';

type FilterType = 'all' | 'unread' | NotificationType;

const NotificationsComponent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time notifications
    const channel = notificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      toast.info(newNotification.title, {
        description: newNotification.message
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: realNotifications } = await notificationService.getNotifications(100);
      
      if (realNotifications) {
        setNotifications(realNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
      new_message: <MessageSquare className="h-5 w-5 text-blue-500" />,
      appointment_scheduled: <Calendar className="h-5 w-5 text-pickfirst-yellow" />,
      appointment_confirmed: <Check className="h-5 w-5 text-green-600" />,
      appointment_cancelled: <X className="h-5 w-5 text-red-600" />,
      property_alert: <AlertCircle className="h-5 w-5 text-pickfirst-yellow" />,
      new_listing: <Home className="h-5 w-5 text-green-600" />,
      price_change: <DollarSign className="h-5 w-5 text-orange-600" />,
      property_sold: <Home className="h-5 w-5 text-red-600" />,
      inquiry_response: <Mail className="h-5 w-5 text-purple-600" />,
      system: <Settings className="h-5 w-5 text-gray-600" />
    };
    return iconMap[type] || <Bell className="h-5 w-5 text-gray-600" />;
  };

  const getNotificationColor = (type: NotificationType) => {
    const colorMap: Record<NotificationType, string> = {
      new_message: 'bg-blue-500/10 border-blue-500/30',
      appointment_scheduled: 'bg-pickfirst-yellow/10 border-pickfirst-yellow/30',
      appointment_confirmed: 'bg-green-500/10 border-green-500/30',
      appointment_cancelled: 'bg-red-500/10 border-red-500/30',
      property_alert: 'bg-pickfirst-yellow/10 border-pickfirst-yellow/30',
      new_listing: 'bg-green-500/10 border-green-500/30',
      price_change: 'bg-orange-500/10 border-orange-500/30',
      property_sold: 'bg-red-500/10 border-red-500/30',
      inquiry_response: 'bg-purple-500/10 border-purple-500/30',
      system: 'bg-gray-500/10 border-gray-500/30'
    };
    return colorMap[type] || 'bg-gray-500/10 border-gray-500/30';
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PageWrapper title="Notifications" showBackButton={true}>
      <div className="space-y-6">
        {/* Header Stats & Actions */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-pickfirst-yellow/10 border border-pickfirst-yellow/20">
                  <Bell className="h-6 w-6 text-pickfirst-yellow" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">All Notifications</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
              </div>
              
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  className="bg-pickfirst-yellow hover:bg-amber-500 text-black font-medium"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-pickfirst-yellow text-black' : 'border-gray-700 text-gray-300'}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={filter === 'unread' ? 'bg-pickfirst-yellow text-black' : 'border-gray-700 text-gray-300'}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'new_message' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('new_message')}
            className={filter === 'new_message' ? 'bg-pickfirst-yellow text-black' : 'border-gray-700 text-gray-300'}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Messages
          </Button>
          <Button
            variant={filter === 'appointment_scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('appointment_scheduled')}
            className={filter === 'appointment_scheduled' ? 'bg-pickfirst-yellow text-black' : 'border-gray-700 text-gray-300'}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Appointments
          </Button>
          <Button
            variant={filter === 'property_alert' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('property_alert')}
            className={filter === 'property_alert' ? 'bg-pickfirst-yellow text-black' : 'border-gray-700 text-gray-300'}
          >
            <Home className="h-3 w-3 mr-1" />
            Properties
          </Button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
              <span className="ml-3 text-gray-400">Loading notifications...</span>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
            <CardContent className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-600 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-white mb-2">No Notifications</h3>
              <p className="text-gray-400 text-sm">
                {filter === 'all' 
                  ? "You don't have any notifications yet" 
                  : `No ${filter === 'unread' ? 'unread' : filter.replace('_', ' ')} notifications`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                  !notification.read 
                    ? 'border-pickfirst-yellow/40 shadow-lg shadow-pickfirst-yellow/10' 
                    : 'border-yellow-400/20 hover:border-yellow-400/30'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${getNotificationColor(notification.type)} flex-shrink-0 h-fit border`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-base font-semibold ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <Badge className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 h-auto hover:bg-red-500/20 hover:text-red-400 shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-3">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <span className="text-xs text-pickfirst-yellow">
                            Click to view →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default withErrorBoundary(NotificationsComponent);
