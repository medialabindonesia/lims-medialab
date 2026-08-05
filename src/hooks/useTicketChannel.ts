"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as AblyTypes from "ably";
import { getAblyClient, supportChannels } from "@/lib/ably-client";
import type { SupportMessageDTO, SupportTicketDTO } from "@/lib/support";

type TypingPayload = { name: string; role: string };
type ReadPayload = { reader: "CUSTOMER" | "AGENT"; at: string };
type PresenceProfile = {
  userId: string;
  name: string;
  role: "CUSTOMER" | "AGENT";
};

type Handlers = {
  onMessage?: (message: SupportMessageDTO) => void;
  onTicketUpdate?: (payload: {
    ticket: SupportTicketDTO;
    message: SupportMessageDTO | null;
  }) => void;
  onTyping?: (payload: TypingPayload) => void;
  onRead?: (payload: ReadPayload) => void;
};

/**
 * Subscribe ke kanal satu tiket. Aman jika Ably tak tersedia (no-op).
 * Typing di-throttle supaya hemat kuota pesan free-tier.
 */
export function useTicketChannel(
  ticketId: string | null,
  handlers: Handlers,
  presence?: PresenceProfile
) {
  const [connected, setConnected] = useState(false);
  const [opponentNames, setOpponentNames] = useState<string[]>([]);
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
    const onRead = (msg: AblyTypes.Message) => {
      handlersRef.current.onRead?.(msg.data as ReadPayload);
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("ticket.update", onUpdate);
    channel.subscribe("typing", onTyping);
    channel.subscribe("read", onRead);

    const refreshPresence = async () => {
      if (!presence || cancelled) return;
      try {
        const members = await channel.presence.get();
        if (cancelled) return;
        const names = members
          .filter((member) => {
            const profile = member.data as PresenceProfile | undefined;
            return profile?.role && profile.role !== presence.role;
          })
          .map((member) => {
            const profile = member.data as PresenceProfile;
            return profile.name;
          });
        setOpponentNames([...new Set(names)]);
      } catch {
        if (!cancelled) setOpponentNames([]);
      }
    };
    const onPresence = () => void refreshPresence();
    if (presence) {
      channel.presence.subscribe("enter", onPresence);
      channel.presence.subscribe("update", onPresence);
      channel.presence.subscribe("leave", onPresence);
      channel.presence.subscribe("present", onPresence);
      void channel.presence
        .enter(presence)
        .then(refreshPresence)
        .catch(() => setOpponentNames([]));
    }

    const onStateChange = (state: AblyTypes.ConnectionStateChange) => {
      if (!cancelled) {
        const online = state.current === "connected";
        setConnected(online);
        if (online && presence) {
          void channel.presence.enter(presence).then(refreshPresence).catch(() => {});
        }
      }
    };
    client.connection.on(onStateChange);
    setConnected(client.connection.state === "connected");

    return () => {
      cancelled = true;
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("ticket.update", onUpdate);
      channel.unsubscribe("typing", onTyping);
      channel.unsubscribe("read", onRead);
      if (presence) {
        channel.presence.unsubscribe("enter", onPresence);
        channel.presence.unsubscribe("update", onPresence);
        channel.presence.unsubscribe("leave", onPresence);
        channel.presence.unsubscribe("present", onPresence);
        void channel.presence.leave().catch(() => {});
      }
      client.connection.off(onStateChange);
      channelRef.current = null;
    };
  }, [ticketId, presence?.userId, presence?.name, presence?.role]);

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

  return {
    connected,
    selfOnline: connected,
    opponentOnline: opponentNames.length > 0,
    opponentNames,
    publishTyping,
  };
}
