Module.register("MMM-GoogleTasksViews", {

  defaults: {
    updateInterval: 10 * 60 * 1000,
    maxTasks: 20,
    taskListIds: [],
    taskListTitles: [
      "Jack Prendergast's list",
      "House",
      "Car",
      "Buy",
      "Beach",
    ],
    credentialsPath: ".auth/google-tasks-credentials.json",
    tokenPath: ".auth/google-tasks-token.json",
    showDueDates: true,
  },

  getStyles() {
    return ["GoogleTasksViews.css"]
  },

  start() {
    this.loaded = false
    this.error = null
    this.result = null
    this.updateTimer = null

    this.fetchTasks()
    this.scheduleFetch()
  },

  suspend() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  },

  resume() {
    this.fetchTasks()
    this.scheduleFetch()
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GOOGLE_TASKS_RESULT") {
      this.loaded = true
      this.error = null
      this.result = payload
      this.updateDom()
    }

    if (notification === "GOOGLE_TASKS_ERROR") {
      this.loaded = true
      this.error = payload.message || "Unable to load Google Tasks."
      this.result = null
      this.updateDom()
    }
  },

  getDom() {
    const wrapper = document.createElement("div")

    wrapper.className = "mmm-google-tasks"

    if (this.error) {
      wrapper.appendChild(this.renderHeader("Google Tasks"))
      wrapper.appendChild(this.renderStatus(this.error, "error"))

      return wrapper
    }

    if (!this.loaded) {
      wrapper.appendChild(this.renderHeader("Google Tasks"))
      wrapper.appendChild(this.renderStatus("Loading tasks...", "loading"))

      return wrapper
    }

    if (!this.result || !this.result.displayedTasks) {
      wrapper.appendChild(this.renderHeader("Google Tasks"))
      wrapper.appendChild(this.renderStatus("No active tasks.", "empty"))

      return wrapper
    }

    wrapper.appendChild(this.renderHeader(`Google Tasks (${this.result.displayedTasks}${this.result.truncated ? "+" : ""})`))
    wrapper.appendChild(this.renderGroups(this.result.groups))

    return wrapper
  },

  renderGroups(groups) {
    const groupsWrapper = document.createElement("div")

    groupsWrapper.className = "mmm-google-tasks__groups"

    for (const group of groups) {
      if (group.tasks.length) {
        groupsWrapper.appendChild(this.renderTaskGroup(group))
      }
    }

    return groupsWrapper
  },

  fetchTasks() {
    this.sendSocketNotification("GOOGLE_TASKS_FETCH", this.config)
  },

  scheduleFetch() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }

    this.updateTimer = setInterval(() => this.fetchTasks(), this.config.updateInterval)
  },

  renderHeader(text) {
    const header = document.createElement("div")

    header.className = "mmm-google-tasks__header"
    header.textContent = text

    return header
  },

  renderStatus(message, type) {
    const status = document.createElement("div")

    status.className = `mmm-google-tasks__status mmm-google-tasks__status--${type}`
    status.textContent = message

    return status
  },

  renderTaskGroup(group) {
    const section = document.createElement("section")
    const title = document.createElement("div")
    const list = document.createElement("ul")

    section.className = "mmm-google-tasks__group"
    title.className = "mmm-google-tasks__group-title"
    title.textContent = group.title
    list.className = "mmm-google-tasks__list"

    for (const task of group.tasks) {
      list.appendChild(this.renderTask(task))
    }

    section.appendChild(title)
    section.appendChild(list)

    return section
  },

  renderTask(task) {
    const item = document.createElement("li")
    const title = document.createElement("span")

    item.className = "mmm-google-tasks__task"
    title.className = "mmm-google-tasks__task-title"
    title.textContent = task.title
    item.appendChild(title)

    if (this.config.showDueDates && task.due) {
      const due = document.createElement("span")

      due.className = "mmm-google-tasks__due"
      due.textContent = this.formatDueDate(task.due)
      item.appendChild(due)
    }

    return item
  },

  formatDueDate(value) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  },
})
