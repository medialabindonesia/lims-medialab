"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as AblyTypes from "ably";
import { getAblyClient, supportChannels } from "@/lib/ably-client";

type Options = {
  isCustomer: boolean;
  customerId?: string | null;
  /** Nonaktifkan hook (mis. user tanpa menu support). Default aktif. */
  enabled?: boolean;
  /** Dipanggil saat ada notifikasi realtime (mis. untuk refetch daftar). */
  onNotify?: () => void;
};

/**
 * Menghitung total unread untuk badge sidebar. Realtime via kanal notifikasi
 * (customer channel / desk channel). Fallback: refetch saat tab kembali fokus.
 */
export function useSupportUnread({
  isCustomer,
  customerId,
  enabled = true,
  onNotify,
}: Options) {
  const [count, setCount] = useState(0);
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/support/unread", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      /* diamkan */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refetch();

    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);

    // Realtime
    const client = getAblyClient();
    let channel: AblyTypes.RealtimeChannel | null = null;
    let handler: ((msg: AblyTypes.Message) => void) | null = null;

    if (client) {
      const channelName =
        isCustomer && customerId
          ? supportChannels.customer(customerId)
          : !isCustomer
          ? supportChannels.desk()
          : null;

      if (channelName) {
        channel = client.channels.get(channelName);
        handler = () => {
          refetch();
          onNotifyRef.current?.();
        };
        channel.subscribe(handler);
      }
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      if (channel && handler) channel.unsubscribe(handler);
    };
  }, [isCustomer, customerId, refetch, enabled]);

  return { count, refetch };
}
