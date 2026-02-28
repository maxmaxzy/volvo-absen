import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  CalendarDays, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  Check,
  FileText,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  [key: string]: any;
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        active 
          ? "bg-navy-900 text-white shadow-lg shadow-navy-900/20" 
          : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function AppLayout({ children, activeTab, setActiveTab }: { 
  children: React.ReactNode, 
  activeTab: string, 
  setActiveTab: (tab: string) => void 
}) {
  const { user, logout, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user-alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, [token]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/user-alerts/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/user-alerts/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Absensi', icon: UserCheck },
    { id: 'history', label: 'Riwayat', icon: CalendarDays },
  ];

  if (user?.role === 'admin') {
    menuItems.push(
      { id: 'employees', label: 'Karyawan', icon: Users },
      { id: 'admin-attendance', label: 'Data Absensi', icon: CalendarDays },
      { id: 'admin-leaves', label: 'Persetujuan Izin', icon: FileText },
      { id: 'settings', label: 'Pengaturan', icon: Settings },
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col bg-slate-50", isDarkMode && "dark bg-slate-950")}>
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              V
            </div>
            <h1 className="text-xl font-bold text-navy-900">VOLVE</h1>
          </div>

          {/* Desktop Menu Dropdown */}
          <div className="hidden lg:block relative dropdown-container">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-navy-900 font-bold hover:bg-slate-100 transition-all shadow-sm group"
            >
              <div className="w-8 h-8 bg-navy-900/10 rounded-lg flex items-center justify-center text-navy-900">
                <Menu size={18} />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Menu Utama</span>
                <span className="text-sm">
                  {menuItems.find(i => i.id === activeTab)?.label || 'Navigasi'}
                </span>
              </div>
              <ChevronDown size={16} className={cn("ml-2 text-slate-400 transition-transform duration-300", isMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isMenuOpen && [
                  <div key="backdrop" className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />,
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-40 overflow-hidden p-2"
                  >
                    <div className="grid gap-1">
                      {menuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium w-full text-left",
                            activeTab === item.id 
                              ? "bg-navy-900 text-white shadow-lg shadow-navy-900/20" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-navy-900"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            activeTab === item.id ? "bg-white/20" : "bg-slate-100 text-slate-400"
                          )}>
                            <item.icon size={18} />
                          </div>
                          <span>{item.label}</span>
                          {activeTab === item.id && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="ml-auto w-1.5 h-1.5 bg-white rounded-full" 
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
              ]}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && [
                  <div 
                    key="backdrop"
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsNotifOpen(false)}
                  />,
                  <motion.div
                    key="notif"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-40 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-900">Notifikasi</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs font-bold text-navy-900 hover:underline flex items-center gap-1"
                        >
                          <Check size={14} />
                          Tandai baca semua
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                          <Bell size={40} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={cn(
                              "p-4 border-b border-slate-50 last:border-0 cursor-pointer transition-colors hover:bg-slate-50",
                              !notif.is_read && "bg-blue-50/30"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={cn("text-sm font-bold", !notif.is_read ? "text-navy-900" : "text-slate-700")}>
                                {notif.title}
                              </h4>
                              {!notif.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-2">{notif.message}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(notif.created_at).toLocaleString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short'
                              })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
              ]}
            </AnimatePresence>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-navy-100 border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={user?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <button 
            onClick={logout}
            className="hidden lg:flex items-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Keluar"
          >
            <LogOut size={20} />
          </button>

          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 lg:p-10 flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>


      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && [
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />,
            <motion.aside
              key="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    V
                  </div>
                  <h1 className="text-xl font-bold text-navy-900">VOLVE</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ))}
              </nav>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 mb-4 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-navy-100 border-2 border-white shadow-sm overflow-hidden">
                    <img 
                      src={user?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize truncate">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Keluar</span>
                </button>
              </div>
            </motion.aside>
        ]}
      </AnimatePresence>
    </div>
  );
}
