import React from 'react';
import { HeartHandshake, Shield, Heart } from 'lucide-react';

interface FooterProps {
  navigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => navigate('home')}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="text-base font-black tracking-tight text-white">
                HELPING HANDS
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering compassionate individuals and verified non-governmental organizations to turn surplus goods into lasting community support.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className="hover:text-white transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('about')}
                  className="hover:text-white transition-colors"
                >
                  About Our Mission
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('how-it-works')}
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('for-ngos')}
                  className="hover:text-white transition-colors"
                >
                  For NGOs & Charities
                </button>
              </li>
            </ul>
          </div>

          {/* Supported Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Donation Streams
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Wearables & Warm Clothes</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Books & Educational Supplies</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Packaged Nutrition & Rations</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Electronics & Learning Devices</span>
              </li>
            </ul>
          </div>

          {/* Transparency & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Platform Integrity
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              All partner organizations are registered entities with verified DARPAN credentials. Scheduled pickups maintain strict donor privacy and timely completion tracking.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Verified Non-Profit Network</span>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar with Discrete Admin Portal */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-1">
            <span>© {new Date().getFullYear()} HELPING HANDS Foundation. Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
            <span>for community welfare.</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Discrete link to dedicated Admin Login */}
            <button
              type="button"
              onClick={() => navigate('admin-login')}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center space-x-1 text-[11px]"
            >
              <Shield className="w-3 h-3" />
              <span>Authorized Administrator Access</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
