import React, { useEffect, useRef, useState } from 'react';
import { CameraMode, GraphicsPipeline, GraphicsStats, TimeOfDay } from '../graphics/GraphicsPipeline.ts';
import { CompatibilityEngine } from '../emulator/CompatibilityEngine.ts';
import { StationInfo } from '../game/RadioSynthesizer.ts';
import {
  Activity,
  Camera,
  Car,
  Compass,
  Gauge,
  Maximize2,
  Minimize2,
  Moon,
  Radio,
  Settings,
  Sun,
  Sunrise,
  Terminal,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface GameCanvasProps {
  engine: CompatibilityEngine;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onOpenSettings,
  onOpenDiagnostics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<GraphicsStats>({
    backend: 'webgl2',
    fps: 60,
    frameTimeMs: 16.6,
    resolution: { width: 1280, height: 720 },
    drawCalls: 8,
    gpuDeviceName: 'Active Renderer',
    mph: 0,
    gear: 1,
    rpm: 800,
    driftFactor: 0,
    playerX: 0,
    playerZ: 0,
    playerAngle: 0,
    timeOfDay: 'sunset',
    cameraMode: 'chase',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [radioToast, setRadioToast] = useState<StationInfo | null>(null);
  const [isOnFoot, setIsOnFoot] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engine.setCanvas(canvas);

    const initGraphicsAndStart = async () => {
      await engine.initializeGraphics();
      await engine.initializeAudio();
      await engine.initializeInput();
      await engine.startGame();

      const graphics = engine.getGraphics();
      if (graphics && containerRef.current) {
        graphics.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    initGraphicsAndStart();

    // Stats polling interval
    const statsTimer = setInterval(() => {
      const graphics = engine.getGraphics();
      if (graphics) {
        setStats(graphics.getStats());
      }
    }, 100);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const graphics = engine.getGraphics();
        if (graphics && width > 0 && height > 0) {
          graphics.resize(width, height);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearInterval(statsTimer);
      resizeObserver.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [engine]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleAudio = () => {
    const audio = engine.getAudio();
    if (isMuted) {
      audio.setVolumes(80, 70, 85);
      setIsMuted(false);
    } else {
      audio.setVolumes(0, 0, 0);
      setIsMuted(true);
    }
  };

  const handleCycleCamera = () => {
    const graphics = engine.getGraphics();
    if (graphics) {
      graphics.toggleCamera();
    }
  };

  const handleCycleTimeOfDay = () => {
    const graphics = engine.getGraphics();
    if (graphics) {
      graphics.toggleTimeOfDay();
    }
  };

  const handleCycleRadio = () => {
    const audio = engine.getAudio();
    audio.unlock();
    const info = audio.getRadio().nextStation();
    setRadioToast(info);
    setTimeout(() => setRadioToast(null), 2500);
  };

  const handleToggleOnFoot = () => {
    const graphics = engine.getGraphics();
    if (graphics) {
      const onFoot = graphics.toggleOnFoot();
      setIsOnFoot(onFoot);
    }
  };

  const handlePointerLock = () => {
    if (canvasRef.current && !document.pointerLockElement) {
      canvasRef.current.requestPointerLock?.();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* Real GPU Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handlePointerLock}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Top HUD Bar */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none z-30">
        {/* Left: Branding & Real Hardware FPS Counter */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono backdrop-blur-md flex items-center gap-2 shadow-md">
            <span className="font-bold text-amber-500">FREE EDITION</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300 font-bold">{stats.fps} FPS</span>
            <span className="text-zinc-500">{stats.frameTimeMs}ms</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 uppercase">{stats.backend}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHUD(!showHUD)}
            className="p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs backdrop-blur-md transition-colors"
            title="Toggle Detailed Telemetry"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: In-Car Radio Station Toast Notification */}
        {radioToast && (
          <div className="px-4 py-1.5 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 animate-bounce">
            <Radio className="w-3.5 h-3.5" />
            <span>{radioToast.name} ({radioToast.genre})</span>
          </div>
        )}

        {/* Right Quick Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Radio Switcher */}
          <button
            type="button"
            onClick={handleCycleRadio}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-amber-400 backdrop-blur-md transition-colors"
            title="Switch Radio Station"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Time of Day */}
          <button
            type="button"
            onClick={handleCycleTimeOfDay}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-amber-400 backdrop-blur-md transition-colors"
            title="Change Time of Day (Sunset / Night / Day)"
          >
            {stats.timeOfDay === 'sunset' ? (
              <Sunrise className="w-4 h-4 text-amber-400" />
            ) : stats.timeOfDay === 'night' ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-400" />
            )}
          </button>

          {/* Camera View Switcher */}
          <button
            type="button"
            onClick={handleCycleCamera}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-amber-400 backdrop-blur-md transition-colors"
            title="Switch Camera (Chase / Far / Cockpit)"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Step in / out vehicle */}
          <button
            type="button"
            onClick={handleToggleOnFoot}
            className={`p-2 rounded-xl border backdrop-blur-md transition-colors ${
              isOnFoot ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
            }`}
            title={isOnFoot ? 'Enter Vehicle (Nearby)' : 'Exit Vehicle (On Foot)'}
          >
            {isOnFoot ? <User className="w-4 h-4" /> : <Car className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 backdrop-blur-md transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 backdrop-blur-md transition-colors"
            title="Diagnostics"
          >
            <Terminal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 backdrop-blur-md transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 backdrop-blur-md transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Extended Telemetry overlay */}
      {showHUD && (
        <div className="absolute top-12 left-2 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 backdrop-blur-md pointer-events-none z-20 space-y-0.5">
          <div>DEVICE: <span className="text-zinc-200">{stats.gpuDeviceName}</span></div>
          <div>MODE: <span className="text-amber-400 font-bold uppercase">{stats.cameraMode} CAM</span> | <span className="text-zinc-200 uppercase">{stats.timeOfDay}</span></div>
          <div>COORDS: <span className="text-zinc-200">X:{stats.playerX} Z:{stats.playerZ}</span></div>
          <div className="text-[9px] text-zinc-500 mt-1">WASD / Touch Pedals • Space / Drift • Y: Exit Vehicle</div>
        </div>
      )}

      {/* BOTTOM LEFT: GTA-STYLE MINI-MAP RADAR */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-950/85 border-2 border-zinc-700/80 overflow-hidden backdrop-blur-md shadow-2xl flex items-center justify-center">
          {/* Compass Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-zinc-600/40" />
          
          {/* Rotating Street Radar Grid */}
          <div
            className="absolute w-48 h-48 border border-zinc-800/80 grid grid-cols-4 grid-rows-4 transition-transform duration-75"
            style={{
              transform: `rotate(${-stats.playerAngle}rad) translate(${-((stats.playerX % 40) / 4)}px, ${-((stats.playerZ % 40) / 4)}px)`,
            }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-zinc-800/60 bg-zinc-900/30" />
            ))}
          </div>

          {/* Player Arrow Marker */}
          <div className="relative z-10 w-4 h-4 flex items-center justify-center">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-amber-400 drop-shadow-md" />
          </div>

          {/* North indicator */}
          <div
            className="absolute top-1 text-[9px] font-bold text-rose-500 font-mono transition-transform duration-75"
            style={{ transform: `rotate(${-stats.playerAngle}rad)` }}
          >
            N
          </div>
        </div>

        {/* Health & Armor bar below radar */}
        <div className="w-28 sm:w-32 mt-1.5 space-y-1">
          {/* Health Bar (Green) */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="w-full h-full bg-emerald-500" />
          </div>
          {/* Armor Bar (Blue) */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="w-3/4 h-full bg-blue-500" />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: SPEEDOMETER & GEAR HUD */}
      {!isOnFoot && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end">
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/85 border border-zinc-800 backdrop-blur-md shadow-2xl flex items-center gap-3">
            {/* Gear Indicator */}
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex flex-col items-center justify-center shadow-inner">
              <span className="text-[8px] font-mono text-zinc-500 uppercase">GEAR</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {stats.gear === -1 ? 'R' : stats.gear}
              </span>
            </div>

            {/* MPH Digital Speed */}
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-100 leading-none">
                {stats.mph}
              </div>
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase mt-0.5">
                MPH
              </div>
            </div>

            {/* RPM Gauge */}
            <div className="flex flex-col gap-0.5 h-10 justify-end">
              <div className="w-2 h-10 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 flex flex-col justify-end p-0.5">
                <div
                  className={`w-full rounded-full transition-all duration-75 ${
                    stats.rpm > 5500 ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ height: `${Math.min(100, (stats.rpm / 7000) * 100)}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-zinc-500">RPM</span>
            </div>
          </div>

          {/* Drift bonus badge if sliding */}
          {stats.driftFactor > 0.25 && (
            <div className="mt-1.5 px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider animate-pulse font-mono shadow-lg">
              DRIFT {Math.round(stats.driftFactor * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};
