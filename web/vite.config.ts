import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';

// Serves the original course videos (../videos, not part of the build) at /videos/
// so lessons can embed the matching lecture while running locally.
function localVideos(): Plugin {
  const dir = path.resolve(__dirname, '../videos');
  const mount = (server: ViteDevServer | PreviewServer) => {
    if (fs.existsSync(dir)) server.middlewares.use('/videos', sirv(dir, { dev: true }));
  };
  return { name: 'local-videos', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  base: './',
  plugins: [react(), localVideos()],
  build: { chunkSizeWarningLimit: 2000 },
});
