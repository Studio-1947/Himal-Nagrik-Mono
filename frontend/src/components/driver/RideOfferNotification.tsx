import { useState, useEffect } from "react";
import { MapPin, Phone, User, Clock, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DispatchOffer } from "@/lib/dispatch-service";

type RideOfferNotificationProps = {
  offer: DispatchOffer | null;
  isAccepting: boolean;
  isRejecting: boolean;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string, reason?: string) => void;
};

export const RideOfferNotification = ({
  offer,
  isAccepting,
  isRejecting,
  onAccept,
  onReject,
}: RideOfferNotificationProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Calculate time remaining
  useEffect(() => {
    if (!offer) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiresAt = new Date(offer.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Offer expired
        return;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [offer]);

  if (!offer) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReject = () => {
    if (showRejectReason) {
      onReject(offer.id, rejectReason || undefined);
      setShowRejectReason(false);
      setRejectReason("");
    } else {
      setShowRejectReason(true);
    }
  };

  const handleAccept = () => {
    onAccept(offer.id);
  };

  const isExpired = timeRemaining === 0;
  const isUrgent = timeRemaining <= 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-emerald-500/20 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-sky-500 p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🚗 New Ride Request!
              </h2>
              <p className="text-emerald-50 text-sm mt-1">
                {offer.passenger?.name || 'Passenger'} needs a ride
              </p>
            </div>
            {!isExpired && (
              <div className={`flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 ${isUrgent ? 'animate-pulse' : ''}`}>
                <Clock className={`h-5 w-5 ${isUrgent ? 'text-red-200' : 'text-white'}`} />
                <span className={`text-lg font-bold ${isUrgent ? 'text-red-200' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs text-white/80">remaining</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Passenger Info */}
          {offer.passenger && (
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="bg-emerald-500 rounded-full p-2">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{offer.passenger.name}</p>
                {offer.passenger.rating && (
                  <p className="text-sm text-slate-400">
                    ⭐ {offer.passenger.rating.toFixed(1)} rating
                  </p>
                )}
              </div>
              {offer.passenger.phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-400 hover:text-emerald-300"
                  asChild
                >
                  <a href={`tel:${offer.passenger.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Locations */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
              <MapPin className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                  Pickup
                </p>
                <p className="text-white font-medium text-sm">
                  {offer.pickup.description || 
                   `${offer.pickup.latitude.toFixed(4)}, ${offer.pickup.longitude.toFixed(4)}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-sky-500/10 rounded-2xl p-4 border border-sky-500/20">
              <MapPin className="h-5 w-5 text-sky-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">
                  Dropoff
                </p>
                <p className="text-white font-medium text-sm">
                  {offer.dropoff.description || 
                   `${offer.dropoff.latitude.toFixed(4)}, ${offer.dropoff.longitude.toFixed(4)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Fare */}
          {offer.fareQuote && (
            <div className="bg-gradient-to-r from-emerald-500/20 to-sky-500/20 rounded-2xl p-4 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm text-slate-300">Estimated Fare</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">
                    ₹{offer.fareQuote.amount}
                  </p>
                  {offer.fareQuote.currency !== 'INR' && (
                    <p className="text-xs text-slate-400">{offer.fareQuote.currency}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reject Reason Input */}
          {showRejectReason && (
            <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 space-y-2">
              <label className="text-sm text-red-300 font-medium">
                Reason for rejection (optional)
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Too far away, Taking a break"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Expired Message */}
          {isExpired && (
            <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 text-center">
              <p className="text-red-300 font-semibold">⏱️ Offer Expired</p>
              <p className="text-sm text-slate-400 mt-1">
                This ride request has expired
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          {showRejectReason && (
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectReason(false);
                setRejectReason("");
              }}
              disabled={isRejecting}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isAccepting || isRejecting || isExpired}
            className="flex-1 border-red-500/50 text-red-300 hover:bg-red-500/20 hover:text-red-200"
          >
            {isRejecting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Rejecting...
              </>
            ) : showRejectReason ? (
              'Confirm Reject'
            ) : (
              'Reject'
            )}
          </Button>
          
          {!showRejectReason && (
            <Button
              onClick={handleAccept}
              disabled={isAccepting || isRejecting || isExpired}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white font-bold shadow-lg shadow-emerald-500/25"
            >
              {isAccepting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Accepting...
                </>
              ) : (
                <>
                  ✅ Accept Ride
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};


