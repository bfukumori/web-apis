import { z } from 'zod';
import { enqueueItem } from './db';

// --- Service Worker & Fila Offline ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => console.log('[Main] SW registrado com sucesso:', reg.scope))
    .catch((err) => console.error('[Main] Falha ao registrar SW:', err));
}

const form = document.querySelector<HTMLFormElement>('#inspection-form')!;
const statusEl = document.querySelector<HTMLParagraphElement>('#queue-status')!;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const notes = document.querySelector<HTMLInputElement>('#notes')!.value;

  await enqueueItem({
    id: crypto.randomUUID(),
    endpoint: 'https://httpbin.org/post',
    notes,
    photoBlob: new Blob(['foto-simulada'], { type: 'text/plain' }),
    status: 'pending',
    createdAt: Date.now(),
  });

  statusEl.textContent = 'Salvo no IndexedDB! Veja na aba Application do DevTools.';
  form.reset();
});

// --- Web Worker vs Main Thread ---
const worker = new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' });
const fileInput = document.querySelector<HTMLInputElement>('#file-input')!;
const hashOutput = document.querySelector<HTMLParagraphElement>('#hash-output')!;
const spinnerEl = document.querySelector<HTMLElement>('#fps-spinner')!;

worker.onerror = (err) => {
  console.error('[Worker Error]', err);
  hashOutput.textContent = 'Erro ao executar o Web Worker.';
};

let framesInSecond = 0;
let lastSecondTimestamp = performance.now();

function measureFPS(now: number): void {
  framesInSecond++;
  if (now - lastSecondTimestamp >= 1000) {
    const fps = Math.round((framesInSecond * 1000) / (now - lastSecondTimestamp));
    spinnerEl.textContent = `${fps} FPS (UI livre)`;
    framesInSecond = 0;
    lastSecondTimestamp = now;
  }
  requestAnimationFrame(measureFPS);
}
requestAnimationFrame(measureFPS);

function heavyCpuTask(buffer: ArrayBuffer): number {
  const bytes = new Uint8Array(buffer);
  let checksum = 0;
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < bytes.length; i++) {
      checksum = (checksum + bytes[i] * 31) % 1_000_000_007;
    }
  }
  return checksum;
}

const WorkerResponseSchema = z.object({
  result: z.number(),
  elapsed: z.string(),
  buffer: z.instanceof(ArrayBuffer),
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  hashOutput.textContent = `Arquivo pronto: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB). Escolha onde processar.`;
});

document.querySelector('#btn-worker')!.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  hashOutput.textContent = 'Processando no Web Worker (UI fluida)...';
  const buffer = await file.arrayBuffer();

  worker.onmessage = (e: MessageEvent<unknown>) => {
    const parsed = WorkerResponseSchema.safeParse(e.data);
    if (!parsed.success) {
      hashOutput.textContent = 'Resposta inválida recebida do Worker.';
      return;
    }

    const { result, elapsed } = parsed.data;
    hashOutput.textContent = `[Web Worker] Checksum: ${result} em ${elapsed}ms (UI manteve FPS estável!)`;
  };

  worker.postMessage({ buffer }, [buffer]);
});

document.querySelector('#btn-main')!.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  hashOutput.textContent = 'Processando na Main Thread... (tente rolar a página ou clicar!)';
  await new Promise((r) => setTimeout(r, 50));

  const start = performance.now();
  const buffer = await file.arrayBuffer();
  const result = heavyCpuTask(buffer);
  const elapsed = (performance.now() - start).toFixed(0);

  hashOutput.textContent = `[Main Thread] Checksum: ${result} em ${elapsed}ms (UI congelou durante esse tempo!)`;
});

// --- Intersection Observer ---
const list = document.querySelector<HTMLUListElement>('#item-list')!;
const sentinel = document.querySelector<HTMLDivElement>('#sentinel')!;
let count = 0;

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      for (let i = 0; i < 10; i++) {
        const li = document.createElement('li');
        li.textContent = `Registro #${++count}`;
        list.appendChild(li);
      }
    }
  },
  { root: document.querySelector('#scroll-box'), threshold: 0.1 }
);
observer.observe(sentinel);

// --- Geolocation API ---
const geoOutput = document.querySelector<HTMLParagraphElement>('#geo-output')!;
document.querySelector('#btn-geo')!.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    geoOutput.textContent = 'Geolocation não suportada neste navegador.';
    return;
  }

  geoOutput.textContent = 'Solicitando permissão e posição...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      geoOutput.textContent = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)} (Precisão: ~${Math.round(accuracy)}m)`;
    },
    (err) => {
      geoOutput.textContent = `Erro (${err.code}): ${err.message}`;
    },
    { enableHighAccuracy: true, timeout: 10_000 }
  );
});

// --- File System Access API ---
interface FileSystemWritableFileStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface WindowWithFileSystemAccess extends Window {
  showOpenFilePicker(options?: {
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle[]>;
}

function supportsFileSystemAccess(win: Window): win is WindowWithFileSystemAccess {
  return 'showOpenFilePicker' in win && typeof (win as WindowWithFileSystemAccess).showOpenFilePicker === 'function';
}

const fsOutput = document.querySelector<HTMLParagraphElement>('#fs-output')!;
document.querySelector('#btn-fs')!.addEventListener('click', async () => {
  if (!supportsFileSystemAccess(window)) {
    fsOutput.textContent = 'File System Access API não suportada neste navegador (use Chrome/Edge).';
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Arquivos de Texto', accept: { 'text/plain': ['.txt', '.md'] } }],
    });

    const file = await handle.getFile();
    const currentText = await file.text();
    const updatedText = `${currentText}\n[Log gravado direto pelo browser em ${new Date().toLocaleTimeString()}]`;

    const writable = await handle.createWritable();
    await writable.write(updatedText);
    await writable.close();

    fsOutput.textContent = `Arquivo "${file.name}" atualizado diretamente no disco!`;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      fsOutput.textContent = 'Seleção de arquivo cancelada.';
      return;
    }
    fsOutput.textContent = `Erro ao acessar arquivo: ${String(err)}`;
  }
});

// --- MediaDevices (Captura de Tela / Janela sem servidor) ---
const videoPreview = document.querySelector<HTMLVideoElement>('#media-preview')!;
let activeStream: MediaStream | null = null;

document.querySelector('#btn-screen')!.addEventListener('click', async () => {
  try {
    activeStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    videoPreview.srcObject = activeStream;
  } catch (err) {
    console.error('[MediaDevices] Captura cancelada ou negada:', err);
  }
});

document.querySelector('#btn-stop-media')!.addEventListener('click', () => {
  activeStream?.getTracks().forEach((track) => track.stop());
  videoPreview.srcObject = null;
  activeStream = null;
});