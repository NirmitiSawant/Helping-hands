import React, { useState } from 'react';
import {
  HeartHandshake,
  Bell,
  LogOut,
  User as UserIcon,
  Building2,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationDrawer } from './NotificationDrawer';

interface NavbarProps {
  currentPage: string;
  navigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, navigate }) => {
  const { user, profile, ngo, isPlatformAdmin, signOut, unreadNotifications, refreshNotifications } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const getDashboardPage = () => {
    if (isPlatformAdmin) return 'admin-dashboard';
    if (profile?.role === 'ngo') return 'ngo-dashboard';
    return 'donor-dashboard';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('home');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => navigate('home')}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                  HELPING HANDS
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-700 mt-0.5">
                  Community Giving
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                type="button"
                onClick={() => navigate('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === 'home' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigate('about')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === 'about' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => navigate('how-it-works')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === 'how-it-works' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => navigate('for-ngos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === 'for-ngos' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For NGOs
              </button>
              <button
                type="button"
                onClick={() => navigate('dwm-analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === 'dwm-analytics'
                    ? 'text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DWM Analytics
              </button>
            </nav>

            {/* Right-side Action Items */}
            <div className="hidden md:flex items-center space-x-3">
              {/* If Authenticated */}
              {user ? (
                <div className="flex items-center space-x-2.5">
                  {/* Notification Bell */}
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(true)}
                    className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Dashboard link button with role badge */}
                  <button
                    type="button"
                    onClick={() => navigate(getDashboardPage())}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    {isPlatformAdmin ? (
                      <Shield className="w-3.5 h-3.5 text-emerald-800" />
                    ) : profile?.role === 'ngo' ? (
                      <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                    <span>
                      {isPlatformAdmin
                        ? 'Admin Portal'
                        : profile?.role === 'ngo'
                        ? (ngo?.org_name || 'NGO Portal')
                        : (profile?.name?.split(' ')[0] || 'My Donations')}
                    </span>
                  </button>

                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* If Not Authenticated */
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => navigate('login')}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('login')}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {user && (
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(true)}
                  className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('about');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('how-it-works');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('for-ngos');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              For NGOs
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('dwm-analytics');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-lg text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50"
            >
              DWM Analytics Dashboard
            </button>

            <div className="pt-2 border-t border-slate-200">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(getDashboardPage());
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-3 text-sm font-bold text-white bg-emerald-700 rounded-xl mb-2"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 text-sm font-semibold text-rose-600 text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 text-sm font-bold text-slate-700 border border-slate-300 rounded-xl text-center"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-3 text-sm font-bold text-white bg-emerald-700 rounded-xl text-center"
                  >
                    Get Started (Register)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Notifications Drawer */}
      {user && (
        <NotificationDrawer
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          userId={user.id}
          onNotificationsChanged={refreshNotifications}
        />
      )}
    </>
  );
};
