import { createClient } from "@/lib/supabase-server"
import { TasksClient } from "./TasksClient"
import type { Task } from "@/lib/mocks/tasks"
import { COMPANY_COLOR } from "@/lib/mocks/tasks"
import type { TaskRow } from "@/lib/types"

function nameInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function nameColor(name: string): string {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#16a34a", "#06b6d4"]
  return colors[name.charCodeAt(0) % colors.length]
}

function mapTask(row: TaskRow): Task {
  const assigneeName = row.assignee_name ?? null
  const companyId    = row.company_id    ?? null
  return {
    id:               row.id,
    title:            row.title,
    description:      row.description,
    status:           row.status,
    priority:         row.priority,
    assigneeName,
    assignee:         assigneeName ?? "—",
    assigneeInitials: assigneeName ? nameInitials(assigneeName) : "?",
    assigneeColor:    assigneeName ? nameColor(assigneeName)    : "#94a3b8",
    companyId,
    projectColor:     companyId ? (COMPANY_COLOR[companyId] ?? "#94a3b8") : "#94a3b8",
    dueDate:          row.due_date ?? "",
    tags:             row.tags,
    archived:         row.archived,
  }
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("archived", false)
    .order("position")

  const tasks: Task[] = (data ?? []).map(mapTask)
  return <TasksClient initialTasks={tasks} />
}
