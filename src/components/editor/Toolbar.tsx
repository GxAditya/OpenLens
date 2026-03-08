import React, { useRef, useCallback } from 'react';
import { useEditor, type ToolType } from '@/contexts/EditorContext';
import { loadImageFile, rotateImage, generateId } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';
import {
  FolderOpen, Crop, Maximize2, RotateCw, RotateCcw,
  Sparkles, Zap, Undo2, Redo2, SplitSquareHorizontal, Download,
  ShieldCheck, Plus
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Toolbar() {
  const { state, dispatch, activeImage, currentDataUrl } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!activeImage;
  const canUndo = activeImage ? activeImage.historyIndex > 0 : false;
  const canRedo = activeImage ? activeImage.historyIndex < activeImage.history.length - 1 : false;
  const busy = state.isProcessing;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newImages = [];
    for (const file of Array.from(files)) {
      if (!file.type.match(/^image\/(jpeg|png|webp)/)) continue;
      try {
        const { dataUrl, width, height } = await loadImageFile(file);
        newImages.push({
          id: generateId(), name: file.name, original: dataUrl,
          history: [dataUrl], historyIndex: 0, width, height,
        });
      } catch (e) { console.error('Load failed:', e); }
    }
    if (newImages.length) dispatch({ type: 'ADD_IMAGES', payload: newImages });
  };

  const handleRotate = async (deg: number) => {
    if (!activeImage || !currentDataUrl || busy) return;
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: 'Rotating...' } });
    try {
      const r = await rotateImage(currentDataUrl, deg);
      dispatch({ type: 'PUSH_EDIT', payload: { imageId: activeImage.id, ...r } });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  const toggleTool = (tool: ToolType) => {
    if (busy) return;
    dispatch({ type: 'SET_TOOL', payload: state.activeTool === tool ? null : tool });
  };

  const Btn = ({ icon: Icon, label, onClick, active, disabled, variant }: {
    icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean; variant?: 'ai' | 'action';
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled || busy}
          className={cn(
            'p-2 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none',
            active
              ? 'bg-primary/20 text-primary glow-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
            variant === 'ai' && !active && 'text-primary hover:text-primary hover:bg-primary/10',
            variant === 'action' && !active && 'text-accent hover:text-accent hover:bg-accent/10',
          )}
        >
          <Icon className="w-[18px] h-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="glass-strong rounded-lg">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  const Sep = () => <div className="w-px h-6 bg-border mx-1" />;

  return (
    <div className="glass border-b border-border px-3 py-1.5 flex items-center gap-1 z-20">
      {/* Logo */}
      <span className="text-sm font-bold text-foreground tracking-tight mr-2 select-none">
        <span className="text-primary">Pixel</span>Forge
      </span>

      <Sep />

      <Btn icon={hasImage ? Plus : FolderOpen} label={hasImage ? 'Add images' : 'Open images'}
        onClick={() => fileInputRef.current?.click()} />

      {hasImage && (
        <>
          <Sep />
          <Btn icon={Crop} label="Crop" onClick={() => toggleTool('crop')} active={state.activeTool === 'crop'} />
          <Btn icon={Maximize2} label="Resize" onClick={() => toggleTool('resize')} active={state.activeTool === 'resize'} />
          <Btn icon={RotateCw} label="Rotate 90° CW" onClick={() => handleRotate(90)} />
          <Btn icon={RotateCcw} label="Rotate 90° CCW" onClick={() => handleRotate(-90)} />

          <Sep />
          <Btn icon={Sparkles} label="Remove Background" variant="ai"
            onClick={() => toggleTool('bg-remove')} active={state.activeTool === 'bg-remove'} />
          <Btn icon={Zap} label="AI Upscale" variant="ai"
            onClick={() => toggleTool('upscale')} active={state.activeTool === 'upscale'} />

          <Sep />
          <Btn icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} />
          <Btn icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} />

          <Sep />
          <Btn icon={SplitSquareHorizontal} label="Compare original"
            onClick={() => dispatch({ type: 'TOGGLE_COMPARISON' })} active={state.showComparison} />

          <Sep />
          <Btn icon={Download} label="Export" variant="action"
            onClick={() => toggleTool('export')} active={state.activeTool === 'export'} />
        </>
      )}

      {/* Right side: privacy badge + image info */}
      <div className="ml-auto flex items-center gap-3">
        {activeImage && (
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            {activeImage.width}×{activeImage.height}
          </span>
        )}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3" />
          <span className="hidden md:inline">Private</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
