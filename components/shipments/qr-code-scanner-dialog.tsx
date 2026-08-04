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
  const hasScannedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    let cancelled = false;
    hasScannedRef.current = false;
    setCameraError(null);
    setIsStarting(true);

    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 500,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || hasScannedRef.current || cancelled) return;
            hasScannedRef.current = true;
            controlsRef.current?.stop();
            onScan(result.getText());
            onOpenChange(false);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (!cancelled) setCameraError(t('collectorReception.scanner.cameraError'));
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onOpenChange, onScan, open, stopScanner, t]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsDecodingFile(true);
    setCameraError(null);
    const imageUrl = URL.createObjectURL(file);

    try {
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl);
      onScan(result.getText());
      onOpenChange(false);
    } catch {
      setCameraError(t('collectorReception.scanner.imageError'));
    } finally {
      URL.revokeObjectURL(imageUrl);
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
            muted
            playsInline
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
