# MMM-GoogleTasksViews

MagicMirror module for displaying Google Tasks in a compact, read-only view.

The first version uses a local OAuth token file, fetches active Google Tasks from selected lists, and renders them in a dense grouped layout intended for the center/lower-middle area of a MagicMirror screen.

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/jprend357/MMM-GoogleTasksViews.git
cd MMM-GoogleTasksViews
npm install
```

## Google Tasks OAuth Setup

1. In Google Cloud Console, enable the Google Tasks API for the project you want to use.
2. Configure the OAuth consent screen if that project has not already been configured.
3. Create an OAuth Client ID with application type `Desktop app`.
4. Download the OAuth client JSON.
5. Save it in this module as `.auth/google-tasks-credentials.json`.
6. Run the local POC once:

```bash
npm run poc:tasks
```

7. Accept the browser OAuth prompt for the Google account whose tasks should appear.

The POC creates `.auth/google-tasks-token.json`. Both OAuth files live in `.auth/`, which is ignored by git. Do not commit credentials or token files.

## MagicMirror Configuration

Add the module to `config/config.js`:

```js
{
  module: "MMM-GoogleTasksViews",
  position: "lower_third",
  config: {
    maxTasks: 20,
    updateInterval: 10 * 60 * 1000,
    taskListTitles: [
      "Jack Prendergast's list",
      "House",
      "Car",
      "Buy",
      "Beach",
    ],
  },
},
```

## Configuration Options

Option | Default | Description
------ | ------- | -----------
`updateInterval` | `10 * 60 * 1000` | Refresh interval in milliseconds.
`maxTasks` | `20` | Maximum number of tasks shown across all selected lists.
`taskListIds` | `[]` | Google Tasks list IDs to include. If empty, title filtering can be used.
`taskListTitles` | Current personal lists | Google Tasks list titles to include.
`credentialsPath` | `.auth/google-tasks-credentials.json` | OAuth client JSON path, relative to this module unless absolute.
`tokenPath` | `.auth/google-tasks-token.json` | OAuth token JSON path, relative to this module unless absolute.
`showDueDates` | `true` | Show due dates beside task titles when Google provides them.

If both `taskListIds` and `taskListTitles` are empty, the module displays all visible task lists returned by the Google Tasks API.

## Developer Commands

- `npm install` - Install dependencies.
- `npm run lint` - Run linting and formatter checks.
- `npm run lint:fix` - Fix linting and formatter issues.
- `npm run poc:tasks` - Run the local Google Tasks read-only connectivity POC.

## Notes

- This module is read-only. It does not create, update, complete, or delete tasks.
- Completed, deleted, and hidden tasks are excluded from the display.
- If more active tasks exist than `maxTasks`, the header shows a `+` after the displayed count.
- A future version can add rotation or automatic scrolling so unseen overflow tasks get screen time without making the first view busier.
