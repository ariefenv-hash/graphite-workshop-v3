import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    // 老 WebView 对 ES2021+ 语法（??= 等）直接 SyntaxError → 纯白屏，降级到 ES2020。
    build: { target: 'es2020' },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        // CI 上 npm install --no-save 偶发不为 file: 本地插件建立可解析入口，
        // 直接指向仓库内已编译产物，网页与 APK 共用同一份实现。
        'capacitor-material-you': path.resolve(
          import.meta.dirname,
          'local_modules/capacitor-material-you/dist/index.js',
        ),
      },
    },
  };
});
