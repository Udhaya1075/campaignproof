export type BufferErrorCode = "auth" | "rate_limit" | "timeout" | "network" | "api" | "not_connected";

export class BufferError extends Error {
  code: BufferErrorCode;
  retryAfter: number | null;
  constructor(code: BufferErrorCode, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "BufferError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}
