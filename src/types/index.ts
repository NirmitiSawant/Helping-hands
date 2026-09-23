export type UserRole = 'donor' | 'ngo' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface NGOProfile {
  id: string;
  org_name: string;
  darpan_id: string;
  contact_person: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  created_at: string;
}

export type DonationStatus = 'PENDING' | 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Donation {
  id: string;
  donor_id: string;
  category: string;
  title: string;
  description: string;
  quantity: number;
  condition: string;
  pickup_location: string;
  city: string;
  pickup_date: string;
  pickup_time: string;
  status: DonationStatus;
  accepted_ngo_id?: string | null;
  scheduled_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  donor?: {
    name: string;
    email: string;
    phone?: string;
    city?: string;
  };
  ngo?: {
    org_name: string;
    contact_person: string;
    phone: string;
    city: string;
  };
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  donation_id: string;
  donor_id: string;
  ngo_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  donation?: {
    title: string;
    category: string;
  };
  donor?: {
    name: string;
  };
  ngo?: {
    org_name: string;
  };
}

export interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  user_id?: string | null;
  entity_id?: string | null;
  entity_type?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  user_email?: string;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  assigned_at: string;
}

export interface SystemStats {
  totalDonors: number;
  totalNGOs: number;
  totalDonations: number;
  pendingDonations: number;
  completedDonations: number;
  activeSchedules: number;
  totalFeedbacks: number;
  averageRating: number;
}
