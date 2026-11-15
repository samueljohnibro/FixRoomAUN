/* FixRoomAUN Demo Data Layer
 *
 * Portfolio/demo-only persistence. This intentionally replaces the paused
 * Supabase dependency for the live demo while preserving the original
 * Supabase integration in js/supabase.js for historical/reference purposes.
 * Do not use this authentication model for production software.
 */

const STORAGE_KEY = "fixroomaun_demo_v1";
const SESSION_KEY = "fixroomaun_demo_session";
const RECENT_ACCOUNTS_KEY = "fixroomaun_recent_accounts_v1";
const LOGGED_OUT_KEY = "fixroomaun_demo_logged_out";
const CURRENT_SEED_VERSION = 2;

const DEFAULT_DEMO_ACCOUNTS = [
    {
        email: "demo.student@aun.edu.ng",
        account_type: "student",
        pinned: true
    },
    {
        email: "demo.staff@aun.edu.ng",
        account_type: "staff",
        pinned: true
    }
];

// Local-file/Guest-browser fallback. Some browsers restrict localStorage for
// file:// pages; if that happens, keep the demo state in window.name so the
// same-tab prototype still works across dashboard navigation.
const demoStorage = {
    get(key) {
        try {
            const value = window.localStorage.getItem(key);
            if (value !== null) return value;
        } catch (error) {}

        try {
            const state = JSON.parse(window.name || "{}");
            return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
        } catch {
            return null;
        }
    },

    set(key, value) {
        let localStorageWorked = false;
        try {
            window.localStorage.setItem(key, value);
            localStorageWorked = true;
        } catch (error) {}

        if (!localStorageWorked) {
            try {
                const state = JSON.parse(window.name || "{}");
                state[key] = value;
                window.name = JSON.stringify(state);
            } catch {}
        }
    },

    remove(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {}

        try {
            const state = JSON.parse(window.name || "{}");
            if (Object.prototype.hasOwnProperty.call(state, key)) {
                delete state[key];
                window.name = JSON.stringify(state);
            }
        } catch {}
    }
};

const now = () => new Date().toISOString();

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function isPinnedDemoAccount(email) {
    const normalized = String(email || "").trim().toLowerCase();
    return DEFAULT_DEMO_ACCOUNTS.some(account => account.email === normalized);
}

function getRecentAccounts() {
    let stored = [];
    try {
        const raw = demoStorage.get(RECENT_ACCOUNTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
            stored = parsed.filter(account =>
                account &&
                typeof account.email === "string" &&
                ["student", "staff"].includes(account.account_type)
            );
        }
    } catch {
        stored = [];
    }

    // Always include the two primary demo accounts (student and staff) first
    // so testers can switch between them at any time on the login page.
    const pinnedEmails = new Set(DEFAULT_DEMO_ACCOUNTS.map(item => item.email));
    const customAccounts = stored
        .filter(account => !pinnedEmails.has(account.email.trim().toLowerCase()))
        .map(account => ({
            email: account.email.trim().toLowerCase(),
            account_type: account.account_type === "staff" ? "staff" : "student",
            last_used_at: account.last_used_at || now(),
            pinned: false
        }));

    const combined = [
        ...DEFAULT_DEMO_ACCOUNTS.map(account => ({
            ...account,
            last_used_at: now()
        })),
        ...customAccounts
    ].slice(0, 6);

    demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify(combined));
    return combined;
}

function rememberAccount(email, accountType) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedType = accountType === "staff" ? "staff" : "student";
    if (!normalizedEmail) return;

    const current = getRecentAccounts();
    if (isPinnedDemoAccount(normalizedEmail)) {
        demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify(current));
        return;
    }

    const pinned = current.filter(account => isPinnedDemoAccount(account.email));
    const others = current.filter(
        account => !isPinnedDemoAccount(account.email) && account.email !== normalizedEmail
    );

    others.unshift({
        email: normalizedEmail,
        account_type: normalizedType,
        last_used_at: now(),
        pinned: false
    });

    demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify([...pinned, ...others].slice(0, 6)));
}

