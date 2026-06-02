#!/usr/bin/env node

const { fetchGoogleTasks } = require("../lib/google-tasks")

function formatTask(task) {
  const parts = [
    task.title,
    `status: ${task.status || "unknown"}`,
    `id: ${task.id}`,
  ]

  if (task.due) {
    parts.splice(1, 0, `due: ${task.due}`)
  }

  return `  - ${parts.join(" | ")}`
}

async function main() {
  const result = await fetchGoogleTasks({
    allowInteractiveAuth: true,
    maxTasks: Number.MAX_SAFE_INTEGER,
  })

  if (!result.groups.length) {
    console.log("No Google Tasks task lists found.")

    return
  }

  console.log(`Found ${result.groups.length} task list${result.groups.length === 1 ? "" : "s"}.\n`)

  for (const group of result.groups) {
    console.log(`${group.title} (${group.id})`)
    console.log(`${group.totalActiveTasks} active task${group.totalActiveTasks === 1 ? "" : "s"}`)

    if (group.tasks.length) {
      console.log(group.tasks.map(formatTask).join("\n"))
    }

    console.log("")
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
