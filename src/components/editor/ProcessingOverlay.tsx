import React from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

export function ProcessingOverlay() {
  const { state } = useEditor();
  if (!state.isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
        <p className="text-foreground font-medium mb-3">
          {state.processingMessage || 'Processing...'}
        </p>
        {state.processingProgress > 0 && (
          <div className="space-y-2">
            <Progress value={state.processingProgress} className="h-2" />
            <p className="text-xs font-mono text-muted-foreground">
              {state.processingProgress}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
