import React, { useEffect, useState } from 'react';
import {
  HeartHandshake,
  Shirt,
  BookOpen,
  Apple,
  Laptop,
  Gamepad2,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Building,
  Users,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface HomePageProps {
  navigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { user, profile, isPlatformAdmin } = useAuth();
  const [stats, setStats] = useState({
    donations: 0,
    ngos: 0,
    donors: 0,
    completed: 0,
  });

  useEffect(() => {
    async function loadStats() {
      if (!isSupabaseConfigured()) return;
      try {
        const supabase = getSupabase();
        const [{ count: totalDonations }, { count: totalNgos }, { count: totalDonors }, { count: totalCompleted }] =
          await Promise.all([
            supabase.from('donations').select('id', { count: 'exact', head: true }),
            supabase.from('ngos').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'donor'),
            supabase.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
          ]);

        setStats({
          donations: totalDonations || 0,
          ngos: totalNgos || 0,
          donors: totalDonors || 0,
          completed: totalCompleted || 0,
        });
      } catch (err) {
        console.error('Failed to load system counts:', err);
      }
    }
    loadStats();
  }, []);

  const categories = [
    { name: 'Clothes & Wearables', icon: Shirt, desc: 'Warm clothes, winter jackets, uniforms, clean wearables' },
    { name: 'Books & Learning', icon: BookOpen, desc: 'Textbooks, literature, stationery, notebooks' },
    { name: 'Packaged Food', icon: Apple, desc: 'Dry rations, grain packets, pulses, canned provisions' },
    { name: 'Electronics & Gadgets', icon: Laptop, desc: 'Computers, tablets, phones, working appliances' },
    { name: 'Toys & Recreational', icon: Gamepad2, desc: 'Board games, soft toys, outdoor sporting kits' },
    { name: 'Medical Aids & Supplies', icon: Stethoscope, desc: 'Wheelchairs, crutches, walkers, sealed aid kits' },
  ];

  const handleCta = () => {
    if (!user) {
      navigate('login');
    } else if (isPlatformAdmin) {
      navigate('admin-dashboard');
    } else if (profile?.role === 'ngo') {
      navigate('ngo-dashboard');
    } else {
      navigate('donor-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Bridging the gap between generous hearts and communities in need</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Give Your Surplus Items a <span className="text-emerald-400">Second Purpose</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            HELPING HANDS connects you directly with verified non-profits. List pre-loved clothes, educational supplies, books, and essentials. You choose the pickup time; verified NGOs pick up right from your doorstep.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCta}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>{user ? 'Open My Dashboard' : 'Donate an Item Today'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('how-it-works')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
            >
              How It Works
            </button>
          </div>

          {/* Quick Real Stats Bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800/70">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {stats.donations > 0 ? stats.donations : '100%'}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {stats.donations > 0 ? 'Total Donations Listed' : 'Direct Doorstep Pickup'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {stats.ngos > 0 ? stats.ngos : 'Verified'}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {stats.ngos > 0 ? 'Registered NGOs' : 'DARPAN Partner Network'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {stats.completed > 0 ? stats.completed : 'Zero'}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {stats.completed > 0 ? 'Completed Deliveries' : 'Middleman Fee'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {stats.donors > 0 ? stats.donors : '1-Click'}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {stats.donors > 0 ? 'Registered Donors' : 'Atomic NGO Acceptance'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            How Helping Hands Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A transparent and dependable process built for donor convenience and verified impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">1. List Items & Set Pickup</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tell us what you're donating, the condition, and choose your preferred pickup date and time. Your schedule is final and respected.
            </p>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 pt-1">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Final Donor-Determined Schedule</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Local NGO Accepts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verified local NGOs browse pending listings matching their beneficiaries. Exactly one NGO accepts your item with database-guaranteed atomicity.
            </p>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified DARPAN Organizations</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Doorstep Pickup & Rating</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The NGO arrives at your location on your chosen date and time. Once completed, share your feedback and star rating to uphold high standards.
            </p>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 pt-1">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Direct Community Fulfillment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="py-16 bg-slate-100/60 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Items That Make an Immediate Difference
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From warm clothes to educational tools, discover what local charities need right now.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs flex items-start space-x-4"
                >
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700 shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donor Box */}
          <div className="bg-emerald-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>For Donors</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Have items at home you don't use?</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Clean out your closet or bookshelves and let verified charities bring them to children, shelters, and families in your city.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => navigate(user ? (profile?.role === 'donor' ? 'donor-dashboard' : 'home') : 'login')}
                className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-2xs"
              >
                Create a Donation
              </button>
            </div>
          </div>

          {/* NGO Box */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                <Building className="w-3.5 h-3.5" />
                <span>For Registered NGOs</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Expand your community reach</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Access pending donations in your city. Accept with one click, confirm scheduled pickups, and manage your volunteer logistics effortlessly.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => navigate('for-ngos')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-2xs"
              >
                Learn About NGO Registration
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
