# In-app assistant (Quinnie)

Staff can open a chat bubble at the bottom right of the staff app and ask Quinnie, the assistant, how Oriel works. Quinnie is Claude with instructions and a guide. Quinnie explains features. It cannot see any data of Oriel and cannot take any action.

## How it works

- The bubble is part of the staff layout (`src/components/Assistant/AssistantBubble.jsx`). It is hidden when the assistant is not switched on on the server. The rescuer, foster and public pages do not have it.
- The browser sends the conversation so far to `POST /api/assistant/chat`. The route is limited to staff roles and is in `server/assistant/`.
- The server sends Claude the instructions (`server/assistant/instructions.md`), the guide (every `.md` file in `server/assistant/guide/`, in file name order), the staff member's role, and the conversation. It keeps the last 20 messages, and a message may have 2000 characters.
- The guide is marked for prompt caching, so the long text is cheap after the first question.
- Nothing is stored on the server. The conversation is kept in the browser until the page is reloaded.
- Every call is counted on the Claude card of the App Settings page (`server/aiUsage/`).

## Data sent to Claude

Only the staff member's questions, the replies so far, the guide, and the role of the person asking. No cat, application, rescuer, foster or adopter data is sent, and no name or email address. The instructions tell Claude to say so when asked for data.

## The guide

The guide is a set of Markdown files in `server/assistant/guide/`, one per area, named with a number prefix to set the order (for example `11-cat-page.md`). It is read on every question, so a change to a file applies without a code change. It is deployed with the server.

The guide must be updated whenever a feature changes. The assistant only knows what the guide says, and it is told to say it is not sure about anything else.

Write the guide for a staff member who has never seen the app. Use the exact names of buttons and tabs, name the role when a feature is restricted, and do not include code names, addresses, keys or personal data.

## Settings

| Setting | Meaning |
| --- | --- |
| ASSISTANT_ENABLED | Set to true to switch the assistant on. Off by default, so nothing is sent to Claude until it is set. |
| ASSISTANT_MODEL | The Claude model. Default claude-sonnet-5-5. |
| ASSISTANT_MAX_PER_DAY | The most answers a day for everyone (UTC). Default 300. |
| ASSISTANT_MAX_PER_USER_HOUR | The most answers an hour for one person. Default 30. |
| ANTHROPIC_API_KEY | The API key of the Claude account. |
| ANTHROPIC_WORKSPACE_ID | The workspace of the key, sent as a header. |

The two limits are kept in the server's memory, so a restart resets them. They guard the cost. The real usage is counted in the database.

## Not built

Streaming the answer as it is written, answers that read live data, and storing conversations.
