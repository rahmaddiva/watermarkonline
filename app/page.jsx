"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Files, Loader2, Stamp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatBytes } from "@/lib/utils";
import { CatMascot } from "@/components/mascot";
import { ThemeToggle } from "@/components/theme-toggle";
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const MAX_TOTAL = 4 * 1024 * 1024;

const STEPS = ["Mengunggah", "Memberi cap watermark", "Mengonversi TIFF 300 DPI", "Mengemas ZIP"];

export default function Home() {
  const inputRef = useRef(null);
  const logoRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const pickLogo = (file) => {
    if (!file) return;
    if (file.type !== "image/png") return toast.error("Logo watermark harus file PNG.");
    if (file.size > 1024 * 1024) return toast.error("Logo watermark maksimal 1 MB.");
    setLogo(file);
    setLogoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };
  const addFiles = (list) => {
    const picked = [...list].filter((f) => /\.(pdf|jpe?g|png)$/i.test(f.name));
    if (picked.length < list.length) toast.warning("Hanya PDF, JPG, PNG yang diterima.");
    setFiles((prev) => [...prev, ...picked]);
  };

  const total = files.reduce((n, f) => n + f.size, 0) + (logo ? logo.size : 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) return toast.error("Pilih minimal satu file dulu.");
    if (total > MAX_TOTAL) {
      return toast.error(
        `Total ${(total / 1024 / 1024).toFixed(1)} MB melebihi batas 4 MB.`,
      );
    }

    setBusy(true);
    setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1500);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("pdf_files", f));
      if (logo) form.append("watermark_file", logo);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Gagal memproses file.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hasil_watermark.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP siap diunduh.");
      setFiles([]);
      setLogo(null);
      setLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-4xl flex-col items-center">
        <CatMascot className="mb-2" />
        <div className="flex w-full flex-col items-start justify-center gap-5 md:flex-row">
        <Card className="w-full max-w-xl flex-1 border-[1.5px] outline outline-4 outline-offset-[5px] outline-[hsl(var(--border))] before:block before:h-[5px] before:bg-primary">
          <CardHeader>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              DISPUSIP — Alat Pengarsipan
            </p>
            <CardTitle className="text-4xl font-bold leading-tight">
              Watermark
              <br />
              Dokumen
            </CardTitle>
            <CardDescription>
              Setiap halaman diberi cap watermark, lalu dikonversi ke TIFF 300 DPI.
              Hasil dikemas dalam satu file ZIP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label
                htmlFor="pdf_files"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "block cursor-pointer border-[1.5px] border-dashed bg-[hsl(var(--background))] px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-[hsl(var(--border))] hover:border-primary",
                )}
              >
                <input
                  ref={inputRef}
                  id="pdf_files"
                  type="file"
                  name="pdf_files"
                  multiple
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <FileUp className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold">Pilih atau jatuhkan file di sini</p>
                <p className="font-mono text-xs text-muted-foreground">
                  PDF · JPG · PNG — bisa lebih dari satu file
                </p>
              </label>

              <div className="border border-[hsl(var(--border))] p-3">
                <p className="text-sm font-semibold">Logo watermark custom (opsional)</p>
                <p className="font-mono text-xs text-muted-foreground">
                  PNG, maks 1 MB — kosong = logo bawaan
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Preview logo" className="size-12 object-contain" />
                  ) : (
                    <div className="flex size-12 items-center justify-center border border-dashed border-[hsl(var(--border))] text-muted-foreground">
                      <Stamp className="size-5" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex flex-1 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoRef.current?.click()}
                    >
                      {logo ? "Ganti logo" : "Pilih logo"}
                    </Button>
                    {logo && (
                      <button
                        type="button"
                        aria-label="Hapus logo custom"
                        onClick={() => {
                          setLogo(null);
                          setLogoUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return null;
                          });
                          if (logoRef.current) logoRef.current.value = "";
                        }}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
                {logo && (
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {logo.name} · {formatBytes(logo.size)}
                  </p>
                )}
                <input
                  ref={logoRef}
                  type="file"
                  accept=".png"
                  className="sr-only"
                  onChange={(e) => {
                    pickLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2 border-l-[3px] border-[hsl(var(--border))] px-2 py-1 font-mono text-xs"
                    >
                      <Files className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        aria-label={`Hapus ${f.name}`}
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                  <li className="pt-1 font-mono text-xs text-muted-foreground">
                    Total: {formatBytes(total)} / 4 MB
                  </li>
                </ul>
              )}

              {busy && (
                <div className="space-y-2 border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status Proses
                  </p>
                  <Progress value={((step + 1) / STEPS.length) * 100} />
                  <ul className="space-y-1">
                    {STEPS.map((s, i) => (
                      <li
                        key={s}
                        className={cn(
                          "font-mono text-xs",
                          i < step && "text-muted-foreground line-through",
                          i === step && "font-semibold text-primary",
                          i > step && "text-muted-foreground/60",
                        )}
                      >
                        {i < step ? "✓ " : i === step ? "… " : "· "}
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" /> Memproses…
                  </>
                ) : (
                  <>
                    <Stamp /> Proses &amp; Unduh ZIP
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="w-full text-center font-mono text-[0.7rem] tracking-wide text-muted-foreground">
              Dinas Perpustakaan dan Kearsipan
            </p>
          </CardFooter>
        </Card>
      </div>
      </div>
    </main>
  );
}
