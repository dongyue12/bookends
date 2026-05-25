import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');

let building = false;
let pending = false;

function runBuild() {
  return new Promise((resolve) => {
    const child = spawn('node', ['src/build.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    child.on('close', () => {
      resolve();
      if (pending) {
        pending = false;
        runBuild();
      }
    });
  });
}

function scheduleBuild() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  runBuild().then(() => { building = false; });
}

export default {
  root: 'dist',
  server: {
    port: 3000,
    open: false
  },
  plugins: [
    {
      name: 'rebuild-on-change',
      async configureServer(server) {
        await runBuild();

        // 监听源文件变化触发构建
        server.watcher.add([
          path.resolve(__dirname, '_posts'),
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'config.json')
        ]);

        server.watcher.on('change', (file) => {
          if (file.startsWith(distDir)) return;
          scheduleBuild();
        });
        server.watcher.on('add', (file) => {
          if (file.startsWith(distDir)) return;
          scheduleBuild();
        });
        server.watcher.on('unlink', (file) => {
          if (file.startsWith(distDir)) return;
          scheduleBuild();
        });
      }
    }
  ]
};
