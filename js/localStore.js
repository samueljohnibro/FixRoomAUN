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


function getRecentAccounts() {
    try {
        const raw = demoStorage.get(RECENT_ACCOUNTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(account =>
            account &&
            typeof account.email === "string" &&
            ["student", "staff"].includes(account.account_type)
        );
    } catch {
        return [];
    }
}

function rememberAccount(email, accountType) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedType = accountType === "staff" ? "staff" : "student";
    if (!normalizedEmail) return;

    const accounts = getRecentAccounts().filter(account => account.email !== normalizedEmail);
    accounts.unshift({
        email: normalizedEmail,
        account_type: normalizedType,
        last_used_at: now()
    });
    demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 6)));
}

function forgetRecentAccount(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const accounts = getRecentAccounts().filter(account => account.email !== normalizedEmail);
    demoStorage.set(RECENT_ACCOUNTS_KEY, JSON.stringify(accounts));
}

const now = () => new Date().toISOString();

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

const seedState = () => ({
    users: [
        {
            id: "demo-student-001",
            email: "demo.student@aun.edu.ng",
            password: "Demo123!",
            student_id: "A12345678",
            role: "student",
            housing: {
                dorm: "AA",
                room_number: "101",
                room_type: "2 in 1 — With Facilities",
                semester: "Fall 2026"
            }
        },
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
    tickets: [
        {
            id: "ticket-1001",
            ticket_number: "FR-10001",
            student_email: "demo.student@aun.edu.ng",
            dorm: "AA",
            room_number: "101",
            category: "Air Conditioner",
            description: "Air conditioner is not cooling the room properly.",
            status: "In Progress",
            image_url: null,
            feedback: null,
            feedback_given: false,
            reopen_reason: null,
            created_at: "2026-04-08T09:30:00.000Z",
            updated_at: "2026-04-09T11:15:00.000Z"
        },
        {
            id: "ticket-1002",
            ticket_number: "FR-10002",
            student_email: "demo.student@aun.edu.ng",
            dorm: "AA",
            room_number: "101",
            category: "Power Socket",
            description: "The wall socket beside the study desk is loose.",
            status: "Completed",
            image_url: null,
            feedback: null,
            feedback_given: false,
            reopen_reason: null,
            created_at: "2026-04-03T14:20:00.000Z",
            updated_at: "2026-04-05T16:45:00.000Z"
        },
        {
            id: "ticket-1003",
            ticket_number: "FR-10003",
            student_email: "another.student@aun.edu.ng",
            dorm: "BB",
            room_number: "203",
            category: "Door",
            description: "Bedroom door handle is difficult to turn.",
            status: "Pending",
            image_url: null,
            feedback: null,
            feedback_given: false,
            reopen_reason: null,
            created_at: "2026-04-10T08:10:00.000Z",
            updated_at: "2026-04-10T08:10:00.000Z"
        },
        {
            id: "ticket-1004",
            ticket_number: "FR-10004",
            student_email: "another.student@aun.edu.ng",
            dorm: "CC",
            room_number: "305",
            category: "Ceiling Light",
            description: "Ceiling light is flickering intermittently.",
            status: "Cancelled",
            image_url: null,
            feedback: null,
            feedback_given: false,
            reopen_reason: null,
            created_at: "2026-04-01T12:00:00.000Z",
            updated_at: "2026-04-02T10:00:00.000Z"
        }
    ]
});

function readState() {
    const raw = demoStorage.get(STORAGE_KEY);
    if (!raw) {
        const initial = seedState();
        demoStorage.set(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.tickets)) {
            throw new Error("Invalid demo state");
        }
        return parsed;
    } catch {
        const initial = seedState();
        demoStorage.set(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }
}

function writeState(state) {
    demoStorage.set(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUser() {
    const email = demoStorage.get(SESSION_KEY);
    if (!email) return null;
    return readState().users.find(user => user.email === email) || null;
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
            housing: null
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

    demoStorage.set(SESSION_KEY, user.email);
    rememberAccount(user.email, isStaffRole(user.role) ? "staff" : "student");
    return { user: clone(user), error: null };
}

function logout() {
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
        housing: { dorm, room_number: roomNumber, room_type: roomType, semester }
    };

    state.users.push(user);
    writeState(state);
    return { user: clone(user), error: null };
}

function getUserByEmail(email) {
    return readState().users.find(user => user.email === email.trim().toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// Demo housing/profile generator
// ---------------------------------------------------------------------------
// The prototype deliberately models a realistic campus allocation without
// pretending to connect to a live university housing database. The allocation
// is deterministic per email, so the same demo account keeps the same profile.
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

function ensureDemoStudentProfile(email) {
    const state = readState();
    const user = state.users.find(item => item.email === String(email).trim().toLowerCase());
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
    return readState().tickets
        .filter(ticket => ticket.student_email === email)
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
    return status === "all" ? tickets : tickets.filter(ticket => ticket.status === status);
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
    let ticketNumber;
    do {
        ticketNumber = `FR-${String(Math.floor(10000 + Math.random() * 90000))}`;
    } while (state.tickets.some(ticket => ticket.ticket_number === ticketNumber));

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

    tickets.forEach(ticket => {
        if (ticket.status === "Pending") status.pending++;
        if (ticket.status === "In Progress") status.inProgress++;
        if (ticket.status === "Completed") status.completed++;
        if (ticket.status === "Cancelled") status.cancelled++;
        if (ticket.status === "Closed") status.closed++;
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
        ? Math.round(((status.completed + status.closed) / tickets.length) * 100)
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
    demoStorage.remove(STORAGE_KEY);
    demoStorage.remove(SESSION_KEY);
    return readState();
}


// Expose the demo data layer for classic browser scripts.
// This intentionally avoids ES modules so the prototype also works when opened
// directly from the filesystem (file://), not only through a local web server.
window.FixRoomStore = {
    readState,
    getCurrentUser,
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
