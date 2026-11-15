/**
 * capacitor-material-you 是随仓库入库的 file: 本地插件。
 * 某些 npm install --no-save 组合下 CI 不会为它生成 node_modules 链接，
 * 但类型检查仍需解析这个模块名；运行时的动态 import 由 Vite 按真实包处理。
 * 空 ambient 声明不与插件自带的 dist/*.d.ts 冲突。
 */
declare module 'capacitor-material-you';