function forgetRecentAccount(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (isPinnedDemoAccount(normalizedEmail)) return;
    const accounts = getRecentAccounts().filter(account => account.email !== normalizedEmail);
    demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ---------------------------------------------------------------------------
// Demo housing/profile & random repair-request generator
// ---------------------------------------------------------------------------
// The prototype models a realistic campus allocation without connecting to a
// live university housing database. Student housing is deterministic per email,
// while initial repair requests are randomly generated once per browser account
// and then persisted in localStorage so they stay consistent across reloads and
// can be worked on between the student and staff dashboards.
const DEMO_FIRST_NAMES = [
    "Daniel", "David", "Samuel", "Michael", "Joshua", "Nathan", "Caleb",
    "Emmanuel", "Joseph", "Isaac", "Benjamin", "Andrew", "Gabriel", "Matthew",
    "Amara", "Adaeze", "Chiamaka", "Ifeoma", "Zainab", "Aisha", "Miriam",
    "Grace", "Deborah", "Esther", "Sarah", "Favour", "Precious", "Victoria"
];
const DEMO_LAST_NAMES = [
    "Okafor", "Adeyemi", "Eze", "Ibrahim", "Nwosu", "Adebayo", "Ogunleye",
    "Chukwu", "Udo", "Balogun", "Obi", "Okoro", "Yusuf", "Lawal", "Ezeh",
    "Onyeka", "Akinyemi", "Oladipo", "Ojo", "Ibe", "Nnamani", "Umeh"
];
const DEMO_DORMS = [
    "AA", "BB", "CC", "DD", "EE", "FF",
    "Gabrielle Volpi Boys",
    "Gabrielle Volpi Girls",
    "Aisha Khande"
];

const ISSUE_TEMPLATES_BY_CATEGORY = {
    "Air Conditioner": [
        "Air conditioner is blowing warm air and not cooling the room properly.",
        "Indoor AC unit is making a rattling noise when fan speed is set to medium.",
        "Water is slowly dripping from the front panel of the air conditioner.",
        "Air conditioner remote sensor is unresponsive and unit stays on standby."
    ],
    "Power Socket": [
        "The wall socket beside the study desk is loose and needs tightening.",
        "Double power outlet near the bedside table is not supplying power.",
        "Wall socket switch is stuck halfway and charger plugs do not fit securely."
    ],
    "Ceiling Light": [
        "Main ceiling light flickers intermittently when switched on at night.",
        "Ceiling fluorescent lamp has burnt out and needs replacement.",
        "Ceiling light wall switch feels loose and takes several clicks to turn on."
    ],
    "Side Reading Light": [
        "Bedside reading lamp does not turn on when the switch is flipped.",
        "Side reading light adjustable arm is loose and droops down.",
        "Reading light bulb is dim and flickers slightly when adjusted."
    ],
    "Bed": [
        "Wooden bed frame slats are loose and creak loudly when sitting down.",
        "One of the bed support legs is slightly uneven and wobbles.",
        "Bed headboard bracket is loose and taps against the wall."
    ],
    "Wardrobe": [
        "Wardrobe right door hinge is misaligned and does not close flush.",
        "Hanging rod bracket inside the wardrobe has come loose on one side.",
        "Wardrobe drawer runner is sticking and difficult to pull open."
    ],
    "Door": [
        "Room entry door handle is stiff and difficult to turn from the inside.",
        "Overhead door closer pulls the door shut too hard and slams loudly.",
        "Bathroom door latch does not catch properly when closed."
    ],
    "Window": [
        "Window latch is loose and the casement cannot lock tightly.",
        "Window insect screen frame has a small gap at the bottom corner.",
        "Sliding window track is stiff and difficult to push open for ventilation."
    ],
    "Toilet": [
        "Toilet cistern keeps running continuously after flushing.",
        "Toilet flush lever is loose and requires multiple presses to flush.",
        "Toilet tank refills very slowly after each use."
    ],
    "Bathtub": [
        "Bathtub drain is partially clogged and water drains out very slowly.",
        "Shower mixer tap continues dripping slightly when turned off.",
        "Silicone sealant along the edge of the bathtub is peeling away."
    ],
    "Wash Hand Basin": [
        "Wash hand basin tap is loose at the base and wobbles when turned.",
        "Pipe joint underneath the wash hand basin has a slow water drip.",
        "Basin pop-up drain stopper is stuck in the closed position."
    ]
};

function randomInt(maxExclusive) {
    if (maxExclusive <= 1) return 0;
    try {
        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            return array[0] % maxExclusive;
        }
    } catch {}
    return Math.floor(Math.random() * maxExclusive);
}

