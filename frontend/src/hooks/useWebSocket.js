import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(token, onMessage) {
  const ws = useRef(null);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;

  const connect = useCallback(() => {
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? '3001' : window.location.port;
    const url = `${protocol}//${host}:${port}/ws?token=${token}`;
    ws.current = new WebSocket(url);
    ws.current.onmessage = (e) => {
      try { onMsgRef.current(JSON.parse(e.data)); } catch {}
    };
    ws.current.onerror = () => {};
    ws.current.onclose = () => {};
    return ws.current;
  }, [token]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    ws.current?.close();
    ws.current = null;
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connect, send, disconnect, ws };
}
