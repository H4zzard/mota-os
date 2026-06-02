"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { CompanyProvider } from "@/components/providers/CompanyProvider";

function useSessionPing() {
  useEffect(() => {
    let fp = localStorage.getItem("mota_device_fp");
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem("mota_device_fp", fp);
    }
    fetch("/api/auth/session-ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_fingerprint: fp }),
    }).catch(() => {});
  }, []);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  useSessionPing();

  return (
    <CompanyProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: "var(--bg-app)" }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
        />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {children}
        </div>
      </div>
    </CompanyProvider>
  );
}
