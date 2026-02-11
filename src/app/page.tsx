"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMB = useMemo(() => {
    const bytes = files.reduce((sum, f) => sum + f.size, 0);
    return (bytes / 1024 / 1024).toFixed(1);
  }, [files]);

  function onPick(list: FileList | null) {
    setError(null);
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type === "application/pdf");
    setFiles(picked);
  }

  async function merge() {
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/merge", { method: "POST", body: fd });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      setFiles([]);
    } catch (e: any) {
      setError(e?.message ?? "Merge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Simple PDF Merge</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Pick PDFs, merge, download. No accounts, no storage, no drama.
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => onPick(e.target.files)}
          disabled={busy}
        />

        <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
          {files.length ? (
            <>
              <div>
                {files.length} file(s) selected • {totalMB} MB
              </div>
              <ul>
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            </>
          ) : (
            <div>No files selected.</div>
          )}
        </div>

        {error && <div style={{ marginTop: 12, color: "crimson", fontSize: 14 }}>{error}</div>}

        <button
          onClick={merge}
          disabled={busy || files.length < 2}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #222",
            background: busy ? "#ddd" : "#fff",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Merging..." : "Merge & Download"}
        </button>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Limits: 20 files, 25MB total.
        </div>
      </div>
    </main>
  );
}
