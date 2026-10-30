import React, { useEffect, useMemo, useState } from 'react';
import { CompatibilityEngine } from './emulator/CompatibilityEngine.ts';
import { RuntimeManager } from './runtime/RuntimeManager.ts';
import { CapabilityReport } from './runtime/RuntimeManifest.ts';
import { StartupScreen } from './ui/StartupScreen.tsx';
import { CompatibilityErrorScreen } from './ui/CompatibilityErrorScreen.tsx';
import { GameCanvas } from './ui/GameCanvas.tsx';
import { TouchOverlay } from './ui/TouchOverlay.tsx';
import { SettingsModal } from './ui/SettingsModal.tsx';
import { DiagnosticsDrawer } from './ui/DiagnosticsDrawer.tsx';
import { AuthorizedContentModal } from './ui/AuthorizedContentModal.tsx';
import { DEFAULT_SETTINGS, IndexedDBStorage, PlayerSettings } from './storage/IndexedDBStorage.ts';

export default function App() {
  const [appState, setAppState] = useState<'startup' | 'incompatible' | 'game'>('startup');
  const [capabilityReport, setCapabilityReport] = useState<CapabilityReport | null>(null);

  // Settings & overlay state
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [vehicleMode, setVehicleMode] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isAuthorizedModalOpen, setIsAuthorizedModalOpen] = useState(false);

  // Singleton runtime engine & manager
  const engine = useMemo(() => new CompatibilityEngine(), []);
  const runtimeManager = useMemo(() => new RuntimeManager(engine), [engine]);

  // Load initial settings and check ?autostart=1
  useEffect(() => {
    IndexedDBStorage.getSettings().then((s) => {
      setSettings(s);
      setVehicleMode(s.vehicleMode);
    });

    // Register service worker if available
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/src/service-worker.ts').catch(() => {});
    }

    // Check autostart query parameter (for automated tests and direct access)
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setAppState('game');
    }
  }, []);

  const handleApplySettings = (updated: PlayerSettings) => {
    setSettings(updated);
    const graphics = engine.getGraphics();
    if (graphics) {
      graphics.setResolutionScale(updated.resolutionScale);
    }
  };

  return (
    <main className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans select-none text-zinc-100">
      {/* 1. STARTUP SCREEN */}
      {appState === 'startup' && (
        <StartupScreen
          runtimeManager={runtimeManager}
          onStartupComplete={() => setAppState('game')}
          onShowDiagnostics={() => setIsDiagnosticsOpen(true)}
          onShowCompatibilityDetails={(report) => {
            setCapabilityReport(report);
            setAppState('incompatible');
          }}
          onLaunchBenchmarkMode={() => setAppState('game')}
        />
      )}

      {/* 2. INCOMPATIBILITY / HONEST RESTRICTION SCREEN */}
      {appState === 'incompatible' && capabilityReport && (
        <CompatibilityErrorScreen
          report={capabilityReport}
          onBack={() => setAppState('startup')}
          onLaunchBenchmark={() => setAppState('game')}
          onMountAuthorizedFiles={() => setIsAuthorizedModalOpen(true)}
          onShowDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}

      {/* 3. ACTIVE GAME VIEWPORT */}
      {appState === 'game' && (
        <div className="relative w-full h-full">
          {/* Game Canvas (WebGPU / WebGL2) */}
          <GameCanvas
            engine={engine}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />

          {/* Touch Controls Overlay */}
          <TouchOverlay
            controller={engine.getTouchController()}
            opacity={settings.controllerOpacity}
            scale={settings.controllerScale}
            isLeftHanded={settings.swapThumbsticks}
            vehicleMode={vehicleMode}
            onToggleVehicleMode={() => setVehicleMode((prev) => !prev)}
          />
        </div>
      )}

      {/* MODALS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioManager={engine.getAudio()}
        onApplySettings={handleApplySettings}
      />

      <DiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        engine={engine}
      />

      <AuthorizedContentModal
        isOpen={isAuthorizedModalOpen}
        onClose={() => setIsAuthorizedModalOpen(false)}
        engine={engine}
        onMountSuccess={() => setAppState('game')}
      />
    </main>
  );
}
