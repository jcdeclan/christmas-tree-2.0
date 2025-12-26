import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ChristmasScene } from './threeScene';
import { GestureService } from './gestureService';
import { SceneMode } from './types';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ChristmasScene | null>(null);
  const gestureRef = useRef<GestureService | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [uiHidden, setUiHidden] = useState(false);
  const [gestureMode, setGestureMode] = useState<SceneMode>(SceneMode.TREE);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && sceneRef.current) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          new THREE.TextureLoader().load(ev.target.result, (t) => {
            t.colorSpace = THREE.SRGBColorSpace; // Specified color space as per requirements
            sceneRef.current?.addPhotoToScene(t);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ChristmasScene(containerRef.current);
    sceneRef.current = scene;

    const initVision = async () => {
      if (videoRef.current && canvasRef.current) {
        try {
          const gesture = new GestureService(videoRef.current, canvasRef.current);
          await gesture.init();
          gestureRef.current = gesture;
          
          gesture.onUpdate = (data) => {
            if (data.mode !== gestureMode) {
              setGestureMode(data.mode);
              scene.setMode(data.mode);
            }
            scene.updateInteraction(data.palmCenter);
          };
        } catch (err) {
          console.error("Vision system failed to initialize:", err);
        }
      }
      // Small delay to ensure smooth transition
      setTimeout(() => setLoading(false), 500);
    };

    initVision();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setUiHidden(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      scene.dispose();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gestureMode]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* Loader */}
      {loading && (
        <div id="loading-screen">
          <div className="spinner mb-6"></div>
          <div className="cinzel text-sm tracking-[0.3em] font-light text-[#d4af37]">LOADING HOLIDAY MAGIC</div>
        </div>
      )}

      {/* 3D Scene Container */}
      <div ref={containerRef} className="w-full h-full cursor-none" />

      {/* UI Overlay */}
      <div className={`fixed inset-0 pointer-events-none flex flex-col items-center justify-between p-16 transition-opacity duration-700 ${uiHidden ? 'ui-hidden' : ''}`}>
        
        {/* Main Title Section */}
        <div className="text-center pointer-events-auto transform translate-y-0 hover:translate-y-[-5px] transition-transform duration-500">
          <h1 className="cinzel text-[56px] leading-tight font-bold mb-4 tracking-wider">Merry Christmas</h1>
          <div className="text-[#fceea7] cinzel tracking-[0.4em] text-xs opacity-70 uppercase font-light">Ethereal Forest of Memories</div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          <div className="upload-wrapper relative">
            <label className="glass-btn cinzel px-10 py-4 cursor-pointer rounded-full inline-block font-bold text-sm tracking-widest border border-[#d4af37]/30">
              ADD MEMORIES
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleUpload}
              />
            </label>
          </div>
          <div className="text-[#fceea7] text-[10px] tracking-widest opacity-40 cinzel font-medium">
            PRESS 'H' TO HIDE INTERFACE
          </div>
        </div>
      </div>

      {/* Tracking Visualization (Optional, keeping it subtle) */}
      {!uiHidden && !loading && (
        <div className="fixed bottom-8 left-8 flex flex-col gap-3 pointer-events-none cinzel text-[10px] uppercase tracking-widest text-[#d4af37] opacity-50 bg-black/20 p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${gestureMode === SceneMode.TREE ? 'bg-green-500' : 'bg-white/20'}`}></div>
            <span>MODE: {gestureMode}</span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-[9px] text-[#fceea7] font-light">
            <span>• FIST → TREE FORMATION</span>
            <span>• OPEN → DYNAMIC SCATTER</span>
            <span>• PINCH → FOCUS MEMORY</span>
          </div>
        </div>
      )}

      {/* Hidden CV Components */}
      <div className="fixed bottom-0 right-0 w-[160px] h-[120px] opacity-0 pointer-events-none">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} width="160" height="120" />
      </div>
    </div>
  );
};

export default App;