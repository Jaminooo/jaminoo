import path from "path";
import fs from "fs";
import { createHash, randomBytes } from "crypto";

export const MUSIC_COVER_MAX = 5 * 1024 * 1024;
export const MUSIC_AUDIO_MAX = 40 * 1024 * 1024;
const MAX_COVER_FILENAME_LEN = 120;
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "music");
const COVER_DIR = path.join(UPLOAD_DIR, "covers");
const AUDIO_DIR = path.join(UPLOAD_DIR, "audio");

const AUDIO_ACCEPT = new Set([
  "audio/mpeg","audio/wav","audio/x-wav","audio/ogg","audio/ogg;codecs=opus",
  "audio/mp4","audio/x-m4a","audio/aac","audio/flac","audio/x-flac",
]);

const COVER_MIME: Record<string, Buffer[]> = {
  "image/png":[Buffer.from([0x89,0x50,0x4E,0x47])],
  "image/jpeg":[Buffer.from([0xFF,0xD8,0xFF])],
  "image/webp":[Buffer.from([0x52,0x49,0x46,0x46])],
};

function magicOk(buf: Buffer, mime: string, sigs: Buffer[]) {
  for (const sig of sigs) if (buf.subarray(0, sig.length).equals(sig)) return true;
  return false;
}

export function sniffCoverMime(buf: Buffer): string | null {
  for (const [mime, sigs] of Object.entries(COVER_MIME)) if (magicOk(buf, mime, sigs)) return mime;
  return null;
}

export function isAcceptedAudioMime(mime: string) {
  return AUDIO_ACCEPT.has(mime.toLowerCase().split(";")[0].trim());
}

export function ensureMusicDirs() {
  for (const dir of [UPLOAD_DIR, COVER_DIR, AUDIO_DIR]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function randId() { return randomBytes(4).toString("hex"); }

export function saveCoverBuf(buf: Buffer, origName: string) {
  ensureMusicDirs();
  const ext = extFromName(origName) || "png";
  const base = sanitizeFilename(path.basename(origName, ext), 60);
  const finalName = `${base}-${randId()}.${ext}`;
  const dest = path.join(COVER_DIR, finalName);
  fs.writeFileSync(dest, buf);
  return finalName;
}

export function saveAudioBuf(buf: Buffer, origName: string) {
  ensureMusicDirs();
  const ext = extFromName(origName) || "mp3";
  const base = sanitizeFilename(path.basename(origName, ext), 60);
  const finalName = `${base}-${randId()}.${ext}`;
  const dest = path.join(AUDIO_DIR, finalName);
  fs.writeFileSync(dest, buf);
  return finalName;
}

export function deleteMusicFile(name: string) {
  for (const dir of [COVER_DIR, AUDIO_DIR]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) { fs.unlinkSync(p); return true; }
  }
  return false;
}

export function musicFilePath(name: string) {
  for (const dir of [COVER_DIR, AUDIO_DIR]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function nodeToWeb(rs: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      rs.on("data", (chunk: string | Buffer) => controller.enqueue(chunk as unknown as Uint8Array));
      rs.on("end", () => controller.close());
      rs.on("error", (e: Error) => controller.error(e));
    },
    cancel() {
      rs.destroy();
    },
  });
}

export function streamFile(req: Request, filePath: string, mime: string): Response {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const rangeHeader = req.headers.get("range");

  if (rangeHeader) {
    const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : Math.min(start + 1024 * 1024 - 1, total - 1);
      if (start >= total) return new Response(null, { status: 416 });
      const chunk = fs.createReadStream(filePath, { start, end });
      return new Response(nodeToWeb(chunk), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          "Content-Type": mime,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
  }
  const stream = fs.createReadStream(filePath);
  return new Response(nodeToWeb(stream), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export function sanitizeFilename(s: string, max: number) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, max) || "file";
}

export function extFromName(name: string) {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  return ext && ext.length <= 6 ? ext : null;
}
