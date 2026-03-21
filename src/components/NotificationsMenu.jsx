import { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare } from 'lucide-react';
import { P, Btn } from './UI';
import { subscribeNotifications, markNotificationRead } from '../firebase';

export default function NotificationsMenu({ userProfile, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeNotifications(userProfile.uid, setNotifications);
    return unsub;
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleAlertClick = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id);
    setOpen(false);
    if (notif.link) onNavigate(notif.link);
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, color: P.textMuted, transition: 'color 0.2s', marginTop: 4 }}
        onMouseEnter={e => e.currentTarget.style.color = P.navy}
        onMouseLeave={e => e.currentTarget.style.color = P.textMuted}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div style={{ position: 'absolute', top: 4, right: 4, background: '#E74C3C', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 2px 4px rgba(231,76,60,0.3)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: -10, width: 340, background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${P.border}`, zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: P.navy }}>Notifications</span>
            {unreadCount > 0 && (
              <span onClick={() => { notifications.forEach(n => !n.read && markNotificationRead(n.id)); }} style={{ fontSize: 12, color: P.gold, fontWeight: 600, cursor: 'pointer' }}>Mark all read</span>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.textMuted }}>
                <CheckSquare size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                <div style={{ fontSize: 13 }}>You're all caught up!</div>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} onClick={() => handleAlertClick(n)} style={{ padding: '16px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', background: n.read ? '#fff' : '#F6FAFD', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: n.read ? 600 : 700, fontSize: 13, color: P.navy }}>{n.title}</span>
                    <span style={{ fontSize: 11, color: P.textMuted }}>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : 'Now'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: P.textMuted, lineHeight: 1.4 }}>{n.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
