import { getSupabase, logActivity } from './supabase';
import { Donation, DonationStatus, NotificationItem, FeedbackItem, ActivityLog } from '../types';

export interface CreateDonationInput {
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
}

// 1. Create a new donation
export async function createDonation(input: CreateDonationInput): Promise<{ data?: Donation; error?: string }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('donations')
      .insert([
        {
          donor_id: input.donor_id,
          category: input.category,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          condition: input.condition,
          pickup_location: input.pickup_location,
          city: input.city,
          pickup_date: input.pickup_date,
          pickup_time: input.pickup_time,
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Write activity audit log
    await logActivity(
      'DONATION_CREATED',
      `Donation "${input.title}" (${input.quantity} items, ${input.category}) created in ${input.city}`,
      input.donor_id,
      data.id,
      'donations',
      { category: input.category, city: input.city }
    );

    return { data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create donation';
    return { error: message };
  }
}

// 2. Atomic Donation Acceptance by NGO
// Primary path: RPC accept_donation (PostgreSQL FOR UPDATE + row lock + atomic status flip)
// Fallback path: Direct conditional update WHERE id = p_donation_id AND status = 'PENDING'
export async function atomicAcceptDonation({
  donationId,
  ngoId,
  ngoName,
  donationTitle,
  pickupDate,
  pickupTime,
  pickupLocation,
  city,
  donorId,
  donorPhone,
}: {
  donationId: string;
  ngoId: string;
  ngoName: string;
  donationTitle: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  city: string;
  donorId: string;
  donorPhone?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    // Attempt database-level atomic RPC function first
    const { error: rpcError } = await supabase.rpc('accept_donation', {
      p_donation_id: donationId,
      p_ngo_id: ngoId,
    });

    if (!rpcError) {
      return { success: true };
    }

    // If RPC function is not installed in database or failed, perform atomic conditional UPDATE
    console.warn('RPC accept_donation unavailable, using atomic SQL conditional update:', rpcError.message);

    const { data, error: updateError } = await supabase
      .from('donations')
      .update({
        status: 'ACCEPTED',
        accepted_ngo_id: ngoId,
        scheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', donationId)
      .eq('status', 'PENDING') // Atomic check: fails if another NGO already accepted!
      .select();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'This donation is no longer available. Another organization may have already accepted it.',
      };
    }

    // 1. Notify Donor
    await supabase.from('notifications').insert([
      {
        user_id: donorId,
        title: 'Donation Accepted!',
        message: `Great news! "${ngoName}" has accepted your donation "${donationTitle}". Scheduled pickup date: ${pickupDate} at ${pickupTime}.`,
        type: 'DONATION_ACCEPTED',
      },
    ]);

    // 2. Notify NGO
    await supabase.from('notifications').insert([
      {
        user_id: ngoId,
        title: 'Pickup Confirmed',
        message: `You accepted "${donationTitle}". Pickup is scheduled on ${pickupDate} at ${pickupTime} from ${pickupLocation}, ${city}. Donor phone: ${donorPhone || 'N/A'}.`,
        type: 'SCHEDULED_PICKUP',
      },
    ]);

    // 3. Log Activity
    await logActivity(
      'DONATION_ACCEPTED',
      `NGO "${ngoName}" accepted donation "${donationTitle}"`,
      ngoId,
      donationId,
      'donations',
      { pickupDate, pickupTime, donorId }
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Donation acceptance failed';
    return { success: false, error: message };
  }
}

// 3. Mark Donation as SCHEDULED
export async function markDonationScheduled(
  donationId: string,
  ngoId: string,
  donationTitle: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const { error: rpcError } = await supabase.rpc('mark_donation_scheduled', {
      p_donation_id: donationId,
    });

    if (!rpcError) return { success: true };

    const { error } = await supabase
      .from('donations')
      .update({ status: 'SCHEDULED', updated_at: new Date().toISOString() })
      .eq('id', donationId)
      .eq('accepted_ngo_id', ngoId)
      .eq('status', 'ACCEPTED');

    if (error) return { success: false, error: error.message };

    await logActivity('DONATION_SCHEDULED', `Pickup for "${donationTitle}" marked as scheduled in route`, ngoId, donationId, 'donations');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to schedule donation';
    return { success: false, error: message };
  }
}

// 4. Mark Donation as COMPLETED
export async function markDonationCompleted(
  donationId: string,
  _ngoId?: string,
  _donorId?: string,
  _donationTitle?: string,
  _ngoName?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const { error: rpcError } = await supabase.rpc('mark_donation_completed', {
      p_donation_id: donationId,
    });

    if (rpcError) {
      console.error('RPC mark_donation_completed error:', rpcError);
      return { success: false, error: rpcError.message || 'Failed to complete donation via RPC.' };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete donation';
    return { success: false, error: message };
  }
}

// 5. Donor Cancel Donation
export async function cancelDonation(
  donationId: string,
  donorId: string,
  donationTitle: string,
  acceptedNgoId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const { error: rpcError } = await supabase.rpc('cancel_donation', {
      p_donation_id: donationId,
    });

    if (!rpcError) return { success: true };

    const { error } = await supabase
      .from('donations')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', donationId)
      .eq('donor_id', donorId)
      .neq('status', 'COMPLETED');

    if (error) return { success: false, error: error.message };

    if (acceptedNgoId) {
      await supabase.from('notifications').insert([
        {
          user_id: acceptedNgoId,
          title: 'Donation Cancelled',
          message: `The donor cancelled donation "${donationTitle}".`,
          type: 'DONATION_CANCELLED',
        },
      ]);
    }

    await logActivity('DONATION_CANCELLED', `Donation "${donationTitle}" was cancelled by donor`, donorId, donationId, 'donations');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel donation';
    return { success: false, error: message };
  }
}

// 6. Submit Feedback
export async function submitFeedback({
  donationId,
  donorId,
  ngoId,
  rating,
  comment,
  donationTitle,
  donorName,
}: {
  donationId: string;
  donorId: string;
  ngoId: string;
  rating: number;
  comment: string;
  donationTitle: string;
  donorName: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase.from('feedbacks').insert([
      {
        donation_id: donationId,
        donor_id: donorId,
        ngo_id: ngoId,
        rating,
        comment,
      },
    ]);

    if (error) return { success: false, error: error.message };

    // Notify NGO of feedback
    await supabase.from('notifications').insert([
      {
        user_id: ngoId,
        title: 'New Feedback Received!',
        message: `${donorName} rated your pickup for "${donationTitle}" ${rating} stars: "${comment || 'No comment provided'}"`,
        type: 'FEEDBACK_RECEIVED',
      },
    ]);

    await logActivity('FEEDBACK_SUBMITTED', `Donor left a ${rating}-star feedback for donation "${donationTitle}"`, donorId, donationId, 'feedbacks', { rating });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit feedback';
    return { success: false, error: message };
  }
}

// 7. Fetch Notifications for User
export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

// 8. Mark notification read
export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  } catch (err) {
    console.error('Failed to mark notification read:', err);
  }
}

// 9. Mark all notifications read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
  }
}
