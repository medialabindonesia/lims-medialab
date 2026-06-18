import type { ReactElement } from "react";
import { pdf } from "@react-pdf/renderer";

function isWebReadableStream(value: unknown): value is ReadableStream {
  return Boolean(value && typeof (value as ReadableStream).getReader === "function");
}

function toBufferChunk(chunk: unknown) {
  if (Buffer.isBuffer(chunk)) return chunk;

  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }

  if (typeof chunk === "string") {
    return Buffer.from(chunk);
  }

  return Buffer.from(String(chunk));
}

export async function renderPdfToBuffer(document: ReactElement): Promise<Buffer> {
  const result = (await pdf(document as any).toBuffer()) as unknown;

  if (Buffer.isBuffer(result)) {
    return result;
  }

  if (result instanceof Uint8Array) {
    return Buffer.from(result);
  }

  const chunks: Buffer[] = [];

  if (isWebReadableStream(result)) {
    const reader = result.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        chunks.push(toBufferChunk(value));
      }
    }

    return Buffer.concat(chunks);
  }

  if (result && typeof (result as any)[Symbol.asyncIterator] === "function") {
    for await (const chunk of result as AsyncIterable<unknown>) {
      chunks.push(toBufferChunk(chunk));
    }

    return Buffer.concat(chunks);
  }

  throw new Error("Gagal render PDF menjadi buffer");
}