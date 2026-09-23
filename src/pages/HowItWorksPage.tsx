import React from 'react';
import { PackagePlus, UserCheck, Calendar, CheckSquare, MessageSquare, ArrowRight, Shield } from 'lucide-react';

interface HowItWorksPageProps {
  navigate: (page: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Title */}
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            Transparent Workflow
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            How The Donation Process Works
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            A step-by-step walk-through of the lifecycle from creating a donation to pickup completion.
          </p>
        </div>

        {/* Status Lifecycle Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6 text-center">
            Standard Status Progression
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mb-2" />
              <div className="text-xs font-black text-amber-900">1. PENDING</div>
              <p className="text-[11px] text-amber-700 mt-1">
                Donation is listed and visible to verified NGOs in your city.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mb-2" />
              <div className="text-xs font-black text-blue-900">2. ACCEPTED</div>
              <p className="text-[11px] text-blue-700 mt-1">
                One NGO accepts. Contact and location details are shared.
              </p>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 mb-2" />
              <div className="text-xs font-black text-purple-900">3. SCHEDULED</div>
              <p className="text-[11px] text-purple-700 mt-1">
                NGO confirms collection vehicle and volunteer dispatch route.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mb-2" />
              <div className="text-xs font-black text-emerald-900">4. COMPLETED</div>
              <p className="text-[11px] text-emerald-700 mt-1">
                Items received. Donor leaves rating & testimonial review.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Donors */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base pb-3 border-b border-slate-100">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
              <span>For Donors</span>
            </div>

            <ol className="space-y-4 text-xs text-slate-600">
              <li className="flex items-start space-x-3">
                <span className="font-bold text-emerald-700 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Register & Post an Item</strong>
                  Describe the item, select quantity and condition, and enter pickup location.
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-emerald-700 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Set Final Pickup Schedule</strong>
                  Pick a convenient calendar date and time. This schedule is non-negotiable for the accepting NGO.
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-emerald-700 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Get Notified on Acceptance</strong>
                  Receive an instant alert when a verified NGO takes responsibility for your donation.
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-emerald-700 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Rate & Share Feedback</strong>
                  After handover, score the pickup from 1 to 5 stars to maintain community excellence.
                </div>
              </li>
            </ol>
          </div>

          {/* For NGOs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-100">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>For NGOs</span>
            </div>

            <ol className="space-y-4 text-xs text-slate-600">
              <li className="flex items-start space-x-3">
                <span className="font-bold text-slate-700 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Sign Up with DARPAN ID</strong>
                  Instant access without cumbersome document upload delays.
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-slate-700 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Browse Available Donations</strong>
                  Filter items by your city and specialization category (e.g. Clothes, Food, Books).
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-slate-700 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Atomic 1-Click Acceptance</strong>
                  Accept an item securely. The system guarantees only one organization can claim each listing.
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="font-bold text-slate-700 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <strong className="text-slate-800 block text-sm">Execute Pickup & Complete</strong>
                  Pick up at the donor's exact specified time, then mark the donation Completed.
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-8 rounded-3xl bg-emerald-800 text-white text-center space-y-4 shadow-xs">
          <h2 className="text-2xl font-bold">Ready to make a tangible difference?</h2>
          <p className="text-xs text-emerald-100 max-w-md mx-auto">
            Join thousands of active donors and verified charities working together every day.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('login')}
              className="px-6 py-2.5 bg-white text-emerald-950 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-colors"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