function shuffleArray(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }
    return copy;
}

function normalizeDormName(dorm, email = "") {
    const value = String(dorm || "").trim();
    if (DEMO_DORMS.includes(value)) return value;

    // Migrate older portfolio-demo data that used the shorter "Volpi" label.
    if (/^volpi$/i.test(value)) {
        const hash = stableHash(String(email).trim().toLowerCase());
        return (hash % 2 === 0) ? "Gabrielle Volpi Boys" : "Gabrielle Volpi Girls";
    }

    return null;
}

function stableHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function pickFrom(list, hash, offset = 0) {
    return list[(hash + offset) % list.length];
}

function buildDemoHousing(email) {
    const hash = stableHash(String(email).trim().toLowerCase());
    const dorm = pickFrom(DEMO_DORMS, hash);
    const floorIndex = hash % 3;

    // AUN-style three-digit room ranges:
    // Ground: 101–125 | Middle: 201–225 | 2nd: 301–325.
    const floorBase = [100, 200, 300][floorIndex];
    const roomOffset = 1 + ((hash >>> 5) % 25);
    const roomNumber = String(floorBase + roomOffset);
    const floorLabel = ["Ground Floor", "Middle Floor", "2nd Floor"][floorIndex];

    // The internal allocation pattern is deliberately not exposed in the
    // profile UI. Students only see one of the four real-world room types.
    const hasFacilities = ((hash >>> 9) % 2) === 0;
    const roomType = /Gabrielle Volpi (Boys|Girls)/i.test(dorm)
        ? `2 in 1 — ${hasFacilities ? "With Facilities" : "Without Facilities"}`
        : `3 in 1 — ${hasFacilities ? "With Facilities" : "Without Facilities"}`;

    return {
        dorm,
        room_number: roomNumber,
        room_type: roomType,
        floor: floorLabel,
        semester: "Fall 2026",
        housing_status: "Assigned",
        allocation_source: "Demo Housing Allocation"
    };
}

function normalizeHousing(housing, email) {
    const generated = buildDemoHousing(email);
    const source = housing && typeof housing === "object" ? housing : {};

    // Preserve valid deterministic room/dorm assignments while repairing old
    // versions that stored internal allocation strings or incomplete housing.
    const dorm = normalizeDormName(source.dorm, email) || generated.dorm;
    const roomNumber = Number(source.room_number);
    const validRoom =
        (roomNumber >= 101 && roomNumber <= 125) ||
        (roomNumber >= 201 && roomNumber <= 225) ||
        (roomNumber >= 301 && roomNumber <= 325);
    const room = validRoom ? String(roomNumber) : generated.room_number;

    const floorIndex = room.startsWith("1") ? 0 : room.startsWith("2") ? 1 : 2;
    const floor = ["Ground Floor", "Middle Floor", "2nd Floor"][floorIndex];

    let roomType;
    const oldType = String(source.room_type || "");
    const volpiDorm = /Gabrielle Volpi (Boys|Girls)/i.test(dorm);
    const defaultHasFacilities = ((stableHash(String(email).trim().toLowerCase()) >>> 9) % 2) === 0;
    if (volpiDorm) {
        roomType = /without facilities/i.test(oldType)
            ? "2 in 1 — Without Facilities"
            : /with facilities/i.test(oldType)
                ? "2 in 1 — With Facilities"
                : `2 in 1 — ${defaultHasFacilities ? "With Facilities" : "Without Facilities"}`;
    } else {
        roomType = /without facilities/i.test(oldType)
            ? "3 in 1 — Without Facilities"
            : /with facilities/i.test(oldType)
                ? "3 in 1 — With Facilities"
                : `3 in 1 — ${defaultHasFacilities ? "With Facilities" : "Without Facilities"}`;
    }

    return {
        dorm,
        room_number: room,
        room_type: roomType,
        floor,
        semester: source.semester || generated.semester,
        housing_status: "Assigned",
        allocation_source: "Demo Housing Allocation"
    };
}

