"use client";

import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
        padding: "2rem 1rem",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>
        AI SDK Demo
      </h1>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              borderRadius: 8,
              background: m.role === "user" ? "#222" : "#1a1a2e",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#888",
                marginBottom: "0.25rem",
              }}
            >
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {m.parts
                ?.filter((p) => p.type === "text")
                .map((p, i) => (
                  <span key={i}>{p.text}</span>
                )) ?? m.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#222",
            color: "#eee",
            fontSize: "1rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: 8,
            border: "none",
            background: "#4a6cf7",
            color: "white",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
