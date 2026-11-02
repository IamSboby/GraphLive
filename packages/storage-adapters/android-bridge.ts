/** Capacitor's native bridge is present only in the packaged Android runtime. */
type NativeBridge = {
  getPlatform(): string;
  nativePromise(
    plugin: string,
    method: string,
    options: Record<string, unknown>,
  ): Promise<unknown>;
};
const bridge = () =>
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { Capacitor?: NativeBridge }).Capacitor;
export const isAndroid = () => bridge()?.getPlatform() === "android";
export function androidCall<T>(
  method: string,
  options: Record<string, unknown> = {},
): Promise<T> {
  const cap = bridge();
  if (!cap || !isAndroid()) return Promise.reject(Error("androidUnavailable"));
  return cap.nativePromise("GraphLive", method, options) as Promise<T>;
}