function buildDemoProfile(email) {
    const normalized = String(email).trim().toLowerCase();
    const hash = stableHash(normalized);
    const firstName = pickFrom(DEMO_FIRST_NAMES, hash);
    const lastName = pickFrom(DEMO_LAST_NAMES, hash >>> 3, 1);
    const studentId = `A${String(10000000 + (hash % 90000000))}`;
    return {
        name: `${firstName} ${lastName}`,
        student_id: studentId,
        housing: buildDemoHousing(normalized)
    };
}

function generateUniqueTicketNumber(existingTickets = []) {
    const used = new Set(existingTickets.map(ticket => ticket.ticket_number));
    let ticketNumber;
    do {
        ticketNumber = `FR-${String(10000 + randomInt(90000))}`;
    } while (used.has(ticketNumber));
    return ticketNumber;
}

function generateRandomTicketsForStudent(studentUser, existingTickets = []) {
    const normalizedEmail = String(studentUser.email || "").trim().toLowerCase();
    const housing = normalizeHousing(studentUser.housing, normalizedEmail);
    const allCategories = Object.keys(ISSUE_TEMPLATES_BY_CATEGORY);
    const selectedCategories = shuffleArray(allCategories).slice(0, 4);

    // Include Pending, In Progress, and Completed so the tickets can immediately
    // be worked on in the staff dashboard and reviewed/rated by the student.
    const statusPool = shuffleArray([
        "Pending",
        "In Progress",
        "Completed",
        randomInt(2) === 0 ? "Pending" : "In Progress"
    ]);

    const nowMs = Date.now();
    const generatedTickets = [];

    selectedCategories.forEach((category, index) => {
        const descriptions = ISSUE_TEMPLATES_BY_CATEGORY[category];
        const description = descriptions[randomInt(descriptions.length)];
        const status = statusPool[index] || "Pending";

        // Stagger creation times over the past 1 to 6 days
        const daysAgoCreated = 1 + index + (randomInt(12) / 24);
        const createdMs = nowMs - Math.round(daysAgoCreated * 86400000);
        const updatedOffsetHours = status === "Pending" ? 0 : (4 + randomInt(28));
        const updatedMs = Math.min(nowMs - (index * 60000), createdMs + updatedOffsetHours * 3600000);

        const ticketNumber = generateUniqueTicketNumber([...existingTickets, ...generatedTickets]);
        generatedTickets.push({
            id: `ticket-${nowMs}-${index}-${randomInt(100000)}`,
            ticket_number: ticketNumber,
            student_email: normalizedEmail,
            dorm: housing.dorm,
            room_number: String(housing.room_number),
            category,
            description,
            status,
            image_url: null,
            feedback: null,
            feedback_given: false,
            reopen_reason: null,
            created_at: new Date(createdMs).toISOString(),
            updated_at: new Date(updatedMs).toISOString()
        });
    });

    return generatedTickets;
}

