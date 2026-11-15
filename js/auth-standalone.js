/*
 * FixRoomAUN Portfolio Demo — local login controller
 *
 * The login page intentionally uses the same local data layer as the
 * dashboards. No Supabase, email verification, or external authentication
 * service is required for this portfolio demo.
 */
(() => {
    "use strict";

    const store = window.FixRoomStore;
    if (!store) {
        console.error("FixRoomAUN: local data layer is unavailable.");
        return;
    }

    const {
        getCurrentUser,
        startWithDemoStudent,
        isPinnedDemoAccount,
        login,
        getRecentAccounts,
        forgetRecentAccount,
        getUserByEmail
    } = store;

    function routeByRole(role) {
        switch (role) {
            case "student":
                return "dashboard.html";
            case "maintenance_staff":
                return "staff.html";
            case "maintenance_head":
            case "overall_admin":
                return "admin.html";
            default:
                return "dashboard.html";
        }
    }

    function showMessage(message, type = "error") {
        const element = document.getElementById("loginMessage");
        if (!element) {
            alert(message);
            return;
        }
        element.hidden = false;
        element.textContent = message;
        element.dataset.type = type;
    }

    function clearMessage() {
        const element = document.getElementById("loginMessage");
        if (!element) return;
        element.hidden = true;
        element.textContent = "";
        delete element.dataset.type;
    }

    function roleLabel(accountType) {
        return accountType === "staff" ? "Staff" : "Student";
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

    function performQuickLogin(email, role) {
        const emailField = document.getElementById("loginEmail");
        const passwordField = document.getElementById("loginPassword");
        const roleField = document.getElementById("loginRole");
        const account = getUserByEmail(email);
        const password = account?.password || (isPinnedDemoAccount?.(email) ? "Demo123!" : "");

        if (emailField) emailField.value = email;
        if (roleField) roleField.value = role;
        if (passwordField) passwordField.value = password;
        clearMessage();

        if (password) {
            const result = login(email, password, role);
            if (result.error) {
                showMessage(result.error);
                return;
            }
            window.location.replace(routeByRole(result.user.role));
        } else if (passwordField) {
            passwordField.focus();
            showMessage("Enter the password for this account once to enable quick sign-in.");
        }
    }

    function renderRecentAccounts() {
        const container = document.getElementById("recentAccounts");
        if (!container) return;

        const accounts = getRecentAccounts();
        container.innerHTML = "";

        if (!accounts.length) {
            container.innerHTML = `
                <div class="recent-empty">
                    <strong>No previously logged in accounts</strong>
                    <span>Accounts used on this browser will appear here.</span>
                </div>`;
            return;
        }

        accounts.forEach(account => {
            const pinned = Boolean(account.pinned || isPinnedDemoAccount?.(account.email));
            const row = document.createElement("div");
            row.className = "recent-account";
            row.innerHTML = `
                <button type="button" class="recent-account-select" data-email="${escapeHtml(account.email)}" data-role="${escapeHtml(account.account_type)}" aria-label="Sign in as ${escapeHtml(account.email)}">
                    <span class="recent-account-avatar" aria-hidden="true">${escapeHtml(account.email.charAt(0).toUpperCase())}</span>
                    <span class="recent-account-details">
                        <strong>${escapeHtml(account.email)}</strong>
                        <small>${roleLabel(account.account_type)}${pinned ? " · Demo Account" : ""} · Click to sign in</small>
                    </span>
                </button>
                ${pinned ? "" : `<button type="button" class="recent-account-remove" data-email="${escapeHtml(account.email)}" aria-label="Remove ${escapeHtml(account.email)} from remembered accounts">×</button>`}
            `;
            container.appendChild(row);
        });

        container.querySelectorAll(".recent-account-select").forEach(button => {
            button.addEventListener("click", () => {
                performQuickLogin(button.dataset.email, button.dataset.role);
            });
        });

        container.querySelectorAll(".recent-account-remove").forEach(button => {
            button.addEventListener("click", () => {
                forgetRecentAccount(button.dataset.email);
                renderRecentAccounts();
            });
        });
    }

    function initialize() {
        const params = new URLSearchParams(window.location.search);
        const explicitlyLoggedOut = params.has("logged_out");

        if (!explicitlyLoggedOut) {
            const demoStudent = startWithDemoStudent();
            window.location.replace(routeByRole(demoStudent?.role || "student"));
            return;
        }

        const form = document.getElementById("loginForm");
        const emailInput = document.getElementById("loginEmail");
        const passwordInput = document.getElementById("loginPassword");
        const roleInput = document.getElementById("loginRole");

        if (!form || !emailInput || !passwordInput || !roleInput) return;

        document.querySelectorAll(".toggle-password").forEach(toggle => {
            toggle.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                const input = document.getElementById(toggle.dataset.target);
                if (!input) return;

                const showing = input.type === "password";
                input.type = showing ? "text" : "password";
                toggle.textContent = showing ? "🙈" : "👁";
                toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
                toggle.setAttribute("aria-pressed", String(showing));
            });
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            event.stopPropagation();
            clearMessage();

            const button = form.querySelector('button[type="submit"]');
            if (button) {
                button.disabled = true;
                button.textContent = "Logging in…";
            }

            const result = login(
                emailInput.value,
                passwordInput.value,
                roleInput.value
            );

            if (result.error) {
                showMessage(result.error);
                if (button) {
                    button.disabled = false;
                    button.textContent = "Login";
                }
                return;
            }

            window.location.replace(routeByRole(result.user.role));
        });

        renderRecentAccounts();

        const currentUser = getCurrentUser();
        if (currentUser && !explicitlyLoggedOut) {
            window.location.replace(routeByRole(currentUser.role));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
