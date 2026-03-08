

# PixelForge — Client-Side Image Editor

**Aesthetic**: Soft modern glass — frosted glass panels, soft gradients, rounded elements, subtle blur effects, contemporary feel. Using a distinctive font pairing (DM Sans + Space Mono for labels). Cool blue-violet dominant palette with warm coral accents.

**Layout**: Top toolbar + full-width canvas, with collapsible bottom panel for settings.

---

## Core Architecture

### Page Structure
- **Top Toolbar**: Horizontal bar with frosted glass background — contains: file import, crop, resize, format/export, background removal, upscale, undo/redo, comparison toggle
- **Center Canvas**: Full-width/height image preview with zoom/pan (mouse wheel + drag), checkerboard pattern for transparency
- **Bottom Settings Panel**: Slides up when a tool is active — contains tool-specific controls (crop ratios, resize inputs, quality sliders, etc.)
- **Right Mini-Panel**: File info, estimated size, export button

### Libraries to Install
- `@imgly/background-removal` — AI background removal with small/medium/large model variants
- `upscaler` — AI upscaling with ESRGAN models
- `pica` — High-quality image resizing
- `browser-image-compression` — Smart JPEG/WebP compression
- `cropperjs` + `react-cropper` — Interactive cropping with touch support

---

## Features (in priority order)

### 1. Image Loading
- Drag-and-drop zone with animated dashed border (appears on drag-over)
- File picker button — accepts JPEG, PNG, WebP
- Multi-file support — thumbnail strip at the bottom for batch mode
- EXIF orientation auto-correction on load
- Large image warning (>15MP) with option to downsample

### 2. Crop & Rotate
- Cropper.js overlay on the canvas with grid, handles, touch-friendly
- Aspect ratio presets in bottom panel: Free, 1:1, 4:3, 16:9, 3:2, Custom (w×h inputs)
- 90° rotation buttons (CW/CCW)
- Apply/Cancel buttons

### 3. Resize
- Bottom panel shows: percentage slider (10–200%), exact pixel W×H inputs
- Aspect ratio lock toggle (locked by default)
- Uses `pica` for high-quality resampling
- Live preview of dimensions and estimated file size

### 4. Format Conversion & Export
- Format selector: PNG, JPEG, WebP
- Quality slider (1–100) for JPEG/WebP, hidden for PNG
- Real-time estimated file size display
- Download button with chosen format

### 5. Compression Preview
- Side-by-side or overlay comparison: original vs compressed
- Quality slider with live file size update
- Visual diff highlighting (optional)

### 6. AI Background Removal
- One-click "Remove Background" button with sparkle icon
- Quality mode selector: Small/Fast (~40MB), Medium/Balanced (~80MB), Large/Best
- First-use: friendly modal explaining one-time model download
- Progress bar showing download percentage via progress callbacks
- WebGPU acceleration when available
- Models cached via Cache API / IndexedDB — instant on revisit
- Result: transparent PNG on checkerboard background

### 7. AI Upscaling
- Button to upscale 2× or 4× 
- Uses UpscalerJS with ESRGAN model
- One-time model download with progress indicator + caching
- Warning for very large images (memory constraints)

### 8. Preview & History
- Zoom/pan on canvas (mouse wheel, pinch-zoom on touch)
- Side-by-side comparison toggle (original vs edited, split-view slider)
- Undo/redo stack (10 steps) with Ctrl+Z/Ctrl+Y support
- History panel showing thumbnail snapshots of each edit step

### 9. Batch Mode
- Thumbnail strip at bottom when multiple images loaded
- Batch operations panel: apply resize/crop/convert/compress to all
- Progress indicator for batch processing
- Individual AI operations (bg removal, upscale) queued per-image

### 10. Privacy & Performance
- Zero network requests for image data — everything in-browser
- Privacy badge in header: "🔒 100% Private — Nothing leaves your browser"
- Web Workers for heavy operations (AI inference, large resizes)
- Loading spinners with percentage for long operations
- Graceful memory management for mobile devices

---

## Design Details
- **Colors**: Deep slate background (#0f172a), frosted glass panels with `backdrop-blur-xl` and white/10% opacity, coral accent (#f97066) for primary actions, cool violet (#8b5cf6) for AI features
- **Typography**: DM Sans for UI text, Space Mono for technical labels (dimensions, file sizes)
- **Animations**: Smooth panel slide-ups, button hover glow effects, progress bar shimmer, tool activation transitions
- **Empty State**: Beautiful illustrated drop zone with floating geometric shapes animation

