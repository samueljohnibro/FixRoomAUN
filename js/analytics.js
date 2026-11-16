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
        getAnalyticsForUser,
        resetDemoData,
        logout
    } = store;

    function routeToLogin() {
        window.location.replace("index.html?logged_out=1");
    }

    const user = getCurrentUser?.();

    if (!user || isExplicitlyLoggedOut?.()) {
        routeToLogin();
        return;
    }

    const staffRoles = ["maintenance_staff", "maintenance_head", "overall_admin"];
    const isStaff = staffRoles.includes(user.role);
    const homePage = isStaff ? "staff.html" : "dashboard.html";

    const email = document.getElementById("analyticsEmail");
    if (email) {
        email.textContent = user.email;
        email.title = user.email;
    }
    mountAccountSwitcher?.("accountSwitcher");

    const roleLabel = document.getElementById("analyticsRoleLabel");
    if (roleLabel) roleLabel.textContent = isStaff ? "Maintenance Operations" : "Personal Maintenance Activity";

    const heading = document.getElementById("analyticsHeading");
    if (heading) heading.textContent = isStaff ? "Maintenance Analytics" : "My Analytics";

    const subtitle = document.getElementById("analyticsSubtitle");
    if (subtitle) {
        subtitle.textContent = isStaff
            ? "A live overview of maintenance demand, ticket status and service outcomes."
            : "A personal overview of your maintenance requests and service history.";
    }

    const homeLink = document.getElementById("homeLink");
    homeLink?.setAttribute("href", homePage);

    document.getElementById("logoutBtn")?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        logout();
        routeToLogin();
    });

    const resetDemoBtn = document.getElementById("resetDemoBtn");
    resetDemoBtn?.addEventListener("click", event => {
        event.preventDefault();
        resetDemoData?.();
        render();
        const originalLabel = resetDemoBtn.textContent;
        resetDemoBtn.textContent = "Demo Data Reset ✓";
        window.setTimeout(() => {
            resetDemoBtn.textContent = originalLabel;
        }, 1600);
    });

    function escapeHtml(value = "") {
        return String(value).replace(/[&<>'"]/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        }[char]));
    }

    function renderList(elementId, values, emptyText = "No data yet.") {
        const list = document.getElementById(elementId);
        if (!list) return;
        list.innerHTML = "";
        const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
        if (!entries.length) {
            list.innerHTML = `<li class="analytics-empty">${escapeHtml(emptyText)}</li>`;
            return;
        }
        const max = Math.max(...entries.map(([, value]) => value), 1);
        entries.forEach(([key, value]) => {
            const item = document.createElement("li");
            item.innerHTML = `
                <div class="analytics-list-label"><span>${escapeHtml(key)}</span><strong>${value}</strong></div>
                <div class="analytics-bar"><span style="width:${Math.round((value / max) * 100)}%"></span></div>`;
            list.appendChild(item);
        });
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function render() {
        const data = getAnalyticsForUser(user.email, user.role);
        const status = data.status || {};

        setText("totalRequests", data.total || 0);
        setText("pending", status.pending || 0);
        setText("inProgress", status.inProgress || 0);
        setText("completed", status.completed || 0);
        setText("cancelled", status.cancelled || 0);
        setText("closed", status.closed || 0);
        setText("reopened", data.reopened || 0);
        setText("completionRate", `${data.completionRate || 0}%`);

        renderList("categoryList", data.category, "No maintenance requests yet.");
        renderList("dormList", data.dorm, "No dorm activity yet.");

        const recent = document.getElementById("recentActivity");
        if (recent) {
            recent.innerHTML = "";
            (data.recent || []).forEach(ticket => {
                const studentClosed =
                    !isStaff &&
                    ticket.status === "Completed" &&
                    ticket.feedback === "positive" &&
                    ticket.feedback_given === true;
                const displayStatus = studentClosed ? "Closed" : ticket.status;
                const item = document.createElement("li");
                item.innerHTML = `
                    <div>
                        <strong>${escapeHtml(ticket.ticket_number)}</strong>
                        <span>${escapeHtml(ticket.category)} · ${escapeHtml(ticket.dorm || "N/A")} ${ticket.room_number ? `· Room ${escapeHtml(ticket.room_number)}` : ""}</span>
                    </div>
                    <span class="ticket-status status-${String(displayStatus).toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(displayStatus)}</span>`;
                recent.appendChild(item);
            });
            if (!recent.children.length) recent.innerHTML = `<li class="analytics-empty">No recent activity.</li>`;
        }

        const resolution = document.getElementById("resolutionMetric");
        if (resolution) resolution.textContent = data.averageResolutionDays > 0 ? `${data.averageResolutionDays} days` : "—";

        const feedback = document.getElementById("feedbackMetric");
        if (feedback) feedback.textContent = `${data.positiveFeedback || 0} 👍 / ${data.negativeFeedback || 0} 👎`;

        const categoryTitle = document.getElementById("categoryTitle");
        if (categoryTitle) categoryTitle.textContent = isStaff ? "Requests by Category" : "My Issues by Category";
        const dormTitle = document.getElementById("dormTitle");
        if (dormTitle) dormTitle.textContent = isStaff ? "Requests by Dorm" : "My Requests by Dorm";
    }

    render();
    window.addEventListener("pageshow", () => {
        const active = getCurrentUser?.();
        if (isExplicitlyLoggedOut?.() || !active) {
            routeToLogin();
            return;
        }
        if (active.email !== user.email) {
            window.location.reload();
            return;
        }
        render();
    });
    window.addEventListener("storage", () => {
        if (isExplicitlyLoggedOut?.()) {
            routeToLogin();
            return;
        }
        render();
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !isExplicitlyLoggedOut?.()) {
            render();
        }
    });
})();
