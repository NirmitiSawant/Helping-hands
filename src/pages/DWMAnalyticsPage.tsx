import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  BarChart3,
  Layers,
  GitMerge,
  Cpu,
  BrainCircuit,
  Sparkles,
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
  runAprioriMining,
  generateKeyInsights,
  computeNGOActivityMetrics,
  DataExplorationResult,
  KMeansResult,
  HierarchicalClusteringResult,
  AprioriResult,
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
  | 'apriori'
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

  // Expandable Methodology Explanations (Professional Architecture & Concepts)
  const [expandedExplainer, setExpandedExplainer] = useState<Record<string, boolean>>({
    overview: false,
    exploration: false,
    olap: false,
    kmeans: false,
    hierarchical: false,
    apriori: false,
    insights: false,
  });

  const toggleExplainer = (key: string) => {
    setExpandedExplainer((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
  // 7. Apriori Association Mining State & computations
  // --------------------------------------------------------------------------
  const [minSupport, setMinSupport] = useState<number>(0.15);
  const [minConfidence, setMinConfidence] = useState<number>(0.4);
  const aprioriResult: AprioriResult = useMemo(() => {
    return runAprioriMining(donations, minSupport, minConfidence);
  }, [donations, minSupport, minConfidence]);

  // --------------------------------------------------------------------------
  // 8. Key Insights computations
  // --------------------------------------------------------------------------
  const keyInsights: DynamicInsight[] = useMemo(() => {
    return generateKeyInsights(donations, ngos, donors, kmeansResult, aprioriResult);
  }, [donations, ngos, donors, kmeansResult, aprioriResult]);

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
              { id: 'apriori', label: '6. Apriori Mining', icon: Sparkles },
              { id: 'insights', label: '7. Key Insights', icon: TrendingUp },
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

            {/* Conceptual Schema Architecture (Professional Description) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('overview')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Data Warehouse Architecture & Dimensional Schema Design</span>
                </span>
                {expandedExplainer.overview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.overview && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Dimensional Modeling (Star Schema):</strong> In HELPING HANDS, operational records are modeled conceptually as an analytical star schema to support rapid aggregations across multiple perspectives:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Fact Table:</strong> <code>public.donations</code> stores transactional event measurements (e.g., item quantities, status codes) and foreign key linkages.</li>
                    <li><strong>Dimension Tables:</strong> <code>public.profiles</code> (Donor dimension where role = 'donor'), <code>public.ngos</code> (Fulfillment NGO partner dimension), and the Date/Time dimension (derived from <code>created_at</code> timestamps).</li>
                    <li><strong>Dynamic Calculations:</strong> Every metric and visual chart is computed dynamically in-memory from verified Supabase records without artificial caching or simulated data.</li>
                  </ul>
                </div>
              )}
            </div>
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

            {/* Methodology Box: Data Exploration */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('exploration')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Exploratory Data Analysis & Attribute Methodology</span>
                </span>
                {expandedExplainer.exploration ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.exploration && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Purpose:</strong> Data exploration analyzes the shape, quality, and statistical properties of data before feeding into learning algorithms.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Measures of Central Tendency:</strong> Mean (x̄) reflects average volume; Median resists skewness from large bulk donations.</li>
                    <li><strong>Measures of Dispersion:</strong> Variance and Standard Deviation (σ) measure variance in quantity. Interquartile Range (IQR = Q3 - Q1) characterizes mid-50% spread.</li>
                    <li><strong>Attribute Cardinality:</strong> High distinct count on categorical variables signals rich diversity in donation categories and geographic presence.</li>
                  </ul>
                </div>
              )}
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

            {/* Explanation Box: K-Means Formulation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('kmeans')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>How it works: K-Means Algorithmic Formulation & Convergence Mechanics</span>
                </span>
                {expandedExplainer.kmeans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.kmeans && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Purpose:</strong> Unsupervised partition of N observation vectors into K clusters where each entity belongs to the cluster with the nearest mean (Euclidean distance).
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Objective Function:</strong> Minimizes Sum of Squared Errors (SSE): J = Σ Σ ||x_i - μ_k||²</li>
                    <li><strong>Input Features:</strong> 1) Total Donations Handled, 2) Completion Rate %, 3) Total Volume Quantity.</li>
                    <li><strong>Silhouette Coefficient:</strong> Evaluates cohesion vs separation: s = (b - a) / max(a, b), where 'a' is mean intra-cluster distance and 'b' is nearest-cluster distance.</li>
                  </ul>
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

            {/* Explanation Box: Hierarchical Clustering */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('hierarchical')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>How it works: Agglomerative Hierarchical Clustering Architecture & Linkage Formulation</span>
                </span>
                {expandedExplainer.hierarchical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.hierarchical && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Agglomerative (Bottom-Up):</strong> Starts with each NGO as an individual singleton cluster and progressively merges the closest pair according to a linkage criterion (Average Linkage - UPGMA).
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Linkage Metric:</strong> D(A, B) = (1 / (|A|·|B|)) Σ Σ ||x - y||</li>
                    <li><strong>Dendrogram Cut:</strong> Slicing the dendrogram horizontally at distance threshold 'd' yields discrete clusters without pre-specifying K in advance.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 6: APRIORI ASSOCIATION RULE MINING */}
        {/* ================================================================== */}
        {activeTab === 'apriori' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Apriori Association Rule Mining</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Discovers frequent itemsets and co-occurrence patterns across Category, Condition, City, and Status dimensions.
                  </p>
                </div>

                {/* Threshold Sliders */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-slate-700">Min Support:</span>
                    <input
                      type="range"
                      min={0.05}
                      max={0.5}
                      step={0.05}
                      value={minSupport}
                      onChange={(e) => setMinSupport(parseFloat(e.target.value))}
                      className="w-20 cursor-pointer accent-emerald-700"
                    />
                    <span className="font-mono font-bold text-emerald-800">{Math.round(minSupport * 100)}%</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-slate-700">Min Confidence:</span>
                    <input
                      type="range"
                      min={0.2}
                      max={0.9}
                      step={0.05}
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-20 cursor-pointer accent-emerald-700"
                    />
                    <span className="font-mono font-bold text-emerald-800">{Math.round(minConfidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {!aprioriResult.isApplicable ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Insufficient Transactional Data</h4>
                  <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                    {aprioriResult.insufficientReason || 'At least 3 donation listings are required to extract meaningful association patterns.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mining Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Total Baskets (Transactions)</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">{aprioriResult.totalTransactions}</div>
                      <span className="text-[10px] text-slate-400">Modeled from donation attributes</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Frequent Itemsets Found</span>
                      <div className="text-2xl font-black text-indigo-700 mt-1">{aprioriResult.frequentItemsets.length}</div>
                      <span className="text-[10px] text-slate-400">Meeting support ≥ {Math.round(minSupport * 100)}%</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Strong Rules Extracted</span>
                      <div className="text-2xl font-black text-emerald-700 mt-1">{aprioriResult.rules.length}</div>
                      <span className="text-[10px] text-slate-400">Meeting confidence ≥ {Math.round(minConfidence * 100)}%</span>
                    </div>
                  </div>

                  {/* Discovered Association Rules Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80">
                        <tr>
                          <th className="py-2.5 px-4">Antecedent (LHS)</th>
                          <th className="py-2.5 px-4 text-center">⇒</th>
                          <th className="py-2.5 px-4">Consequent (RHS)</th>
                          <th className="py-2.5 px-4">Support</th>
                          <th className="py-2.5 px-4">Confidence</th>
                          <th className="py-2.5 px-4">Lift</th>
                          <th className="py-2.5 px-4">Correlation Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {aprioriResult.rules.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              No association rules found with the current thresholds. Try decreasing min support or min confidence.
                            </td>
                          </tr>
                        ) : (
                          aprioriResult.rules.map((rule, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-bold text-slate-900">{rule.antecedent.join(', ')}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-emerald-700">⇒</td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">{rule.consequent.join(', ')}</td>
                              <td className="py-2.5 px-4 font-mono">{Math.round(rule.support * 100)}%</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">
                                {Math.round(rule.confidence * 100)}%
                              </td>
                              <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{rule.lift}x</td>
                              <td className="py-2.5 px-4">
                                {rule.lift > 1.2 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Strong Positive Association
                                  </span>
                                ) : rule.lift > 1.0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    Moderate Correlation
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    Independent / Weak
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Frequent Itemsets List */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Frequent Itemsets (L1 & L2)
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {aprioriResult.frequentItemsets.map((fit, fi) => (
                        <div key={fi} className="p-2 rounded bg-white border border-slate-200 shadow-2xs space-x-1.5 flex items-center">
                          <span className="font-semibold text-slate-800">{fit.items.join(' + ')}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                            Supp: {Math.round(fit.support * 100)}% ({fit.supportCount})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Explanation Box: Apriori Association Rules */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('apriori')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>How it works: Support, Confidence, Lift & Apriori Mechanics</span>
                </span>
                {expandedExplainer.apriori ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.apriori && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Apriori Principle:</strong> Any subset of a frequent itemset must also be frequent. If itemset X is infrequent, all supersets of X are instantly pruned.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Support(A ⇒ B) = P(A ∩ B):</strong> Percentage of total transactions containing both items.</li>
                    <li><strong>Confidence(A ⇒ B) = P(B|A) = Support(A ∩ B) / Support(A):</strong> Likelihood that item B is present given item A.</li>
                    <li><strong>Lift(A ⇒ B) = Confidence(A ⇒ B) / Support(B):</strong> Ratio of observed co-occurrence over expected independent chance. Lift &gt; 1 indicates genuine affinity.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 7: KEY INSIGHTS */}
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

            {/* Enterprise Summary Card */}
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Executive Decision Support & Data Warehouse Architecture Summary
              </h4>
              <p className="text-xs leading-relaxed text-emerald-800">
                This DWM Analytical Dashboard demonstrates complete data warehousing and mining integration for the <strong>HELPING HANDS</strong> social good platform. The system operates as a zero-write, non-invasive analytical layer directly over the Supabase production datastore, delivering real-time multidimensional slicing/dicing, descriptive profiling, cluster segmentation, and associative discovery.
              </p>
            </div>

            {/* Explanation Box: Key Insights */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => toggleExplainer('insights')}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900"
              >
                <span className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>How it works: Business Intelligence & Decision Support Architecture</span>
                </span>
                {expandedExplainer.insights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedExplainer.insights && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    <strong>Decision Support Systems (DSS):</strong> The objective of Data Warehousing & Mining is converting raw operational transactions into actionable strategy:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Route Optimization:</strong> Identifying geographic hotspots (top donation cities) allows NGOs to batch logistics efficiently.</li>
                    <li><strong>Targeted Outreach:</strong> Clustering active vs dormant NGOs informs the platform administrator on capacity allocation.</li>
                    <li><strong>Inventory Forecasting:</strong> Association rules reveal correlated essentials (e.g. food rations + bulk volume) to prepare transport storage.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
