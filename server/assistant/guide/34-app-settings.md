# App Settings and Client Review (Super Admin Only)

## Who can open these pages

The pages "App Settings" and "Client Review" are for the Super Admin only. They appear in the sidebar only for that role. Admins and Volunteers do not see them.

## App Settings

The "App Settings" page has the subtitle "App-wide configuration". It has two parts: a row of monitor cards at the top, and the list of settings below.

### Monitor cards

The cards show whether the app and its connections are healthy. They update on their own while the page is open. They are for checking and do not change anything, except the "Run now" button on the sync card.

"API Requests" and "Database Requests" (one card)
- "API Requests" counts today's requests that Oriel sent to Monday, shown as the number used out of the daily allowance, with a bar. The bar turns yellow when most of the allowance is used and red when it is nearly used up.
- The card says when the count resets ("Resets in" a time). If Monday refuses requests, the card says "Blocked, back in" a time, and Oriel cannot read or save some data until then.
- "Database Requests" counts today's requests to the Oriel database. It has no limit, so there is no bar. Both counts restart at midnight UTC.
- The Super Admin also sees these two counters at the bottom of the sidebar.

"Server"
- Shows whether the app's server is "Awake", "Waking up..." or "Unreachable". "Just woke up" appears for a short time after a restart.
- "Up for" is how long the server has been running. "Response" is how fast it answered the last check. When the server had been asleep, the response time is shown in yellow.
- "Keep-alive" shows the last automatic ping that keeps the server from sleeping.
- "Render hours" shows the hours the server has been awake this month against the free monthly allowance of its hosting plan.
- A sleeping server takes about a minute to wake up, so the first page load after a quiet period can be slow.

"Database"
- Shows "Connected", "Offline" or "Not set up". The database keeps a copy of the Monday data, but not files.
- "Space" shows the storage used against the limit. "Copied today" shows how many changes were copied and how many failed. "Last copy" shows when the last copy happened.
- Press "Show tables" to list the database tables with their number of rows and size. Press "Hide tables" to close the list. Type in the search box to find a table. Press a table to open its rows in a read-only window, newest first. Press the copy icon that appears on a cell to copy its value.

"Monday Sync"
- Changes saved in the database reach Monday once a night. This card shows how that went.
- The header shows "Scheduled", "Manual only" or "Needs attention", and the last run with how long ago it ran.
- "Last run" shows the result: "Done", "Partly done", "Failed" or "Running". "Sent" shows how many changes were sent and how many Monday calls were used. "Waiting" shows changes not yet sent. "Failed" shows changes that could not be sent. "Next run" shows when the next sync is due.
- A failed change is retried several times. After the last try, Admins get a notification, and the change stays in the database but is not in Monday.
- Press "Show failures" to see each change that gave up, with the board, the item, how many tries, and Monday's answer.
- Press "Run now" to send the waiting changes immediately. The button reads "Syncing..." while it runs, and a short result appears under it.

"Claude"
- Shows what Oriel's calls to the Claude AI service used, as counted by Oriel itself. Use of the same account outside Oriel is not included.
- The state is "Working", "No calls yet", "Errors today", "Not set up" or "Unreachable".
- The rows are "Calls today", "Tokens today", "Cost today", "Calls this month", "Tokens this month", "Cost this month" and "Last call". The cost is an estimate. The card does not show remaining credit.

### The settings list

Below the cards, a list shows the settings that control how Oriel behaves. Each row shows the setting name, its value and a short description.

To change a setting:

1. Hover over the row and press the pencil button.
2. Type the new value, or tick the options for a list setting.
3. Press the tick button to save, or the cross button to cancel.

Settings that hold a list are edited with tick boxes, and at least one option must stay ticked. A setting that has never been saved shows the note "Using the default - saved to the board the first time you edit it." It is saved when you first edit it.

The settings include these:

- "Matching Stages": which application stages appear on the "Matching" page and count towards pending matching.
- "Case Owner Roles": which roles can be chosen as an application's Case Owner. Only active accounts are offered.
- "Case Owner Assigner Roles": which roles may set or change an application's Case Owner. By default only Admins can.
- "My Cases Open Stages": which application stages count as open on the Dashboard tile for the person's open cases.
- "Upcoming Tasks Days": how many days ahead the Dashboard's Upcoming Tasks panel looks. Overdue tasks are always included.
- "Monday API Version": the Monday version Oriel uses, written as a year and a quarterly month such as 2026-10. A status line under it says whether the version is current. Admins are alerted when Monday moves the version to maintenance. Update it after checking Monday's release notes. A value that is not a quarterly month, for example one ending in 05, is refused.

Other settings, such as the maximum number of bonded cats in a group, the session length and the sign-in lockout limits, appear in the same list when they exist.

### Adding a setting

Press "Add Setting" at the top right. Fill in "Name" (the label shown on the page), "Setting Key" (filled in from the name, and best left as suggested unless you know what reads it), "Value" and an optional "Description". Name, Setting Key and Value are required. Press "Add Setting". A new setting only has an effect if the app already knows how to use its key.

## Client Review

The "Client Review" page is a working list for calls with the client. Its title is "Client Review" and its subtitle says it is for questions and flags for client calls.

The page has five sections, each with its own "Add" button:

- "Client change requests"
- "Questions for the client"
- "Things to flag to the client"
- "Security"
- "Internal / to do"

### Reading and filtering

- The chips "All", "Change requests", "Questions", "Flags", "Security" and "Internal" show one section, each with a count.
- The "Priority" chips "All", "High", "Medium", "Low" and "None" filter by priority.
- The switch "Show resolved" shows or hides finished items. It is off at first, and the page remembers your choice in your browser.
- Within a section, open items come first, then answered items, then resolved ones. Items with a higher priority come first.

### Working with an item

Each item is a card with a status tag (Open, Answered or Resolved), a priority tag if one is set (High, Medium or Low), and a title. Press the card to open it.

- The open card shows the detail text, a status drop-down, a "Priority" drop-down, and a delete button.
- "Answer / notes" holds the answer to a question or any notes. Edit it in place. The card then shows who last answered and when.
- To delete an item, press the delete button and confirm with "Delete" in the question "Delete this item?". It cannot be undone.

### Adding an item

1. Press "Add" in the section.
2. Type a "Title" (required), an optional "Detail (optional)" and a "Priority".
3. Press "Add".
