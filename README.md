# FixRoomAUN

**Campus Service & Maintenance Management Platform — Portfolio Prototype**

FixRoomAUN is a university-residence service management prototype. Students can report facility problems, attach evidence, track requests and provide feedback. Maintenance staff can review requests and update their status, while authorized operations users can view analytics.

The original academic prototype used Supabase. This portfolio edition is intentionally **self-contained** so the public GitHub project does not depend on a continuously running cloud database.

## Portfolio demo

The current demo uses browser storage for local persistence.

- No Supabase dependency in the active demo path.
- No email verification.
- No public sign-up form.
- Login accepts any properly formatted email address.
- Select **Student** or **Staff**.
- A new email automatically receives a local demo account.
- Logging out clears the active session so another role/account can be explored.
- The login page remembers previously used account emails and roles on the browser for quick account switching; passwords are handled by the browser credential manager.
- Student profiles receive deterministic synthetic names, IDs and AUN-style housing details.

> **Important:** this authentication model is for demonstration only. It is not production security.

## Demo accounts

All seeded demo accounts use:

`Demo123!`

| Role | Email |
|---|---|
| Student | `demo.student@aun.edu.ng` |
| Maintenance Staff | `demo.staff@aun.edu.ng` |
| Maintenance Head | `demo.head@aun.edu.ng` |
| Overall Admin | `demo.admin@aun.edu.ng` |

You can also enter another valid email and password to create a local demo account.

## Main workflows

### Student

- View a generated student profile and housing assignment.
- Hover over the email address to view profile/housing details.
- Select a facility item to open its report dialog.
- See the selected item's image inside the dialog.
- Describe the issue.
- Optionally attach an image.
- Submit and receive a maintenance ticket.
- Track tickets and their statuses.
- Cancel pending requests.
- Delete cancelled requests.
- Give positive feedback after completion.
- Reopen a completed request with a reason when necessary.
- Log out and return safely to Login.

### Maintenance Staff

- View all maintenance requests.
- Filter requests by status.
- Inspect student, dorm, room, category and description.
- View attached evidence.
- Update request status.
- Log out safely.

### Maintenance Head / Administrator

- View request totals and status distribution.
- Review requests by category and dorm.
- Reset the demo dataset from the administration dashboard.

## Demo housing model

The housing generator is synthetic and deterministic: the same email receives the same profile on subsequent logins.

The model follows the requested AUN-style room ranges:

- `101–125` — Ground Floor
- `201–225` — Middle Floor
- `301–325` — 2nd Floor

**Gabrielle Volpi Boys / Gabrielle Volpi Girls**

- 2-in-1 rooms.
- Demo allocation is split between **With Facilities** and **Without Facilities**.
- The profile UI exposes only **2 in 1 — With Facilities** or **2 in 1 — Without Facilities**.

**AA, BB, CC, DD, EE, FF, and Aisha Khande**

- 3-in-1 rooms.
- The profile UI exposes only **3 in 1 — With Facilities** or **3 in 1 — Without Facilities**.
- The internal A/B bed-space allocation is intentionally hidden from the student-facing profile.

Synthetic student names and IDs are generated from the email so the profile remains stable without exposing real student information.

## Architecture

```text
                         FixRoomAUN
                              |
             +----------------+----------------+
             |                                 |
       Presentation                       Demo Data Layer
       HTML / CSS / JS                  localStorage
             |                                 |
             +----------------+----------------+
                              |
                       Browser Session
```

The active demo path is deliberately backend-free.

### Historical architecture

The academic version previously used:

```text
Browser
   |
   +--> Supabase Auth
   |
   +--> Supabase PostgreSQL
   |
   +--> Supabase Storage
```

`js/supabase.js` remains only as a historical reference. It is not imported by the active demo.

## Project structure

