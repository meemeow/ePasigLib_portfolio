import { useCallback, useEffect, useRef, useState } from "react";

type SerialPortLike = {
  readable?: {
    getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  } | null;
  writable?: unknown;
  open: (options: Record<string, unknown>) => Promise<void>;
};

function serialApi(): {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
} | null {
  if (typeof navigator === "undefined" || !("serial" in navigator)) return null;
  return (navigator as unknown as { serial: ReturnType<typeof serialApi> })
    .serial as NonNullable<ReturnType<typeof serialApi>>;
}

export const isNfcSupported = (): boolean => serialApi() !== null;

interface NfcScannerOptions {
  onScan: (uid: string) => void;
  autoConnect?: boolean;
}

export function useNfcScanner({
  onScan,
  autoConnect = true,
}: NfcScannerOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(isNfcSupported);

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const mountedRef = useRef(true);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const readLoop = useCallback(async (port: SerialPortLike) => {
    const readable = port.readable;
    if (!readable) return;
    try {
      const reader = readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done || !mountedRef.current) break;
        if (value) {
          const uid = decoder.decode(value).trim();
          if (uid) onScanRef.current(uid);
        }
      }
      reader.releaseLock();
      readerRef.current = null;
    } catch {
      if (!mountedRef.current) return;
      setConnected(false);
      setError(
        "Lost contact with the NFC scanner. Reconnect it and try again.",
      );
    }
  }, []);

  const attach = useCallback(
    async (port: SerialPortLike) => {
      portRef.current = port;
      if (!(port.readable && port.writable)) {
        await port.open({
          baudRate: 9600,
          autoOpen: false,
          rtscts: false,
          xon: false,
          xoff: false,
          hupcl: false,
        });
      }
      if (!mountedRef.current) return;
      setConnected(true);
      setError(null);
      void readLoop(port);
    },
    [readLoop],
  );

  const connect = useCallback(async () => {
    const serial = serialApi();
    if (!serial) {
      setError("This browser cannot talk to an NFC scanner.");
      return;
    }
    try {
      await attach(await serial.requestPort());
    } catch (e) {
      if (!mountedRef.current) return;
      setConnected(false);
      setError(
        (e as { name?: string })?.name === "NotFoundError"
          ? "No NFC scanner selected."
          : "Could not connect to the NFC scanner.",
      );
    }
  }, [attach]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoConnect) {
      const serial = serialApi();
      if (serial) {
        serial
          .getPorts()
          .then((ports) => {
            if (ports.length > 0 && mountedRef.current) return attach(ports[0]);
            return undefined;
          })
          .catch(() => {
          });
      }
    }
    return () => {
      mountedRef.current = false;
      const reader = readerRef.current;
      if (reader) {
        reader.cancel().catch(() => {});
        try {
          reader.releaseLock();
        } catch {
        }
        readerRef.current = null;
      }
    };
  }, [autoConnect, attach]);

  return { supported, connected, connect, error } as const;
}
