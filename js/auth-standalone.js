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

    const { getCurrentUser, login, getRecentAccounts, forgetRecentAccount, getUserByEmail } = store;

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
                return "index.html";
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
            const row = document.createElement("div");
            row.className = "recent-account";
            row.innerHTML = `
                <button type="button" class="recent-account-select" data-email="${escapeHtml(account.email)}" data-role="${escapeHtml(account.account_type)}" aria-label="Sign in as ${escapeHtml(account.email)}">
                    <span class="recent-account-avatar" aria-hidden="true">${account.email.charAt(0).toUpperCase()}</span>
                    <span class="recent-account-details">
                        <strong>${escapeHtml(account.email)}</strong>
                        <small>${roleLabel(account.account_type)} · Click to sign in</small>
                    </span>
                </button>
                <button type="button" class="recent-account-remove" data-email="${escapeHtml(account.email)}" aria-label="Remove ${escapeHtml(account.email)} from remembered accounts">×</button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll(".recent-account-select").forEach(button => {
            button.addEventListener("click", () => {
                const emailField = document.getElementById("loginEmail");
                const passwordField = document.getElementById("loginPassword");
                const roleField = document.getElementById("loginRole");
                const form = document.getElementById("loginForm");
                const account = getUserByEmail(button.dataset.email);

                if (emailField) emailField.value = button.dataset.email;
                if (roleField) roleField.value = button.dataset.role;
                if (passwordField) passwordField.value = account?.password || "";
                clearMessage();

                // A remembered account is a true quick-switch control: populate
                // every credential field and immediately run the same successful
                // login flow used by the normal Login button.
                if (account?.password && form) {
                    form.requestSubmit();
                } else if (passwordField) {
                    passwordField.focus();
                    showMessage("This older remembered account needs its password entered once before quick sign-in can be enabled.");
                }
            });
        });

        container.querySelectorAll(".recent-account-remove").forEach(button => {
            button.addEventListener("click", () => {
                forgetRecentAccount(button.dataset.email);
                renderRecentAccounts();
            });
        });
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

    function initialize() {
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

        form.addEventListener("submit", async event => {
            // Chrome and other password managers are much more reliable when
            // the successful login is completed as a real HTML form submission.
            // We therefore validate/authenticate locally first, then allow the
            // native POST to /__login on the included localhost demo server.
            // The server immediately redirects to the appropriate dashboard and
            // never persists the submitted password.
            if (form.dataset.nativeSubmit === "true") return;

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

            // Let the browser see an actual successful password-form POST.
            // This is the key difference from the previous implementation,
            // which intercepted every submission with JavaScript.
            if (window.location.protocol === "http:" &&
                (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
                const destination = routeByRole(result.user.role);
                let destinationField = form.querySelector('input[name="destination"]');
                if (!destinationField) {
                    destinationField = document.createElement("input");
                    destinationField.type = "hidden";
                    destinationField.name = "destination";
                    form.appendChild(destinationField);
                }
                destinationField.value = destination;
                form.dataset.nativeSubmit = "true";
                HTMLFormElement.prototype.submit.call(form);
                return;
            }

            // Static-host fallback (e.g. GitHub Pages): retain the local demo
            // behavior when no POST-capable demo server is available.
            window.location.replace(routeByRole(result.user.role));
        });

        renderRecentAccounts();

        // If a valid session exists, continue to the correct dashboard.
        const currentUser = getCurrentUser();
        if (currentUser) {
            window.location.replace(routeByRole(currentUser.role));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
