import React, { useState, useEffect, useCallback } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { cn } from '@/lib/utils';
import {
  resizeImage, convertImage, removeImageBackground, upscaleImage,
  formatFileSize, estimateSize,
} from '@/utils/imageUtils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Check, X, Lock, Unlock, Download, Sparkles, Zap, AlertTriangle, Info,
} from 'lucide-react';

export function ToolPanel() {
  const { state, dispatch, activeImage, currentDataUrl, cropperRef } = useEditor();

  if (!state.activeTool || !activeImage || !currentDataUrl) return null;

  return (
    <div className="glass border-t border-border animate-slide-up z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {state.activeTool === 'crop' && <CropControls />}
        {state.activeTool === 'resize' && <ResizeControls />}
        {state.activeTool === 'export' && <ExportControls />}
        {state.activeTool === 'bg-remove' && <BgRemoveControls />}
        {state.activeTool === 'upscale' && <UpscaleControls />}
      </div>
    </div>
  );
}

function CropControls() {
  const { state, dispatch, activeImage, cropperRef } = useEditor();
  const ratios = [
    { label: 'Free', value: NaN },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
  ];

  const applyCrop = () => {
    const cropper = cropperRef.current;
    if (!cropper || !activeImage) return;
    const canvas = cropper.getCroppedCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    dispatch({ type: 'PUSH_EDIT', payload: { imageId: activeImage.id, dataUrl, width: canvas.width, height: canvas.height } });
    dispatch({ type: 'SET_TOOL', payload: null });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground mr-1">Aspect:</span>
      {ratios.map((r) => (
        <button
          key={r.label}
          onClick={() => dispatch({ type: 'SET_CROP_ASPECT', payload: r.value })}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            (isNaN(state.cropAspectRatio) && isNaN(r.value)) || state.cropAspectRatio === r.value
              ? 'bg-primary text-primary-foreground' : 'glass-input text-muted-foreground hover:text-foreground'
          )}
        >
          {r.label}
        </button>
      ))}
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'SET_TOOL', payload: null })}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={applyCrop} className="bg-primary text-primary-foreground">
          <Check className="w-4 h-4 mr-1" /> Apply Crop
        </Button>
      </div>
    </div>
  );
}

function ResizeControls() {
  const { dispatch, activeImage, currentDataUrl } = useEditor();
  const [w, setW] = useState(activeImage?.width || 0);
  const [h, setH] = useState(activeImage?.height || 0);
  const [locked, setLocked] = useState(true);
  const [pct, setPct] = useState(100);
  const origW = activeImage?.width || 1;
  const origH = activeImage?.height || 1;
  const aspect = origW / origH;

  useEffect(() => {
    if (activeImage) { setW(activeImage.width); setH(activeImage.height); setPct(100); }
  }, [activeImage?.id]);

  const updateW = (nw: number) => {
    setW(nw);
    if (locked) setH(Math.round(nw / aspect));
    setPct(Math.round((nw / origW) * 100));
  };
  const updateH = (nh: number) => {
    setH(nh);
    if (locked) setW(Math.round(nh * aspect));
    setPct(Math.round((nh / origH) * 100));
  };
  const updatePct = (p: number) => {
    setPct(p);
    setW(Math.round(origW * p / 100));
    setH(Math.round(origH * p / 100));
  };

  const apply = async () => {
    if (!activeImage || !currentDataUrl) return;
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: 'Resizing...' } });
    try {
      const r = await resizeImage(currentDataUrl, w, h);
      dispatch({ type: 'PUSH_EDIT', payload: { imageId: activeImage.id, ...r } });
      dispatch({ type: 'SET_TOOL', payload: null });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">W</label>
        <Input type="number" value={w} onChange={(e) => updateW(Number(e.target.value))}
          className="w-20 h-8 text-xs font-mono glass-input border-border" />
        <button onClick={() => setLocked(!locked)} className="text-muted-foreground hover:text-foreground transition-colors">
          {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
        <label className="text-xs text-muted-foreground">H</label>
        <Input type="number" value={h} onChange={(e) => updateH(Number(e.target.value))}
          className="w-20 h-8 text-xs font-mono glass-input border-border" />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-[150px] max-w-[250px]">
        <Slider value={[pct]} onValueChange={([v]) => updatePct(v)} min={10} max={200} step={1} className="flex-1" />
        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
      </div>
      <Button size="sm" onClick={apply} className="bg-primary text-primary-foreground ml-auto">
        <Check className="w-4 h-4 mr-1" /> Apply
      </Button>
    </div>
  );
}

