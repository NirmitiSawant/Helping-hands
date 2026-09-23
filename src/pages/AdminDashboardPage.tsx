import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Building2,
  Package,
  Calendar,
  Bell,
  Star,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Lock,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../lib/supabase';
import { Donation, UserProfile, NGOProfile, FeedbackItem, ActivityLog, NotificationItem } from '../types';

interface AdminDashboardPageProps {
  navigate: (page: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { user, isPlatformAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'ngos' | 'donations' | 'schedules' | 'notifications' | 'feedback' | 'activity'
  >('overview');

  // Real Database Collections
  const [donations, setDonations] = useState<Donation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchRealAdminData = useCallback(async () => {
    if (!user || !isPlatformAdmin) return;
    setLoading(true);

    try {
      const supabase = getSupabase();

      // 1. Fetch Donations with joins
      const { data: donData } = await supabase
        .from('donations')
        .select(`
          *,
          donor:donor_id (name, email, phone, city),
          ngo:accepted_ngo_id (org_name, contact_person, phone, city)
        `)
        .order('created_at', { ascending: false });

      setDonations(donData || []);

      // 2. Fetch Users
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(userData || []);

      // 3. Fetch NGOs
      const { data: ngoData } = await supabase
        .from('ngos')
        .select('*')
        .order('created_at', { ascending: false });

      setNgos(ngoData || []);

      // 4. Fetch Feedbacks with joins
      const { data: fbData } = await supabase
        .from('feedbacks')
        .select(`
          *,
          donor:donor_id (name),
          ngo:ngo_id (org_name),
          donation:donation_id (title, category)
        `)
        .order('created_at', { ascending: false });

      setFeedbacks(fbData || []);

      // 5. Fetch Activity Logs
      const { data: logData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setActivityLogs(logData || []);

      // 6. Fetch Notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(notifData || []);
    } catch (err) {
      console.error('Failed to fetch real admin data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isPlatformAdmin]);

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchRealAdminData();
    }
  }, [isPlatformAdmin, fetchRealAdminData]);

  // If still checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs font-mono text-slate-400">Verifying administrative authorization...</p>
        </div>
      </div>
    );
  }

  // Requirement: "AdminDashboard must not contain another login form."
  // If not authorized:
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Administrator Access Required</h1>
        <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
          The administrative control panel is restricted strictly to the single authorized administrator recorded in the platform authorization registry.
        </p>
        <div className="mt-6 flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={() => navigate('admin-login')}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Administrator Login
          </button>
        </div>
      </div>
    );
  }

  // Calculated Real Live Counts from Supabase
  const totalUsers = users.length;
  const totalNGOs = ngos.length;
  const totalDonations = donations.length;
  const pendingDonations = donations.filter((d) => d.status === 'PENDING').length;
  const acceptedDonations = donations.filter((d) => d.status === 'ACCEPTED').length;
  const scheduledDonations = donations.filter((d) => d.status === 'SCHEDULED').length;
  const completedDonations = donations.filter((d) => d.status === 'COMPLETED').length;
  const cancelledDonations = donations.filter((d) => d.status === 'CANCELLED').length;

  const avgRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
      : 'N/A';

  const scheduledDonationsList = donations.filter(
    (d) => d.status === 'ACCEPTED' || d.status === 'SCHEDULED'
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                Authorized Administrator Portal
              </span>
              <span className="text-xs text-slate-400">
                Status: <strong className="text-emerald-400">Active & Verified</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Central Administration Dashboard</h1>
            <p className="text-xs text-slate-400">
              Live Supabase database operations • Real-time platform governance and statistics
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchRealAdminData}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Live Data</span>
            </button>
          </div>
        </div>

        {/* 8 Real Live Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* 1. Total Users */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Total Users</span>
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalUsers}</div>
            <span className="text-[10px] text-slate-500">Profiles</span>
          </div>

          {/* 2. Total NGOs */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Total NGOs</span>
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalNGOs}</div>
            <span className="text-[10px] text-slate-500">Charities</span>
          </div>

