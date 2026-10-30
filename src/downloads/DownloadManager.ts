import { ChecksumValidator } from '../security/ChecksumValidator.ts';

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  status: 'idle' | 'downloading' | 'verifying' | 'completed' | 'paused' | 'failed';
  errorMessage?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export class DownloadManager {
  private abortController: AbortController | null = null;
  private isPaused = false;
  private currentProgress: DownloadProgress = {
    bytesDownloaded: 0,
    totalBytes: 0,
    percentage: 0,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    status: 'idle',
  };

  /**
   * Downloads a resource via Fetch and Streams API, tracking genuine byte counts,
   * calculating true transfer speed and ETA.
   */
  public async downloadFile(
    url: string,
    expectedSha256?: string,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    this.abortController = new AbortController();
    this.isPaused = false;

    const startTime = performance.now();
    let lastTime = startTime;
    let lastBytes = 0;

    this.currentProgress = {
      bytesDownloaded: 0,
      totalBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'downloading',
    };
    onProgress?.({ ...this.currentProgress });

    try {
      const response = await fetch(url, {
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      this.currentProgress.totalBytes = totalBytes;

      if (!response.body) {
        throw new Error('Response body is null, cannot stream download');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytesDownloaded = 0;

      while (true) {
        if (this.isPaused) {
          this.currentProgress.status = 'paused';
          onProgress?.({ ...this.currentProgress });
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          bytesDownloaded += value.length;

          const now = performance.now();
          const timeDeltaSec = (now - lastTime) / 1000;

          if (timeDeltaSec >= 0.25) {
            const bytesDelta = bytesDownloaded - lastBytes;
            const currentSpeed = bytesDelta / timeDeltaSec; // bytes per second
            const remainingBytes = Math.max(0, totalBytes - bytesDownloaded);
            const eta = currentSpeed > 0 && totalBytes > 0 ? Math.round(remainingBytes / currentSpeed) : 0;
            const percentage = totalBytes > 0 ? Math.min(100, (bytesDownloaded / totalBytes) * 100) : 0;

            this.currentProgress = {
              bytesDownloaded,
              totalBytes,
              percentage: +percentage.toFixed(1),
              speedBytesPerSec: Math.round(currentSpeed),
              etaSeconds: eta,
              status: 'downloading',
            };
            onProgress?.({ ...this.currentProgress });

            lastTime = now;
            lastBytes = bytesDownloaded;
          }
        }
      }

      // Merge chunks into a single contiguous Uint8Array
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Cryptographic Checksum verification if hash provided
      if (expectedSha256) {
        this.currentProgress.status = 'verifying';
        onProgress?.({ ...this.currentProgress });

        const matches = await ChecksumValidator.verify(combined, expectedSha256);
        if (!matches) {
          this.currentProgress.status = 'failed';
          this.currentProgress.errorMessage = 'Integrity error: Downloaded asset failed SHA-256 verification.';
          onProgress?.({ ...this.currentProgress });
          throw new Error(this.currentProgress.errorMessage);
        }
      }

      this.currentProgress.bytesDownloaded = totalLength;
      this.currentProgress.percentage = 100;
      this.currentProgress.status = 'completed';
      onProgress?.({ ...this.currentProgress });

      return combined;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.currentProgress.status = 'idle';
        this.currentProgress.errorMessage = 'Download cancelled';
      } else {
        this.currentProgress.status = 'failed';
        this.currentProgress.errorMessage = e.message || 'Network download error';
      }
      onProgress?.({ ...this.currentProgress });
      throw e;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  public getProgress(): DownloadProgress {
    return { ...this.currentProgress };
  }
}
