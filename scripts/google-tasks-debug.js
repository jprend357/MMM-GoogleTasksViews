#!/usr/bin/env node

const { getAuthorizedClient } = require("../lib/google-tasks")

async function fetchAllPages(fetchPage) {
  const items = []
  let pageToken

  do {
    const result = await fetchPage(pageToken)

    items.push(...(result.data.items || []))
    pageToken = result.data.nextPageToken
  } while (pageToken)

  return items
}

function matchesQuery(task, query) {
  if (!query) {
    return true
  }

  return (task.title || "").toLowerCase().includes(query.toLowerCase())
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim()
  const { auth, google } = await getAuthorizedClient({ allowInteractiveAuth: true })
  const service = google.tasks({ version: "v1", auth })
  const taskLists = await fetchAllPages(pageToken => service.tasklists.list({
    maxResults: 100,
    pageToken,
  }))
  let matchCount = 0

  for (const taskList of taskLists) {
    const tasks = await fetchAllPages(pageToken => service.tasks.list({
      tasklist: taskList.id,
      maxResults: 100,
      pageToken,
      showCompleted: false,
      showDeleted: false,
      showHidden: false,
    }))
    const matches = tasks.filter(task => matchesQuery(task, query))

    if (!matches.length) {
      continue
    }

    console.log(`\n# ${taskList.title || "(untitled list)"} (${taskList.id})`)

    for (const task of matches) {
      matchCount += 1
      console.log(JSON.stringify(task, null, 2))
    }
  }

  if (!matchCount) {
    console.log(query ? `No active tasks matched "${query}".` : "No active tasks found.")
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
