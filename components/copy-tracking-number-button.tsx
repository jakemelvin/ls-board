'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

interface CopyTrackingNumberButtonProps {
  trackingNumber: string;
  className?: string;
}

export function CopyTrackingNumberButton({
  trackingNumber,
  className,
}: CopyTrackingNumberButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setIsCopied(true);
      toast({
        title: t('copyTracking.copyTitle'),
        description: trackingNumber,
      });
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      toast({
        title: t('copyTracking.copyFailedTitle'),
        description: t('copyTracking.copyFailedDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className ?? 'h-7 w-7 shrink-0'}
      onClick={handleCopy}
      aria-label={t('copyTracking.copyAria', { values: { reference: trackingNumber } })}
      title={t('copyTracking.copyTitleAttr')}
    >
      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
