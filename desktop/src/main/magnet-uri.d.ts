declare module "magnet-uri" {
  // Minimal surface for KillNode main-process usage.
  type MagnetData = {
    infoHash?: string | Buffer | Uint8Array;
    name?: string | Buffer;
    announce?: string[];
    [key: string]: unknown;
  };
  function magnetDecode(uri: string): MagnetData;
  export default magnetDecode;
}
