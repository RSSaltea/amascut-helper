// Alt1 globals (provided at runtime by the CDN scripts)
declare const A1lib: any;
declare const a1lib: any;
declare const alt1: any;
declare const Chatbox: any;

// Allow importing images with Webpack
declare module "*.png" {
  const src: string;
  export default src;
}
