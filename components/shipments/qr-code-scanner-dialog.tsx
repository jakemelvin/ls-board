'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera, ImageIcon, LoaderCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';

const CAMERA_START_TIMEOUT_MS = 12_000;

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: HTMLCanvasElement) => Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function getCameraErrorKey(error?: unknown) {
  if (!window.isSecureContext) return 'collectorReception.scanner.cameraHttpsRequired';

  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'collectorReception.scanner.cameraPermissionDenied';
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'collectorReception.scanner.cameraUnavailable';
  }

  return 'collectorReception.scanner.cameraError';
}

function loadImageFile(file: File) {
  return new Promise<{ image: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load image'));
    };
    image.src = url;
  });
}

function renderImageToCanvas(
  image: HTMLImageElement,
  maxDimension: number,
  cropScale = 1,
  highContrast = false,
) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const croppedWidth = Math.max(1, Math.round(sourceWidth * cropScale));
  const croppedHeight = Math.max(1, Math.round(sourceHeight * cropScale));
  const sourceX = Math.round((sourceWidth - croppedWidth) / 2);
  const sourceY = Math.round((sourceHeight - croppedHeight) / 2);
  const scale = Math.min(1, maxDimension / Math.max(croppedWidth, croppedHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(croppedWidth * scale));
  canvas.height = Math.max(1, Math.round(croppedHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: highContrast });
  if (!context) throw new Error('Canvas is unavailable');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    croppedWidth,
    croppedHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  if (highContrast) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray =
        pixels.data[index] * 0.299 +
        pixels.data[index + 1] * 0.587 +
        pixels.data[index + 2] * 0.114;
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 128));
      pixels.data[index] = contrasted;
      pixels.data[index + 1] = contrasted;
      pixels.data[index + 2] = contrasted;
    }
    context.putImageData(pixels, 0, 0);
  }

  return canvas;
}

async function decodeQrCodeFromFile(file: File) {
  const { image, url } = await loadImageFile(file);

  try {
    const reader = new BrowserQRCodeReader();
    const attempts: Array<[number, number, boolean]> = [
      [2400, 1, false],
      [1600, 1, false],
      [1600, 0.8, false],
      [1400, 1, true],
      [1400, 0.7, true],
    ];

    const BarcodeDetectorApi = (
      globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    for (const [index, [maxDimension, cropScale, highContrast]] of attempts.entries()) {
      const canvas = renderImageToCanvas(image, maxDimension, cropScale, highContrast);
      try {
        if (index === 0 && BarcodeDetectorApi) {
          try {
            const detected = await new BarcodeDetectorApi({ formats: ['qr_code'] }).detect(canvas);
            const value = detected.find((result) => result.rawValue)?.rawValue;
            if (value) return value;
          } catch {
            // ZXing remains the cross-browser fallback.
          }
        }

        return reader.decodeFromCanvas(canvas).getText();
      } catch {
        // Try the next resolution/crop/contrast combination.
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    }

    throw new Error('QR code not found');
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface QrCodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
}

export function QrCodeScannerDialog({ open, onOpenChange, onScan }: QrCodeScannerDialogProps) {
  const { t } = useTranslation('dashboard');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const startupTimeoutRef = useRef<number | null>(null);
  const scannerAttemptRef = useRef(0);
  const onOpenChangeRef = useRef(onOpenChange);
  const onScanRef = useRef(onScan);
  const translateRef = useRef(t);
  const hasScannedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    onScanRef.current = onScan;
    translateRef.current = t;
  }, [onOpenChange, onScan, t]);

  const stopScanner = useCallback(() => {
    if (startupTimeoutRef.current !== null) {
      window.clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startScanner = useCallback(() => {
    // Safari on iOS can suppress camera permission requests that originate from an effect.
    // Keep getUserMedia in the button's synchronous click path.
    const attempt = scannerAttemptRef.current + 1;
    scannerAttemptRef.current = attempt;
    hasScannedRef.current = false;
    stopScanner();
    setCameraError(null);
    setIsStarting(true);

    const start = async () => {
      try {
        if (!window.isSecureContext) throw new Error('Insecure context');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable');

        startupTimeoutRef.current = window.setTimeout(() => {
          if (scannerAttemptRef.current !== attempt) return;
          scannerAttemptRef.current += 1;
          stopScanner();
          setIsStarting(false);
          setCameraError(translateRef.current(getCameraErrorKey()));
        }, CAMERA_START_TIMEOUT_MS);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (scannerAttemptRef.current !== attempt) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error('Camera preview unavailable');
        }
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        await video.play();

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 500,
        });
        const controls = await reader.decodeFromStream(
          stream,
          video,
          (result) => {
            if (!result || hasScannedRef.current || scannerAttemptRef.current !== attempt) return;
            hasScannedRef.current = true;
            controlsRef.current?.stop();
            onScanRef.current(result.getText());
            onOpenChangeRef.current(false);
          },
        );

        if (scannerAttemptRef.current !== attempt) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        if (startupTimeoutRef.current !== null) {
          window.clearTimeout(startupTimeoutRef.current);
          startupTimeoutRef.current = null;
        }
      } catch (error) {
        if (scannerAttemptRef.current === attempt) {
          stopScanner();
          setCameraError(translateRef.current(getCameraErrorKey(error)));
        }
      } finally {
        if (scannerAttemptRef.current === attempt) setIsStarting(false);
      }
    };

    void start();
  }, [stopScanner]);

  useEffect(() => {
    if (open) return;
    scannerAttemptRef.current += 1;
    hasScannedRef.current = false;
    setCameraError(null);
    setIsStarting(false);
    stopScanner();
  }, [open, stopScanner]);

  useEffect(() => {
    return () => {
      scannerAttemptRef.current += 1;
      stopScanner();
    };
  }, [stopScanner]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsDecodingFile(true);
    setCameraError(null);

    try {
      const value = await decodeQrCodeFromFile(file);
      onScanRef.current(value);
      onOpenChangeRef.current(false);
    } catch {
      setCameraError(t('collectorReception.scanner.imageError'));
    } finally {
      setIsDecodingFile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t('collectorReception.scanner.title')}
          </DialogTitle>
          <DialogDescription>{t('collectorReception.scanner.description')}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] max-h-[58dvh] overflow-hidden rounded-xl bg-black sm:aspect-square">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onCanPlay={() => setIsStarting(false)}
            aria-label={t('collectorReception.scanner.previewAria')}
          />
          <div className="pointer-events-none absolute inset-[16%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
              <LoaderCircle className="h-7 w-7 animate-spin" />
              <p className="text-sm">{t('collectorReception.scanner.starting')}</p>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
              <Camera className="h-8 w-8" />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t('collectorReception.scanner.hint')}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void handleFileChange(event)}
        />
        <DialogFooter>
          <Button
            type="button"
            className="w-full gap-2"
            onClick={startScanner}
            disabled={isStarting || isDecodingFile}
          >
            {isStarting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {cameraError
              ? t('collectorReception.scanner.retryCamera')
              : t('collectorReception.scanner.startCamera')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDecodingFile}
          >
            {isDecodingFile ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {t('collectorReception.scanner.chooseImage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
