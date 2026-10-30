import React, { useRef, useState } from 'react';
import { CompatibilityEngine, MountedAssetInfo } from '../emulator/CompatibilityEngine.ts';
import { CheckCircle2, FolderCheck, FolderOpen, HardDrive, ShieldCheck, X } from 'lucide-react';

interface AuthorizedContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: CompatibilityEngine;
  onMountSuccess: () => void;
}

export const AuthorizedContentModal: React.FC<AuthorizedContentModalProps> = ({
  isOpen,
  onClose,
  engine,
  onMountSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mountedFiles, setMountedFiles] = useState<MountedAssetInfo[]>([]);
  const [totalSizeGb, setTotalSizeGb] = useState('0.00');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasDetectedGtaExe, setHasDetectedGtaExe] = useState(false);

  if (!isOpen) return null;

  const handleDirectoryPicker = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        setIsVerifying(true);
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read',
        });

        const files: File[] = [];
        let hasExe = false;
        let totalBytes = 0;

        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'file') {
            const f = await entry.getFile();
            files.push(f);
            totalBytes += f.size;
            if (f.name.toLowerCase().includes('gta5.exe') || f.name.toLowerCase().endsWith('.rpf')) {
              hasExe = true;
            }
          }
        }

        await engine.registerUserMountedFiles(files);
        setMountedFiles(engine.getMountedAssets());
        setTotalSizeGb((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        setHasDetectedGtaExe(hasExe);
        setIsVerifying(false);
      } else {
        fileInputRef.current?.click();
      }
    } catch (e: any) {
      setIsVerifying(false);
      console.warn('Directory picking cancelled or failed:', e);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsVerifying(true);
    let totalBytes = 0;
    let hasExe = false;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      totalBytes += f.size;
      if (f.name.toLowerCase().includes('gta5.exe') || f.name.toLowerCase().endsWith('.rpf')) {
        hasExe = true;
      }
    }

    await engine.registerUserMountedFiles(fileList);
    setMountedFiles(engine.getMountedAssets());
    setTotalSizeGb((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
    setHasDetectedGtaExe(hasExe);
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">
              Mount Authorized Game Content
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-zinc-300">
          <p className="leading-relaxed text-zinc-400">
            In compliance with copyright laws, GTA V Web Player does not distribute proprietary Rockstar game archives. You can mount your legally owned PC game folder directly from your local filesystem into the browser's sandbox.
          </p>

          {/* Directory Picker Button */}
          <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-amber-500/60 transition-colors flex flex-col items-center justify-center text-center gap-3 bg-zinc-950/40">
            <FolderOpen className="w-10 h-10 text-amber-500" />
            <div>
              <div className="font-bold text-zinc-200 text-sm">Select Local GTA V Installation Folder</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Supports Steam, Epic Games, or Rockstar Games Launcher game folders
              </div>
            </div>

            <button
              type="button"
              onClick={handleDirectoryPicker}
              disabled={isVerifying}
              className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 active:scale-[0.98] mt-2"
            >
              {isVerifying ? 'Scanning Directory...' : 'Browse Local Game Directory'}
            </button>

            {/* Hidden fallback file input */}
            <input
              ref={fileInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Mounted Files Summary */}
          {mountedFiles.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200">Mounted Files:</span>
                <span className="font-mono text-amber-400 font-bold">{mountedFiles.length} files ({totalSizeGb} GB)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {hasDetectedGtaExe ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Executable / RPF archive headers detected</span>
                  </>
                ) : (
                  <>
                    <FolderCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Generic game files loaded</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onMountSuccess();
              onClose();
            }}
            disabled={mountedFiles.length === 0}
            className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition-colors"
          >
            Confirm & Mount Content
          </button>
        </div>
      </div>
    </div>
  );
};