const seedState = () => {
    const demoStudentEmail = "demo.student@aun.edu.ng";
    const generatedProfile = buildDemoProfile(demoStudentEmail);
    const studentHousing = normalizeHousing(
        {
            dorm: "AA",
            room_number: "101",
            room_type: "3 in 1 — With Facilities",
            semester: "Fall 2026"
        },
        demoStudentEmail
    );

    const demoStudentUser = {
        id: "demo-student-001",
        email: demoStudentEmail,
        password: "Demo123!",
        name: generatedProfile.name,
        student_id: "A12345678",
        role: "student",
        housing: studentHousing,
        seeded_tickets: true
    };

    const tickets = generateRandomTicketsForStudent(demoStudentUser, []);

    return {
        seed_version: CURRENT_SEED_VERSION,
        users: [
            demoStudentUser,
            {
                id: "demo-staff-001",
                email: "demo.staff@aun.edu.ng",
                password: "Demo123!",
                student_id: null,
                role: "maintenance_staff",
                housing: null
            },
            {
                id: "demo-head-001",
                email: "demo.head@aun.edu.ng",
                password: "Demo123!",
                student_id: null,
                role: "maintenance_head",
                housing: null
            },
            {
                id: "demo-admin-001",
                email: "demo.admin@aun.edu.ng",
                password: "Demo123!",
                student_id: null,
                role: "overall_admin",
                housing: null
            }
        ],
        tickets
    };
};

function readState() {
    const raw = demoStorage.get(STORAGE_KEY);
    if (!raw) {
        const initial = seedState();
        demoStorage.set(STORAGE_KEY, JSON.stringify(initial));
        getRecentAccounts();
        if (!isExplicitlyLoggedOut() && !demoStorage.get(SESSION_KEY)) {
            demoStorage.set(SESSION_KEY, "demo.student@aun.edu.ng");
        }
        return initial;
    }

    try {
        const parsed = JSON.parse(raw);
        if (
            !parsed ||
            parsed.seed_version !== CURRENT_SEED_VERSION ||
            !Array.isArray(parsed.users) ||
            !Array.isArray(parsed.tickets)
        ) {
            throw new Error("Outdated or invalid demo state");
        }
        return parsed;
    } catch {
        const initial = seedState();
        demoStorage.set(STORAGE_KEY, JSON.stringify(initial));
        getRecentAccounts();
        if (!isExplicitlyLoggedOut() && !demoStorage.get(SESSION_KEY)) {
            demoStorage.set(SESSION_KEY, "demo.student@aun.edu.ng");
        }
        return initial;
    }
}

function writeState(state) {
    demoStorage.set(STORAGE_KEY, JSON.stringify(state));
}

function isExplicitlyLoggedOut() {
    try {
        if (window.sessionStorage.getItem(LOGGED_OUT_KEY) === "true") return true;
    } catch {}
    return demoStorage.get(LOGGED_OUT_KEY) === "true";
}

function setExplicitlyLoggedOut(loggedOut) {
    if (loggedOut) {
        try {
            window.sessionStorage.setItem(LOGGED_OUT_KEY, "true");
        } catch {}
        demoStorage.set(LOGGED_OUT_KEY, "true");
    } else {
        try {
            window.sessionStorage.removeItem(LOGGED_OUT_KEY);
        } catch {}
        demoStorage.remove(LOGGED_OUT_KEY);
    }
}

function startWithDemoStudent() {
    const state = readState();
    ensureDemoStudentProfile("demo.student@aun.edu.ng");
    getRecentAccounts();
    setExplicitlyLoggedOut(false);
    demoStorage.set(SESSION_KEY, "demo.student@aun.edu.ng");
    return state.users.find(user => user.email === "demo.student@aun.edu.ng") || null;
}

function getCurrentUser() {
    const state = readState();
    let email = demoStorage.get(SESSION_KEY);
    if (!email && !isExplicitlyLoggedOut()) {
        email = "demo.student@aun.edu.ng";
        demoStorage.set(SESSION_KEY, email);
    }
    if (!email) return null;
    return state.users.find(user => user.email === email) || null;
}

