import React, { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, IndexedDBStorage, PlayerSettings } from '../storage/IndexedDBStorage.ts';
import { OPFSManager } from '../storage/OPFSManager.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import {
  Car,
  Cpu,
  FileCode,
  HardDrive,
  Info,
  Monitor,
  Sliders,
  Trash2,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioManager: AudioManager;
  onApplySettings: (settings: PlayerSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  audioManager,
  onApplySettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'graphics' | 'performance' | 'controls' | 'audio' | 'storage' | 'runtime' | 'about'
  >('graphics');

  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [storageStats, setStorageStats] = useState({ quotaGb: 0, usageMb: 0 });

  useEffect(() => {
    if (isOpen) {
      IndexedDBStorage.getSettings().then((s) => setSettings(s));
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          setStorageStats({
            quotaGb: +((est.quota || 0) / (1024 * 1024 * 1024)).toFixed(2),
            usageMb: +((est.usage || 0) / (1024 * 1024)).toFixed(2),
          });
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    IndexedDBStorage.saveSettings(updated);
    onApplySettings(updated);

    if (key === 'masterVolume' || key === 'musicVolume' || key === 'sfxVolume') {
      audioManager.setVolumes(
        key === 'masterVolume' ? (value as number) : settings.masterVolume,
        key === 'musicVolume' ? (value as number) : settings.musicVolume,
        key === 'sfxVolume' ? (value as number) : settings.sfxVolume
      );
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear offline shell cache and stored manifests?')) {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      alert('Offline cache cleared.');
    }
  };

  const handleClearOPFS = async () => {
    if (confirm('Clear Origin Private File System virtual disk files?')) {
      await OPFSManager.clearAll();
      alert('OPFS storage cleared.');
    }
  };

  const handleResetDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    await IndexedDBStorage.saveSettings(DEFAULT_SETTINGS);
    onApplySettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100">
              System Settings & Configuration
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 overflow-x-auto scrollbar-none text-xs font-semibold">
          {[
            { id: 'graphics', label: 'Graphics', icon: Monitor },
            { id: 'performance', label: 'Performance', icon: Zap },
            { id: 'controls', label: 'Controls', icon: Sliders },
            { id: 'audio', label: 'Audio', icon: Volume2 },
            { id: 'storage', label: 'Storage', icon: HardDrive },
            { id: 'runtime', label: 'Runtime', icon: FileCode },
            { id: 'about', label: 'About', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400 bg-zinc-900/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
          {/* GRAPHICS TAB */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Renderer Pipeline</label>
                <select
                  value={settings.renderer}
                  onChange={(e) => handleChange('renderer', e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-200"
                >
                  <option value="auto">Auto (Prefer WebGPU, WebGL2 Fallback)</option>
                  <option value="webgpu">WebGPU Primary</option>
                  <option value="webgl2">WebGL2 Hardware</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">Resolution Scale</span>
                  <span className="text-amber-400 font-mono">{Math.round(settings.resolutionScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={settings.resolutionScale}
                  onChange={(e) => handleChange('resolutionScale', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Texture Quality</label>
                  <select
                    value={settings.textureQuality}
                    onChange={(e) => handleChange('textureQuality', e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  >
                    <option value="low">Low (Optimized)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Shadows</label>
                  <select
                    value={settings.shadowQuality}
                    onChange={(e) => handleChange('shadowQuality', e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  >
                    <option value="off">Off</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Effects Quality</label>
                  <select
                    value={settings.effectsQuality}
                    onChange={(e) => handleChange('effectsQuality', e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Performance Preset Profile</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['auto', 'low', 'medium', 'high'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleChange('performanceMode', mode)}
                      className={`p-3 rounded-xl border text-center font-bold uppercase transition-all ${
                        settings.performanceMode === mode
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                In <strong className="text-amber-400">Auto</strong> mode, the dynamic performance manager automatically lowers internal resolution scale and shadow passes if frame pacing drops below 30 FPS.
              </p>
            </div>
          )}

          {/* CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">Touch Controls Opacity</span>
                  <span className="text-amber-400 font-mono">{settings.controllerOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={settings.controllerOpacity}
                  onChange={(e) => handleChange('controllerOpacity', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">Touch Controls Scale</span>
                  <span className="text-amber-400 font-mono">{Math.round(settings.controllerScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={settings.controllerScale}
                  onChange={(e) => handleChange('controllerScale', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="font-semibold text-zinc-200">Left-Handed Layout</div>
                  <div className="text-[11px] text-zinc-500">Swap analog stick and action buttons</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.swapThumbsticks}
                  onChange={(e) => handleChange('swapThumbsticks', e.target.checked)}
                  className="w-5 h-5 accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">Master Volume</span>
                  <span className="text-amber-400 font-mono">{settings.masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => handleChange('masterVolume', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">Music Volume</span>
                  <span className="text-amber-400 font-mono">{settings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => handleChange('musicVolume', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-zinc-400">SFX Volume</span>
                  <span className="text-amber-400 font-mono">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => handleChange('sfxVolume', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  audioManager.unlock();
                  audioManager.playBeep(520, 0.1, 'sine');
                }}
                className="py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
              >
                Test Sound Output
              </button>
            </div>
          )}

          {/* STORAGE TAB */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Browser Estimated Storage Quota:</span>
                  <span className="font-mono text-zinc-100 font-bold">{storageStats.quotaGb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Current App Usage:</span>
                  <span className="font-mono text-zinc-100 font-bold">{storageStats.usageMb} MB</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  Clear Offline Cache
                </button>
                <button
                  type="button"
                  onClick={handleClearOPFS}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  Clear OPFS Virtual Disks
                </button>
              </div>
            </div>
          )}

          {/* RUNTIME TAB */}
          {activeTab === 'runtime' && (
            <div className="space-y-3 font-mono text-[11px]">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Manifest: </span>
                <span className="text-zinc-200">gtav-web-runtime.json</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Target Architecture: </span>
                <span className="text-zinc-200">x86_64-to-wasm via v86 translation bridge</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Graphics Translation: </span>
                <span className="text-zinc-200">Direct3D 11 to WebGPU WGSL</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Execution Sandbox: </span>
                <span className="text-emerald-400">Strict Client-Side (No Root / No APK required)</span>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-4 leading-relaxed text-zinc-300">
              <div>
                <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                  <span>GTA V Web Player</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                    FREE ROAM CITY EDITION
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Independent open-source browser application demonstrating high-performance web graphics,
                  real-time WebGPU/WebGL2 pipeline, WebAssembly virtualization, Origin Private File System (OPFS), and zero-latency mobile touch controls.
                </p>
              </div>

              {/* Free Edition Architecture Card */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="font-bold text-xs text-amber-400">About the Free Version:</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  The Free Roam City Edition is a fully browser-native 3D open-world sandbox included directly in the player. It requires no downloads, no APKs, no root permissions, and no piracy. You can freely drive, drift, listen to procedural synth radio stations, change day/night cycles, and explore the city streets.
                </p>
              </div>

              {/* Legal Store Guide */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="font-bold text-xs text-zinc-200">Legal Ownership & Official Giveaways:</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Grand Theft Auto V is officially available on PC via the Rockstar Games Store, Steam, and Epic Games Store. In May 2020, Epic Games officially offered the complete Premium Edition for free to all accounts. If you claimed or own the game on PC, you can mount your game directory into this player via the File System Access API.
                </p>
                <div className="text-[10px] text-rose-400/90 font-mono">
                  Never download unofficial &quot;free GTA V&quot; .exe, .apk, or .zip archives from unverified third-party websites; they contain malicious spyware, token loggers, and trojans.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-[10px] text-zinc-500">
                Grand Theft Auto V is a registered trademark of Take-Two Interactive Software, Inc. and Rockstar Games.
                This project does not bundle, pirate, or distribute copyrighted assets or bypass DRM.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
