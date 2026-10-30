/**
 * OPFSManager provides access to the browser's Origin Private File System
 * for large virtual disks, caches, and user-mounted assets.
 */
export class OPFSManager {
  private static rootDir: FileSystemDirectoryHandle | null = null;

  public static async getRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (this.rootDir) return this.rootDir;
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
      return null;
    }
    try {
      this.rootDir = await navigator.storage.getDirectory();
      return this.rootDir;
    } catch (e) {
      console.warn('Failed to get OPFS root directory:', e);
      return null;
    }
  }

  public static async writeFile(path: string, data: ArrayBuffer | Uint8Array): Promise<boolean> {
    const root = await this.getRoot();
    if (!root) return false;

    try {
      const parts = path.split('/').filter(Boolean);
      let dir = root;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i], { create: true });
      }
      const fileName = parts[parts.length - 1];
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (e) {
      console.error(`OPFS write failed for ${path}:`, e);
      return false;
    }
  }

  public static async readFile(path: string): Promise<ArrayBuffer | null> {
    const root = await this.getRoot();
    if (!root) return null;

    try {
      const parts = path.split('/').filter(Boolean);
      let dir = root;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      const fileName = parts[parts.length - 1];
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch {
      return null;
    }
  }

  public static async listFiles(dirPath = ''): Promise<string[]> {
    const root = await this.getRoot();
    if (!root) return [];

    try {
      let targetDir = root;
      if (dirPath) {
        const parts = dirPath.split('/').filter(Boolean);
        for (const part of parts) {
          targetDir = await targetDir.getDirectoryHandle(part);
        }
      }

      const results: string[] = [];
      // Iterating via async iterator
      for await (const [name, handle] of (targetDir as any).entries()) {
        results.push(`${name} (${handle.kind})`);
      }
      return results;
    } catch {
      return [];
    }
  }

  public static async clearAll(): Promise<boolean> {
    const root = await this.getRoot();
    if (!root) return false;

    try {
      for await (const [name] of (root as any).entries()) {
        await root.removeEntry(name, { recursive: true });
      }
      return true;
    } catch (e) {
      console.error('Failed to clear OPFS:', e);
      return false;
    }
  }
}
