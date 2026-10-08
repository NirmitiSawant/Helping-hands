import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  BarChart3,
  Layers,
  GitMerge,
  Cpu,
  BrainCircuit,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Package,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowLeft,
  TrendingUp,
  ArrowRight,
  Sliders,
  Table as TableIcon,
  Maximize2,
  PieChart,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { Donation, NGOProfile, UserProfile } from '../types';
import {
  computeDataExploration,
  computeDonationTrend,
  runKMeansClustering,
  runHierarchicalClustering,
  generateKeyInsights,
  computeNGOActivityMetrics,
  DataExplorationResult,
  KMeansResult,
  HierarchicalClusteringResult,
  DynamicInsight,
  NGOActivityMetric,
} from '../lib/dwmAnalytics';
import {
  DonationStatusDonutChart,
  DonationTrendLineChart,
  CategoryDonutChart,
  CityActivityHorizontalBarChart,
  NGOActivityBarChart,
} from '../components/dwm/DWMCharts';
import { OLAPExplorer } from '../components/dwm/OLAPExplorer';

interface DWMAnalyticsPageProps {
  navigate: (page: string) => void;
}

type TabType =
  | 'overview'
  | 'exploration'
  | 'olap'
  | 'kmeans'
  | 'hierarchical'
  | 'insights';

