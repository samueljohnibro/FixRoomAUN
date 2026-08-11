
## v5 — Feedback cycle + quick account switching

- Remembered accounts now populate email, password and account type and immediately sign in when selected.
- Re-completing a ticket always creates a fresh thumbs-up/thumbs-down feedback cycle.
- Negative feedback now starts with the ticket's previous description, keeps it editable, and saves the edited description when reopening the request.
- Added clearer negative-feedback guidance.
# FixRoomAUN — Final Demo Polish — 2026-08-09

## Latest consolidated repair

- Standardized all student housing profile types to exactly four user-facing categories: **2 in 1 — With Facilities**, **2 in 1 — Without Facilities**, **3 in 1 — With Facilities**, and **3 in 1 — Without Facilities**.
- Preserved deterministic AUN-style room generation: 101–125, 201–225 and 301–325.
- Added migration/repair logic so older demo profiles with internal allocation labels are automatically normalized.
- Added a **Previously logged in accounts** section to the login page for quick account switching without displaying passwords.
- Recent account memory stores only email, role and last-used time; passwords remain under the browser's credential manager.
- Preserved standard `email`/`password` form semantics and native localhost form submission for browser password-manager compatibility.
- Raised modal z-index above the application header so the report dialog cannot be visually covered.
- Preserved selected-item images, reporting, cancellation, logout and profile details.
- Updated the localhost server to route students, staff, heads and admins to their correct dashboard.

# Changelog

## Final demo polish — 2026-08-09

- Raised report/confirmation dialog layers above the dashboard header so the header can never cover an active modal.
- Added explicit modal accessibility state and body scroll locking.
- Preserved the selected maintenance item's image inside the report dialog.
- Added proper login `name` attributes and `autocomplete="username"` / `autocomplete="current-password"` semantics.
- Added best-effort browser Credential Management API support without storing passwords in application storage.
- Standardized logout handling across student, staff and administration pages.
- Documented `http://localhost:8000/` as the recommended demo URL for reliable browser behavior.

# FixRoomAUN — Final Demo Polish

## Reliability fixes

- Replaced the duplicated login data layer with one shared local demo store.
- Removed the active dependency on the paused Supabase project.
- Made local storage/session handling resilient to restrictive `file://` environments.
- Fixed student and staff logout to clear the session and use history-safe navigation.
- Added session checks for browser back/forward restoration.
- Removed the stale `head.html` route from the active login path.
- Removed the unused `auth.js` controller.

## Student reporting workflow

- Maintenance cards now carry their own image path.
- Clicking an item reliably opens the report dialog.
- Keyboard activation with Enter/Space is supported.
- The selected item's image is shown in the dialog.
- Image attachments receive validation and a 4 MB limit.
- Ticket submission no longer fails because a demo account has no housing.
- Submitted requests immediately appear under **My Tickets**.

## Demo realism

- Student names and IDs are generated deterministically.
- Housing follows the requested three-digit room ranges.
- Volpi is modelled as 2-in-1 with/without facilities.
- Other dorms use the requested 3-in-1 layout labels.
- Profile details include name, ID, email, dorm, room, floor, room type and housing status.

## Verification performed

- JavaScript syntax checked with Node.js.
- Local data-layer login, housing generation, ticket creation and logout tested.
- Fallback session storage path tested.
- HTML local asset/script references checked.
- Active source scanned for literal `\\n` artifacts.
- Active source checked for the old invalid-housing error path.

## 2026-08-09 — v2.1 Login/password-manager fix

- Reworked the login flow so the browser can observe a conventional successful password-form submission.
- Login form now posts to the included local `/__login` endpoint instead of being permanently intercepted by JavaScript.
- Added `server.py`, a minimal localhost demo server that accepts the login POST and immediately redirects to the correct dashboard without persisting or logging passwords.
- Preserved local demo authentication in browser storage; the server is only used to complete the native form submission/redirect needed for browser credential-manager heuristics.
- Kept `autocomplete="username"` and `autocomplete="current-password"` semantics and stable username/password field names.
- Updated `start-demo.bat` to use the POST-capable local server.
- Static-host fallback remains available for GitHub Pages/other static hosting.


## v6 — Housing Dorm Model

- Updated the synthetic housing catalogue to use AA, BB, CC, DD, EE, FF, Gabrielle Volpi Boys, Gabrielle Volpi Girls, and Aisha Khande.
- Volpi is now represented as separate Boys and Girls dorms rather than a generic Volpi label.
- Existing legacy demo records using `Volpi` are deterministically migrated to one of the two Gabrielle Volpi dorms.
- Ticket lists and analytics normalize legacy dorm labels so the old `Volpi` label does not reappear in the interface.
- Gabrielle Volpi Boys/Girls remain 2-in-1; all other listed dorms remain 3-in-1.

## Analytics Navigation Update
- Added a shared Home / Analytics navigation for student and staff dashboards.
- Analytics now scopes student metrics to the signed-in student's own tickets and shows operational metrics for staff/head/admin roles.
- Added category/dorm breakdown bars, service outcome metrics, feedback summary and recent activity.
- Analytics refreshes when the page becomes visible and when shared browser storage changes.

## v8
- Fixed the staff ticket status dropdown rendering so it explicitly reflects the persisted ticket status after each render.
- Disabled native form-state restoration on individual status controls to prevent completed/in-progress/cancelled tickets from visually reverting to Pending.
- Status filtering and stored ticket status behavior remain unchanged.

## v8.1 — Staff status synchronization fix — 2026-08-09

- Fixed the staff ticket status dropdown so it recognizes **Closed** as a valid persisted ticket status.
- Added **Closed** to the staff status filter so tickets closed by student thumbs-up feedback can be found directly.
- Preserved the authoritative ticket status stored by the shared local data layer; no status is rewritten to Pending during staff rendering.
- The existing explicit dropdown-value assignment now correctly displays `Closed` after a fresh staff login/reload instead of falling back to `Pending`.
