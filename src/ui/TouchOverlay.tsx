import React, { useRef, useState } from 'react';
import { TouchController } from '../input/TouchController.ts';
import { Car, Compass, Gamepad2, Map, Pause, Play } from 'lucide-react';

interface TouchOverlayProps {
  controller: TouchController;
  opacity?: number; // 0 to 100
  scale?: number; // 0.7 to 1.3
  isLeftHanded?: boolean;
  vehicleMode?: boolean;
  onToggleVehicleMode?: () => void;
}

export const TouchOverlay: React.FC<TouchOverlayProps> = ({
  controller,
  opacity = 75,
  scale = 1.0,
  isLeftHanded = false,
  vehicleMode = false,
  onToggleVehicleMode,
}) => {
  const leftStickRef = useRef<HTMLDivElement | null>(null);
  const rightStickRef = useRef<HTMLDivElement | null>(null);

  const [leftStickPos, setLeftStickPos] = useState({ x: 0, y: 0 });
  const [rightStickPos, setRightStickPos] = useState({ x: 0, y: 0 });

  // Multi-touch tracking for left thumbstick
  const handleLeftTouchMove = (e: React.TouchEvent) => {
    if (!leftStickRef.current) return;
    const rect = leftStickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = e.targetTouches[0];
    if (!touch) return;

    const maxRadius = rect.width / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;

    setLeftStickPos({ x: normX * 30, y: normY * 30 });
    controller.setLeftStick(normX, normY);
  };

  const handleLeftTouchEnd = () => {
    setLeftStickPos({ x: 0, y: 0 });
    controller.setLeftStick(0, 0);
  };

  // Multi-touch tracking for right camera thumbstick
  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (!rightStickRef.current) return;
    const rect = rightStickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = e.targetTouches[0];
    if (!touch) return;

    const maxRadius = rect.width / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;

    setRightStickPos({ x: normX * 30, y: normY * 30 });
    controller.setRightStick(normX, normY);
  };

  const handleRightTouchEnd = () => {
    setRightStickPos({ x: 0, y: 0 });
    controller.setRightStick(0, 0);
  };

  const alpha = opacity / 100;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-6 overflow-hidden select-none"
      style={{ opacity: alpha }}
    >
      {/* Top Center System Buttons */}
      <div className="flex justify-center items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onTouchStart={() => controller.setButton('select', true)}
          onTouchEnd={() => controller.setButton('select', false)}
          onMouseDown={() => controller.setButton('select', true)}
          onMouseUp={() => controller.setButton('select', false)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 text-[10px] font-mono uppercase tracking-wider shadow-lg active:bg-amber-500 active:text-zinc-950 flex items-center gap-1.5"
        >
          <Map className="w-3 h-3 text-amber-400" />
          Map
        </button>

        {onToggleVehicleMode && (
          <button
            type="button"
            onClick={onToggleVehicleMode}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-colors ${
              vehicleMode
                ? 'bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-300'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            {vehicleMode ? 'Vehicle Mode' : 'On Foot'}
          </button>
        )}

        <button
          type="button"
          onTouchStart={() => controller.setButton('pause', true)}
          onTouchEnd={() => controller.setButton('pause', false)}
          onMouseDown={() => controller.setButton('pause', true)}
          onMouseUp={() => controller.setButton('pause', false)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 text-[10px] font-mono uppercase tracking-wider shadow-lg active:bg-amber-500 active:text-zinc-950 flex items-center gap-1.5"
        >
          <Pause className="w-3 h-3 text-amber-400" />
          Pause
        </button>
      </div>

      {/* Shoulder Bumpers / Triggers (Top Left & Top Right) */}
      <div className={`flex justify-between items-center pointer-events-auto w-full px-2 ${isLeftHanded ? 'flex-row-reverse' : ''}`}>
        <div className="flex gap-2">
          <button
            type="button"
            onTouchStart={() => controller.setButton('lt', true)}
            onTouchEnd={() => controller.setButton('lt', false)}
            onMouseDown={() => controller.setButton('lt', true)}
            onMouseUp={() => controller.setButton('lt', false)}
            className="w-12 h-10 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-bold shadow-lg active:bg-amber-500 active:text-zinc-950"
          >
            LT
          </button>
          <button
            type="button"
            onTouchStart={() => controller.setButton('lb', true)}
            onTouchEnd={() => controller.setButton('lb', false)}
            onMouseDown={() => controller.setButton('lb', true)}
            onMouseUp={() => controller.setButton('lb', false)}
            className="w-12 h-10 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-bold shadow-lg active:bg-amber-500 active:text-zinc-950"
          >
            LB
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onTouchStart={() => controller.setButton('rb', true)}
            onTouchEnd={() => controller.setButton('rb', false)}
            onMouseDown={() => controller.setButton('rb', true)}
            onMouseUp={() => controller.setButton('rb', false)}
            className="w-12 h-10 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-bold shadow-lg active:bg-amber-500 active:text-zinc-950"
          >
            RB
          </button>
          <button
            type="button"
            onTouchStart={() => controller.setButton('rt', true)}
            onTouchEnd={() => controller.setButton('rt', false)}
            onMouseDown={() => controller.setButton('rt', true)}
            onMouseUp={() => controller.setButton('rt', false)}
            className="w-12 h-10 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-bold shadow-lg active:bg-amber-500 active:text-zinc-950"
          >
            RT
          </button>
        </div>
      </div>

      {/* Main Bottom Section: Left Thumbstick vs Right Buttons / Camera */}
      <div
        className={`flex justify-between items-end pointer-events-auto pb-4 ${
          isLeftHanded ? 'flex-row-reverse' : ''
        }`}
        style={{ transform: `scale(${scale})`, transformOrigin: 'bottom' }}
      >
        {/* Left Side: Analog Thumbstick or Vehicle Steer */}
        {!vehicleMode ? (
          <div className="relative">
            <div
              ref={leftStickRef}
              onTouchMove={handleLeftTouchMove}
              onTouchEnd={handleLeftTouchEnd}
              onTouchCancel={handleLeftTouchEnd}
              className="relative w-32 h-32 rounded-full bg-zinc-900/80 border-2 border-zinc-700/80 flex items-center justify-center backdrop-blur-md shadow-2xl touch-none"
            >
              {/* Center nub */}
              <div
                className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 border border-amber-300/40 shadow-xl transition-transform ease-out"
                style={{
                  transform: `translate(${leftStickPos.x}px, ${leftStickPos.y}px)`,
                }}
              />
            </div>
            <div className="text-[10px] font-mono text-zinc-400 text-center mt-1 uppercase tracking-wider">
              MOVE
            </div>
          </div>
        ) : (
          /* Vehicle Mode Left: Left / Right Steering Buttons */
          <div className="flex gap-2">
            <button
              type="button"
              onTouchStart={() => controller.setButton('steerLeft', true)}
              onTouchEnd={() => controller.setButton('steerLeft', false)}
              onMouseDown={() => controller.setButton('steerLeft', true)}
              onMouseUp={() => controller.setButton('steerLeft', false)}
              className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 text-lg font-bold shadow-xl active:bg-amber-500 active:text-zinc-950"
            >
              ◀
            </button>
            <button
              type="button"
              onTouchStart={() => controller.setButton('steerRight', true)}
              onTouchEnd={() => controller.setButton('steerRight', false)}
              onMouseDown={() => controller.setButton('steerRight', true)}
              onMouseUp={() => controller.setButton('steerRight', false)}
              className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 text-lg font-bold shadow-xl active:bg-amber-500 active:text-zinc-950"
            >
              ▶
            </button>
          </div>
        )}

        {/* Right Side: Action Diamond (A, B, X, Y) or Vehicle Pedals */}
        {!vehicleMode ? (
          <div className="relative flex flex-col items-center">
            {/* Diamond layout for A B X Y */}
            <div className="relative w-36 h-36">
              {/* Y Button (Top) */}
              <button
                type="button"
                onTouchStart={() => controller.setButton('buttonY', true)}
                onTouchEnd={() => controller.setButton('buttonY', false)}
                onMouseDown={() => controller.setButton('buttonY', true)}
                onMouseUp={() => controller.setButton('buttonY', false)}
                className="absolute top-0 left-12 w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 font-bold text-sm shadow-xl flex items-center justify-center active:bg-amber-500 active:text-zinc-950"
              >
                Y
              </button>

              {/* X Button (Left) */}
              <button
                type="button"
                onTouchStart={() => controller.setButton('buttonX', true)}
                onTouchEnd={() => controller.setButton('buttonX', false)}
                onMouseDown={() => controller.setButton('buttonX', true)}
                onMouseUp={() => controller.setButton('buttonX', false)}
                className="absolute top-12 left-0 w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500/60 text-blue-300 font-bold text-sm shadow-xl flex items-center justify-center active:bg-blue-500 active:text-zinc-950"
              >
                X
              </button>

              {/* B Button (Right) */}
              <button
                type="button"
                onTouchStart={() => controller.setButton('buttonB', true)}
                onTouchEnd={() => controller.setButton('buttonB', false)}
                onMouseDown={() => controller.setButton('buttonB', true)}
                onMouseUp={() => controller.setButton('buttonB', false)}
                className="absolute top-12 right-0 w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500/60 text-rose-300 font-bold text-sm shadow-xl flex items-center justify-center active:bg-rose-500 active:text-zinc-950"
              >
                B
              </button>

              {/* A Button (Bottom) */}
              <button
                type="button"
                onTouchStart={() => controller.setButton('buttonA', true)}
                onTouchEnd={() => controller.setButton('buttonA', false)}
                onMouseDown={() => controller.setButton('buttonA', true)}
                onMouseUp={() => controller.setButton('buttonA', false)}
                className="absolute bottom-0 left-12 w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-300 font-bold text-sm shadow-xl flex items-center justify-center active:bg-emerald-500 active:text-zinc-950"
              >
                A
              </button>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 text-center mt-1 uppercase tracking-wider">
              ACTIONS
            </div>
          </div>
        ) : (
          /* Vehicle Mode Right: Accelerate, Brake, Handbrake */
          <div className="flex items-end gap-3">
            <button
              type="button"
              onTouchStart={() => controller.setButton('handbrake', true)}
              onTouchEnd={() => controller.setButton('handbrake', false)}
              onMouseDown={() => controller.setButton('handbrake', true)}
              onMouseUp={() => controller.setButton('handbrake', false)}
              className="w-12 h-14 rounded-xl bg-zinc-900/90 border border-zinc-700 text-amber-400 font-mono text-xs font-bold shadow-xl active:bg-amber-500 active:text-zinc-950"
            >
              E-BRAKE
            </button>
            <button
              type="button"
              onTouchStart={() => controller.setButton('brake', true)}
              onTouchEnd={() => controller.setButton('brake', false)}
              onMouseDown={() => controller.setButton('brake', true)}
              onMouseUp={() => controller.setButton('brake', false)}
              className="w-14 h-20 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 font-mono text-xs font-bold shadow-xl active:bg-rose-500 active:text-zinc-950 flex flex-col items-center justify-center"
            >
              <span>BRAKE</span>
              <span className="text-[10px]">▼</span>
            </button>
            <button
              type="button"
              onTouchStart={() => controller.setButton('accelerate', true)}
              onTouchEnd={() => controller.setButton('accelerate', false)}
              onMouseDown={() => controller.setButton('accelerate', true)}
              onMouseUp={() => controller.setButton('accelerate', false)}
              className="w-14 h-24 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 font-mono text-xs font-bold shadow-xl active:bg-emerald-500 active:text-zinc-950 flex flex-col items-center justify-center"
            >
              <span>GAS</span>
              <span className="text-[10px]">▲</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