export const DWMAnalyticsPage: React.FC<DWMAnalyticsPageProps> = ({ navigate }) => {
  const { user, profile, isPlatformAdmin, loading: authLoading } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Supabase Raw Data State (strictly from Authenticated Admin session)
  const [donations, setDonations] = useState<Donation[]>([]);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [queryFailed, setQueryFailed] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Data Fetching: Strictly READ-ONLY using Authenticated Admin Supabase Client
  // --------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    // 1. Authorization guard: NEVER query private tables if unauthenticated or non-admin
    if (!user || !isPlatformAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setQueryFailed(false);

    if (!isSupabaseConfigured()) {
      setLoading(false);
      setFetchError('Supabase is not configured. Connection credentials are required.');
      setQueryFailed(true);
      return;
    }

    try {
      const supabase = getSupabase();

      // Read directly using the authenticated Admin Supabase session
      const [donationsRes, ngosRes, profilesRes] = await Promise.all([
        supabase
          .from('donations')
          .select(`
            *,
            donor:donor_id (name, email, phone, city),
            ngo:accepted_ngo_id (org_name, contact_person, phone, city)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('ngos')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      const errors: string[] = [];
      if (donationsRes.error) {
        errors.push(`public.donations: ${donationsRes.error.message}`);
      }
      if (ngosRes.error) {
        errors.push(`public.ngos: ${ngosRes.error.message}`);
      }
      if (profilesRes.error) {
        errors.push(`public.profiles: ${profilesRes.error.message}`);
      }

      // If Supabase returned an RLS or query failure, do NOT treat it as 0 records
      if (errors.length > 0) {
        const errorMsg = `Supabase query failure: ${errors.join(' | ')}`;
        console.error(errorMsg);
        setFetchError(errorMsg);
        setQueryFailed(true);
        return;
      }

      const allProfiles = (profilesRes.data || []) as UserProfile[];
      // Real Donors: filtered from public.profiles where role = 'donor'
      const donorProfiles = allProfiles.filter((p) => p.role === 'donor');

      setDonations((donationsRes.data || []) as Donation[]);
      setNgos((ngosRes.data || []) as NGOProfile[]);
      setDonors(donorProfiles);
      setHasAttemptedLoad(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query administrative data';
      setFetchError(msg);
      setQueryFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user, isPlatformAdmin]);

  useEffect(() => {
    if (user && isPlatformAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, isPlatformAdmin, loadData]);

  // --------------------------------------------------------------------------
  // 1. Dynamic KPIs for Overview (from real data)
  // --------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalDonors = donors.length;
    const totalNGOs = ngos.length;
    const totalDonations = donations.length;

    let pending = 0;
    let accepted = 0;
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    let totalQuantity = 0;

    for (const d of donations) {
      totalQuantity += Number(d.quantity) || 1;
      if (d.status === 'PENDING') pending++;
      else if (d.status === 'ACCEPTED') accepted++;
      else if (d.status === 'SCHEDULED') scheduled++;
      else if (d.status === 'COMPLETED') completed++;
      else if (d.status === 'CANCELLED') cancelled++;
    }

    return {
      totalDonors,
      totalNGOs,
      totalDonations,
      pending,
      accepted,
      scheduled,
      completed,
      cancelled,
      totalQuantity,
    };
  }, [donations, ngos, donors]);

  // Real Data Visualizations: Chronological Trend (Monthly counts & item quantities)
  const donationTrend = useMemo(() => computeDonationTrend(donations), [donations]);

  // --------------------------------------------------------------------------
  // 2. Data Exploration computations
  // --------------------------------------------------------------------------
  const explorationResult: DataExplorationResult = useMemo(() => {
    return computeDataExploration(donations, ngos, donors);
  }, [donations, ngos, donors]);

  // NGO Activity Metrics for Key Insights
  const ngoActivityMetrics = useMemo(() => {
    return computeNGOActivityMetrics(ngos, donations);
  }, [ngos, donations]);

  // --------------------------------------------------------------------------
  // 3. K-Means Clustering State & computations
  // --------------------------------------------------------------------------
  const [kValue, setKValue] = useState<number>(3);
  const kmeansResult: KMeansResult = useMemo(() => {
    return runKMeansClustering(ngos, donations, kValue);
  }, [ngos, donations, kValue]);

  // --------------------------------------------------------------------------
  // 6. Hierarchical Clustering computations
  // --------------------------------------------------------------------------
  const hierarchicalResult: HierarchicalClusteringResult = useMemo(() => {
    return runHierarchicalClustering(ngos, donations);
  }, [ngos, donations]);

  // --------------------------------------------------------------------------
  // 7. Key Insights computations
  // --------------------------------------------------------------------------
  const keyInsights: DynamicInsight[] = useMemo(() => {
    return generateKeyInsights(donations, ngos, donors, kmeansResult);
  }, [donations, ngos, donors, kmeansResult]);

  // 1. Loading state during auth verification
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

  // 2. Unauthenticated user: strictly no access to private analytics
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                Admin-Only Analytical System
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Administrator Access Required
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Administrator access required to view DWM Analytics.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed pt-1">
                The DWM Analytics Dashboard requires an active administrator session to calculate real-time mining models and access platform statistics under Row Level Security.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('admin-login')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Go to Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('home')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated user but not an authorized admin
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-red-400 text-xs font-medium">
                Authorization Required
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Administrator Access Required
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Administrator access required to view DWM Analytics.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed pt-1">
                Your current account (<span className="text-slate-200 font-semibold">{profile?.email || user.email}</span>) is signed in as a <span className="text-emerald-400 font-semibold uppercase">{profile?.role || 'user'}</span>. Access to DWM Analytics is restricted to authorized platform administrators.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('admin-login')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In as Admin</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(profile?.role === 'ngo' ? 'ngo-dashboard' : profile?.role === 'donor' ? 'donor-dashboard' : 'home')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Return to My Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Initial database query loading
  if (loading && !hasAttemptedLoad) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-white">Loading Administrative Data from Supabase...</p>
          <p className="text-xs text-slate-400">Executing authenticated queries across profiles, ngos, and donations</p>
        </div>
      </div>
    );
  }

  // 5. Query failure error state (do NOT convert query failures to 0)
  if (queryFailed && fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="p-8 rounded-3xl bg-slate-900 border border-red-500/30 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold">
                Supabase Query Failure
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">
                Failed to Retrieve Analytical Data
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Supabase returned a query or permission error instead of data records. DWM analytics will not convert database errors into false 0 values.
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[11px] text-red-300 break-all">
                {fetchError}
              </div>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={loadData}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Query</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('admin-dashboard')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Go to Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header Banner */}
      <section className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Database className="w-3.5 h-3.5" />
                <span>HELPING HANDS — Data Warehousing & Mining (DWM)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                DWM Analytics Dashboard
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                HELPING HANDS uses data analysis and data mining techniques to understand donation activity, NGO activity, geographical patterns, temporal trends, and relationships within the platform data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('admin-dashboard')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Read-Only Analytical Layer</span>
              </span>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Analyzing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>

          {/* Privacy & Scope Indicator */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-400">Data Scope: </span>
              <span className="font-semibold text-emerald-400">Authorized Admin Analytics</span>
            </div>
            <div>
              Active Engine:{' '}
              <span className="font-mono text-emerald-400">In-Memory Analytical Engine (Read-Only)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tab Navigation */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            {[
              { id: 'overview', label: '1. Overview & Visualizations', icon: BarChart3 },
              { id: 'exploration', label: '2. Exploration', icon: TableIcon },
              { id: 'olap', label: '3. OLAP Explorer', icon: Layers },
              { id: 'kmeans', label: '4. K-Means', icon: BrainCircuit },
              { id: 'hierarchical', label: '5. Hierarchical', icon: GitMerge },
              { id: 'insights', label: '6. Key Insights', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {fetchError && !queryFailed && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 1: OVERVIEW & REAL-TIME KPIS WITH DATA VISUALIZATIONS */}
        {/* ================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Genuinely empty state indicator */}
            {hasAttemptedLoad && !queryFailed && donations.length === 0 && ngos.length === 0 && donors.length === 0 && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-blue-900">Database Connected: Genuinely Empty State</p>
                  <p className="text-blue-700 mt-0.5">
                    No donor profiles, NGO records, or donations exist yet in the database. Dynamic KPIs accurately reflect 0 real database records.
                  </p>
                </div>
              </div>
            )}

            {/* KPI Grid - Real Calculated Supabase Data */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Donors</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpis.totalDonors}</div>
                <div className="text-[10px] text-slate-400 mt-1">From public.profiles (role = 'donor')</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total NGOs</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpis.totalNGOs}</div>
                <div className="text-[10px] text-slate-400 mt-1">From public.ngos master table</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Donations</span>
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpis.totalDonations}</div>
                <div className="text-[10px] text-slate-400 mt-1">From public.donations listings</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Donation Quantity</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpis.totalQuantity}</div>
                <div className="text-[10px] text-slate-400 mt-1">Sum from actual quantity values</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Completed Donations</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpis.completed}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {kpis.totalDonations > 0
                    ? `${Math.round((kpis.completed / kpis.totalDonations) * 100)}% fulfillment rate`
                    : "status = 'COMPLETED'"}
                </div>
              </div>
            </div>

            {/* Status Breakdown Pipeline - Real donations.status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Donation Status Pipeline (Calculated from donations.status)</span>
                <span className="text-xs font-normal text-slate-500">{kpis.totalDonations} total records</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase text-amber-800">Pending Donations</span>
                  <div className="text-xl font-black text-amber-900 mt-0.5">{kpis.pending}</div>
                  <span className="text-[10px] text-amber-700">status = 'PENDING'</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80">
                  <span className="text-[10px] font-bold uppercase text-blue-800">Accepted Donations</span>
                  <div className="text-xl font-black text-blue-900 mt-0.5">{kpis.accepted}</div>
                  <span className="text-[10px] text-blue-700">status = 'ACCEPTED'</span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80">
                  <span className="text-[10px] font-bold uppercase text-indigo-800">Scheduled Donations</span>
                  <div className="text-xl font-black text-indigo-900 mt-0.5">{kpis.scheduled}</div>
                  <span className="text-[10px] text-indigo-700">status = 'SCHEDULED'</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Completed Donations</span>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">{kpis.completed}</div>
                  <span className="text-[10px] text-emerald-700">status = 'COMPLETED'</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-600">Cancelled Donations</span>
                  <div className="text-xl font-black text-slate-700 mt-0.5">{kpis.cancelled}</div>
                  <span className="text-[10px] text-slate-500">status = 'CANCELLED'</span>
                </div>
              </div>
            </div>

            {/* Chronological Donation Trend Line Chart */}
            <DonationTrendLineChart trend={donationTrend} />
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: DATA EXPLORATION */}
        {/* ================================================================== */}
        {activeTab === 'exploration' && (
          <div className="space-y-8">
            {/* Exploration Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Total Observations (N)</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{explorationResult.totalDonationRecords}</div>
                <span className="text-[10px] text-slate-400">Rows in public.donations</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Attributes Cataloged</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{explorationResult.attributes.length}</div>
                <span className="text-[10px] text-slate-400">Schema fields inspected</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Duplicate Tuples</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{explorationResult.duplicateCount}</div>
                <span className="text-[10px] text-slate-400">Detected by compound key</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500">Unique Entities</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {explorationResult.totalDonorRecords + explorationResult.totalNGORecords}
                </div>
                <span className="text-[10px] text-slate-400">Donors ({explorationResult.totalDonorRecords}) + NGOs ({explorationResult.totalNGORecords})</span>
              </div>
            </div>

            {/* Numerical Attribute Summary: 'quantity' */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Descriptive Statistics for Continuous Numerical Feature (quantity)</span>
                <span className="text-xs text-slate-400">Sample count: {explorationResult.numericalStats?.count || 0}</span>
              </h3>

              {explorationResult.numericalStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Min</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.min}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Max</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.max}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Mean (x̄)</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.mean}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Median (Q2)</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.median}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Std Dev (σ)</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.stdDev}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Q1 (25%)</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.q1}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Q3 (75%)</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.q3}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500">IQR</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{explorationResult.numericalStats.iqr}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">Insufficient numeric records to calculate moments.</div>
              )}
            </div>

            {/* Schema Attribute Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attribute Inventory & Data Profiling</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Summary of attribute types, completeness, and cardinality</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Attribute Name</th>
                      <th className="py-3 px-4">Data Type</th>
                      <th className="py-3 px-4">Non-Null Count</th>
                      <th className="py-3 px-4">Null Count</th>
                      <th className="py-3 px-4">Distinct Values</th>
                      <th className="py-3 px-4">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {explorationResult.attributes.map((attr) => (
                      <tr key={attr.name} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{attr.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              attr.type === 'numeric'
                                ? 'bg-indigo-50 text-indigo-700'
                                : attr.type === 'categorical'
                                ? 'bg-emerald-50 text-emerald-700'
                                : attr.type === 'datetime'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {attr.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{attr.nonNullCount}</td>
                        <td className="py-3 px-4 text-slate-700">{attr.nullCount}</td>
                        <td className="py-3 px-4 text-slate-700 font-bold">{attr.distinctCount}</td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{attr.sampleValues.join(', ') || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: OLAP EXPLORER */}
        {/* ================================================================== */}
        {activeTab === 'olap' && (
          <OLAPExplorer donations={donations} />
        )}

        {/* ================================================================== */}
        {/* TAB 4: K-MEANS CLUSTERING */}
        {/* ================================================================== */}
        {activeTab === 'kmeans' && (
          <div className="space-y-8">
            {/* K-Means Control & Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">K-Means Clustering on NGO Operational Profiles</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Purpose: Group verified non-profit partners according to their real donation-handling activity and completion velocity.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-700">Clusters (K):</span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {[2, 3, 4].map((kv) => (
                      <button
                        key={kv}
                        type="button"
                        onClick={() => setKValue(kv)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          kValue === kv ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        K = {kv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insufficient Data Check */}
              {!kmeansResult.isApplicable ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Insufficient Data for Reliable Analysis</h4>
                  <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                    {kmeansResult.insufficientReason || 'At least 2 distinct active NGOs are needed to run K-Means clustering.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Model Performance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Number of Clusters (K)</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">{kmeansResult.k}</div>
                      <span className="text-[10px] text-slate-400">Iterations to convergence: {kmeansResult.iterationsRun}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Evaluated Entities</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">{kmeansResult.points.length} NGOs</div>
                      <span className="text-[10px] text-slate-400">Feature space: 3 activity dimensions</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Silhouette Coefficient</span>
                      <div className="text-2xl font-black text-emerald-700 mt-1">
                        {kmeansResult.silhouetteScore !== null ? kmeansResult.silhouetteScore : 'N/A'}
                      </div>
                      <span className="text-[10px] text-slate-400">Range [-1, +1], &gt; 0 indicates compact clusters</span>
                    </div>
                  </div>

                  {/* Cluster Characteristics Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80">
                        <tr>
                          <th className="py-2.5 px-4">Cluster Label</th>
                          <th className="py-2.5 px-4">Size (NGOs)</th>
                          <th className="py-2.5 px-4">Avg Handled</th>
                          <th className="py-2.5 px-4">Avg Completed</th>
                          <th className="py-2.5 px-4">Avg Completion Rate</th>
                          <th className="py-2.5 px-4">Avg Quantity</th>
                          <th className="py-2.5 px-4">Assigned Organizations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {kmeansResult.clusters.map((cl, idx) => (
                          <tr key={cl.clusterIndex} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : idx === 1
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                                }`}
                              >
                                {cl.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{cl.size}</td>
                            <td className="py-3 px-4 text-slate-700">{cl.avgTotalHandled}</td>
                            <td className="py-3 px-4 text-slate-700">{cl.avgCompletedCount}</td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-700">{cl.avgCompletionRate}%</td>
                            <td className="py-3 px-4 text-slate-700">{cl.avgTotalQuantity}</td>
                            <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{cl.ngoNames.join(', ') || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 2D Interactive Scatter / Distribution Grid */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Cluster Points Distribution (Total Handled vs Completion Rate)
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Each bubble represents a verified NGO located by real donation activity coordinates.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {kmeansResult.points.map((pt) => {
                        const cl = kmeansResult.clusters.find((c) => c.clusterIndex === pt.assignedCluster);
                        return (
                          <div
                            key={pt.ngoId}
                            className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs truncate max-w-[160px]">{pt.orgName}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {cl?.label || `Cluster ${pt.assignedCluster}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex justify-between">
                              <span>City: {pt.city}</span>
                              <span className="font-mono text-emerald-700 font-bold">{pt.completionRate}% rate</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Handled: {pt.totalHandled} | Completed: {pt.completedCount} | Qty: {pt.totalQuantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 5: HIERARCHICAL CLUSTERING */}
        {/* ================================================================== */}
        {activeTab === 'hierarchical' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agglomerative Hierarchical Clustering</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Builds a bottom-up cluster hierarchy (dendrogram) pairing NGOs by similarity in donation-handling patterns.
                </p>
              </div>

              {!hierarchicalResult.isApplicable ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Insufficient Data for Hierarchical Clustering</h4>
                  <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                    {hierarchicalResult.insufficientReason || 'At least 2 distinct NGOs are required.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step-by-Step Merge Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80">
                        <tr>
                          <th className="py-2.5 px-4">Merge Step</th>
                          <th className="py-2.5 px-4">Cluster A</th>
                          <th className="py-2.5 px-4">Cluster B</th>
                          <th className="py-2.5 px-4">Euclidean Distance (d)</th>
                          <th className="py-2.5 px-4">Resulting Combined Node</th>
                          <th className="py-2.5 px-4">Merged Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {hierarchicalResult.mergeSteps.map((step) => (
                          <tr key={step.step} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">#{step.step}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-bold">{step.clusterA}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-bold">{step.clusterB}</td>
                            <td className="py-2.5 px-4 font-mono text-indigo-700 font-bold">{step.distance}</td>
                            <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{step.resultCluster}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">{step.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Visual Dendrogram Branch Tree */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Dendrogram Merge Visualizer
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Horizontal branch lengths indicate pairwise Euclidean distance at the time of agglomerative union.
                    </p>

                    <div className="space-y-2 pt-2">
                      {hierarchicalResult.mergeSteps.map((step) => {
                        const widthPct = Math.min(100, Math.max(15, Math.round((step.distance / hierarchicalResult.maxDistance) * 100)));
                        return (
                          <div key={step.step} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-slate-800 font-bold truncate max-w-md">
                                [{step.clusterA}] + [{step.clusterB}]
                              </span>
                              <span className="text-indigo-700 font-bold">d = {step.distance}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 6: KEY INSIGHTS */}
        {/* ================================================================== */}
        {activeTab === 'insights' && (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Empirical Analysis & Visualization</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                KEY INSIGHTS
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Key patterns identified from the HELPING HANDS donation data.
              </p>
            </div>

            {/* ROW 1: Proportion Donut Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryDonutChart
                distribution={explorationResult.categoryDistribution}
                totalDonations={kpis.totalDonations}
              />
              <DonationStatusDonutChart
                statusCounts={explorationResult.statusDistribution}
                totalDonations={kpis.totalDonations}
              />
            </div>

            {/* ROW 2: Activity Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CityActivityHorizontalBarChart
                distribution={explorationResult.cityDistribution}
                totalDonations={kpis.totalDonations}
              />
              <NGOActivityBarChart
                metrics={ngoActivityMetrics}
                totalDonations={kpis.totalDonations}
              />
            </div>

            {/* ROW 3: Dynamic Insight Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Calculated Pattern Summaries
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {keyInsights.length} Analytical Observations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {keyInsights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {ins.category}
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-slate-900 font-mono break-words">
                        {ins.metric}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{ins.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
