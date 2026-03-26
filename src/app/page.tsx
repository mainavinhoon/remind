"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function HomePage() {
  const [input, setInput]     = useState("");
  const [error, setError]     = useState("");
  const router                = useRouter();

  const slug = slugify(input);
  const preview = slug || "your-path";

  return (
    <div style={{
      minHeight: "100dvh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      fontFamily: "'JetBrains Mono', monospace", 
      background: "#fff", 
      padding: "24px" 
    }}>
      <p style={{ fontSize: "0.8rem", fontWeight: 700, position: "fixed", top: "20px" }}>
        remnd.com
      </p>

      <h1 style={{ fontSize: "1.4rem", fontWeight: 400, color: "#000", textAlign: "center", marginBottom: "32px", letterSpacing: "-0.01em" }}>
        where <span style={{ textDecoration: "underline" }}>do you want to</span> remember things?
      </h1>

      <div style={{ border: "2px solid #000", padding: "16px", width: "100%", maxWidth: "480px" }}>
        <p style={{ fontSize: "0.75rem", color: "#666", marginBottom: "8px" }}>
          remnd.com/<span style={{ color: slug ? "#000" : "#ccc" }}>{preview}</span>
        </p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (slug) router.push(`/${slug}`);
            else setError("pick a name");
          }} 
          style={{ display: "flex", gap: "12px" }}
        >
          <input 
            autoFocus 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="pick-a-slug"
            style={{ 
              flex: 1, 
              border: "none", 
              borderBottom: "1px solid #000", 
              outline: "none", 
              fontFamily: "inherit", 
              fontSize: "1rem" 
            }}
          />
          <button style={{ 
            background: "#000", 
            color: "#fff", 
            border: "none", 
            padding: "8px 24px", 
            fontFamily: "inherit", 
            fontWeight: 700, 
            cursor: "pointer" 
          }}>
            GO
          </button>
        </form>
        {error && <p style={{ color: "red", fontSize: "0.7rem", marginTop: "8px" }}>{error}</p>}
      </div>

      <button
        onClick={() => router.push(`/${Math.random().toString(36).slice(2, 8)}`)}
        style={{ marginTop: "20px", background: "none", border: "none", color: "#999", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "0.7rem" }}
      >
        random slug
      </button>

      <p style={{ position: "fixed", bottom: "20px", fontSize: "0.7rem", color: "#ccc" }}>
        v1.0 / no accounts / ephemeral
      </p>
    </div>
  );
}
