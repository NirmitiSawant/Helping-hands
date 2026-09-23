import React, { useState } from 'react';
import { HeartHandshake, User, Building2, Lock, Mail, Phone, MapPin, Building, ShieldCheck, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  navigate: (page: string) => void;
  defaultTab?: 'donor' | 'ngo';
  defaultMode?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  navigate,
  defaultTab = 'donor',
  defaultMode = 'login',
}) => {
  const { signIn, signUpDonor, signUpNGO, isConfigured } = useAuth();

  const [activeRole, setActiveRole] = useState<'donor' | 'ngo'>(defaultTab);
  const [isRegister, setIsRegister] = useState<boolean>(defaultMode === 'register');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  // NGO-specific fields
  const [orgName, setOrgName] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [category, setCategory] = useState('Clothes & Wearables');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (!isRegister) {
        // Public Sign In (for both Donor and NGO)
        const result = await signIn(email, password);
        if (result.success) {
          if (activeRole === 'ngo') {
            navigate('ngo-dashboard');
          } else {
            navigate('donor-dashboard');
          }
        } else {
          setErrorMessage(result.error || 'Invalid credentials. Please check your email and password.');
        }
      } else {
        // Sign Up
        if (activeRole === 'donor') {
          const result = await signUpDonor({
            email,
            password,
            name,
            phone,
            city,
          });
          if (result.success) {
            if (result.requiresEmailConfirmation) {
              setInfoMessage(result.message || 'Registration successful! Please check your email to confirm your account, then sign in.');
              setIsRegister(false);
            } else {
              navigate('donor-dashboard');
            }
          } else {
            setErrorMessage(result.error || 'Registration failed. Please try again.');
          }
        } else {
          // NGO Sign Up
          const result = await signUpNGO({
            email,
            password,
            orgName,
            darpanId,
            contactPerson,
            phone,
            city,
            category,
          });
          if (result.success) {
            navigate('ngo-dashboard');
          } else {
            setErrorMessage(result.error || 'NGO registration failed. Please try again.');
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div
          className="inline-flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">HELPING HANDS</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {isRegister ? 'Create Your Account' : 'Welcome Back'}
        </h2>
        <p className="text-xs text-slate-600">
          {isRegister
            ? 'Join our verified community of donors and registered non-profits.'
            : 'Access your donation activities, scheduled pickups, and notifications.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm">
          {/* Role Selector Tabs (Strictly DONOR and NGO only - No Admin here!) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveRole('donor');
                setErrorMessage('');
                setInfoMessage('');
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                activeRole === 'donor'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Donor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRole('ngo');
                setErrorMessage('');
                setInfoMessage('');
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                activeRole === 'ngo'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Registered NGO</span>
            </button>
          </div>

          {/* Toggle between Sign In & Sign Up */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              {activeRole === 'donor' ? 'Donor Portal' : 'Non-Profit Partner'}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage('');
                setInfoMessage('');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>

          {infoMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {infoMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Donor Registration Extra Fields */}
            {isRegister && activeRole === 'donor' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Maya Sharma"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        placeholder="e.g. Mumbai"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* NGO Registration Extra Fields */}
            {isRegister && activeRole === 'ngo' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      placeholder="e.g. Hope For Youth Foundation"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                    />
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registration / DARPAN ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={darpanId}
                        onChange={(e) => setDarpanId(e.target.value)}
                        required
                        placeholder="e.g. MH/2021/0293819"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Person
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        required
                        placeholder="e.g. Rajesh Patil"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+91 98200 12345"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Operating City</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        placeholder="e.g. Pune"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Focus Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9 bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none pl-9"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              {isRegister && (
                <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 mt-4"
            >
              {loading
                ? 'Processing...'
                : isRegister
                ? activeRole === 'donor'
                  ? 'Complete Donor Registration'
                  : 'Register NGO Organization'
                : `Sign In as ${activeRole === 'donor' ? 'Donor' : 'NGO'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
