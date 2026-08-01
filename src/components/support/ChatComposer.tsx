"use client";

import { useRef, useState } from "react";
import {
  Camera,
  FileAudio,
  FileUp,
  ImagePlus,
  Lock,
  MessageSquareText,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import type { CannedReplyDTO, SupportAttachmentDTO } from "@/lib/support";
import {
  isAllowedSupportFile,
  SUPPORT_ACCEPT,
} from "@/lib/support-attachments";
import { uploadToServer } from "@/lib/support-upload-client";
import {
  attachmentDraft,
  optimizeSupportImage,
  readMediaMetadata,
} from "@/lib/support-media-client";

type Props = {
  ticketId: string;
  onSend: (
    body: string,
    isInternalNote: boolean,
    attachments: SupportAttachmentDTO[]
  ) => Promise<void> | void;
  onTyping?: () => void;
  disabled?: boolean;
  /** Agent-only: izinkan internal note + canned replies. */
  allowInternalNote?: boolean;
  cannedReplies?: CannedReplyDTO[];
  placeholder?: string;
};

export default function ChatComposer({
  ticketId,
  onSend,
  onTyping,
  disabled,
  allowInternalNote,
  cannedReplies,
  placeholder,
}: Props) {
  const [value, setValue] = useState("");
  const [internal, setInternal] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [attachments, setAttachments] = useState<SupportAttachmentDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);

  // Optimistic: bersihkan input SEKARANG, kirim di latar (jangan tunggu server).
  // Tombol/textarea tak pernah nge-freeze — terasa snappy seperti WhatsApp.
  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled || uploading) return;

    const noteFlag = internal;
    const selectedAttachments = attachments;
    setValue("");
    setInternal(false);
    setAttachments([]);
    onSend(trimmed, noteFlag, selectedAttachments);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function addFiles(list: FileList | null) {
    const files = Array.from(list || []).slice(0, 8 - attachments.length);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const original of files) {
        if (!isAllowedSupportFile(original)) {
          throw new Error(
            `${original.name}: format tidak didukung atau ukuran melebihi 250 MB`
          );
        }
        const optimized = original.type.startsWith("image/")
          ? await optimizeSupportImage(original)
          : {
              file: original,
              originalSizeBytes: original.size,
              isCompressed: false,
            };
        const media = await readMediaMetadata(optimized.file);
        if (
          optimized.file.type.startsWith("video/") &&
          media.height &&
          media.height > 1080
        ) {
          throw new Error(
            `${original.name}: video maksimal 1080p agar ukuran dan kualitas konsisten`
          );
        }
        const blob = await uploadToServer(ticketId, optimized.file, (percentage) =>
          setUploadProgress(percentage)
        );
        setAttachments((current) => [
          ...current,
          attachmentDraft(
            optimized.file,
            { url: blob.url, downloadUrl: blob.downloadUrl },
            {
              ...media,
              originalSizeBytes: optimized.originalSizeBytes,
              isCompressed: optimized.isCompressed,
            }
          ),
        ]);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Lampiran gagal diunggah"
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-3 shadow-sm transition-colors ${
        internal ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
      }`}
    >
      {allowInternalNote && cannedReplies && cannedReplies.length > 0 && (
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowCanned((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <MessageSquareText size={14} />
            Balasan cepat
          </button>

          {showCanned && (
            <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {cannedReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    setValue((prev) =>
                      prev ? `${prev}\n${reply.body}` : reply.body
                    );
                    setShowCanned(false);
                    textareaRef.current?.focus();
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                >
                  <p className="text-xs font-bold text-slate-700">
                    {reply.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {reply.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={SUPPORT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Paperclip size={13} /> Lampiran
        </span>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-[#114DA5] disabled:opacity-50"
          title="Buka kamera"
        >
          <Camera size={17} />
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-[#114DA5] disabled:opacity-50"
          title="Foto / video dari galeri"
        >
          <ImagePlus size={17} />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-[#114DA5] disabled:opacity-50"
          title="Upload dokumen"
        >
          <FileUp size={17} />
        </button>
        <button
          type="button"
          onClick={() => audioRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-[#114DA5] disabled:opacity-50"
          title="Upload audio"
        >
          <FileAudio size={17} />
        </button>
        <span className="text-[11px] text-slate-400">
          Foto dioptimasi HD · video maks. 1080p · maks. 250 MB
        </span>
      </div>

      {uploading && (
        <div className="mb-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-1.5 bg-gradient-to-r from-[#114DA5] to-[#6FBC1D] transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      {uploadError && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {uploadError}
        </p>
      )}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((item, index) => (
            <span
              key={`${item.url}-${index}`}
              className="inline-flex max-w-52 items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#072B6B]"
            >
              <span className="truncate">{item.fileName}</span>
              <button
                type="button"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                className="shrink-0"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            placeholder ||
            (internal ? "Tulis catatan internal…" : "Tulis pesan…")
          }
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={submit}
          disabled={
            disabled || uploading || (!value.trim() && attachments.length === 0)
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>

      {allowInternalNote && (
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={internal}
            onChange={(event) => setInternal(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-500"
          />
          <span className="inline-flex items-center gap-1">
            <Lock size={12} />
            Kirim sebagai catatan internal (tidak terlihat customer)
          </span>
        </label>
      )}
    </div>
  );
}