function isStaffRole(role) {
    return ["maintenance_staff", "maintenance_head", "overall_admin"].includes(role);
}

function login(email, password, selectedRole = "student") {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const role = selectedRole === "staff" ? "staff" : "student";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { user: null, error: "Please enter a valid email address." };
    }
    if (!String(password || "").trim()) {
        return { user: null, error: "Please enter your password." };
    }

    const state = readState();
    let user = state.users.find(item => item.email === normalizedEmail);

    if (!user) {
        user = {
            id: `demo-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            email: normalizedEmail,
            password: String(password),
            student_id: null,
            role: role === "staff" ? "maintenance_staff" : "student",
            housing: null,
            seeded_tickets: false
        };
        state.users.push(user);
        writeState(state);
    } else {
        if (user.password !== String(password)) {
            return { user: null, error: "Incorrect password." };
        }

        const isStaffAccount = ["maintenance_staff", "maintenance_head", "overall_admin"].includes(user.role);
        const requestedStaff = role === "staff";
        if (isStaffAccount !== requestedStaff) {
            return {
                user: null,
                error: `This account is registered as a ${isStaffAccount ? "staff" : "student"} account. Select the matching account type.`
            };
        }
    }

    if (user.role === "student") {
        ensureDemoStudentProfile(user.email);
        user = readState().users.find(item => item.email === user.email) || user;
    }

    setExplicitlyLoggedOut(false);
    demoStorage.set(SESSION_KEY, user.email);
    rememberAccount(user.email, isStaffRole(user.role) ? "staff" : "student");
    return { user: clone(user), error: null };
}

function logout() {
    setExplicitlyLoggedOut(true);
    demoStorage.remove(SESSION_KEY);
    return true;
}

function signup({ email, password, studentId, dorm, roomNumber, roomType, semester }) {
    const state = readState();
    const normalizedEmail = email.trim().toLowerCase();

    if (state.users.some(user => user.email === normalizedEmail)) {
        return { user: null, error: "An account with this email already exists." };
    }

    const user = {
        id: `demo-user-${Date.now()}`,
        email: normalizedEmail,
        password,
        student_id: studentId,
        role: "student",
        housing: { dorm, room_number: roomNumber, room_type: roomType, semester },
        seeded_tickets: false
    };

    state.users.push(user);
    writeState(state);
    ensureDemoStudentProfile(normalizedEmail);
    return { user: clone(getUserByEmail(normalizedEmail) || user), error: null };
}

function getUserByEmail(email) {
    return readState().users.find(user => user.email === String(email || "").trim().toLowerCase()) || null;
}

function ensureDemoStudentProfile(email) {
    const state = readState();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = state.users.find(item => item.email === normalizedEmail);
    if (!user || user.role !== "student") return null;

    const generated = buildDemoProfile(user.email);
    let changed = false;

    const normalizedHousing = normalizeHousing(user.housing, user.email);
    if (JSON.stringify(user.housing || {}) !== JSON.stringify(normalizedHousing)) {
        user.housing = normalizedHousing;
        changed = true;
    }
    if (!user.name) {
        user.name = generated.name;
        changed = true;
    }
    if (!user.student_id) {
        user.student_id = generated.student_id;
        changed = true;
    }

    // Seed initial random repair requests once per student account in this browser
    // so every student account starts with realistic requests visible to staff.
    if (!user.seeded_tickets) {
        const hasTickets = state.tickets.some(ticket => ticket.student_email === normalizedEmail);
        if (!hasTickets) {
            const seededTickets = generateRandomTicketsForStudent(user, state.tickets);
            state.tickets.push(...seededTickets);
        }
        user.seeded_tickets = true;
        changed = true;
    }

    if (changed) writeState(state);
    return user;
}

function getHousing(email) {
    return ensureDemoStudentProfile(email)?.housing || null;
}

function getStudentProfile(email) {
    const user = ensureDemoStudentProfile(email);
    if (!user) return null;
    return {
        name: user.name,
        student_id: user.student_id,
        email: user.email,
        role: user.role,
        housing: clone(user.housing)
    };
}

function updateHousing(email, housing) {
    const state = readState();
    const user = state.users.find(item => item.email === String(email).trim().toLowerCase());
    if (!user) return false;
    user.housing = housing;
    writeState(state);
    return true;
}

function getTicketsForStudent(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    ensureDemoStudentProfile(normalizedEmail);
    return readState().tickets
        .filter(ticket => ticket.student_email === normalizedEmail)
        .map(ticket => ({
            ...ticket,
            dorm: normalizeDormName(ticket.dorm, ticket.student_email) || ticket.dorm || "Unassigned"
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getAllTickets(status = "all") {
    const tickets = readState().tickets
        .map(ticket => ({
            ...ticket,
            dorm: normalizeDormName(ticket.dorm, ticket.student_email) || ticket.dorm || "Unassigned"
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (status === "all") return tickets;
    if (status === "Closed") {
        return tickets.filter(ticket =>
            ticket.status === "Completed" &&
            ticket.feedback === "positive" &&
            ticket.feedback_given === true
        );
    }
    return tickets.filter(ticket => ticket.status === status);
}

function createTicket({ studentEmail, category, description, imageUrl = null }) {
    const normalizedEmail = String(studentEmail || "").trim().toLowerCase();
    const student = ensureDemoStudentProfile(normalizedEmail);

    // Missing housing is repaired automatically in this offline portfolio demo
    // instead of blocking an otherwise valid maintenance request.
    let housing = student?.housing;
    if (!student || student.role !== "student") {
        return { ticket: null, error: "The active account is not a student account." };
    }
    if (!housing?.dorm || !/^[123]\d{2}$/.test(String(housing.room_number))) {
        const repaired = ensureDemoStudentProfile(normalizedEmail);
        housing = repaired?.housing;
        if (!housing?.dorm || !/^[123]\d{2}$/.test(String(housing.room_number))) {
            return { ticket: null, error: "Demo housing could not be generated. Please return to login and try again." };
        }
    }
    if (imageUrl && String(imageUrl).length > 5_500_000) {
        return { ticket: null, error: "The attached image is too large for this offline demo. Please choose an image under 4 MB." };
    }

    const state = readState();
    const ticketNumber = generateUniqueTicketNumber(state.tickets);

    const ticket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ticket_number: ticketNumber,
        student_email: normalizedEmail,
        dorm: housing.dorm,
        room_number: String(housing.room_number),
        category,
        description,
        status: "Pending",
        image_url: imageUrl || null,
        feedback: null,
        feedback_given: false,
        reopen_reason: null,
        created_at: now(),
        updated_at: now()
    };

    state.tickets.push(ticket);
    writeState(state);
    return { ticket: clone(ticket), error: null };
}

function updateTicket(id, updates) {
    const state = readState();
    const ticket = state.tickets.find(item => item.id === id);
    if (!ticket) return { ticket: null, error: "Ticket not found." };

    // Closed is a student-facing state derived from positive feedback.
    // Staff workflow status remains Completed, so staff can continue to
    // manage and view the request under Completed.
    if (updates && updates.status === "Closed" && (updates.feedback || ticket.feedback) !== "positive") {
        return { ticket: null, error: "A ticket can only be closed after positive student feedback." };
    }

    // Every time staff marks a request Completed, the student receives a
    // completely fresh feedback opportunity. This is intentionally reset on
    // every Completed transition so thumbs up/down never disappear merely
    // because the same ticket has been reopened and completed again.
    if (updates && updates.status === "Completed") {
        ticket.feedback = null;
        ticket.feedback_given = false;
    }

    Object.assign(ticket, updates, { updated_at: now() });
    writeState(state);
    return { ticket: clone(ticket), error: null };
}

function deleteTicket(id, email) {
    const state = readState();
    const index = state.tickets.findIndex(ticket => ticket.id === id && ticket.student_email === email);
    if (index === -1) return { error: "Ticket not found." };
    state.tickets.splice(index, 1);
    writeState(state);
    return { error: null };
}

function buildAnalytics(tickets) {
    const status = { pending: 0, inProgress: 0, completed: 0, cancelled: 0, closed: 0 };
    const category = {};
    const dorm = {};
    let reopened = 0;
    let positiveFeedback = 0;
    let negativeFeedback = 0;
    let resolutionTotal = 0;
    let resolutionCount = 0;
    let resolvedCount = 0;

    tickets.forEach(ticket => {
        const isStudentClosed =
            ticket.status === "Closed" ||
            (ticket.status === "Completed" && ticket.feedback === "positive" && ticket.feedback_given === true);

        if (ticket.status === "Pending") status.pending++;
        if (ticket.status === "In Progress") status.inProgress++;
        if (ticket.status === "Completed") status.completed++;
        if (ticket.status === "Cancelled") status.cancelled++;
        if (isStudentClosed) status.closed++;
        if (ticket.status === "Completed" || ticket.status === "Closed") resolvedCount++;

        category[ticket.category] = (category[ticket.category] || 0) + 1;
        const normalizedDorm = normalizeDormName(ticket.dorm, ticket.student_email) || ticket.dorm || "Unassigned";
        dorm[normalizedDorm] = (dorm[normalizedDorm] || 0) + 1;
        if (ticket.reopen_reason || ticket.feedback === "negative") reopened++;
        if (ticket.feedback === "positive") positiveFeedback++;
        if (ticket.feedback === "negative") negativeFeedback++;

        if (["Completed", "Closed"].includes(ticket.status) && ticket.created_at && ticket.updated_at) {
            const created = new Date(ticket.created_at).getTime();
            const updated = new Date(ticket.updated_at).getTime();
            if (updated >= created) {
                resolutionTotal += (updated - created) / 86400000;
                resolutionCount++;
            }
        }
    });

    const completionRate = tickets.length
        ? Math.round((resolvedCount / tickets.length) * 100)
        : 0;

    return {
        total: tickets.length,
        status,
        category,
        dorm,
        reopened,
        positiveFeedback,
        negativeFeedback,
        completionRate,
        averageResolutionDays: resolutionCount ? Number((resolutionTotal / resolutionCount).toFixed(1)) : 0,
        recent: tickets.slice().sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).slice(0, 6)
    };
}

function getAnalytics() {
    return buildAnalytics(readState().tickets);
}

function getAnalyticsForUser(email, role) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const allTickets = readState().tickets.map(ticket => ({
        ...ticket,
        dorm: normalizeDormName(ticket.dorm, ticket.student_email) || ticket.dorm || "Unassigned"
    }));
    const scopedTickets = isStaffRole(role)
        ? allTickets
        : allTickets.filter(ticket => ticket.student_email === normalizedEmail);
    return buildAnalytics(scopedTickets);
}

function resetDemoData() {
    const previousSession = demoStorage.get(SESSION_KEY);
    demoStorage.remove(STORAGE_KEY);
    const freshState = readState();
    if (previousSession) {
        demoStorage.set(SESSION_KEY, previousSession);
    }
    return freshState;
}

// Expose the demo data layer for classic browser scripts.
// This intentionally avoids ES modules so the prototype also works when opened
// directly from the filesystem (file://), not only through a local web server.
window.FixRoomStore = {
    readState,
    getCurrentUser,
    startWithDemoStudent,
    isExplicitlyLoggedOut,
    isPinnedDemoAccount,
    login,
    logout,
    signup,
    getRecentAccounts,
    rememberAccount,
    forgetRecentAccount,
    getUserByEmail,
    getHousing,
    getStudentProfile,
    updateHousing,
    getTicketsForStudent,
    getAllTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    getAnalytics,
    getAnalyticsForUser,
    resetDemoData
};
