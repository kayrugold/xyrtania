# Xyrtania Development Workflow

This directory is the local development version of Xyrtania.

## Safety boundaries

- GitHub `main` is the production source used by Cloudflare and Render.
- Work in this directory on the local `development` branch.
- The `origin` push URL is intentionally disabled in this checkout.
- Nothing should be uploaded or deployed until a build has been tested and
  explicitly approved for release.

## Build versions

Development builds use this format:

`0.1.0-dev.N`

Increase `N` for each local build worth preserving. Update the version in both
`package.json` and `package-lock.json`, then make a local commit such as:

`git commit -m "build: 0.1.0-dev.2"`

Verified release candidates can later use a version such as `0.1.0-rc.1`.
Production versions use a normal version such as `0.1.0`.

## Run locally from WSL

```bash
cd /mnt/c/Users/kayru_tolw96q/Desktop/xyrtania/xyrtania-development
npm ci
npm run dev
```

Use `npm ci` for the first setup of a clean checkout. After that, normally use
only `npm run dev` unless the dependency files change.

The local game should be available at:

`http://localhost:3000`

## Releasing

The release process is deliberately manual:

1. Test the development build locally.
2. Preserve the tested state with a local commit and build version.
3. Create a backup if desired.
4. Upload to GitHub only after explicit approval.
5. Verify the Cloudflare and Render deployments after upload.
