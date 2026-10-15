// Dev-only handle. Production builds must not put the live run on window.
export function attachDebug(dev: boolean, host: object, api: unknown) {
  if (!dev) return;
  Object.assign(host, { rd: api });
}
