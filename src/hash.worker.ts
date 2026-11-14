/// <reference lib="webworker" />
import { z } from 'zod';

const WorkerInputSchema = z.object({
  buffer: z.instanceof(ArrayBuffer),
});

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

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsed = WorkerInputSchema.safeParse(event.data);
  if (!parsed.success) return;

  const { buffer } = parsed.data;
  const start = performance.now();
  const result = heavyCpuTask(buffer);
  const elapsed = (performance.now() - start).toFixed(0);

  self.postMessage({ result, elapsed, buffer }, [buffer]);
};