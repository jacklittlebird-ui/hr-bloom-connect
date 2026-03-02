import { useEffect, useState, useCallback, useRef } from "react";

interface QrScannerProps {
  onScan: (token: string) => void;
}

const QrScanner = ({ onScan }: QrScannerProps) => {
  const [error, setError] = useState("");
  const scannerRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;
        const scanner = new Html5Qrcode("qr-reader", /* verbose */ false);
        scannerRef.current = scanner;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        const successCb = (decoded: string) => onScanRef.current(decoded.trim());
        const errorCb = () => {};

        try {
          await scanner.start(
            { facingMode: { exact: "environment" } },
            config,
            successCb,
            errorCb
          );
        } catch {
          await scanner.start(
            { facingMode: "environment" },
            config,
            successCb,
            errorCb
          );
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Camera error");
      }
    })();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => scannerRef.current?.clear());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader"
        className="w-[300px] h-[300px] rounded-lg overflow-hidden border-2 border-primary"
      />
      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}
    </div>
  );
};

export default QrScanner;
