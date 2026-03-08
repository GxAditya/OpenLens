import { EditorProvider } from '@/contexts/EditorContext';
import { useEditor } from '@/contexts/EditorContext';
import { Toolbar } from '@/components/editor/Toolbar';
import { CanvasPreview } from '@/components/editor/CanvasPreview';
import { DropZone } from '@/components/editor/DropZone';
import { ToolPanel } from '@/components/editor/ToolPanel';
import { BatchStrip } from '@/components/editor/BatchStrip';
import { ProcessingOverlay } from '@/components/editor/ProcessingOverlay';

function EditorLayout() {
  const { activeImage } = useEditor();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex flex-col min-h-0 relative">
        {activeImage ? <CanvasPreview /> : <DropZone />}
        <ToolPanel />
        <BatchStrip />
      </div>
      <ProcessingOverlay />
    </div>
  );
}

const Index = () => (
  <EditorProvider>
    <EditorLayout />
  </EditorProvider>
);

export default Index;
