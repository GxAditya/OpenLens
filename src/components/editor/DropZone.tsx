import React, { useCallback, useRef } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { loadImageFile, generateId } from '@/utils/imageUtils';
import { ImagePlus, Upload, ShieldCheck } from 'lucide-react';

export function DropZone() {
  const { dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newImages = [];
    for (const file of Array.from(files)) {
      if (!file.type.match(/^image\/(jpeg|png|webp)/)) continue;
      try {
        const { dataUrl, width, height } = await loadImageFile(file);
        newImages.push({
          id: generateId(),
          name: file.name,
          original: dataUrl,
          history: [dataUrl],
          historyIndex: 0,
          width,
          height,
        });
      } catch (e) {
        console.error('Failed to load:', file.name, e);
      }
    }
    if (newImages.length) dispatch({ type: 'ADD_IMAGES', payload: newImages });
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      className="flex-1 flex items-center justify-center p-8"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div
        className={`
          relative max-w-lg w-full rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer
          glass ${isDragOver ? 'glass-strong glow-primary scale-105' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="mb-6 inline-flex p-5 rounded-2xl bg-primary/10 animate-float">
          <ImagePlus className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Drop images here
        </h2>
        <p className="text-muted-foreground mb-6">
          or click to browse — JPEG, PNG, WebP supported
        </p>
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Upload className="w-4 h-4" />
          Choose Files
        </button>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          100% Private — Nothing leaves your browser
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
