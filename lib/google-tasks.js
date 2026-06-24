const fs = require("node:fs/promises")
const fsSync = require("node:fs")
const path = require("node:path")

const MODULE_ROOT = path.join(__dirname, "..")
const DEFAULT_CREDENTIALS_PATH = ".auth/google-tasks-credentials.json"
const DEFAULT_TOKEN_PATH = ".auth/google-tasks-token.json"
const SCOPES = ["https://www.googleapis.com/auth/tasks.readonly"]
let googleApis
let localAuth

async function readJson(filePath) {
  const contents = await fs.readFile(filePath, "utf8")

  return JSON.parse(contents)
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function resolveModulePath(filePath, moduleRoot = MODULE_ROOT) {
  if (path.isAbsolute(filePath)) {
    return filePath
  }

  return path.join(moduleRoot, filePath)
}

function loadGoogleApis() {
  if (googleApis) {
    return googleApis
  }

  try {
    googleApis = require("googleapis").google

    return googleApis
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      throw new Error("Missing npm dependency `googleapis`. Run `npm install` in the module directory.")
    }

    throw error
  }
}

function loadLocalAuth() {
  if (localAuth) {
    return localAuth
  }

  try {
    localAuth = require("@google-cloud/local-auth").authenticate

    return localAuth
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      throw new Error("Missing npm dependency `@google-cloud/local-auth`. Run `npm install` in the module directory.")
    }

    throw error
  }
}

function createOAuthClient(credentials, google) {
  const clientConfig = credentials.installed || credentials.web

  if (!clientConfig) {
    throw new Error("Credentials file must contain an installed or web OAuth client.")
  }

  const redirectUri = clientConfig.redirect_uris?.[0]

  return new google.auth.OAuth2(clientConfig.client_id, clientConfig.client_secret, redirectUri)
}

function attachTokenPersistence(auth, tokenPath, currentToken = {}) {
  auth.on("tokens", async (tokens) => {
    await writeJson(tokenPath, { ...currentToken, ...tokens })
  })
}

function missingCredentialsMessage(credentialsPath) {
  return [
    "Missing Google Tasks OAuth credentials.",
    `Save the downloaded Desktop OAuth client JSON here: ${credentialsPath}`,
    `Required scope: ${SCOPES[0]}`,
  ].join(" ")
}

function missingTokenMessage(tokenPath) {
  return [
    "Missing Google Tasks OAuth token.",
    "Run `npm run poc:tasks` once from the module directory to authorize the account.",
    `Expected token file: ${tokenPath}`,
  ].join(" ")
}

async function getAuthorizedClient(options = {}) {
  const moduleRoot = options.moduleRoot || MODULE_ROOT
  const credentialsPath = resolveModulePath(options.credentialsPath || DEFAULT_CREDENTIALS_PATH, moduleRoot)
  const tokenPath = resolveModulePath(options.tokenPath || DEFAULT_TOKEN_PATH, moduleRoot)

  if (!fsSync.existsSync(credentialsPath)) {
    throw new Error(missingCredentialsMessage(credentialsPath))
  }

  const google = loadGoogleApis()
  const credentials = await readJson(credentialsPath)

  if (fsSync.existsSync(tokenPath)) {
    const token = await readJson(tokenPath)
    const auth = createOAuthClient(credentials, google)

    auth.setCredentials(token)
    attachTokenPersistence(auth, tokenPath, token)

    return { auth, google }
  }

  if (!options.allowInteractiveAuth) {
    throw new Error(missingTokenMessage(tokenPath))
  }

  const authenticate = loadLocalAuth()
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: credentialsPath,
  })

  await writeJson(tokenPath, auth.credentials)
  attachTokenPersistence(auth, tokenPath, auth.credentials)

  return { auth, google }
}

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

async function fetchTaskLists(service) {
  return fetchAllPages(pageToken => service.tasklists.list({
    maxResults: 100,
    pageToken,
  }))
}

async function fetchActiveTasks(service, taskListId) {
  return fetchAllPages(pageToken => service.tasks.list({
    tasklist: taskListId,
    maxResults: 100,
    pageToken,
    showCompleted: false,
    showDeleted: false,
    showHidden: false,
  }))
}

function shouldIncludeTaskList(taskList, taskListIds = [], taskListTitles = []) {
  const idSet = new Set(taskListIds.filter(Boolean))
  const titleSet = new Set(taskListTitles.filter(Boolean))

  if (!idSet.size && !titleSet.size) {
    return true
  }

  return idSet.has(taskList.id) || titleSet.has(taskList.title)
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title || "(untitled task)",
    status: task.status,
    due: task.due,
  }
}

async function fetchGoogleTasks(options = {}) {
  const maxTasks = Number.isFinite(options.maxTasks) ? Math.max(options.maxTasks, 0) : 20
  const { auth, google } = await getAuthorizedClient(options)
  const service = google.tasks({ version: "v1", auth })
  const allTaskLists = await fetchTaskLists(service)
  const selectedTaskLists = allTaskLists.filter(taskList => shouldIncludeTaskList(taskList, options.taskListIds, options.taskListTitles))
  const groups = []
  let displayedTasks = 0
  let totalActiveTasks = 0

  for (const taskList of selectedTaskLists) {
    const activeTasks = await fetchActiveTasks(service, taskList.id)
    const remainingSlots = Math.max(maxTasks - displayedTasks, 0)
    const tasks = activeTasks.slice(0, remainingSlots).map(normalizeTask)

    totalActiveTasks += activeTasks.length

    if (tasks.length || activeTasks.length === 0) {
      groups.push({
        id: taskList.id,
        title: taskList.title || "(untitled list)",
        tasks,
        totalActiveTasks: activeTasks.length,
      })
    }

    displayedTasks += tasks.length
  }

  return {
    generatedAt: new Date().toISOString(),
    groups,
    displayedTasks,
    totalActiveTasks,
    maxTasks,
    truncated: totalActiveTasks > displayedTasks,
  }
}

module.exports = {
  DEFAULT_CREDENTIALS_PATH,
  DEFAULT_TOKEN_PATH,
  SCOPES,
  fetchGoogleTasks,
  getAuthorizedClient,
}
