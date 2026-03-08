import React from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BatchStrip() {
  const { state, dispatch } = useEditor();
  if (state.images.length <= 1) return null;

  return (
    <div className="glass border-t border-border px-4 py-2 flex gap-2 overflow-x-auto scrollbar-thin">
      {state.images.map((img) => {
        const thumb = img.history[img.historyIndex];
        const isActive = img.id === state.activeImageId;
        return (
          <div
            key={img.id}
            className={cn(
              'relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
              isActive ? 'border-primary glow-primary' : 'border-transparent hover:border-muted-foreground/30'
            )}
            onClick={() => dispatch({ type: 'SET_ACTIVE_IMAGE', payload: img.id })}
          >
            <img src={thumb} alt={img.name} className="w-full h-full object-cover" draggable={false} />
            <button
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive transition-colors"
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_IMAGE', payload: img.id }); }}
            >
              <X className="w-3 h-3" />
            </button>
            <span className="absolute bottom-0 inset-x-0 text-[8px] font-mono text-foreground/80 bg-background/60 text-center truncate px-0.5">
              {img.name.length > 8 ? img.name.substring(0, 8) + '…' : img.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
