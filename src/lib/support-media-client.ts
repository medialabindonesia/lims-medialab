"use client";

import type { SupportAttachmentDTO } from "@/lib/support";
import { attachmentKind } from "@/lib/support-attachments";

export async function optimizeSupportImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { file, originalSizeBytes: file.size, isCompressed: false };
  }
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2560;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    return { file, originalSizeBytes: file.size, isCompressed: false };
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const type = file.type === "image/png" ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.84)
  );
  if (!blob || blob.size >= file.size) {
    return {
      file,
      width,
      height,
      originalSizeBytes: file.size,
      isCompressed: false,
    };
  }
  const extension = type === "image/webp" ? "webp" : "jpg";
  const name = `${file.name.replace(/\.[^.]+$/, "")}-hd.${extension}`;
  return {
    file: new File([blob], name, { type, lastModified: Date.now() }),
    width,
    height,
    originalSizeBytes: file.size,
    isCompressed: true,
  };
}

export async function readMediaMetadata(file: File) {
  if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
    return {};
  }
  const element = document.createElement(
    file.type.startsWith("video/") ? "video" : "audio"
  );
  const url = URL.createObjectURL(file);
  element.preload = "metadata";
  element.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      element.onloadedmetadata = () => resolve();
      element.onerror = () => reject(new Error("Metadata media tidak terbaca"));
    });
    const video = element instanceof HTMLVideoElement ? element : null;
    return {
      width: video?.videoWidth || undefined,
      height: video?.videoHeight || undefined,
      durationSeconds: Number.isFinite(element.duration)
        ? element.duration
        : undefined,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function attachmentDraft(
  file: File,
  uploaded: { url: string; downloadUrl?: string },
  metadata: {
    width?: number;
    height?: number;
    durationSeconds?: number;
    originalSizeBytes?: number;
    isCompressed?: boolean;
  }
): SupportAttachmentDTO {
  return {
    kind: attachmentKind(file.type),
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    url: uploaded.url,
    downloadUrl: uploaded.downloadUrl || null,
    ...metadata,
  };
}
