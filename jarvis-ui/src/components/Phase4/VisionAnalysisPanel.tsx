import { useState, useEffect } from 'react';

interface VisionResult {
  timestamp: string;
  detections: Array<{
    class: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  analysisType: 'objects' | 'scene' | 'text';
  processingTime: number;
}

export default function VisionAnalysisPanel() {
  const [latestResult, setLatestResult] = useState<VisionResult>({
    timestamp: new Date().toISOString(),
    detections: [
      { class: 'person', confidence: 0.94, bbox: [0.1, 0.2, 0.3, 0.5] },
      { class: 'laptop', confidence: 0.87, bbox: [0.4, 0.1, 0.8, 0.6] },
      { class: 'monitor', confidence: 0.92, bbox: [0.05, 0.15, 0.35, 0.7] },
      { class: 'keyboard', confidence: 0.81, bbox: [0.35, 0.55, 0.75, 0.95] },
    ],
    analysisType: 'objects',
    processingTime: 234,
  });

  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestResult = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/yolo/latest-result');
        if (res.ok) {
          const data = await res.json();
          setLatestResult(data.data || latestResult);
        }
      } catch (e) {
        console.error('Failed to fetch vision result:', e);
      }
    };

    fetchLatestResult();
    const interval = setInterval(fetchLatestResult, 5000);
    return () => clearInterval(interval);
  }, []);

  const sortedDetections = [...latestResult.detections].sort((a, b) => b.confidence - a.confidence);
  const totalDetections = latestResult.detections.length;
  const avgConfidence = totalDetections > 0 ? (latestResult.detections.reduce((s, d) => s + d.confidence, 0) / totalDetections) : 0;

  return (
    <div className="holographic-card p-6 flex flex-col gap-4">
      <div>
        <div className="text-primary font-bold mb-2 uppercase text-sm">YOLO Vision — Object Detection</div>
        <p className="text-text-secondary text-xs">YOLOv8n nano model real-time inference</p>
      </div>

      {/* Vision Canvas Simulation */}
      <div className="bg-surface/30 border border-border rounded-lg relative overflow-hidden aspect-video bg-black/50">
        <svg width="100%" height="100%" className="w-full h-full">
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 217, 255, 0.05)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Bounding Boxes */}
          {latestResult.detections.map((detection, idx) => {
            const width = detection.bbox[2] - detection.bbox[0];
            const height = detection.bbox[3] - detection.bbox[1];
            const isSelected = selectedClass === detection.class;

            return (
              <g key={idx}>
                {/* Box */}
                <rect
                  x={`${detection.bbox[0] * 100}%`}
                  y={`${detection.bbox[1] * 100}%`}
                  width={`${width * 100}%`}
                  height={`${height * 100}%`}
                  fill="none"
                  stroke={isSelected ? '#00d9ff' : 'rgba(0, 217, 255, 0.6)'}
                  strokeWidth="2"
                  className="cursor-pointer hover:stroke-primary transition-colors"
                  onClick={() => setSelectedClass(isSelected ? null : detection.class)}
                />

                {/* Label Background */}
                <rect
                  x={`${detection.bbox[0] * 100}%`}
                  y={`${Math.max(0, detection.bbox[1] * 100 - 20)}%`}
                  width="auto"
                  height="20"
                  fill="rgba(0, 217, 255, 0.2)"
                  stroke="rgba(0, 217, 255, 0.4)"
                  strokeWidth="1"
                />

                {/* Label Text */}
                <text
                  x={`${detection.bbox[0] * 100 + 2}%`}
                  y={`${Math.max(10, detection.bbox[1] * 100 - 5)}%`}
                  fill="#00d9ff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {detection.class} {(detection.confidence * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Corner Indicators */}
        <div className="absolute top-2 left-2 text-primary text-xs font-bold bg-surface/80 px-2 py-1 rounded border border-primary/30">
          YOLO INFERENCE
        </div>
        <div className="absolute bottom-2 right-2 text-text-secondary text-[10px] font-mono bg-surface/80 px-2 py-1 rounded border border-border/30">
          {latestResult.processingTime}ms
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-light/50 border border-border rounded p-3 text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Objects</div>
          <div className="text-primary text-2xl font-bold">{totalDetections}</div>
        </div>
        <div className="bg-surface-light/50 border border-border rounded p-3 text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Avg Confidence</div>
          <div className="text-success text-2xl font-bold">{(avgConfidence * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-surface-light/50 border border-border rounded p-3 text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Inference</div>
          <div className="text-primary text-2xl font-bold">{latestResult.processingTime}ms</div>
        </div>
      </div>

      {/* Detections List */}
      <div className="bg-surface-light/50 border border-border rounded-lg p-4 max-h-[200px] overflow-y-auto">
        <div className="text-primary text-xs font-bold mb-3 uppercase">Detected Classes ({totalDetections})</div>
        <div className="space-y-2">
          {sortedDetections.map((detection, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedClass(selectedClass === detection.class ? null : detection.class)}
              className={`w-full flex items-center justify-between text-left px-3 py-2 rounded transition-all text-xs ${
                selectedClass === detection.class
                  ? 'bg-primary/20 border border-primary text-primary'
                  : 'bg-surface/50 border border-border/30 text-text-secondary hover:border-primary/50'
              }`}
            >
              <span className="font-bold uppercase">{detection.class}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-dark"
                    style={{ width: `${detection.confidence * 100}%` }}
                  />
                </div>
                <span className="text-success font-bold w-10 text-right">{(detection.confidence * 100).toFixed(0)}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-[10px] text-text-secondary/60">
        <div className="flex items-center gap-2">
          <div className="status-indicator online" />
          <span>MODEL: YOLOv8n</span>
        </div>
        <span>Last update: {new Date(latestResult.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