function ExportControls() {
  const { activeImage, currentDataUrl } = useEditor();
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(92);
  const [estSize, setEstSize] = useState(0);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!currentDataUrl) return;
    let cancelled = false;
    setComputing(true);
    const timer = setTimeout(async () => {
      try {
        const { size } = await convertImage(currentDataUrl, format, quality);
        if (!cancelled) setEstSize(size);
      } catch { /* ignore */ }
      if (!cancelled) setComputing(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentDataUrl, format, quality]);

  const handleDownload = async () => {
    if (!currentDataUrl || !activeImage) return;
    const { blob } = await convertImage(currentDataUrl, format, quality);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const baseName = activeImage.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_edited.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formats: Array<'png' | 'jpeg' | 'webp'> = ['png', 'jpeg', 'webp'];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex gap-1">
        {formats.map((f) => (
          <button key={f} onClick={() => setFormat(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-all',
              format === f ? 'bg-accent text-accent-foreground' : 'glass-input text-muted-foreground hover:text-foreground'
            )}
          >{f}</button>
        ))}
      </div>
      {format !== 'png' && (
        <div className="flex items-center gap-2 flex-1 min-w-[150px] max-w-[250px]">
          <span className="text-xs text-muted-foreground">Quality</span>
          <Slider value={[quality]} onValueChange={([v]) => setQuality(v)} min={1} max={100} step={1} className="flex-1" />
          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{quality}</span>
        </div>
      )}
      <span className="text-xs font-mono text-muted-foreground">
        {computing ? '...' : `≈ ${formatFileSize(estSize)}`}
      </span>
      <Button size="sm" onClick={handleDownload} className="bg-accent text-accent-foreground ml-auto">
        <Download className="w-4 h-4 mr-1" /> Download
      </Button>
    </div>
  );
}

function BgRemoveControls() {
  const { dispatch, activeImage, currentDataUrl } = useEditor();
  const [model, setModel] = useState<'small' | 'medium' | 'large'>('medium');
  const models = [
    { key: 'small' as const, label: 'Small/Fast', desc: '~40 MB, faster' },
    { key: 'medium' as const, label: 'Medium', desc: '~80 MB, balanced' },
    { key: 'large' as const, label: 'Large/Best', desc: 'Highest quality' },
  ];

  const run = async () => {
    if (!activeImage || !currentDataUrl) return;
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, progress: 0, message: 'Preparing background removal...' } });
    try {
      const r = await removeImageBackground(currentDataUrl, model, (pct, msg) => {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, progress: pct, message: msg } });
      });
      dispatch({ type: 'PUSH_EDIT', payload: { imageId: activeImage.id, ...r } });
      dispatch({ type: 'SET_TOOL', payload: null });
    } catch (e: any) {
      console.error('BG removal failed:', e);
      alert('Background removal failed: ' + (e?.message || 'Unknown error'));
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5" />
        One-time model download on first use — then instant &amp; offline
      </div>
      <div className="flex gap-1">
        {models.map((m) => (
          <button key={m.key} onClick={() => setModel(m.key)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              model === m.key ? 'bg-primary text-primary-foreground' : 'glass-input text-muted-foreground hover:text-foreground'
            )}
            title={m.desc}
          >{m.label}</button>
        ))}
      </div>
      <Button size="sm" onClick={run} className="bg-primary text-primary-foreground ml-auto">
        <Sparkles className="w-4 h-4 mr-1" /> Remove Background
      </Button>
    </div>
  );
}

function UpscaleControls() {
  const { dispatch, activeImage, currentDataUrl } = useEditor();
  const [scale, setScale] = useState<2 | 4>(2);
  const isBig = activeImage && (activeImage.width * activeImage.height) > 4_000_000;

  const run = async () => {
    if (!activeImage || !currentDataUrl) return;
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, progress: 0, message: 'Preparing upscaler...' } });
    try {
      const r = await upscaleImage(currentDataUrl, scale, (pct, msg) => {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, progress: pct, message: msg } });
      });
      dispatch({ type: 'PUSH_EDIT', payload: { imageId: activeImage.id, ...r } });
      dispatch({ type: 'SET_TOOL', payload: null });
    } catch (e: any) {
      console.error('Upscale failed:', e);
      alert('Upscaling failed: ' + (e?.message || 'Unknown error'));
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5" />
        One-time model download — uses AI for detail preservation
      </div>
      <div className="flex gap-1">
        {([2, 4] as const).map((s) => (
          <button key={s} onClick={() => setScale(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              scale === s ? 'bg-primary text-primary-foreground' : 'glass-input text-muted-foreground hover:text-foreground'
            )}
          >{s}× Upscale</button>
        ))}
      </div>
      {isBig && (
        <div className="flex items-center gap-1 text-xs text-accent">
          <AlertTriangle className="w-3.5 h-3.5" />
          Large image — may take longer
        </div>
      )}
      {activeImage && (
        <span className="text-[10px] font-mono text-muted-foreground">
          Output: {activeImage.width * scale}×{activeImage.height * scale}
        </span>
      )}
      <Button size="sm" onClick={run} className="bg-primary text-primary-foreground ml-auto">
        <Zap className="w-4 h-4 mr-1" /> Upscale {scale}×
      </Button>
    </div>
  );
}
