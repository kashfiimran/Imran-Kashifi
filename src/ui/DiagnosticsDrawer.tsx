import React, { useEffect, useState } from 'react';
import { CompatibilityEngine } from '../emulator/CompatibilityEngine.ts';
import { RuntimeLog } from '../runtime/GameRuntimeAdapter.ts';
import { Copy, Download, RefreshCw, Terminal, Trash2, X } from 'lucide-react';

interface DiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  engine: CompatibilityEngine;
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  engine,
}) => {
  const [logs, setLogs] = useState<RuntimeLog[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogs(engine.getLogs());
      const timer = setInterval(() => {
        setLogs(engine.getLogs());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, engine]);

  if (!isOpen) return null;

  const report = engine.getCapabilityReport();
  const graphicsStats = engine.getGraphics()?.getStats();

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtav-web-diagnostics-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    // Clear local array
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex justify-end overflow-hidden select-none">
      <div className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider font-mono">
              Diagnostic & Hardware Inspector
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {/* Hardware & API Status */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
              Active Hardware Subsystem
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Renderer Backend:</span>
              <span className="text-amber-400 font-bold uppercase">{graphicsStats?.backend || 'Auto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">GPU Device:</span>
              <span className="text-zinc-200">{graphicsStats?.gpuDeviceName || 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">WebGPU:</span>
              <span className={report?.hasWebGPU ? 'text-emerald-400' : 'text-zinc-500'}>
                {report?.hasWebGPU ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">WebGL2:</span>
              <span className={report?.hasWebGL2 ? 'text-emerald-400' : 'text-zinc-500'}>
                {report?.hasWebGL2 ? 'Supported' : 'Unsupported'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">WebAssembly SIMD:</span>
              <span className={report?.hasWasmSimd ? 'text-emerald-400' : 'text-zinc-500'}>
                {report?.hasWasmSimd ? 'Supported (128-bit)' : 'Scalar Only'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cross-Origin Isolated:</span>
              <span className={report?.isCrossOriginIsolated ? 'text-emerald-400' : 'text-amber-400'}>
                {report?.isCrossOriginIsolated ? 'Yes (SAB active)' : 'No (Single-thread)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">OPFS Virtual Filesystem:</span>
              <span className={report?.hasOPFS ? 'text-emerald-400' : 'text-amber-400'}>
                {report?.hasOPFS ? 'Ready' : 'Not supported'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Storage Quota:</span>
              <span className="text-zinc-200">{report?.storageEstimate?.quotaGb || 0} GB</span>
            </div>
          </div>

          {/* Real-time FPS & Frame Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">REAL FPS</div>
              <div className="text-xl font-bold text-amber-400">{graphicsStats?.fps ?? 60}</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">FRAME TIME</div>
              <div className="text-xl font-bold text-zinc-200">{graphicsStats?.frameTimeMs ?? 16.6} ms</div>
            </div>
          </div>

          {/* Real Diagnostic Log Stream */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-400 font-bold uppercase text-[10px]">
                Runtime Telemetry Stream ({logs.length})
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLogs}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            <div className="h-64 overflow-y-auto bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[10px] space-y-1">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">No telemetry events logged yet.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-tight flex gap-2">
                    <span className="text-zinc-600 shrink-0">
                      {new Date(log.timestamp).toTimeString().split(' ')[0]}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-zinc-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
