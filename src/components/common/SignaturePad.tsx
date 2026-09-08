import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';
import { Button } from './Button';

interface SignaturePadProps {
  value?: string;
  onChange: (signatureData: string) => void;
  label?: string;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label = 'Digital Signature',
  required = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on client rect
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;

    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedName(val);
    if (val.trim()) {
      onChange(`TYPED_SIGNATURE:${val.trim()}:${new Date().toISOString()}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-primary" />
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              mode === 'draw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              mode === 'type' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Type
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div className="relative border-2 border-dashed border-border rounded-xl bg-muted/20 hover:border-primary/40 transition-colors p-1">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-28 cursor-crosshair touch-none rounded-lg"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50 text-xs">
              Sign here using mouse or finger
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              leftIcon={<Eraser className="w-3 h-3" />}
              className="text-[11px] h-7 px-2"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 border rounded-xl bg-muted/20 space-y-2">
          <input
            type="text"
            placeholder="Type your full legal name to generate digital seal..."
            value={typedName}
            onChange={handleTypeChange}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {typedName && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <span className="font-serif italic text-lg text-primary tracking-wide">
                /s/ {typedName}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                Verified Digital Seal
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
