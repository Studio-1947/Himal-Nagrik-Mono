import { useState, useEffect, useCallback } from "react";
import { dispatchService, type DispatchOffer } from "@/lib/dispatch-service";
import { realtimeClient, type RealtimeEvent } from "@/lib/realtime";
import { useAuth } from "./use-auth";

export const useDriverOffers = () => {
  const { session } = useAuth();
  const token = session?.token;
  const driverId = session?.userId;
  
  const [currentOffer, setCurrentOffer] = useState<DispatchOffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Load initial offers
  const loadOffers = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const offers = await dispatchService.listOffers(token);
      console.log('[useDriverOffers] Loaded offers:', offers);
      // Get the most recent pending offer
      const pendingOffer = offers.find(o => o.status === 'pending');
      if (pendingOffer) {
        console.log('[useDriverOffers] Setting current offer:', pendingOffer);
        setCurrentOffer(pendingOffer);
        // Play notification sound for existing offers
        playNotificationSound();
      } else {
        console.log('[useDriverOffers] No pending offers found');
        setCurrentOffer(null);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Accept offer
  const acceptOffer = useCallback(async (offerId: string) => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const booking = await dispatchService.acceptOffer(token, offerId);
      setCurrentOffer(null); // Clear offer after acceptance
      return booking;
    } catch (err) {
      console.error('Failed to accept offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept offer');
      return null;
    } finally {
      setIsAccepting(false);
    }
  }, [token]);

  // Reject offer
  const rejectOffer = useCallback(async (offerId: string, reason?: string) => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setIsRejecting(true);
    setError(null);

    try {
      await dispatchService.rejectOffer(token, offerId, reason ? { reason } : undefined);
      setCurrentOffer(null); // Clear offer after rejection
      return true;
    } catch (err) {
      console.error('Failed to reject offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject offer');
      return false;
    } finally {
      setIsRejecting(false);
    }
  }, [token]);

  // Listen for real-time offer events
  useEffect(() => {
    if (!driverId) return;

    const handleRealtimeEvent = (event: RealtimeEvent) => {
      console.log('[useDriverOffers] Received event:', event.type, event.data);

      if (event.type === 'dispatch.offer.created') {
        const offer = event.data?.offer as DispatchOffer;
        if (offer) {
          console.log('[useDriverOffers] New offer received:', offer);
          setCurrentOffer(offer);
          // Play notification sound
          playNotificationSound();
        } else {
          console.warn('[useDriverOffers] Offer data missing in event:', event.data);
        }
      } else if (event.type === 'dispatch.offer.expired') {
        const expiredOfferId = event.data?.offerId;
        console.log('[useDriverOffers] Offer expired:', expiredOfferId);
        setCurrentOffer(prev => {
          if (prev?.id === expiredOfferId) {
            return null;
          }
          return prev;
        });
      } else if (event.type === 'dispatch.offer.accepted') {
        // Offer was accepted (confirmation)
        console.log('[useDriverOffers] Offer accepted');
        setCurrentOffer(null);
      }
    };

    const unsubscribe = realtimeClient.subscribe(
      `driver:${driverId}`,
      handleRealtimeEvent
    );

    // Load initial offers
    void loadOffers();

    return () => {
      unsubscribe();
    };
  }, [driverId, loadOffers]);

  return {
    currentOffer,
    isLoading,
    error,
    isAccepting,
    isRejecting,
    acceptOffer,
    rejectOffer,
    refreshOffers: loadOffers,
  };
};

// Helper function to play notification sound
const playNotificationSound = () => {
  try {
    // Create audio context and play a simple beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};


