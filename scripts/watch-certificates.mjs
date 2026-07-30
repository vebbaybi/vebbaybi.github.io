import { watch } from 'node:fs';
import path from 'node:path';
import { writeCertificateManifest } from './build-certificates-index.mjs';

const sourceDir = path.join(process.cwd(), 'assets', 'Certs');
let timer = null;
let running = false;
let rerun = false;

async function rebuild() {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    const certificates = await writeCertificateManifest();
    console.log(`Certificate manifest updated: ${certificates.length} files.`);
  } catch (error) {
    console.error(`Certificate watcher failed: ${error.message}`);
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      queueMicrotask(rebuild);
    }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 180);
}

await rebuild();
const watcher = watch(sourceDir, { recursive: true }, schedule);
console.log(`Watching ${sourceDir}`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearTimeout(timer);
    watcher.close();
    process.exit(0);
  });
}
