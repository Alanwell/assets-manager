import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

// 当前 uni-app Vue 3 发布包在纯 ESM 加载时会暴露一层 CommonJS default。
const uniPlugin =
  typeof uni === 'function'
    ? uni
    : (uni as unknown as { default: typeof uni }).default;

export default defineConfig({ plugins: [uniPlugin()] });
