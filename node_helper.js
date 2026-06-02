const NodeHelper = require("node_helper")
const { fetchGoogleTasks } = require("./lib/google-tasks")

module.exports = NodeHelper.create({

  async socketNotificationReceived(notification, payload) {
    if (notification !== "GOOGLE_TASKS_FETCH") {
      return
    }

    try {
      const result = await fetchGoogleTasks({
        ...payload,
        moduleRoot: __dirname,
        allowInteractiveAuth: false,
      })

      this.sendSocketNotification("GOOGLE_TASKS_RESULT", result)
    } catch (error) {
      this.sendSocketNotification("GOOGLE_TASKS_ERROR", {
        message: error.message,
      })
    }
  },
})
