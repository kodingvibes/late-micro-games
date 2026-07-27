/**
 * Typed message contract between the parent window and the sandboxed
 * TIC-80 loader iframe (`public/tic80/loader.html`).
 *
 * The parent sends `Tic80HostMessage` via `iframe.contentWindow.postMessage(..., "*")`,
 * using the raw ArrayBuffers as Transferable Objects so we don't copy.
 *
 * The iframe sends `Tic80IframeMessage` back via `parent.postMessage(..., "*")`,
 * which the host hook filters by `event.source === iframe.contentWindow`.
 */

export interface Tic80InitMessage {
  type: "init";
  jsBytes: ArrayBuffer;
  wasmBytes: ArrayBuffer;
  cartBytes: ArrayBuffer;
  cartName: string;
}

export interface Tic80DestroyMessage {
  type: "destroy";
}

export type Tic80HostMessage = Tic80InitMessage | Tic80DestroyMessage;

export interface Tic80BootingMessage {
  type: "booting";
}
export interface Tic80ReadyMessage {
  type: "ready";
}
export interface Tic80ErrorMessage {
  type: "error";
  detail: string | null;
}
export interface Tic80LogMessage {
  type: "log";
  level: "log" | "error";
  message: string;
}

export type Tic80IframeMessage =
  | Tic80BootingMessage
  | Tic80ReadyMessage
  | Tic80ErrorMessage
  | Tic80LogMessage;

export type PlayerState = "idle" | "booting" | "ready" | "error";
