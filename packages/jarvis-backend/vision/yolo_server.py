
# JARVIS YOLO Vision Server (THOMAS Grade)
# Provides real-time object detection and segmentation data to the JARVIS kernel.

import sys
import os
import json
import time
from ultralytics import YOLO

def run_vision_loop():
    # Load YOLOv8n model (small, fast for CPU/M1/M2)
    # This will auto-download if not present
    model = YOLO("yolov8n.pt")
    
    stream_dir = os.path.join(os.getcwd(), "screen_stream")
    if not os.path.exists(stream_dir):
        os.makedirs(stream_dir)
        
    print(f"[YOLO] Vision Kernel Online. Monitoring: {stream_dir}")
    
    while True:
        try:
            # Look for the absolute latest frame
            files = [f for f in os.listdir(stream_dir) if f.endswith(('.png', '.jpg'))]
            if not files:
                time.sleep(0.5)
                continue
                
            files.sort(key=lambda x: os.path.getmtime(os.path.join(stream_dir, x)), reverse=True)
            latest_frame = os.path.join(stream_dir, files[0])
            
            # Run inference
            results = model(latest_frame, verbose=False)
            
            # Extract detections
            detections = []
            for r in results:
                for box in r.boxes:
                    detections.append({
                        "class": model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "box": [float(x) for x in box.xyxy[0]]
                    })
            
            # Write results back for TS Bridge
            output_path = os.path.join(stream_dir, "vision_results.json")
            with open(output_path, "w") as f:
                json.dump({
                    "timestamp": time.time(),
                    "frame": files[0],
                    "detections": detections
                }, f)
                
            # Slow down slightly to prevent CPU burn (1-2 FPS is enough for situational awareness)
            time.sleep(1.0)
            
        except Exception as e:
            print(f"[YOLO] Error: {str(e)}")
            time.sleep(2.0)

if __name__ == "__main__":
    run_vision_loop()
