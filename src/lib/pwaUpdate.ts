type UpdateListener = () => void;

let updateAvailable = false;
let applyUpdate: (() => Promise<void>) | null = null;
const listeners = new Set<UpdateListener>();

export function hasPwaUpdate(): boolean {
  return updateAvailable;
}

export function subscribeToPwaUpdate(listener: UpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportPwaUpdateAvailable(): void {
  if (updateAvailable) return;
  updateAvailable = true;
  listeners.forEach((listener) => listener());
}

export function configurePwaUpdate(apply: () => Promise<void>): void {
  applyUpdate = apply;
}

export async function applyPwaUpdate(): Promise<void> {
  await applyUpdate?.();
}
