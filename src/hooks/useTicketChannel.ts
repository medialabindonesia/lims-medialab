"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as AblyTypes from "ably";
import { getAblyClient, supportChannels } from "@/lib/ably-client";
import type { SupportMessageDTO, SupportTicketDTO } from "@/lib/support";

type TypingPayload = { name: string; role: string };

type Handlers = {
  onMessage?: (message: SupportMessageDTO) => void;
  onTicketUpdate?: (payload: {
    ticket: SupportTicketDTO;
    message: SupportMessageDTO | null;
  }) => void;
  onTyping?: (payload: TypingPayload) => void;
};

/**
 * Subscribe ke kanal satu tiket. Aman jika Ably tak tersedia (no-op).
 * Typing di-throttle supaya hemat kuota pesan free-tier.
 */
export function useTicketChannel(ticketId: string | null, handlers: Handlers) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const channelRef = useRef<AblyTypes.RealtimeChannel | null>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    if (!ticketId) return;

    const client = getAblyClient();
    if (!client) return;

    let cancelled = false;
    const channel = client.channels.get(supportChannels.ticket(ticketId));
    channelRef.current = channel;

    const onMessage = (msg: AblyTypes.Message) => {
      handlersRef.current.onMessage?.(msg.data as SupportMessageDTO);
    };
    const onUpdate = (msg: AblyTypes.Message) => {
      handlersRef.current.onTicketUpdate?.(
        msg.data as {
          ticket: SupportTicketDTO;
          message: SupportMessageDTO | null;
        }
      );
    };
    const onTyping = (msg: AblyTypes.Message) => {
      handlersRef.current.onTyping?.(msg.data as TypingPayload);
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("ticket.update", onUpdate);
    channel.subscribe("typing", onTyping);

    const onStateChange = (state: AblyTypes.ConnectionStateChange) => {
      if (!cancelled) setConnected(state.current === "connected");
    };
    client.connection.on(onStateChange);
    setConnected(client.connection.state === "connected");

    return () => {
      cancelled = true;
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("ticket.update", onUpdate);
      channel.unsubscribe("typing", onTyping);
      client.connection.off(onStateChange);
      channelRef.current = null;
    };
  }, [ticketId]);

  const publishTyping = useCallback((payload: TypingPayload) => {
    const channel = channelRef.current;
    if (!channel) return;

    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return; // throttle 2s
    lastTypingRef.current = now;

    channel.publish("typing", payload).catch(() => {
      /* diamkan: realtime opsional */
    });
  }, []);

  return { connected, publishTyping };
}
