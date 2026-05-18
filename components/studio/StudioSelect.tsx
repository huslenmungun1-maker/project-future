"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  minWidth?: number;
}

export default function StudioSelect({ value, onChange, options, placeholder = "Select…", minWidth = 120 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll selected option into view when opening
  useEffect(() => {
    if (open && listRef.current && selected) {
      const el = listRef.current.querySelector(`[data-value="${CSS.escape(selected.value)}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [open, selected]);

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 14px",
          borderRadius: 9999,
          background: open
            ? "rgba(255,255,255,0.92)"
            : "rgba(255,255,255,0.72)",
          border: `1px solid ${open ? "rgba(94,99,87,0.28)" : "rgba(47,47,47,0.11)"}`,
          color: selected ? "var(--text)" : "var(--muted)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          outline: "none",
          whiteSpace: "nowrap",
          minWidth,
          justifyContent: "space-between",
          transition: "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
          boxShadow: open
            ? "0 0 0 3.5px rgba(94,99,87,0.12), 0 2px 12px rgba(0,0,0,0.07)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="9" height="9" viewBox="0 0 9 9" fill="none"
          style={{
            flexShrink: 0,
            opacity: 0.45,
            transition: "transform 180ms cubic-bezier(0.34,1.56,0.64,1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M1 3L4.5 6.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      <div
        ref={listRef}
        style={{
          position: "absolute",
          top: "calc(100% + 5px)",
          left: 0,
          zIndex: 100,
          minWidth: "100%",
          maxHeight: 256,
          overflowY: "auto",
          background: "rgba(253,252,250,0.97)",
          border: "1px solid rgba(47,47,47,0.09)",
          borderRadius: 16,
          boxShadow: "0 12px 40px rgba(0,0,0,0.13), 0 3px 10px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,0.9) inset",
          backdropFilter: "blur(24px)",
          padding: "5px 0",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 160ms cubic-bezier(0.16,1,0.3,1), transform 160ms cubic-bezier(0.16,1,0.3,1)",
          transformOrigin: "top left",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(94,99,87,0.15) transparent",
        }}
      >
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              data-value={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 13px",
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? "var(--accent)" : "#1a1a1a",
                background: isSelected ? "rgba(94,99,87,0.09)" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                letterSpacing: isSelected ? "-0.01em" : "normal",
                transition: "background 70ms ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(94,99,87,0.055)";
              }}
              onMouseLeave={e => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {opt.label}
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.5 5.5L3.8 7.8L8.5 2.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
