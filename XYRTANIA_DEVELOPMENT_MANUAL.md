# Xyrtania Local Development Manual

This manual explains the safe local-development workflow for Xyrtania. It is
written so development can continue even without Codex or an internet
connection.

## The basic idea

The active local workbench is:

`C:\Users\kayru_tolw96q\Desktop\xyrtania\xyrtania-development`

In WSL, the same directory is:

`/mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development`

Git commits replace the old habit of copying the entire game into a new
numbered directory after every change.

| Traditional folder copies | Git snapshots |
| --- | --- |
| `xyrtania-v000` | `build-0.1.0-dev.1` |
| `xyrtania-v001` | `build-0.1.0-dev.2` |
| `xyrtania-v002` | `build-0.1.0-dev.3` |

Both approaches preserve older versions. Git stores the snapshots efficiently
inside one working directory instead of duplicating every file.

The version written in `package.json` is a label. The Git commit is the actual
saved snapshot.

## Safety boundaries

- Develop in `xyrtania-development`.
- Work on the local Git branch named `development`.
- Pushing to GitHub is intentionally disabled in this checkout.
- Local commits do not change GitHub, Cloudflare, Render, or the public game.
- Upload to GitHub manually only after a build has been tested and approved.
- `xyrtania-main` and other backup directories should remain reference copies.

## First setup on a clean checkout

Open WSL and run:

```bash
cd /mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development
npm ci
npm run dev
```

Use `npm ci` after making a fresh checkout or when dependencies need to be
reinstalled. It is not normally required every day.

## Everyday development

### 1. Enter the project

```bash
cd /mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development
```

### 2. Start the local game

```bash
npm run dev
```

Open this address in the browser:

`http://localhost:3000`

Keep the terminal running while testing. To stop the server, return to the
terminal and press `Ctrl+C`.

### 3. Edit and test

Edit files in `xyrtania-development`, save them, and test the result in the
browser. Vite often refreshes automatically. If a change does not appear,
refresh the browser. If it still does not appear, stop the development server
with `Ctrl+C` and run `npm run dev` again.

## Preserve a good working state

When the game reaches a state worth keeping:

```bash
git status
git add .
git commit -m "build: describe what changed"
```

Example:

```bash
git add .
git commit -m "build: improve multiplayer loading screen"
```

This is the Git equivalent of copying the entire game into a new numbered
folder.

Nothing is uploaded by these commands.

Good times to make a commit include:

- A new feature works.
- A bug has been fixed.
- The game is stable before attempting a risky change.
- Work is stopping for the day.
- A build is ready for wider testing.

## Development version numbers

Development builds use this format:

`0.1.0-dev.1`

The pieces mean:

- `0.1.0` — the planned game release.
- `dev` — the build is still under development.
- `1` — the numbered development build.

Future preserved builds may be:

```text
0.1.0-dev.2
0.1.0-dev.3
0.1.0-dev.4
```

The number does not need to change after every small edit. Increase it when
declaring a meaningful build worth preserving or testing.

When working with Codex, it is enough to say:

`Save this as the next development build.`

Codex can update the version files, create the commit, and add the matching
local build tag.

When working alone, it is safe to make a commit without immediately changing
the formal version number:

```bash
git add .
git commit -m "backup: my latest working version"
```

The commit still preserves the files.

## Useful inspection commands

Show which branch is active and which files have changed:

```bash
git status
```

Show recent saved snapshots:

```bash
git log --oneline -10
```

Show all local build tags:

```bash
git tag
```

Show the current branch:

```bash
git branch --show-current
```

The expected branch is:

`development`

## Working without internet or Codex

Internet access is not required for ordinary local development after the
dependencies have been installed.

Run:

```bash
cd /mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development
npm run dev
```

Edit and test normally. When ready to preserve the work:

```bash
git add .
git commit -m "backup: describe my latest work"
```

## If something breaks

Do not panic, delete files, or immediately run restoration commands.

First inspect the situation:

```bash
git status
git log --oneline -10
```

These commands do not change anything. They show the unsaved changes and recent
snapshots.

Restoring an older commit can overwrite current work. Before attempting a
restore:

1. Stop editing.
2. Preserve the current files with a commit or traditional folder copy.
3. Ask Codex for help if available.
4. Clearly identify the known-good commit before restoring anything.

Avoid destructive commands such as:

```text
git reset --hard
git clean -fd
```

Do not use them unless the consequences are fully understood and the current
work has been backed up.

## Traditional backups are still allowed

Git does not prevent making familiar full-directory backups. At important
milestones, copy:

`xyrtania-development`

to a clearly named directory such as:

`xyrtania-backup-001`

This hybrid method provides:

- Git commits for frequent, efficient snapshots.
- Full copied directories for occasional major milestones.

Do not copy an actively running `node_modules` directory unless necessary.
Dependencies can normally be recreated later with `npm ci`.

## Manual production release

Uploading to GitHub is deliberately separate from local development.

The release pipeline is:

1. Finish the local changes.
2. Test the game with `npm run dev`.
3. Preserve the tested state with a local commit.
4. Give the build a development or release-candidate version.
5. Make a traditional backup if desired.
6. Manually upload the approved files to GitHub.
7. Watch the Cloudflare and Render deployments.
8. Test the public game after both deployments finish.

Do not upload an untested work-in-progress build merely to preserve it. A local
Git commit already preserves it without affecting production.

## Short reference

Start work:

```bash
cd /mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development
npm run dev
```

Preserve good work:

```bash
git status
git add .
git commit -m "build: describe what changed"
```

Review saved versions:

```bash
git log --oneline -10
```

The complete mental pipeline is:

```text
Open project
→ npm run dev
→ edit
→ test
→ git add .
→ git commit
→ continue developing locally
→ manually release to GitHub only when approved
```
