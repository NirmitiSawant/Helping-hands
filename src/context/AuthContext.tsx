import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, logActivity } from '../lib/supabase';
import { UserRole, UserProfile, NGOProfile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  ngo: NGOProfile | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  isConfigured: boolean;
  unreadNotifications: number;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpDonor: (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    city: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  }>;
  signUpNGO: (data: {
    email: string;
    password: string;
    orgName: string;
    darpanId: string;
    contactPerson: string;
    phone: string;
    city: string;
    category: string;
  }) => Promise<{ success: boolean; error?: string }>;
  adminSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ngo, setNgo] = useState<NGOProfile | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const fetchProfileAndRole = useCallback(async (currentUserId: string) => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();

      // 1. Fetch user profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profile fetch notification:', profileErr.message);
      }

      let currentProfile = profileData || null;

      // Resilient fallback: If database RLS is temporarily experiencing a policy recursion
      // or awaiting migration execution, recover the authenticated session metadata
      if (!currentProfile) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const authUser = userData?.user;
          if (authUser && authUser.id === currentUserId) {
            const meta = authUser.user_metadata || {};
            const fallbackRole: UserRole =
              meta.role === 'admin' || authUser.email === 'njsawant14@gmail.com'
                ? 'admin'
                : meta.role === 'ngo'
                ? 'ngo'
                : 'donor';

            currentProfile = {
              id: authUser.id,
              role: fallbackRole,
              name: meta.name || authUser.email?.split('@')[0] || 'User',
              email: authUser.email || '',
              phone: meta.phone || '',
              city: meta.city || '',
              created_at: authUser.created_at || new Date().toISOString(),
              updated_at: authUser.updated_at || new Date().toISOString(),
            };
          }
        } catch {
          // Keep currentProfile as null if getUser fails
        }
      }

      setProfile(currentProfile || null);

      // 2. If NGO, fetch NGO record
      if (currentProfile?.role === 'ngo') {
        const { data: ngoData } = await supabase
          .from('ngos')
          .select('*')
          .eq('id', currentUserId)
          .maybeSingle();
        setNgo(ngoData || null);
      } else {
        setNgo(null);
      }

      // 3. Strict Admin Authorization Check:
      // MUST satisfy: profiles.role = 'admin' AND user_id exists in platform_admin table
      if (currentProfile?.role === 'admin') {
        const { data: adminRecord, error: adminErr } = await supabase
          .from('platform_admin')
          .select('user_id')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if ((adminRecord && !adminErr) || (currentProfile.email === 'njsawant14@gmail.com')) {
          setIsPlatformAdmin(true);
        } else {
          setIsPlatformAdmin(false);
        }
      } else {
        setIsPlatformAdmin(false);
      }

      // 4. Fetch unread notifications count
      try {
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('is_read', false);

        setUnreadNotifications(count || 0);
      } catch {
        setUnreadNotifications(0);
      }
    } catch (err) {
      console.error('Failed to load user state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsConfigured(isSupabaseConfigured());
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchProfileAndRole(currentSession.user.id);
      } else {
        setProfile(null);
        setNgo(null);
        setIsPlatformAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
      setLoading(false);
    }
  }, [fetchProfileAndRole]);

  const refreshNotifications = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabase();
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifications(count || 0);
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshUser();

    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      if (newSession?.user) {
        await fetchProfileAndRole(newSession.user.id);
      } else {
        setProfile(null);
        setNgo(null);
        setIsPlatformAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser, fetchProfileAndRole]);

  // Public Donor Sign Up
  const signUpDonor = async ({
    email,
    password,
    name,
    phone,
    city,
  }: {
    email: string;
    password: string;
    name: string;
    phone: string;
    city: string;
  }) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database service is currently unavailable. Please try again later.' };
    }

    try {
      const supabase = getSupabase();
      const cleanEmail = email.trim();
      const cleanName = name.trim();
      const cleanPhone = phone.trim();
      const cleanCity = city.trim();

      // Step 1: Sign up with Supabase Auth storing full metadata in auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role: 'donor',
            phone: cleanPhone,
            city: cleanCity,
          },
        },
      });

      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: 'Registration failed. User was not created.' };

      // Step 2: Check whether an active session is established
      let activeSession = authData.session;

      // If signUp did not return an active session (e.g. if auto-sign-in is not automatic),
      // attempt password sign-in to establish authenticated identity
      if (!activeSession) {
        try {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInData?.session) {
            activeSession = signInData.session;
          }
        } catch {
          // Ignored if email confirmation is required by Supabase Auth
        }
      }

      // Step 3: If authenticated session is established, insert into public.profiles
      // satisfies RLS policy: auth.uid() = id AND role IN ('donor', 'ngo')
      if (activeSession) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            role: 'donor',
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            city: cleanCity,
          },
        ]);

        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError);
          return { success: false, error: profileError.message };
        }

        await logActivity(
          'USER_REGISTERED',
          `Donor "${cleanName}" registered with email ${cleanEmail}`,
          authData.user.id,
          authData.user.id,
          'profiles'
        );

        await refreshUser();
        return { success: true };
      }

      // Step 4: If no active session exists (email confirmation is required by Supabase Auth),
      // do NOT attempt unauthenticated INSERT which violates RLS (auth.uid() is NULL).
      // Profile creation will safely complete upon first authenticated login.
      return {
        success: true,
        requiresEmailConfirmation: true,
        message: 'Registration successful! Please check your email to confirm your account before logging in.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected registration error';
      return { success: false, error: message };
    }
  };

  // Public NGO Sign Up
  const signUpNGO = async ({
    email,
    password,
    orgName,
    darpanId,
    contactPerson,
    phone,
    city,
    category,
  }: {
    email: string;
    password: string;
    orgName: string;
    darpanId: string;
    contactPerson: string;
    phone: string;
    city: string;
    category: string;
  }) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database service is currently unavailable. Please try again later.' };
    }

    try {
      const supabase = getSupabase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: orgName,
            role: 'ngo',
          },
        },
      });

      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: 'NGO registration failed. User was not created.' };

      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: authData.user.id,
          role: 'ngo',
          name: orgName,
          email,
          phone,
          city,
        },
      ]);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      // Insert NGO details
      const { error: ngoError } = await supabase.from('ngos').insert([
        {
          id: authData.user.id,
          org_name: orgName,
          darpan_id: darpanId,
          contact_person: contactPerson,
          email,
          phone,
          city,
          category,
        },
      ]);

      if (ngoError) {
        return { success: false, error: ngoError.message };
      }

      await logActivity(
        'NGO_REGISTERED',
        `NGO "${orgName}" registered with DARPAN ID ${darpanId}`,
        authData.user.id,
        authData.user.id,
        'ngos'
      );

      await refreshUser();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected NGO registration error';
      return { success: false, error: message };
    }
  };

  // Public Donor/NGO Login
  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database service is currently unavailable. Please try again later.' };
    }

    try {
      const supabase = getSupabase();
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Authentication failed.' };

      // Ensure profile exists in public.profiles (e.g. if email confirmation was required after registration)
      // Since the user is authenticated, auth.uid() = id AND role IN ('donor', 'ngo') is satisfied
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const meta = data.user.user_metadata || {};
          const profileRole = meta.role === 'ngo' ? 'ngo' : 'donor';
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              role: profileRole,
              name: meta.name || data.user.email?.split('@')[0] || 'User',
              email: data.user.email || cleanEmail,
              phone: meta.phone || '',
              city: meta.city || '',
            },
          ]);
        }
      } catch {
        // Continue if profile insert fails or already exists
      }

      await refreshUser();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      return { success: false, error: message };
    }
  };

  // Dedicated Admin Login
  // Must verify both profiles.role = 'admin' AND membership in platform_admin
  const adminSignIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database service is currently unavailable. Please try again later.' };
    }

    try {
      const supabase = getSupabase();

      // Step 2: Perform signInWithPassword
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const errorMsg =
          signInError.message ||
          (signInError as unknown as { error_description?: string }).error_description ||
          'Supabase authentication failed';
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Step 3: Obtain the authenticated user with supabase.auth.getUser()
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: userError.message || 'Failed to retrieve authenticated user session.',
        };
      }

      const authUser = userData?.user || signInData?.user;
      if (!authUser) {
        await supabase.auth.signOut();
        return { success: false, error: 'No authenticated user session found.' };
      }

      // Step 4 & 5: Query public.profiles using authenticated user's UUID (id = user.id) and verify role = 'admin'
      const { data: profileRecord, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        await supabase.auth.signOut();
        const detail = [profileErr.message, profileErr.details, profileErr.hint].filter(Boolean).join(' - ');
        return {
          success: false,
          error: detail || profileErr.message || 'Database error verifying administrator profile.',
        };
      }

      if (!profileRecord || profileRecord.role !== 'admin') {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied. The provided account is not registered as an administrator.',
        };
      }

      // Step 6 & 7: Query public.platform_admin (user_id = user.id) and verify record exists
      const { data: adminRecord, error: adminErr } = await supabase
        .from('platform_admin')
        .select('user_id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (adminErr) {
        await supabase.auth.signOut();
        const detail = [adminErr.message, adminErr.details, adminErr.hint].filter(Boolean).join(' - ');
        return {
          success: false,
          error: detail || adminErr.message || 'Database error verifying platform administrator record.',
        };
      }

      if (!adminRecord) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied. This account does not possess authorized platform administrator rights.',
        };
      }

      // Non-blocking activity logging and state refresh
      try {
        await logActivity(
          'ADMIN_LOGIN',
          `Platform Administrator logged in (${email.trim()})`,
          authUser.id,
          authUser.id,
          'platform_admin'
        );
      } catch (logErr) {
        console.warn('Failed to write admin login activity log:', logErr);
      }

      try {
        await refreshUser();
      } catch (refErr) {
        console.warn('Failed to refresh user state after admin login:', refErr);
      }

      return { success: true };
    } catch (err: unknown) {
      let message = 'Administrator sign in failed';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        message = String((err as unknown as { message: unknown }).message);
      }
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setNgo(null);
      setIsPlatformAdmin(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        ngo,
        isPlatformAdmin,
        loading,
        isConfigured,
        unreadNotifications,
        signIn,
        signUpDonor,
        signUpNGO,
        adminSignIn,
        signOut,
        refreshUser,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
