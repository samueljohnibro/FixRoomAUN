(() => {
    "use strict";

    const store = window.FixRoomStore;
    if (!store) {
        window.location.replace("index.html?logged_out=1");
        return;
    }

    const {
        getCurrentUser,
        isExplicitlyLoggedOut,
        mountAccountSwitcher,
        routeByRole,
        logout,
        getAllTickets,
        updateTicket
    } = store;

    function routeToLogin() {
        window.location.replace("index.html?logged_out=1");
    }

    const user = getCurrentUser();
    if (!user || isExplicitlyLoggedOut?.()) {
        routeToLogin();
        return;
    }

    if (!["maintenance_staff", "maintenance_head", "overall_admin"].includes(user.role)) {
        window.location.replace("dashboard.html");
        return;
    }

    const staffEmail = document.getElementById("staffEmail");
    const logoutBtn = document.getElementById("logoutBtn");
    const statusFilter = document.getElementById("statusFilter");
    const container = document.getElementById("staffTicketList");

    if (staffEmail) {
        staffEmail.textContent = user.email;
        staffEmail.title = user.email;
    }
    mountAccountSwitcher?.("accountSwitcher");

    logoutBtn?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        logout();
        // Replace the current document so the authenticated page is not
        // retained as the active navigation entry.
        routeToLogin();
    });

    window.addEventListener("pageshow", () => {
        const current = getCurrentUser();
        if (isExplicitlyLoggedOut?.() || !current) {
            routeToLogin();
            return;
        }
        if (!["maintenance_staff", "maintenance_head", "overall_admin"].includes(current.role)) {
            window.location.replace(routeByRole?.(current.role) || "dashboard.html");
            return;
        }
        loadTickets();
    });

    window.addEventListener("storage", () => {
        if (isExplicitlyLoggedOut?.()) {
            routeToLogin();
            return;
        }
        loadTickets();
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !isExplicitlyLoggedOut?.()) {
            loadTickets();
        }
    });

    statusFilter?.addEventListener("change", loadTickets);

    function getCategoryIcon(category) {
        const map = {
            "Air Conditioner": "ac.png",
            "Power Socket": "socket.png",
            "Ceiling Light": "ceilinglight.png",
            "Side Reading Light": "sidelight.png",
            "Bed": "bed.png",
            "Wardrobe": "wardrobe.png",
            "Door": "door.png",
            "Window": "window.png",
            "Toilet": "toilet.png",
            "Bathtub": "bathtub.png",
            "Wash Hand Basin": "basin.png"
        };
        return map[category] || "ac.png";
    }

    function escapeHtml(value = "") {
        return String(value).replace(/[&<>'"]/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char]));
    }

    function loadTickets() {
        if (!container) return;

        const tickets = getAllTickets(statusFilter?.value || "all");
        container.innerHTML = "";

        if (!tickets.length) {
            container.innerHTML =
                `<div class="empty-state"><strong>No requests match this filter.</strong><p>Try another status.</p></div>`;
            return;
        }

        const allowedStatuses = ["Pending", "In Progress", "Completed", "Cancelled"];

        tickets.forEach(ticket => {
            const studentClosed =
                ticket.status === "Completed" &&
                ticket.feedback === "positive" &&
                ticket.feedback_given === true;
            const badgeLabel = studentClosed ? "Closed by Student" : ticket.status;
            const badgeClass = studentClosed
                ? "status-closed"
                : `status-${String(ticket.status).toLowerCase().replace(/\s+/g, "-")}`;

            const card = document.createElement("div");
            card.className = "ticket-card";
            card.innerHTML = `
                <div class="ticket-left">
                    <div class="ticket-item-image">
                        <img src="assets/${getCategoryIcon(ticket.category)}" alt="${escapeHtml(ticket.category)}">
                    </div>
                    <div class="ticket-info">
                        <strong>${escapeHtml(ticket.ticket_number)}</strong>
                        <p><b>Student:</b> ${escapeHtml(ticket.student_email)}</p>
                        <p><b>Dorm:</b> ${escapeHtml(ticket.dorm || "N/A")}</p>
                        <p><b>Room:</b> ${escapeHtml(ticket.room_number || "N/A")}</p>
                        <p><b>Category:</b> ${escapeHtml(ticket.category)}</p>
                        <p><b>Description:</b> ${escapeHtml(ticket.description)}</p>
                        ${ticket.reopen_reason ? `<p><b>Reopen reason:</b> ${escapeHtml(ticket.reopen_reason)}</p>` : ""}
                        ${studentClosed ? `<p><b>Student feedback:</b> 👍 Confirmed resolved</p>` : ""}
                        ${ticket.image_url ? `<img src="${ticket.image_url}" class="ticket-image" alt="Attached issue">` : ""}
                    </div>
                </div>
                <div class="ticket-right">
                    <span class="ticket-status ${badgeClass}">${escapeHtml(badgeLabel)}</span>
                    <label class="sr-only" for="status-${escapeHtml(ticket.id)}">Update status</label>
                    <select id="status-${escapeHtml(ticket.id)}" data-id="${escapeHtml(ticket.id)}" class="statusUpdate" autocomplete="off">
                        ${allowedStatuses.map(status => `<option value="${status}">${status}</option>`).join("")}
                    </select>
                </div>`;
            container.appendChild(card);

            // Explicitly set the native control's value after insertion. This
            // prevents browser form-state restoration from visually forcing
            // the first option (Pending) when the persisted ticket is not Pending.
            const statusSelect = card.querySelector(".statusUpdate");
            if (statusSelect) {
                statusSelect.value = allowedStatuses.includes(ticket.status) ? ticket.status : "Pending";
            }
        });

        container.querySelectorAll(".statusUpdate").forEach(select => {
            select.addEventListener("change", () => {
                const result = updateTicket(select.dataset.id, { status: select.value });
                if (result.error) alert(result.error);
                loadTickets();
            });
        });
    }

    loadTickets();
})();
