'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface CopyTrackingNumberButtonProps {
  trackingNumber: string;
  className?: string;
}

export function CopyTrackingNumberButton({
  trackingNumber,
  className,
}: CopyTrackingNumberButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setIsCopied(true);
      toast({
        title: 'Reference copiee',
        description: trackingNumber,
      });
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      toast({
        title: 'Copie impossible',
        description: 'Le numero de reference n’a pas pu etre copie.',
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
      aria-label={`Copier la reference ${trackingNumber}`}
      title="Copier la reference"
    >
      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
