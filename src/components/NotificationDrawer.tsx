import React, { useEffect, useState } from 'react';
import { X, Bell, CheckCircle, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { NotificationItem } from '../types';
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/donationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNotificationsChanged: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  userId,
  onNotificationsChanged,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchUserNotifications(userId);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    onNotificationsChanged();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onNotificationsChanged();
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'DONATION_ACCEPTED':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'SCHEDULED_PICKUP':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'FEEDBACK_RECEIVED':
        return <MessageSquare className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500">Real-time alerts for your donations & pickups</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2" />
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  You'll be notified when donations are accepted or schedules are set.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.is_read
                      ? 'bg-white border-slate-200 text-slate-600'
                      : 'bg-emerald-50/40 border-emerald-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                        <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                          {new Date(item.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                      {!item.is_read && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleMarkRead(item.id)}
                            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
