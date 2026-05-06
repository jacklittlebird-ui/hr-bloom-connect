import { useEffect, useState, useCallback, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScan: (token: string) => void;
}

const QrScanner = ({ onScan }: QrScannerProps) => {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;
    const requestCameraPermission = async (): Promise<boolean> => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("متصفحك لا يدعم الوصول للكاميرا. استخدم Chrome أو Safari الحديث.");
          return false;
        }
        // Force an explicit permission prompt before initializing the QR scanner.
        // Some devices (especially iOS Safari & in-app browsers) silently fail
        // when html5-qrcode opens the camera without a prior getUserMedia call.
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        // Immediately release the stream so html5-qrcode can take over.
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch (err: any) {
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا من إعدادات المتصفح وإعادة المحاولة.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("لم يتم العثور على كاميرا في هذا الجهاز.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setError("الكاميرا مستخدمة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مجدداً.");
        } else if (name === "OverconstrainedError") {
          setError("إعدادات الكاميرا غير مدعومة على هذا الجهاز.");
        } else {
          setError(err?.message || "تعذر الوصول للكاميرا. تأكد من السماح بالإذن.");
        }
        return false;
      }
    };

    const startScanner = async () => {
      try {
        if (!mounted) return;
        // Force-request camera permission FIRST so the OS prompt appears reliably.
        const granted = await requestCameraPermission();
        if (!mounted || !granted) return;
        // Small delay to ensure any previous camera stream is fully released
        await new Promise((r) => setTimeout(r, 250));
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
          try {
            await scanner.start(
              { facingMode: "environment" },
              config,
              successCb,
              errorCb
            );
          } catch {
            // Final fallback: any available camera (front camera on devices without rear)
            await scanner.start(
              { facingMode: "user" },
              config,
              successCb,
              errorCb
            );
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Camera error");
      }
    };
    startScanner();

    return () => {
      mounted = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        // Best-effort stop + clear; ignore errors if scanner never fully started
        Promise.resolve()
          .then(() => s.stop())
          .catch(() => {})
          .then(() => s.clear())
          .catch(() => {});
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
