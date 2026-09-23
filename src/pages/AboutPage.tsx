import React from 'react';
import { HeartHandshake, ShieldCheck, Target, Award, Sparkles, CheckCircle2 } from 'lucide-react';

interface AboutPageProps {
  navigate: (page: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <HeartHandshake className="w-4 h-4" />
            <span>Our Origin & Purpose</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            About HELPING HANDS
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We are on a mission to eliminate item waste and turn surplus home goods into lifelines for underprivileged communities through technology-driven transparency.
          </p>
        </div>

        {/* Mission and Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 w-fit">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Our Core Mission</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              To provide individuals with a trustworthy, dignified, and frictionless method to donate usable goods directly to non-profit organizations, with guaranteed doorstep pickups and zero middlemen fees.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 w-fit">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Our Vision</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              A community where every child has access to textbooks, every family has warm winter wear, and reusable electronic devices enable equal education rather than ending up in landfills.
            </p>
          </div>
        </div>

        {/* Guiding Principles */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Our Pillars of Trust</h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Donor Authority Over Scheduling</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  We believe giving should fit your lifestyle. When a donor designates a pickup date and time window, it is locked into the system. Receiving NGOs accept with full commitment to that schedule.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Verified Non-Profit Partners Only</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Every NGO registered on HELPING HANDS must register their official DARPAN identifier and verifiable contact person, preventing unauthorized commercial reselling.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">End-to-End Status Tracking & Mutual Feedback</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  From Pending to Accepted, Scheduled, and Completed: both parties receive clear updates. Donors rate completed collections to guarantee top-tier service.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => navigate('login')}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Join Our Community Today
          </button>
        </div>
      </div>
    </div>
  );
};
