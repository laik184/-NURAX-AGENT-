# Tools Inventory

> Catalog of every tool the agent system can call — both **existing** (✅) and **recommended-but-missing** (❌).

## Summary

| Status | Count |
|---|---|
| ✅ Existing (already implemented) | **14** |
| ❌ Missing (recommended to add) | **120** |
| **Total catalog** | **134** |

## Summary by category

| | Category | Existing | Missing | Total |
|---|---|---|---|---|
| 📁 | **File Operations** | 4 | 7 | 11 |
| 💻 | **Shell & Terminal** | 1 | 6 | 7 |
| 👁️ | **Preview & Browser** | 0 | 9 | 9 |
| 🚀 | **Server Lifecycle** | 4 | 4 | 8 |
| 📦 | **Package Management** | 2 | 5 | 7 |
| 🌿 | **Git & Version Control** | 0 | 13 | 13 |
| ✨ | **Code Quality & Edit** | 0 | 9 | 9 |
| 🧪 | **Testing & Build** | 0 | 5 | 5 |
| 🗄️ | **Database** | 0 | 6 | 6 |
| 🌐 | **HTTP & Network** | 0 | 4 | 4 |
| 📈 | **Diagnostics & Observability** | 1 | 4 | 5 |
| 🔐 | **Secrets & Environment** | 0 | 6 | 6 |
| 🤖 | **AI & Generation** | 0 | 6 | 6 |
| 🚀 | **Deployment** | 0 | 6 | 6 |
| 📋 | **Project & Task** | 0 | 6 | 6 |
| 💬 | **User Interaction** | 2 | 4 | 6 |
| 🎨 | **Canvas & UI** | 0 | 6 | 6 |
| 📚 | **Skills & Knowledge** | 0 | 4 | 4 |
| ⏳ | **Background Jobs** | 0 | 5 | 5 |
| 🔔 | **Notifications & Integrations** | 0 | 5 | 5 |

---

