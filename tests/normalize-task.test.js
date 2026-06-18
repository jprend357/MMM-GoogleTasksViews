const assert = require("node:assert/strict")
const { normalizeTask } = require("../lib/google-tasks")

const starredOptions = {
  highlightStarredTasks: true,
  starredTitlePrefixes: ["* ", "\u2605 ", "\u2B50 "],
}

assert.deepEqual(normalizeTask({
  id: "raw-starred",
  title: "Pay registration",
  status: "needsAction",
  due: "2026-06-18T00:00:00.000Z",
  starred: true,
}, starredOptions), {
  id: "raw-starred",
  title: "Pay registration",
  status: "needsAction",
  due: "2026-06-18T00:00:00.000Z",
  isStarred: true,
})

assert.deepEqual(normalizeTask({
  id: "prefix-starred",
  title: "\u2B50 Call garage",
  status: "needsAction",
}, starredOptions), {
  id: "prefix-starred",
  title: "Call garage",
  status: "needsAction",
  due: undefined,
  isStarred: true,
})

assert.deepEqual(normalizeTask({
  id: "normal",
  title: "Buy milk",
  status: "needsAction",
}, starredOptions), {
  id: "normal",
  title: "Buy milk",
  status: "needsAction",
  due: undefined,
  isStarred: false,
})

assert.deepEqual(normalizeTask({
  id: "empty-title",
  title: "\u2605 ",
  status: "needsAction",
}, starredOptions), {
  id: "empty-title",
  title: "(untitled task)",
  status: "needsAction",
  due: undefined,
  isStarred: true,
})

assert.deepEqual(normalizeTask({
  id: "disabled",
  title: "* Keep marker visible",
  status: "needsAction",
}, {
  ...starredOptions,
  highlightStarredTasks: false,
}), {
  id: "disabled",
  title: "* Keep marker visible",
  status: "needsAction",
  due: undefined,
  isStarred: false,
})
