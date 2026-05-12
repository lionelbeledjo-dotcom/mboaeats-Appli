import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DriverLoc = {
  driver_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  status: string;
  updated_at: string;
};

export function useDriverLocation(driverId: string | null | undefined) {
  const [loc, setLoc] = useState<DriverLoc | null>(null);

  useEffect(() => {
    if (!driverId) {
      setLoc(null);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", driverId)
        .maybeSingle();
      if (!cancelled && data) setLoc(data as DriverLoc);
    })();

    const channel = supabase
      .channel(`driver-loc:${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          if (payload.new) setLoc(payload.new as DriverLoc);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return loc;
}
