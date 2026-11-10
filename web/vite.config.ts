import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';

// Serves the course videos (../videos: original course; ../videos-new: the current one; neither is
// part of the build) at /videos/ and /videos-new/ so lessons can embed the matching lecture locally.
function localVideos(): Plugin {
  const mounts = { '/videos': path.resolve(__dirname, '../videos'), '/videos-new': path.resolve(__dirname, '../videos-new') };
  const mount = (server: ViteDevServer | PreviewServer) => {
    for (const [url, dir] of Object.entries(mounts)) if (fs.existsSync(dir)) server.middlewares.use(url, sirv(dir, { dev: true }));
  };
  return { name: 'local-videos', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  base: './',
  plugins: [react(), localVideos()],
  build: { chunkSizeWarningLimit: 2000 },
});
