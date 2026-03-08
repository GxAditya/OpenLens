import React, { createContext, useContext, useReducer, useRef } from 'react';
import type Cropper from 'cropperjs';

export interface EditorImage {
  id: string;
  name: string;
  original: string;
  history: string[];
  historyIndex: number;
  width: number;
  height: number;
}

export type ToolType = 'crop' | 'resize' | 'export' | 'bg-remove' | 'upscale';

export interface EditorState {
  images: EditorImage[];
  activeImageId: string | null;
  activeTool: ToolType | null;
  zoom: number;
  panOffset: { x: number; y: number };
  showComparison: boolean;
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;
  cropAspectRatio: number;
}

export type EditorAction =
  | { type: 'ADD_IMAGES'; payload: EditorImage[] }
  | { type: 'SET_ACTIVE_IMAGE'; payload: string }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'SET_TOOL'; payload: ToolType | null }
  | { type: 'PUSH_EDIT'; payload: { imageId: string; dataUrl: string; width: number; height: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'TOGGLE_COMPARISON' }
  | { type: 'SET_PROCESSING'; payload: { isProcessing: boolean; progress?: number; message?: string } }
  | { type: 'RESET_VIEW' }
  | { type: 'SET_CROP_ASPECT'; payload: number };

const MAX_HISTORY = 10;

const initialState: EditorState = {
  images: [],
  activeImageId: null,
  activeTool: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  showComparison: false,
  isProcessing: false,
  processingProgress: 0,
  processingMessage: '',
  cropAspectRatio: NaN,
};

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_IMAGES': {
      const newImages = [...state.images, ...action.payload];
      return {
        ...state,
        images: newImages,
        activeImageId: state.activeImageId || action.payload[0]?.id || null,
      };
    }
    case 'SET_ACTIVE_IMAGE':
      return { ...state, activeImageId: action.payload, activeTool: null, zoom: 1, panOffset: { x: 0, y: 0 } };
    case 'REMOVE_IMAGE': {
      const filtered = state.images.filter(img => img.id !== action.payload);
      return {
        ...state,
        images: filtered,
        activeImageId: state.activeImageId === action.payload
          ? (filtered[0]?.id || null)
          : state.activeImageId,
      };
    }
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload, cropAspectRatio: NaN };
    case 'PUSH_EDIT': {
      return {
        ...state,
        images: state.images.map(img => {
          if (img.id !== action.payload.imageId) return img;
          const newHistory = img.history.slice(0, img.historyIndex + 1);
          newHistory.push(action.payload.dataUrl);
          const trimmed = newHistory.length > MAX_HISTORY ? newHistory.slice(newHistory.length - MAX_HISTORY) : newHistory;
          return {
            ...img,
            history: trimmed,
            historyIndex: trimmed.length - 1,
            width: action.payload.width,
            height: action.payload.height,
          };
        }),
      };
    }
    case 'UNDO':
      return {
        ...state,
        images: state.images.map(img =>
          img.id === state.activeImageId
            ? { ...img, historyIndex: Math.max(0, img.historyIndex - 1) }
            : img
        ),
      };
    case 'REDO':
      return {
        ...state,
        images: state.images.map(img =>
          img.id === state.activeImageId
            ? { ...img, historyIndex: Math.min(img.history.length - 1, img.historyIndex + 1) }
            : img
        ),
      };
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(10, action.payload)) };
    case 'SET_PAN':
      return { ...state, panOffset: action.payload };
    case 'TOGGLE_COMPARISON':
      return { ...state, showComparison: !state.showComparison };
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload.isProcessing,
        processingProgress: action.payload.progress ?? 0,
        processingMessage: action.payload.message ?? '',
      };
    case 'RESET_VIEW':
      return { ...state, zoom: 1, panOffset: { x: 0, y: 0 } };
    case 'SET_CROP_ASPECT':
      return { ...state, cropAspectRatio: action.payload };
    default:
      return state;
  }
}

interface EditorContextType {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  activeImage: EditorImage | null;
  currentDataUrl: string | null;
  cropperRef: React.MutableRefObject<Cropper | null>;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cropperRef = useRef<Cropper | null>(null);
  const activeImage = state.images.find(img => img.id === state.activeImageId) || null;
  const currentDataUrl = activeImage ? activeImage.history[activeImage.historyIndex] : null;

  return (
    <EditorContext.Provider value={{ state, dispatch, activeImage, currentDataUrl, cropperRef }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
