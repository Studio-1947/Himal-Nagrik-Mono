
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { RealtimeEvent } from "@/lib/realtime";

type PassengerDashboardToasterProps = {
  events: RealtimeEvent[];
};

const eventToMessage = (event: RealtimeEvent) => {
  switch (event.type) {
    case "booking.driver_assigned":
      return {
        title: "Driver assigned",
        description: "Your driver is on the way. Check the dashboard for details.",
      };
    case "booking.offer.created":
      return {
        title: "Searching for a driver",
        description: "We're reaching out to nearby drivers.",
      };
    case "booking.offer.declined":
      return {
        title: "Driver declined",
        description: "We're looking for another driver.",
      };
    case "booking.offer.expired":
      return {
        title: "Offer expired",
        description: "Finding another driver for your ride.",
      };
    case "booking.driver_arriving":
      return {
        title: "Driver arriving",
        description: "Please meet your driver at the pickup point.",
      };
    case "booking.completed":
      return {
        title: "Ride completed",
        description: "Thanks for riding with us!",
      };
    case "booking.cancelled":
      return {
        title: "Ride cancelled",
        description: "Your booking was cancelled.",
      };
    default:
      return null;
  }
};

export const PassengerDashboardToaster = ({
  events,
}: PassengerDashboardToasterProps) => {
  useEffect(() => {
    if (events.length === 0) {
      return;
    }
    const latest = events[events.length - 1];
    const message = eventToMessage(latest);
    if (message) {
      toast({
        title: message.title,
        description: message.description,
      });
    }
  }, [events]);

  return null;
};
