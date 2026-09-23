import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Package,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Check,
  Phone,
  Filter,
  User,
  Star,
  RefreshCw,
  AlertCircle,
  Truck,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../lib/supabase';
import { Donation, FeedbackItem } from '../types';
import { atomicAcceptDonation, markDonationScheduled, markDonationCompleted } from '../lib/donationService';

interface NGODashboardPageProps {
  navigate: (page: string) => void;
}

export const NGODashboardPage: React.FC<NGODashboardPageProps> = ({ navigate }) => {
  const { user, profile, ngo } = useAuth();

  const [activeTab, setActiveTab] = useState<'available' | 'my-pickups' | 'history'>('available');

  // Available PENDING donations
  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  // My accepted/scheduled/completed donations
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  // Feedback received
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for available items
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  const categories = [
    'ALL',
    'Clothes & Wearables',
    'Books & Learning',
    'Packaged Food',
    'Electronics & Gadgets',
    'Toys & Recreational',
    'Medical Aids & Supplies',
    'Furniture & Living',
    'General Community Aid',
  ];

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = getSupabase();

      // 1. Fetch PENDING donations (available for NGOs) with joined donor info
      const { data: pendingData, error: pendingErr } = await supabase
        .from('donations')
        .select(`
          *,
          donor:donor_id (
            name,
            email,
            phone,
            city
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (pendingErr) throw pendingErr;
      setPendingDonations(pendingData || []);

      // 2. Fetch donations where accepted_ngo_id = current NGO
      const { data: myData, error: myErr } = await supabase
        .from('donations')
        .select(`
          *,
          donor:donor_id (
            name,
            email,
            phone,
            city
          )
        `)
        .eq('accepted_ngo_id', user.id)
        .order('pickup_date', { ascending: true });

      if (myErr) throw myErr;
      setMyDonations(myData || []);

      // 3. Fetch feedbacks received by this NGO
      const { data: fbData } = await supabase
        .from('feedbacks')
        .select(`
          *,
          donor:donor_id (name),
          donation:donation_id (title, category)
        `)
        .eq('ngo_id', user.id)
        .order('created_at', { ascending: false });

      setFeedbacks(fbData || []);
    } catch (err) {
      console.error('Error loading NGO dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Atomic Acceptance
  const handleAccept = async (donation: Donation) => {
    if (!user || !ngo) return;

    setActionLoadingId(donation.id);
    setActionMessage(null);

    const result = await atomicAcceptDonation({
      donationId: donation.id,
      ngoId: user.id,
      ngoName: ngo.org_name,
      donationTitle: donation.title,
      pickupDate: donation.pickup_date,
      pickupTime: donation.pickup_time,
      pickupLocation: donation.pickup_location,
      city: donation.city,
      donorId: donation.donor_id,
      donorPhone: donation.donor?.phone,
    });

    setActionLoadingId(null);

    if (result.success) {
      setActionMessage({
        type: 'success',
        text: `Successfully claimed "${donation.title}". Scheduled pickup date: ${donation.pickup_date} (${donation.pickup_time}).`,
      });
      await loadData();
      setActiveTab('my-pickups');
    } else {
      setActionMessage({
        type: 'error',
        text: result.error || 'Failed to accept donation. Another NGO may have claimed it.',
      });
      await loadData();
    }
  };

  // Mark Scheduled
  const handleMarkScheduled = async (donation: Donation) => {
    if (!user) return;
    setActionLoadingId(donation.id);
    const result = await markDonationScheduled(donation.id, user.id, donation.title);
    setActionLoadingId(null);

    if (result.success) {
      setActionMessage({
        type: 'success',
        text: `Donation "${donation.title}" confirmed as scheduled for collection route.`,
      });
      await loadData();
    } else {
      setActionMessage({
        type: 'error',
        text: result.error || 'Failed to update schedule status.',
      });
    }
  };

  // Mark Completed
  const handleMarkCompleted = async (donation: Donation) => {
    if (!user) return;

    // Strict requirement: Only allow completion when donation status is SCHEDULED
    if (donation.status !== 'SCHEDULED') {
      setActionMessage({
        type: 'error',
        text: 'Only scheduled donations can be marked as completed.',
      });
      return;
    }

    setActionLoadingId(donation.id);
    try {
      const result = await markDonationCompleted(donation.id);

      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `Donation "${donation.title}" marked completed! Moved to Completed & Feedback history.`,
        });
        await loadData();
        setActiveTab('history');
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || 'Failed to complete donation.',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error completing donation';
      setActionMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter available items
  const filteredAvailable = pendingDonations.filter((d) => {
    if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
    if (cityFilter !== 'ALL' && d.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    return true;
  });

  const availableCities = Array.from(new Set(pendingDonations.map((d) => d.city)));

  const activePickups = myDonations.filter((d) => d.status === 'ACCEPTED' || d.status === 'SCHEDULED');
  const completedPickups = myDonations.filter((d) => d.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* NGO Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Non-Profit Partner Portal
              </span>
              <span className="text-xs font-semibold text-slate-500">
                DARPAN ID: <strong className="text-slate-800">{ngo?.darpan_id || 'Verified'}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {ngo?.org_name || profile?.name || 'NGO Partner'}
            </h1>
            <p className="text-xs text-slate-500">
              Contact: {ngo?.contact_person || 'Coordinator'} • Phone: {ngo?.phone || profile?.phone} • Base City: {ngo?.city || profile?.city} • Focus: {ngo?.category || 'General'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Global Action Message */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-xl px-4 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'available'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Available Donations</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              {pendingDonations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-pickups')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'my-pickups'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Active Pickups</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
              {activePickups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed & Feedback</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
              {completedPickups.length}
            </span>
          </button>
        </div>

        {/* TAB 1: AVAILABLE DONATIONS */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>Filter Items:</span>
              </div>

              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 p-1.5 text-xs text-slate-800 focus:border-emerald-600 bg-white"
                >
                  <option value="ALL">All Categories</option>
                  {categories.filter((c) => c !== 'ALL').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {availableCities.length > 0 && (
                <div>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 p-1.5 text-xs text-slate-800 focus:border-emerald-600 bg-white"
                  >
                    <option value="ALL">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(categoryFilter !== 'ALL' || cityFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setCityFilter('ALL');
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-xs font-semibold">Loading available donations...</p>
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No pending donations available</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Check back soon! New donations are posted in real-time by donors across the community.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAvailable.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {d.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" />
                          PENDING
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{d.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                        {d.description}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                            Quantity & Condition
                          </span>
                          <span className="font-bold text-slate-800">
                            {d.quantity} item{d.quantity > 1 ? 's' : ''} ({d.condition})
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                            City & Location
                          </span>
                          <span className="font-bold text-slate-800">{d.city}</span>
                        </div>

                        <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>
                              {d.pickup_date} ({d.pickup_time})
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                            Guaranteed Schedule
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Posted {new Date(d.created_at).toLocaleDateString()}
                      </span>

                      {/* Atomic 1-Click Accept Button */}
                      <button
                        type="button"
                        onClick={() => handleAccept(d)}
                        disabled={actionLoadingId === d.id}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        {actionLoadingId === d.id ? (
                          <span>Accepting atomically...</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Claim & Accept Donation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY ACCEPTED & SCHEDULED PICKUPS */}
        {activeTab === 'my-pickups' && (
          <div className="space-y-4">
            {activePickups.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-2">
                <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No active pickups</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse available listings and accept items to dispatch your volunteer collection team.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('available')}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800"
                >
                  Browse Available Donations
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activePickups.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {item.category}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.status === 'ACCEPTED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Donor Contact & Address Box */}
                      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>Donor: {item.donor?.name || 'Anonymous Donor'}</span>
                          </div>
                          {item.donor?.phone && (
                            <a
                              href={`tel:${item.donor.phone}`}
                              className="flex items-center space-x-1 text-emerald-700 font-bold hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{item.donor.phone}</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-start space-x-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="font-medium">
                            {item.pickup_location}, {item.city}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-emerald-900 font-semibold bg-emerald-100/60 p-2 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>
                            Pickup Scheduled: {item.pickup_date} at {item.pickup_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* NGO Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      {item.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkScheduled(item)}
                          disabled={actionLoadingId === item.id}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoadingId === item.id ? 'Scheduling...' : 'Confirm Route (Scheduled)'}
                        </button>
                      )}

                      {item.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(item)}
                          disabled={actionLoadingId === item.id}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {actionLoadingId === item.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Completing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark Pickup Completed</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPLETED & FEEDBACK HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {completedPickups.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No completed pickups yet</h3>
                <p className="text-xs text-slate-500">
                  Completed donations and donor feedback ratings will be logged here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedPickups.map((item) => {
                  const itemFeedback = feedbacks.find((f) => f.donation_id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {item.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          COMPLETED
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500">
                        Donor: {item.donor?.name} • Quantity: {item.quantity} item(s) • Picked up: {item.pickup_date}
                      </p>

                      {/* Feedback rating if available */}
                      {itemFeedback ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-amber-900">
                              Donor Rating
                            </span>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= itemFeedback.rating
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 italic">
                            "{itemFeedback.comment || 'No written comment'}"
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          Awaiting donor rating & review
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
