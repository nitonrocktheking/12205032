import { useEffect, useRef, useCallback } from "react";

export type MPMessage =
  | { type: "room_created"; code: string; seed: number; faction: "player" }
  | { type: "room_joined";  code: string; seed: number; faction: "enemy" }
  | { type: "opponent_joined" }
  | { type: "opponent_play_card"; cardIndex: number; x: number; y: number }
  | { type: "opponent_left" }
  | { type: "error"; message: string };

interface Options {
  onMessage: (msg: MPMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useMultiplayer({ onMessage, onOpen, onClose }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen  = () => onOpen?.();
    ws.onclose = () => { wsRef.current = null; onClose?.(); };
    ws.onmessage = (e) => {
      try { onMessageRef.current(JSON.parse(e.data) as MPMessage); } catch { /* ignore */ }
    };

    return () => { ws.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((data: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const createRoom = useCallback(() => send({ type: "create_room" }), [send]);
  const joinRoom   = useCallback((code: string) => send({ type: "join_room", code }), [send]);
  const sendPlayCard = useCallback((cardIndex: number, x: number, y: number) =>
    send({ type: "play_card", cardIndex, x, y }), [send]);

  return { createRoom, joinRoom, sendPlayCard };
}
