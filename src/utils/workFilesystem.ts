const WORKS_ROOT = "works";

async function getRoot() {
  return navigator.storage.getDirectory();
}

async function resolveDir(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  let current = root;
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create });
    } catch {
      if (!create) throw new Error(`Directory not found: ${path}`);
      throw new Error(`Cannot create directory: ${part} in ${path}`);
    }
  }
  return current;
}

export async function saveWorkImage(projectId: string, workId: string, b64: string): Promise<void> {
  const byteString = atob(b64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const dir = await resolveDir(`${WORKS_ROOT}/${projectId}`, true);
  const fileHandle = await dir.getFileHandle(`${workId}.png`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(ab);
  await writable.close();
}

export async function loadWorkImage(projectId: string, workId: string): Promise<string | null> {
  try {
    const dir = await resolveDir(`${WORKS_ROOT}/${projectId}`, false);
    const fileHandle = await dir.getFileHandle(`${workId}.png`);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export async function deleteWorkImage(projectId: string, workId: string): Promise<void> {
  try {
    const dir = await resolveDir(`${WORKS_ROOT}/${projectId}`, false);
    await dir.removeEntry(`${workId}.png`);
  } catch {
    // Already gone
  }
}

export async function deleteProjectImages(projectId: string): Promise<void> {
  try {
    const root = await getRoot();
    const worksDir = await root.getDirectoryHandle(WORKS_ROOT);
    await worksDir.removeEntry(projectId, { recursive: true });
  } catch {
    // Already gone
  }
}
