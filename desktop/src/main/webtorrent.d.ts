declare module "webtorrent" {
  // Minimal surface for KillNode main-process usage (full typings not shipped with package).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebTorrent: any;
  export default WebTorrent;
}
