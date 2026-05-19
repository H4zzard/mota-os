"use client"

import { Moon, Sun } from "lucide-react"
import { useThemeContext } from "./ThemeProvider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  size?: "sm" | "md"
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, toggle } = useThemeContext()

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        "hover:bg-[var(--bg-hover)]",
        size === "sm" && "w-7 h-7",
        size === "md" && "w-8 h-8",
        className
      )}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {theme === "dark" ? (
        <Sun size={size === "sm" ? 14 : 16} />
      ) : (
        <Moon size={size === "sm" ? 14 : 16} />
      )}
    </button>
  )
}