## 📁 File Operations

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | 🗂️ | `file_list` | List directory tree (recursive, with maxDepth) |
| ✅ | 📖 | `file_read` | Read UTF-8 file contents from sandbox |
| ✅ | ✍️ | `file_write` | Write/overwrite a file (auto-creates parent dirs) |
| ✅ | 🗑️ | `file_delete` | Delete file or directory recursively |
| ❌ | 🔍 | `file_search` | Ripgrep-style content search across files |
| ❌ | 🌐 | `file_glob` | Glob-pattern file discovery (e.g., **/*.ts) |
| ❌ | ➡️ | `file_move` | Move/rename files and folders |
| ❌ | 📋 | `file_copy` | Copy files preserving metadata |
| ❌ | ✏️ | `file_replace` | Find-and-replace strings inside files (precise edit) |
| ❌ | 📊 | `file_diff` | Show unified diff between two file versions |
| ❌ | ℹ️ | `file_stat` | File metadata (size, mtime, permissions) |

## 💻 Shell & Terminal

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | ⌨️ | `shell_exec` | One-shot command execution with stdout/stderr capture |
| ❌ | 🖥️ | `terminal_create` | Spawn an interactive PTY terminal session |
| ❌ | ⏎ | `terminal_input` | Send keystrokes/input to an open terminal |
| ❌ | 📜 | `terminal_read` | Read scrollback buffer from a terminal |
| ❌ | ↔️ | `terminal_resize` | Resize PTY (cols × rows) |
| ❌ | ⏹️ | `terminal_kill` | Kill an active terminal session |
| ❌ | 📋 | `terminal_list` | List all open terminal sessions |

## 👁️ Preview & Browser

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🌐 | `preview_url` | Get the public preview URL for a project |
| ❌ | 📸 | `preview_screenshot` | Capture screenshot of running preview |
| ❌ | 📋 | `preview_logs` | Stream browser console + network logs |
| ❌ | 🧭 | `preview_navigate` | Navigate preview to a specific path |
| ❌ | 🔄 | `preview_reload` | Hard-reload the preview frame |
| ❌ | 🖱️ | `browser_click` | Simulate click on a DOM selector |
| ❌ | ⌨️ | `browser_type` | Type text into an input element |
| ❌ | 🧪 | `browser_eval` | Execute JS in preview context, return result |
| ❌ | 🛠️ | `browser_devtools` | Open Chrome DevTools session for inspection |

## 🚀 Server Lifecycle

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | ▶️ | `server_start` | Start the dev server for a project |
| ✅ | ⏹️ | `server_stop` | Stop the running dev server |
| ✅ | 🔄 | `server_restart` | Restart dev server (use after writes) |
| ✅ | 📜 | `server_logs` | Get last N lines of stdout/stderr |
| ❌ | 🟢 | `server_status` | Check if server is up + port + PID |
| ❌ | 🔧 | `workflow_create` | Define a new workflow (cmd + port) |
| ❌ | ▶️ | `workflow_run` | Trigger an existing named workflow |
| ❌ | 📋 | `workflow_logs` | Stream a workflow's log output |

## 📦 Package Management

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | ⬇️ | `package_install` | Install npm/pnpm/yarn packages |
| ✅ | 🔎 | `detect_missing_packages` | Scan imports for uninstalled packages |
| ❌ | 🗑️ | `package_uninstall` | Remove a dependency |
| ❌ | ⬆️ | `package_update` | Update package(s) to latest |
| ❌ | 🛡️ | `package_audit` | Run npm/pnpm audit for vulnerabilities |
| ❌ | 🐍 | `language_install` | Install a language runtime (Python, Go, Rust) |
| ❌ | 🧰 | `system_install` | Install Nix/system packages |

## 🌿 Git & Version Control

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🆕 | `git_init` | Initialize a new git repo |
| ❌ | ⬇️ | `git_clone` | Clone a remote repository |
| ❌ | 📊 | `git_status` | Show working tree status |
| ❌ | 🔍 | `git_diff` | Show unified diff (staged/unstaged/commits) |
| ❌ | ➕ | `git_add` | Stage file(s) for commit |
| ❌ | 💾 | `git_commit` | Create a commit with message |
| ❌ | ⬆️ | `git_push` | Push to remote branch |
| ❌ | ⬇️ | `git_pull` | Pull from remote branch |
| ❌ | 🌳 | `git_branch` | Create/list/delete branches |
| ❌ | 🔀 | `git_checkout` | Switch branch or restore files |
| ❌ | 📜 | `git_log` | View commit history |
| ❌ | ↩️ | `git_revert` | Revert a commit safely |
| ❌ | 📥 | `git_stash` | Stash work-in-progress changes |

## ✨ Code Quality & Edit

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | ✏️ | `code_edit` | Apply structured edits (replace, insert, delete by line) |
| ❌ | 🎨 | `code_format` | Run formatter (prettier, black, gofmt) |
| ❌ | 🧹 | `code_lint` | Run linter (eslint, ruff, etc.) |
| ❌ | ✅ | `code_typecheck` | Run TS/Flow/mypy type-checking |
| ❌ | 🔍 | `code_review` | AI-driven code review on a diff |
| ❌ | 🩺 | `lsp_diagnostics` | Fetch LSP errors + warnings for a file |
| ❌ | 🎯 | `lsp_definition` | Jump to symbol definition via LSP |
| ❌ | 🔗 | `lsp_references` | Find all references to a symbol |
| ❌ | 🏷️ | `lsp_rename` | Rename symbol across project safely |

## 🧪 Testing & Build

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | ▶️ | `test_run` | Run the project test suite |
| ❌ | 👀 | `test_watch` | Start tests in watch mode |
| ❌ | 📊 | `test_coverage` | Generate coverage report |
| ❌ | 🏗️ | `build_run` | Run production build |
| ❌ | 📦 | `bundle_analyze` | Analyze bundle size & treeshake gaps |

## 🗄️ Database

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🔍 | `db_query` | Execute read-only SQL query |
| ❌ | ⚡ | `db_execute` | Execute write SQL (with safety check) |
| ❌ | 🔀 | `db_migrate` | Run pending migrations |
| ❌ | 🔬 | `db_introspect` | Inspect tables, columns, indexes |
| ❌ | 🌱 | `db_seed` | Seed database with fixture data |
| ❌ | 💾 | `db_backup` | Create a database snapshot |

## 🌐 HTTP & Network

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 📡 | `http_request` | Make HTTP request (GET/POST/etc.) with body+headers |
| ❌ | 🌍 | `web_fetch` | Fetch and parse a URL's HTML/text |
| ❌ | 🔍 | `web_search` | Search the web for real-time info |
| ❌ | 🪝 | `webhook_register` | Register inbound webhook URL |

## 📈 Diagnostics & Observability

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | 🔎 | `detect_missing_packages` | Find imports without matching deps |
| ❌ | 📊 | `logs_query` | Query structured logs by filter |
| ❌ | 📈 | `metrics_query` | Query Prometheus-style metrics |
| ❌ | 🕸️ | `trace_view` | View OpenTelemetry trace spans |
| ❌ | ❤️‍🩹 | `health_check` | Probe app health endpoints |

## 🔐 Secrets & Environment

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 📋 | `secret_list` | List secret keys (values redacted) |
| ❌ | ➕ | `secret_set` | Set/update a secret value |
| ❌ | 🗑️ | `secret_delete` | Delete a secret |
| ❌ | 🙋 | `secret_request` | Ask user to provide a missing secret |
| ❌ | 📖 | `env_get` | Read non-secret env variable |
| ❌ | ✍️ | `env_set` | Set non-secret env variable |

## 🤖 AI & Generation

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🖼️ | `image_generate` | Generate AI image from text prompt |
| ❌ | 🎨 | `image_edit` | Edit existing image with AI |
| ❌ | 🪄 | `image_remove_bg` | Remove background → transparent PNG |
| ❌ | 🎬 | `video_generate` | Generate AI video from prompt |
| ❌ | 🎙️ | `audio_transcribe` | Speech-to-text on audio |
| ❌ | 🧬 | `embedding_create` | Create vector embeddings |

## 🚀 Deployment

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🆕 | `deploy_create` | Create a new deployment |
| ❌ | 🟢 | `deploy_status` | Check current deployment health |
| ❌ | 📜 | `deploy_logs` | Tail production logs |
| ❌ | ↩️ | `deploy_rollback` | Roll back to previous version |
| ❌ | ⚙️ | `deploy_config` | Update build/run/env config |
| ❌ | 🌐 | `deploy_domain` | Manage custom domains + TLS |

## 📋 Project & Task

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | ➕ | `task_create` | Create a project task with deps |
| ❌ | 📋 | `task_list` | List tasks with status |
| ❌ | ✏️ | `task_update` | Update task progress/status |
| ❌ | ℹ️ | `project_info` | Get project metadata |
| ❌ | 💾 | `checkpoint_create` | Create rollback checkpoint |
| ❌ | ↩️ | `checkpoint_restore` | Restore from checkpoint |

## 💬 User Interaction

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ✅ | 📨 | `agent_message` | Send a message back to user |
| ✅ | 🏁 | `task_complete` | Mark current task as complete (terminal tool) |
| ❌ | ❓ | `user_query` | Ask user a clarifying question |
| ❌ | ☑️ | `user_choice` | Present multiple choices to user |
| ❌ | 🎁 | `present_asset` | Present a downloadable file to user |
| ❌ | 🚀 | `suggest_deploy` | Suggest user to publish app |

## 🎨 Canvas & UI

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 👁️ | `canvas_get_state` | Read all shapes on canvas |
| ❌ | ➕ | `canvas_create_shape` | Create new shape (text, image, iframe) |
| ❌ | ✏️ | `canvas_update_shape` | Update existing shape |
| ❌ | 🗑️ | `canvas_delete_shape` | Remove shape from canvas |
| ❌ | 🎨 | `mockup_create` | Create a mockup-sandbox preview URL |
| ❌ | 📤 | `mockup_extract` | Pull existing component into mockup sandbox |

## 📚 Skills & Knowledge

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 🔍 | `skill_search` | Search skill library by query |
| ❌ | 📖 | `skill_read` | Read a skill's SKILL.md |
| ❌ | ▶️ | `skill_run` | Invoke a skill's entrypoint script |
| ❌ | 📚 | `docs_search` | Search Replit/library docs |

## ⏳ Background Jobs

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | ▶️ | `job_start` | Start an async background job |
| ❌ | 🔍 | `job_status` | Query job status by ID |
| ❌ | ⏹️ | `job_cancel` | Cancel a running job |
| ❌ | 🤖 | `subagent_start` | Spawn a subagent for delegated work |
| ❌ | 📨 | `subagent_message` | Send follow-up message to subagent |

## 🔔 Notifications & Integrations

| Status | Icon | Tool | What it does |
|---|---|---|---|
| ❌ | 📧 | `send_email` | Send email via SMTP/SendGrid |
| ❌ | 💬 | `send_slack` | Post message to Slack |
| ❌ | 📱 | `send_sms` | Send SMS via Twilio |
| ❌ | 🔗 | `integration_connect` | Connect a third-party integration |
| ❌ | 📋 | `integration_list` | List available integrations |

---

## Legend

- ✅ **Existing** — defined in `server/tools/categories/*.ts` and registered in `server/tools/registry.ts`
- ❌ **Missing** — recommended to add for full agent capability parity with a Replit-clone IDE
- ⚠️ **Partial** — exists but with limited surface

## How tools get added

1. Define the `Tool` object in a file under `server/tools/categories/<your-category>-tools.ts`
2. Export the array (e.g., `export const GIT_TOOLS: Tool[] = [...]`)
3. Spread it into `TOOLS` in `server/tools/registry.ts`
4. The pipeline picks it up automatically via `TOOL_DEFS`