```text
fixroomaun/
├── index.html
├── dashboard.html
├── staff.html
├── analytics.html
├── admin.html
├── assets/
├── css/
│   └── styles.css
├── js/
│   ├── localStore.js
│   ├── auth-standalone.js
│   ├── student.js
│   ├── staff.js
│   ├── analytics.js
│   └── supabase.js
├── projectstructure.txt
├── start-demo.bat
├── CHANGELOG.md
└── README.md
```

## Run locally

### Windows

The simplest option is the included `start-demo.bat`.

Or open Command Prompt in the project folder and run:

```text
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

VS Code Live Server works as well.

The active login controller and data layer are classic browser scripts, so the application can also tolerate local `file://` usage where the browser permits local storage. **For the most realistic browser behavior, including password-manager recognition and credential saving, use the included `start-demo.bat` and open the app at `http://localhost:8000/`.** The browser still controls whether it offers to save credentials.

## Testing focus

The final demo was reviewed around the workflows that previously caused regressions:

- Login form submission is explicitly prevented from performing a normal page refresh.
- Password visibility is a non-submit button.
- Student item cards have explicit click/keyboard handlers.
- The report dialog receives the selected item's own image path.
- Housing is generated before ticket creation.
- Ticket creation no longer depends on a live housing database.
- Student and staff logout clear the active session.
- Dashboard pages check the session again on browser back/forward restoration.
- Literal `\n` artifacts are not present in the active source files.
- The JavaScript files pass syntax validation.

## Portfolio limitations

This is a **portfolio prototype**, not a production SaaS platform.

The local data layer intentionally stores demo credentials and application state in browser storage. A production implementation would require:

- secure authentication and password hashing
- server-side authorization
- organization/tenant isolation
- a real API and database
- secure object/file storage
- audit logs
- rate limiting
- input validation on the server
- role-based access control
- proper session management
- monitoring and observability

Those production concerns are intentionally outside the scope of this standalone portfolio demo.

## Security note

Do not add Supabase service-role keys, database passwords, API secrets or other private credentials to this repository.

## Product evolution

FixRoomAUN is the university-specific prototype that helped establish the service-request workflow.

Its reusable product ideas — service requests, role-based workflows, organization-specific configuration, ticket management, evidence, operational dashboards and administration — informed the broader **Orbit** product direction.

Orbit is being treated as a separate product rather than simply renaming FixRoomAUN.

### Latest demo behavior

- The demo site starts directly on the already signed-in **Demo Student** dashboard (`demo.student@aun.edu.ng`) so visitors can explore immediately.
- A profile switcher icon button beside the signed-in email in the dashboard header lets visitors switch directly in one click between the **Demo Student** (`demo.student@aun.edu.ng`) and **Demo Staff** (`demo.staff@aun.edu.ng`) dashboards without logging out first.
- Clicking **Logout** remains available to open the login page, where the **Previously logged in accounts** section always includes both primary demo accounts (`demo.student@aun.edu.ng` — Student, and `demo.staff@aun.edu.ng` — Staff) for instant one-click switching.
- Student accounts are automatically seeded once per browser account with a random set of realistic repair requests that persist in that browser's local storage and are immediately visible and actionable from the staff dashboard.
- Every staff completion resets the student's feedback cycle, so thumbs up/down appear again after each completion.
- Negative feedback starts from the current ticket description and remains editable before the request is reopened.

> This is a portfolio/demo application. Its local authentication and stored demo credentials are not suitable for production authentication.


## Navigation and Analytics
Student and staff dashboards now include a shared Home / Analytics navigation. Student analytics are scoped to the signed-in student; staff analytics cover operational maintenance activity.

### Ticket status lifecycle

The shared demo store keeps the staff workflow status at `Completed` after staff finishes a request. When the student gives positive feedback, the student dashboard displays the request as `Closed`, while the underlying staff status remains `Completed`. `Closed` is therefore a student-facing confirmation state rather than a staff status-update option. The staff dashboard continues to display the request under `Completed` after a fresh login or reload.
