import React, { useState } from 'react';
import { X, Star, HeartHandshake } from 'lucide-react';
import { submitFeedback } from '../lib/donationService';
import { Donation } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: Donation;
  donorId: string;
  donorName: string;
  onSuccess: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  donation,
  donorId,
  donorName,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donation.accepted_ngo_id) {
      setErrorMessage('No partner organization recorded for this donation.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const result = await submitFeedback({
      donationId: donation.id,
      donorId,
      ngoId: donation.accepted_ngo_id,
      rating,
      comment,
      donationTitle: donation.title,
      donorName,
    });

    setSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Share Your Experience</h3>
                <p className="text-xs text-slate-500">For: {donation.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Pickup Experience & Professionalism
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm font-semibold text-slate-700">
                  {rating === 5 && 'Excellent'}
                  {rating === 4 && 'Good'}
                  {rating === 3 && 'Average'}
                  {rating === 2 && 'Below Expectation'}
                  {rating === 1 && 'Needs Improvement'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Comments or Notes for the Partner Organization
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the pickup? Did the team arrive on time? Share any words of appreciation or constructive feedback..."
                rows={4}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
