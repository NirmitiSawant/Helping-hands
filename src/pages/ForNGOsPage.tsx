import React from 'react';
import { Building2, CheckCircle2, ShieldCheck, Zap, HeartHandshake, ArrowRight } from 'lucide-react';

interface ForNGOsPageProps {
  navigate: (page: string) => void;
}

export const ForNGOsPage: React.FC<ForNGOsPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Building2 className="w-4 h-4" />
            <span>Dedicated Non-Profit Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Empower Your Community with Direct Donations
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Gain immediate access to pre-sorted goods from donors in your city. Register your organization with your DARPAN ID and start claiming donations in minutes.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('login')}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-2"
            >
              <span>Register Your Organization</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 w-fit">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Zero Onboarding Delay</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No endless verification queues or complex document uploads. Enter your NGO registration or DARPAN ID and begin receiving donations right away.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 w-fit">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Protected Acceptance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you accept a donation, database locks ensure that no other organization can claim it. The items and scheduled pickup window belong solely to you.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 w-fit">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">100% Free Service</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              HELPING HANDS is a pure non-profit enablement initiative. There are no commission fees, subscription costs, or transactional overheads.
            </p>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900">What You Need to Get Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Registered Organization Name</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Government / DARPAN Registration ID</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Designated Contact Person & Phone</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Primary Operating City & Category Focus</span>
            </div>
          </div>
        </div>

        {/* Commitment Banner */}
        <div className="p-6 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Commitment to Timely Pickup</h3>
            <p className="text-xs text-slate-400 mt-1">
              By accepting items, your organization honors the donor's designated date and time window.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('login')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
          >
            Join Network
          </button>
        </div>
      </div>
    </div>
  );
};
