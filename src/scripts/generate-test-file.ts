const SIZE_IN_MB = 50;
const TOTAL_BYTES = SIZE_IN_MB * 1024 * 1024;
const CHUNK_SIZE = 65_536; 
const buffer = new Uint8Array(TOTAL_BYTES);

for (let offset = 0; offset < TOTAL_BYTES; offset += CHUNK_SIZE) {
  crypto.getRandomValues(buffer.subarray(offset, offset + CHUNK_SIZE));
}

await Bun.write('test-50mb.bin', buffer);
console.log(`Arquivo test-50mb.bin (${SIZE_IN_MB} MB) gerado com sucesso.`);