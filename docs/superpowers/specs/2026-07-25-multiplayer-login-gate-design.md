# Multiplayer Login Gate Design

**Status:** Approved

**Date:** July 25, 2026

## Purpose

Require an explicit identity selection before Xyrtania starts a multiplayer
connection. Clicking Multiplayer must no longer enter the world automatically
as an anonymous or cached character.

## Approved Player Flow

```text
MULTIPLAYER
    |
    v
Login Modal
    |-- Continue as <saved character name>
    |-- Login as Tester
    |-- Recover Account
    `-- Create / Switch Account
            |
            v
Explicit identity selection
            |
            v
Wake Render server
            |
            v
Authenticate selected identity
            |
            v
Load persistent terrain from Cloudflare D1
            |
            v
Enter world
```

## Requirements

1. Clicking **Multiplayer** always opens the login modal.
2. A saved character is displayed as **Continue as `<display name>`**.
3. No Render connection begins until the player explicitly selects an identity.
4. The existing loading sequence begins after selection and continues to report
   Render wake-up and persistent-terrain loading.
5. **Login as Tester** is visible in local development builds and omitted from
   production builds.
6. The Tester profile uses a separate persistent local identity. It must not
   rename, replace, or synchronize over the saved normal character.
7. **Recover Account** continues to accept the existing recovery phrase.
8. **Create / Switch Account** begins the existing new-identity flow.
9. The authentication hook must not invent an `Anonymous ###` display name merely
   because the application mounted.
10. Closing or cancelling the login modal returns to the start menu without
    connecting.

## Saved Identity Behavior

The locally cached cryptographic identity is treated as the saved identity for
that browser. The normal path does not display an invalid-cache warning or add a
separate validation step.

If a display name is available from local storage, the modal can show it
immediately. Cloudflare may refresh the character record in the background, but
that refresh must not bypass the modal or start multiplayer.

## Tester Isolation

The development Tester profile must have storage separate from the normal
account session. Selecting Tester temporarily makes that identity active for the
multiplayer launch. Returning to the start menu and choosing the saved character
must restore the saved normal identity without requiring account recovery.

Tester is a development convenience, not an anonymous fallback. Production
players must never be offered this option.

## Out of Scope

- Password-based authentication.
- Changes to Cloudflare D1 schemas.
- Changes to Render deployment configuration.
- Redesigning the account cryptography or recovery phrase.
- Supporting multiple production characters in a full character-selection
  interface.
- Deploying the change to GitHub, Cloudflare, or Render.

## Acceptance Checks

1. With Kayrugold cached, Multiplayer opens the modal and does not connect.
2. Selecting **Continue as Kayrugold** starts the existing Render and terrain
   loading sequence.
3. Selecting **Login as Tester** enters using Tester without modifying
   Kayrugold's stored name or identity.
4. Reloading the page does not create or display `Anonymous ###`.
5. Cancelling leaves the player on the start menu and offline.
6. Recover Account still restores its character and can proceed to multiplayer.
7. Create / Switch Account still supports creating a new identity.
8. The project builds successfully and the flow works on localhost.
