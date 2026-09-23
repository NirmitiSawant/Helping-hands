import React, { useEffect, useState, useCallback } from 'react';
import {
  PackagePlus,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  Star,
  XCircle,
  AlertCircle,
  Phone,
  Filter,
  Plus,
  X,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../lib/supabase';
import { Donation, FeedbackItem } from '../types';
import { createDonation, cancelDonation } from '../lib/donationService';
import { FeedbackModal } from '../components/FeedbackModal';

interface UserDashboardPageProps {
  navigate: (page: string) => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ navigate }) => {
  const { user, profile } = useAuth();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Create Donation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');

  // Form inputs
  const [category, setCategory] = useState<string>('Clothes & Wearables');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<string>('Good');
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [city, setCity] = useState<string>(profile?.city || '');
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('10:00 AM - 12:00 PM');

  // Feedback Modal State
  const [feedbackDonation, setFeedbackDonation] = useState<Donation | null>(null);

  const categories = [
    'Clothes & Wearables',
    'Books & Learning',
    'Packaged Food',
    'Electronics & Gadgets',
    'Toys & Recreational',
    'Medical Aids & Supplies',
    'Furniture & Living',
    'General Community Aid',
  ];

  const conditions = ['Brand New', 'Like New', 'Good', 'Fair'];
  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  const loadDonations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = getSupabase();

      // Fetch user's donations with joined NGO details
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          ngo:accepted_ngo_id (
            org_name,
            contact_person,
            phone,
            city
          )
        `)
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);

      // Fetch feedbacks submitted by this donor
      const { data: fbData } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('donor_id', user.id);

      if (fbData) {
        const map: Record<string, FeedbackItem> = {};
        fbData.forEach((fb) => {
          map[fb.donation_id] = fb;
        });
        setFeedbacks(map);
      }
    } catch (err) {
      console.error('Failed to load donor donations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title || !description || !pickupLocation || !city || !pickupDate) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    const res = await createDonation({
      donor_id: user.id,
      category,
      title,
      description,
      quantity,
      condition,
      pickup_location: pickupLocation,
      city,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
    });

    setCreateSubmitting(false);

    if (res.error) {
      setCreateError(res.error);
    } else {
      setIsCreateOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setQuantity(1);
      setPickupLocation('');
      setPickupDate('');
      await loadDonations();
    }
  };

  const handleCancel = async (d: Donation) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel donation "${d.title}"?`);
    if (!confirmCancel || !user) return;

    const res = await cancelDonation(d.id, user.id, d.title, d.accepted_ngo_id);
    if (res.success) {
      await loadDonations();
    } else {
      alert(res.error || 'Failed to cancel donation');
    }
  };

  const filteredDonations = donations.filter((d) => {
    if (activeFilter === 'ALL') return true;
    return d.status === activeFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            PENDING
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Building2 className="w-3 h-3 mr-1" />
            ACCEPTED
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Calendar className="w-3 h-3 mr-1" />
            SCHEDULED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" />
            CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Donor Banner & Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Donor Profile
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Welcome, {profile?.name || 'Valued Donor'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Email: {profile?.email} • Phone: {profile?.phone || 'Not set'} • City: {profile?.city || 'Not set'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Donation</span>
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {(['ALL', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((filter) => {
            const count =
              filter === 'ALL'
                ? donations.length
                : donations.filter((d) => d.status === filter).length;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === filter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All Items' : filter} ({count})
              </button>
            );
          })}
        </div>

        {/* Donation Items List */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading your donations from database...</p>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              {activeFilter === 'ALL'
                ? "You haven't listed any donations yet"
                : `No donations with status "${activeFilter}"`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ready to give clothes, books, food, or toys a second life? Create your first listing in just a minute.
            </p>
            {activeFilter === 'ALL' && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors inline-block"
              >
                List an Item Now
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDonations.map((item) => {
              const itemFeedback = feedbacks[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Status & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {item.category}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Metadata Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                          Quantity & Condition
                        </span>
                        <span className="font-bold text-slate-800">
                          {item.quantity} item{item.quantity > 1 ? 's' : ''} ({item.condition})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                          Pickup City
                        </span>
                        <span className="font-bold text-slate-800">{item.city}</span>
                      </div>

                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="font-semibold">
                            {item.pickup_date} ({item.pickup_time})
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          Final Schedule
                        </span>
                      </div>

                      <div className="col-span-2 text-[11px] text-slate-500 flex items-start space-x-1 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{item.pickup_location}</span>
                      </div>
                    </div>

                    {/* NGO Partner Info if Accepted/Scheduled */}
                    {item.ngo && (
                      <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-blue-800">
                            Partner Organization
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold">
                            Verified Receiver
                          </span>
                        </div>
                        <div className="font-bold text-slate-900">{item.ngo.org_name}</div>
                        <div className="text-[11px] text-slate-600 flex items-center space-x-3">
                          <span>Contact: {item.ngo.contact_person}</span>
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>{item.ngo.phone}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Feedback Display if Completed & Reviewed */}
                    {itemFeedback && (
                      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-amber-800">
                            Your Rating & Feedback
                          </span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= itemFeedback.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-700 italic">
                          "{itemFeedback.comment || 'No written comments'}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Listed {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center space-x-2">
                      {item.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(item)}
                          className="px-3 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold transition-colors"
                        >
                          Cancel Listing
                        </button>
                      )}

                      {item.status === 'COMPLETED' && !itemFeedback && (
                        <button
                          type="button"
                          onClick={() => setFeedbackDonation(item)}
                          className="px-3.5 py-1.5 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold transition-all shadow-xs flex items-center space-x-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Leave Feedback</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Donation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsCreateOpen(false)}
            />

            <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">List an Item for Donation</h3>
                    <p className="text-xs text-slate-500">
                      Specify the items and designate your final doorstep pickup schedule
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDonation} className="mt-5 space-y-4">
                {createError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Item Condition
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none bg-white"
                    >
                      {conditions.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Donation Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. 5 Winter Woolen Sweaters"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      required
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Describe sizes, colors, material, packaging, or special instructions..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pickup Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      required
                      placeholder="e.g. Flat 402, Sunshine Heights, MG Road"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pickup City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      placeholder="e.g. Mumbai"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Final Pickup Schedule Inputs */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Doorstep Pickup Schedule (Final & Guaranteed)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      NGO cannot modify this
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Preferred Pickup Date
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setPickupDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Preferred Time Slot
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none bg-white"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
                  >
                    {createSubmitting ? 'Posting Donation...' : 'Post Donation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackDonation && user && (
        <FeedbackModal
          isOpen={Boolean(feedbackDonation)}
          onClose={() => setFeedbackDonation(null)}
          donation={feedbackDonation}
          donorId={user.id}
          donorName={profile?.name || 'Donor'}
          onSuccess={loadDonations}
        />
      )}
    </div>
  );
};