          {/* 3. Total Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Total Donations</span>
              <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalDonations}</div>
            <span className="text-[10px] text-slate-500">All listings</span>
          </div>

          {/* 4. Pending Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1.5">{pendingDonations}</div>
            <span className="text-[10px] text-slate-500">Awaiting claim</span>
          </div>

          {/* 5. Accepted Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Accepted</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1.5">{acceptedDonations}</div>
            <span className="text-[10px] text-slate-500">Claimed by NGO</span>
          </div>

          {/* 6. Scheduled Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Scheduled</span>
              <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1.5">{scheduledDonations}</div>
            <span className="text-[10px] text-slate-500">Pickup planned</span>
          </div>

          {/* 7. Completed Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Completed</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1.5">{completedDonations}</div>
            <span className="text-[10px] text-slate-500">Delivered</span>
          </div>

          {/* 8. Cancelled Donations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="truncate">Cancelled</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1.5">{cancelledDonations}</div>
            <span className="text-[10px] text-slate-500">Withdrawn</span>
          </div>
        </div>

        {/* Administrative Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 rounded-xl px-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Users Management</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ngos')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'ngos'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>NGOs Management</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {ngos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('donations')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'donations'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Donations Management</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {donations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Schedules</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {scheduledDonationsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Notifications</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Feedback</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {feedbacks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'activity'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Activity Logs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {activityLogs.length}
            </span>
          </button>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Breakdown Panel */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Donation Pipeline Breakdown</span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">1. PENDING (Awaiting Claim)</span>
                    <span className="font-mono font-bold text-amber-400">{pendingDonations}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2 rounded-full"
                      style={{
                        width: `${totalDonations ? (pendingDonations / totalDonations) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">2. ACCEPTED (Claimed by NGO)</span>
                    <span className="font-mono font-bold text-blue-400">{acceptedDonations}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-400 h-2 rounded-full"
                      style={{
                        width: `${totalDonations ? (acceptedDonations / totalDonations) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">3. SCHEDULED (Route Confirmed)</span>
                    <span className="font-mono font-bold text-purple-400">{scheduledDonations}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-400 h-2 rounded-full"
                      style={{
                        width: `${totalDonations ? (scheduledDonations / totalDonations) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">4. COMPLETED (Successfully Delivered)</span>
                    <span className="font-mono font-bold text-emerald-400">{completedDonations}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full"
                      style={{
                        width: `${totalDonations ? (completedDonations / totalDonations) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">CANCELLED (By Donor)</span>
                    <span className="font-mono font-bold text-rose-400">{cancelledDonations}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-400 h-2 rounded-full"
                      style={{
                        width: `${totalDonations ? (cancelledDonations / totalDonations) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recent Activity Audit Trail */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Recent Audit Activity Logs</span>
                </h3>

                {activityLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {activityLogs.slice(0, 7).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{log.description}</div>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {log.action_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: DONATIONS */}
        {activeTab === 'donations' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded-lg p-1.5 text-slate-200"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, city..."
                  className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                    <tr>
                      <th className="p-3.5">Title & Category</th>
                      <th className="p-3.5">Donor</th>
                      <th className="p-3.5">Accepted NGO</th>
                      <th className="p-3.5">City & Schedule</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {donations
                      .filter((d) => (statusFilter === 'ALL' ? true : d.status === statusFilter))
                      .filter((d) =>
                        searchQuery
                          ? d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.city.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{d.title}</div>
                            <span className="text-[10px] text-emerald-400">{d.category} ({d.quantity} items)</span>
                          </td>
                          <td className="p-3.5">
                            <div>{d.donor?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-500">{d.donor?.email}</div>
                          </td>
                          <td className="p-3.5">
                            {d.ngo ? (
                              <div>
                                <div className="font-semibold text-white">{d.ngo.org_name}</div>
                                <div className="text-[10px] text-slate-500">{d.ngo.contact_person}</div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">None (Unclaimed)</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold">{d.city}</div>
                            <div className="text-[10px] text-slate-400">
                              {d.pickup_date} ({d.pickup_time})
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === 'PENDING'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : d.status === 'ACCEPTED'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                  : d.status === 'SCHEDULED'
                                  ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                  : d.status === 'COMPLETED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {new Date(d.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Registered profiles across the platform (<strong className="text-white">{users.length}</strong> total)
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, email, city, role..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                    <tr>
                      <th className="p-3.5">User Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Phone</th>
                      <th className="p-3.5">City</th>
                      <th className="p-3.5">Registered On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users
                      .filter((u) =>
                        searchQuery
                          ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            u.role.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/40">
                          <td className="p-3.5 font-bold text-white">{u.name}</td>
                          <td className="p-3.5 text-slate-300">{u.email}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : u.role === 'ngo'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">{u.phone || 'N/A'}</td>
                          <td className="p-3.5 text-slate-400">{u.city || 'N/A'}</td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NGOS */}
        {activeTab === 'ngos' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Organization Name</th>
                    <th className="p-3.5">DARPAN / Reg ID</th>
                    <th className="p-3.5">Contact Person</th>
                    <th className="p-3.5">Email & Phone</th>
                    <th className="p-3.5">City & Category</th>
                    <th className="p-3.5">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ngos.map((ngoItem) => (
                    <tr key={ngoItem.id} className="hover:bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">{ngoItem.org_name}</td>
                      <td className="p-3.5 font-mono text-emerald-400">{ngoItem.darpan_id}</td>
                      <td className="p-3.5 text-slate-300">{ngoItem.contact_person}</td>
                      <td className="p-3.5">
                        <div>{ngoItem.email}</div>
                        <div className="text-[10px] text-slate-500">{ngoItem.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div>{ngoItem.city}</div>
                        <span className="text-[10px] text-slate-400">{ngoItem.category}</span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(ngoItem.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SCHEDULES */}
        {activeTab === 'schedules' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Scheduled Item</th>
                    <th className="p-3.5">Pickup Date & Window</th>
                    <th className="p-3.5">Assigned NGO</th>
                    <th className="p-3.5">Donor Contact</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scheduledDonationsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No active accepted or scheduled pickups at this time.
                      </td>
                    </tr>
                  ) : (
                    scheduledDonationsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="p-3.5 font-bold text-white">{item.title}</td>
                        <td className="p-3.5 text-emerald-400 font-semibold">
                          {item.pickup_date} ({item.pickup_time})
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200">
                          {item.ngo?.org_name || 'N/A'}
                        </td>
                        <td className="p-3.5">
                          <div>{item.donor?.name}</div>
                          <div className="text-[10px] text-slate-500">{item.donor?.phone}</div>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {item.pickup_location}, {item.city}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ACTIVITY LOGS */}
        {activeTab === 'activity' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Action Code</th>
                    <th className="p-3.5">Audit Description</th>
                    <th className="p-3.5">Entity Type</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="p-3.5 text-emerald-400 font-bold">{log.action_type}</td>
                      <td className="p-3.5 text-slate-200 font-sans">{log.description}</td>
                      <td className="p-3.5 text-slate-500">{log.entity_type || 'system'}</td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Donation Title</th>
                    <th className="p-3.5">Donor</th>
                    <th className="p-3.5">NGO</th>
                    <th className="p-3.5">Rating</th>
                    <th className="p-3.5">Testimonial Review</th>
                    <th className="p-3.5">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No donor feedback submitted yet.
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((fb) => (
                      <tr key={fb.id} className="hover:bg-slate-900/40">
                        <td className="p-3.5 font-bold text-white">
                          {fb.donation?.title || 'Donation Item'}
                        </td>
                        <td className="p-3.5 text-slate-300">{fb.donor?.name || 'Donor'}</td>
                        <td className="p-3.5 text-slate-300">{fb.ngo?.org_name || 'NGO'}</td>
                        <td className="p-3.5">
                          <div className="flex items-center text-amber-400 font-bold">
                            <span>{fb.rating}</span>
                            <Star className="w-3.5 h-3.5 ml-1 fill-amber-400" />
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 italic">"{fb.comment || 'None'}"</td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Notification Title</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Message Content</th>
                    <th className="p-3.5">Read Status</th>
                    <th className="p-3.5">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">{n.title}</td>
                      <td className="p-3.5 font-mono text-[10px] text-emerald-400">{n.type}</td>
                      <td className="p-3.5 text-slate-400 max-w-md">{n.message}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.is_read ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-400'
                          }`}
                        >
                          {n.is_read ? 'Read' : 'Unread'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(n.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
