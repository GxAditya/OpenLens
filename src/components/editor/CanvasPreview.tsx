import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { Columns } from 'lucide-react';

export function CanvasPreview() {
  const { state, dispatch, activeImage, currentDataUrl, cropperRef } = useEditor();
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [comparisonPos, setComparisonPos] = useState(50);

  const isCropMode = state.activeTool === 'crop';

  // Cropper.js lifecycle
  useEffect(() => {
    if (!isCropMode || !imgRef.current) {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      if (imgRef.current && !cropperRef.current) {
        cropperRef.current = new Cropper(imgRef.current, {
          viewMode: 1,
          dragMode: 'crop',
          guides: true,
          center: true,
          highlight: true,
          background: true,
          autoCropArea: 0.8,
          responsive: true,
          aspectRatio: isNaN(state.cropAspectRatio) ? NaN : state.cropAspectRatio,
        });
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [isCropMode, currentDataUrl]);

  // Update aspect ratio when it changes
  useEffect(() => {
    if (cropperRef.current) {
      cropperRef.current.setAspectRatio(isNaN(state.cropAspectRatio) ? NaN : state.cropAspectRatio);
    }
  }, [state.cropAspectRatio]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isCropMode) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    dispatch({ type: 'SET_ZOOM', payload: state.zoom * factor });
  }, [state.zoom, isCropMode, dispatch]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); }
        if (e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
        if (e.key === '0') { e.preventDefault(); dispatch({ type: 'RESET_VIEW' }); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropMode || e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - state.panOffset.x, y: e.clientY - state.panOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    dispatch({ type: 'SET_PAN', payload: { x: e.clientX - panStart.x, y: e.clientY - panStart.y } });
  };
  const handleMouseUp = () => setIsPanning(false);

  if (!currentDataUrl || !activeImage) return null;

  // Comparison mode
  if (state.showComparison && !isCropMode) {
    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-background checkerboard relative cursor-col-resize select-none"
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            const rect = e.currentTarget.getBoundingClientRect();
            setComparisonPos(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
          }
        }}
      >
        <img src={currentDataUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} alt="Edited" />
        <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - comparisonPos}% 0 0)` }}>
          <img src={activeImage.original} className="absolute inset-0 w-full h-full object-contain" draggable={false} alt="Original" />
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 pointer-events-none" style={{ left: `${comparisonPos}%` }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full glass-strong flex items-center justify-center">
            <Columns className="w-4 h-4 text-foreground" />
          </div>
        </div>
        <span className="absolute top-3 left-3 text-[10px] font-mono text-muted-foreground glass px-2 py-1 rounded-md pointer-events-none">Original</span>
        <span className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground glass px-2 py-1 rounded-md pointer-events-none">Edited</span>
      </div>
    );
  }

  // Crop mode
  if (isCropMode) {
    return (
      <div ref={containerRef} className="flex-1 overflow-hidden bg-background flex items-center justify-center p-2">
        <img
          ref={imgRef}
          src={currentDataUrl}
          alt="Crop"
          className="max-w-full max-h-full"
          style={{ display: 'block' }}
        />
      </div>
    );
  }

  // Normal mode
  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-background checkerboard cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoom})`,
        }}
      >
        <img
          ref={imgRef}
          src={currentDataUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>
      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 glass px-2 py-1 rounded-lg text-[10px] font-mono text-muted-foreground pointer-events-none">
        {Math.round(state.zoom * 100)}%
      </div>
    </div>
  );
}
