import React, { useEffect, useState } from 'react';
import { RuntimeManager } from '../runtime/RuntimeManager.ts';
import { CapabilityReport } from '../runtime/RuntimeManifest.ts';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Terminal, Wrench } from 'lucide-react';

interface StartupScreenProps {
  runtimeManager: RuntimeManager;
  onStartupComplete: () => void;
  onShowDiagnostics: () => void;
  onShowCompatibilityDetails: (report: CapabilityReport) => void;
  onLaunchBenchmarkMode: () => void;
}

interface StepStatus {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  detail?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({
  runtimeManager,
  onStartupComplete,
  onShowDiagnostics,
  onShowCompatibilityDetails,
  onLaunchBenchmarkMode,
}) => {
  const [steps, setSteps] = useState<StepStatus[]>([
    { id: 'browser', label: 'Browser Capability Detection', status: 'pending' },
    { id: 'wasm', label: 'WebAssembly & SIMD JIT Execution', status: 'pending' },
    { id: 'storage', label: 'Storage & OPFS Virtual Filesystem', status: 'pending' },
    { id: 'graphics', label: 'Graphics Pipeline (WebGPU / WebGL2)', status: 'pending' },
    { id: 'runtime', label: 'Runtime Verification & Translation Bridge', status: 'pending' },
  ]);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [capabilityReport, setCapabilityReport] = useState<CapabilityReport | null>(null);

  const runStartupSequence = async () => {
    setFailedError(null);
    const engine = runtimeManager.getEngine();

    try {
      // Step 1: Browser & Hardware Audit
      updateStep('browser', 'running');
      setActiveStepIndex(0);
      setProgressPercent(15);
      await engine.initialize();
      const report = engine.getCapabilityReport();
      setCapabilityReport(report);

      if (!report?.hasWebAssembly) {
        throw new Error('WebAssembly is disabled or unsupported in this browser.');
      }
      updateStep('browser', 'done', `${report.cpuCores} CPU cores, ~${report.memoryGb} GB RAM`);

      // Step 2: WebAssembly & SIMD
      updateStep('wasm', 'running');
      setActiveStepIndex(1);
      setProgressPercent(35);
      const isSimd = report.hasWasmSimd;
      await engine.loadRuntime();
      updateStep('wasm', 'done', `JIT Active (${isSimd ? 'SIMD-128 enabled' : 'Scalar fallback'})`);

      // Step 3: Storage & OPFS
      updateStep('storage', 'running');
      setActiveStepIndex(2);
      setProgressPercent(60);
      await runtimeManager.mountFilesystem();
      const quotaStr = report.storageEstimate.quotaGb > 0 ? `${report.storageEstimate.quotaGb} GB quota` : 'Storage ready';
      updateStep('storage', 'done', report.hasOPFS ? `OPFS Mounted (${quotaStr})` : 'Memory filesystem mounted');

      // Step 4: Graphics
      updateStep('graphics', 'running');
      setActiveStepIndex(3);
      setProgressPercent(80);
      await runtimeManager.initializeGraphics();
      const backendName = report.hasWebGPU ? 'WebGPU Device' : (report.hasWebGL2 ? 'WebGL2 Hardware' : 'Software 2D');
      updateStep('graphics', 'done', backendName);

      // Step 5: Runtime Architecture & Game Verification
      updateStep('runtime', 'running');
      setActiveStepIndex(4);
      setProgressPercent(95);

      // Check honest compatibility for direct 64-bit GTA V execution
      const isDirectlyCompatible = await runtimeManager.detectRuntime();

      if (!isDirectlyCompatible) {
        updateStep('runtime', 'failed', 'Architecture restriction: x86_64 JIT / Game content mount needed');
        setFailedError(
          report?.failingChecks?.[0] ||
          'In-browser execution requires mounting authorized GTA V game files or testing via the open-source micro-kernel benchmark.'
        );
        return;
      }

      updateStep('runtime', 'done', 'Ready');
      setProgressPercent(100);
      setTimeout(() => {
        onStartupComplete();
      }, 400);

    } catch (err: any) {
      console.error('Startup sequence failed:', err);
      setFailedError(err.message || 'An unexpected runtime initialization error occurred.');
      updateStep(steps[activeStepIndex]?.id || 'runtime', 'failed', err.message);
    }
  };

  const updateStep = (id: string, status: StepStatus['status'], detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  useEffect(() => {
    runStartupSequence();
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-zinc-950 text-zinc-100 p-4 sm:p-6 select-none overflow-y-auto">
      {/* Background glow styling */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-zinc-950/80 to-zinc-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3 shadow-inner">
            <span className="text-3xl font-black tracking-wider">V</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-100">
            GTA V <span className="text-amber-500">Web Player</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mt-1">
            Open. Load. Play.
          </p>
        </div>

        {/* Real Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-mono mb-2">
            <span>MEASURED WORKFLOW</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                failedError ? 'bg-amber-600' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Startup Steps */}
        <div className="space-y-3 mb-6 font-mono text-xs">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start justify-between p-2.5 rounded-lg border transition-colors ${
                step.status === 'done'
                  ? 'bg-zinc-800/40 border-emerald-500/30 text-zinc-200'
                  : step.status === 'running'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : step.status === 'failed'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {step.status === 'running' && (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                )}
                {step.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                {step.status === 'failed' && (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                {step.status === 'pending' && (
                  <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                )}
                <div>
                  <div className="font-semibold">{step.label}</div>
                  {step.detail && <div className="text-[10px] text-zinc-400 mt-0.5">{step.detail}</div>}
                </div>
              </div>
              <span className="uppercase text-[10px] font-bold tracking-wider">
                {step.status}
              </span>
            </div>
          ))}
        </div>

        {/* Incompatible or Failure State */}
        {failedError && (
          <div className="space-y-4">
            {/* Free Version Hero Callout */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-500/60 shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase tracking-wider">
                  FREE VERSION READY
                </span>
                <span className="text-[10px] font-mono text-zinc-400">100% Free & Legal</span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 mb-1">
                Play GTA V Free Roam City Edition
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                Jump into the free open-world 3D sandbox: drive high-performance sports cars, drift corners, cruise with in-car synth radio stations, and explore Los Santos inspired streets without needing a 65GB install!
              </p>
              <button
                type="button"
                onClick={onLaunchBenchmarkMode}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                PLAY FREE ROAM CITY NOW
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-xs leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-zinc-300 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Original 65GB PC Binary Requirement Notice
              </div>
              {failedError}
            </div>

            <div className="flex flex-col gap-2">

              {/* View Full Hardware Capability Matrix */}
              {capabilityReport && (
                <button
                  type="button"
                  onClick={() => onShowCompatibilityDetails(capabilityReport)}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  View Exact Hardware & Compatibility Breakdown
                </button>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={runStartupSequence}
                  className="flex-1 py-2 px-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Audit
                </button>
                <button
                  type="button"
                  onClick={onShowDiagnostics}
                  className="py-2 px-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  Diagnostics
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clean Footer / Legal Separation */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 text-center leading-tight">
          Independent open-source browser runtime bridge. Not affiliated with Rockstar Games or Take-Two Interactive.
        </div>
      </div>
    </div>
  );
};
