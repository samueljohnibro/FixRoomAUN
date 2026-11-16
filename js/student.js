(() => {
    "use strict";

    const store = window.FixRoomStore;
    if (!store) {
        console.error("FixRoomAUN: demo data layer is unavailable.");
        window.location.replace("index.html?logged_out=1");
        return;
    }

    const {
        getCurrentUser,
        startWithDemoStudent,
        isExplicitlyLoggedOut,
        mountAccountSwitcher,
        routeByRole,
        logout,
        getHousing,
        getStudentProfile,
        getTicketsForStudent,
        createTicket,
        updateTicket,
        deleteTicket
    } = store;

    function routeToLogin() {
        window.location.replace("index.html?logged_out=1");
    }

    function getActiveStudent() {
        let current = getCurrentUser();
        if (!current && !isExplicitlyLoggedOut?.()) {
            current = startWithDemoStudent?.() || null;
        }
        if (!current) {
            routeToLogin();
            return null;
        }
        if (current.role !== "student") {
            if (current.role === "maintenance_staff") {
                window.location.replace("staff.html");
            } else if (["maintenance_head", "overall_admin"].includes(current.role)) {
                window.location.replace("admin.html");
            } else {
                routeToLogin();
            }
            return null;
        }
        return current;
    }

    const user = getActiveStudent();
    if (!user) return;

    const $ = id => document.getElementById(id);

    const studentEmailSpan = $("studentEmail");
    const logoutBtn = $("logoutBtn");
    const popupDorm = $("popupDorm");
    const popupRoom = $("popupRoom");
    const popupType = $("popupType");
    const popupName = $("popupName");
    const popupStudentId = $("popupStudentId");
    const popupFloor = $("popupFloor");
    const popupEmail = $("popupEmail");
    const popupHousingStatus = $("popupHousingStatus");

    const ticketList = $("ticketList");

    const modal = $("reportModal");
    const modalTitle = $("modalTitle");
    const modalItemImage = $("modalItemImage");
    const descriptionInput = $("issueDescription");
    const imageInput = $("issueImage");
    const imagePreview = $("imagePreview");
    const submitBtn = $("submitIssue");
    const closeBtn = $("closeModal");

    const confirmModal = $("confirmModal");
    const confirmMessage = $("confirmMessage");
    const confirmYes = $("confirmYes");
    const confirmNo = $("confirmNo");

    const negativeModal = $("negativeModal");
    const negativeTextarea = $("negativeDescription");
    const submitNegativeBtn = $("submitNegative");
    const cancelNegativeBtn = $("cancelNegative");

    let selectedItem = null;
    let selectedImageUrl = null;
    let pendingAction = null;
    let currentNegativeId = null;

    // Keep dialog state explicit for accessibility and reliable CSS stacking.
    if (modal) {
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-hidden", "true");
    }

    // Header identity is intentionally rendered explicitly so it cannot
    // disappear because of hover/popup styling.
    if (studentEmailSpan) {
        studentEmailSpan.textContent = user.email;
        studentEmailSpan.title = "Open profile details";
    }
    mountAccountSwitcher?.("accountSwitcher");

    function loadHousing() {
        const profile = getStudentProfile(user.email);
        const housing = profile?.housing || getHousing(user.email);

        if (popupDorm) popupDorm.textContent = housing?.dorm || "N/A";
        if (popupRoom) popupRoom.textContent = housing?.room_number || "N/A";
        if (popupType) popupType.textContent = housing?.room_type || "N/A";
        if (popupName) popupName.textContent = profile?.name || "Demo Student";
        if (popupStudentId) popupStudentId.textContent = profile?.student_id || "N/A";
        if (popupFloor) popupFloor.textContent = housing?.floor || "N/A";
        if (popupEmail) popupEmail.textContent = profile?.email || user.email;
        if (popupHousingStatus) popupHousingStatus.textContent = housing?.housing_status || "Assigned";

        return housing;
    }

    loadHousing();

    // Use replace() so a logged-out user cannot simply navigate back into a
    // stale dashboard. pageshow below handles browser back-cache as well.
    logoutBtn?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        logout();
        routeToLogin();
    });

    window.addEventListener("pageshow", () => {
        const current = getCurrentUser();
        if (isExplicitlyLoggedOut?.() || !current) {
            routeToLogin();
            return;
        }
        if (current.role !== "student") {
            window.location.replace(routeByRole?.(current.role) || "staff.html");
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

    function openConfirm(message, action) {
        if (!confirmModal || !confirmMessage) return;
        confirmMessage.textContent = message;
        pendingAction = action;
        confirmModal.classList.add("active");
        confirmModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeConfirm() {
        pendingAction = null;
        if (confirmModal) {
            confirmModal.classList.remove("active");
            confirmModal.setAttribute("aria-hidden", "true");
        }
        if (!modal?.classList.contains("active") && !negativeModal?.classList.contains("active")) {
            document.body.classList.remove("modal-open");
        }
    }

    confirmYes?.addEventListener("click", () => {
        const action = pendingAction;
        closeConfirm();
        if (typeof action === "function") action();
    });

    confirmNo?.addEventListener("click", closeConfirm);

    // Every item carries its own image path. This avoids relying on a second
    // mapping being kept in sync with the HTML.
    document.querySelectorAll(".grid-item").forEach(item => {
        const openReport = event => {
            event.preventDefault();

            selectedItem = item.dataset.item || "Maintenance Item";
            const imagePath =
                item.dataset.image ||
                item.querySelector("img")?.getAttribute("src") ||
                "assets/ac.png";

            descriptionInput.value = "";
            imageInput.value = "";
            selectedImageUrl = null;
            if (imagePreview) {
                imagePreview.removeAttribute("src");
                imagePreview.style.display = "none";
            }

            if (modalTitle) modalTitle.textContent = `Report Issue: ${selectedItem}`;

            if (modalItemImage) {
                modalItemImage.src = imagePath;
                modalItemImage.alt = selectedItem;
                modalItemImage.style.display = "block";
                modalItemImage.onerror = () => {
                    // If a renamed/moved asset is encountered, show the generic
                    // maintenance icon rather than leaving a broken image.
                    modalItemImage.onerror = null;
                    modalItemImage.src = "assets/fixroomaunlogo.png";
                };
            }

            loadHousing();
            if (modal) {
                modal.classList.add("active");
                modal.setAttribute("aria-hidden", "false");
                document.body.classList.add("modal-open");
            }
            window.setTimeout(() => descriptionInput?.focus(), 40);
        };

        item.addEventListener("click", openReport);
        item.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") openReport(event);
        });
    });

    imageInput?.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        selectedImageUrl = null;

        if (!file) {
            imagePreview.style.display = "none";
            return;
        }

        if (!file.type.startsWith("image/")) {
            imageInput.value = "";
            imagePreview.style.display = "none";
            alert("Please choose an image file.");
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            imageInput.value = "";
            imagePreview.style.display = "none";
            alert("Please choose an image under 4 MB for this offline demo.");
            return;
        }

        const reader = new FileReader();
        reader.onload = event => {
            selectedImageUrl = event.target.result;
            imagePreview.src = selectedImageUrl;
            imagePreview.alt = "Attached issue preview";
            imagePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    });

    function resetReportForm() {
        if (descriptionInput) descriptionInput.value = "";
        if (imageInput) imageInput.value = "";
        if (imagePreview) {
            imagePreview.removeAttribute("src");
            imagePreview.style.display = "none";
        }
        selectedItem = null;
        selectedImageUrl = null;
    }

    function closeReportModal() {
        if (modal) {
            modal.classList.remove("active");
            modal.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("modal-open");
        resetReportForm();
    }

    closeBtn?.addEventListener("click", event => {
        event.preventDefault();
        closeReportModal();
    });

    modal?.addEventListener("click", event => {
        if (event.target === modal) closeReportModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (modal?.classList.contains("active")) closeReportModal();
        if (negativeModal?.classList.contains("active")) {
            negativeModal.classList.remove("active");
            negativeModal.setAttribute("aria-hidden", "true");
            currentNegativeId = null;
            if (!modal?.classList.contains("active") && !confirmModal?.classList.contains("active")) {
                document.body.classList.remove("modal-open");
            }
        }
        if (confirmModal?.classList.contains("active")) closeConfirm();
    });

    submitBtn?.addEventListener("click", event => {
        event.preventDefault();

        const description = descriptionInput?.value.trim() || "";
        if (!selectedItem) {
            alert("Please select an item to report.");
            return;
        }
        if (!description) {
            alert("Please describe the issue.");
            descriptionInput?.focus();
            return;
        }

        // Ensure the profile exists immediately before creating the ticket.
        // This is the final guard against the old "valid housing" failure.
        const housing = loadHousing();
        if (!housing?.dorm || !housing?.room_number) {
            alert("Your demo housing could not be generated. Please log out and sign in again.");
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting…";

        try {
            const result = createTicket({
                studentEmail: user.email,
                category: selectedItem,
                description,
                imageUrl: selectedImageUrl
            });

            if (result.error) {
                alert(result.error);
                return;
            }

            closeReportModal();
            loadTickets();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    function escapeHtml(value = "") {
        return String(value).replace(/[&<>'"]/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char]));
    }

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

    function loadTickets() {
        if (!ticketList) return;

        const tickets = getTicketsForStudent(user.email);
        ticketList.innerHTML = "";

        if (!tickets.length) {
            ticketList.innerHTML =
                `<div class="empty-state"><strong>No maintenance requests yet.</strong><p>Your submitted requests will appear here.</p></div>`;
            return;
        }

        tickets.forEach(ticket => {
            // Positive student feedback closes the request from the student's
            // perspective, while the persisted staff workflow status remains
            // Completed so staff can continue to see it under Completed.
            const studentClosed = ticket.status === "Completed" && ticket.feedback === "positive" && ticket.feedback_given === true;
            const status = studentClosed ? "Closed" : ticket.status;
            let actionSection =
                `<span class="ticket-status status-${status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(status)}</span>`;

            if (status === "Pending") {
                actionSection += `<button type="button" class="cancel-btn" data-id="${escapeHtml(ticket.id)}">Cancel</button>`;
            } else if (ticket.status === "Completed" && !ticket.feedback_given) {
                actionSection =
                    `<span class="ticket-status status-completed">Completed</span>` +
                    `<div class="inline-feedback"><button type="button" class="thumb-inline" data-id="${escapeHtml(ticket.id)}" data-type="positive">👍</button><button type="button" class="thumb-inline" data-id="${escapeHtml(ticket.id)}" data-type="negative">👎</button></div>`;
            } else if (status === "Cancelled") {
                actionSection += `<button type="button" class="delete-btn" data-id="${escapeHtml(ticket.id)}">Delete</button>`;
            }

            const card = document.createElement("div");
            card.className = "ticket-card";
            card.innerHTML = `
                <div class="ticket-left">
                    <div class="ticket-item-image">
                        <img src="assets/${getCategoryIcon(ticket.category)}" alt="${escapeHtml(ticket.category)}">
                    </div>
                    <div class="ticket-info">
                        <strong>${escapeHtml(ticket.ticket_number)}</strong>
                        <p><b>Dorm:</b> ${escapeHtml(ticket.dorm || "N/A")}</p>
                        <p><b>Room:</b> ${escapeHtml(ticket.room_number || "N/A")}</p>
                        <p><b>Category:</b> ${escapeHtml(ticket.category)}</p>
                        <p><b>Description:</b> ${escapeHtml(ticket.description)}</p>
                        ${ticket.reopen_reason ? `<p><b>Reopen reason:</b> ${escapeHtml(ticket.reopen_reason)}</p>` : ""}
                        ${ticket.image_url ? `<img src="${ticket.image_url}" class="ticket-image" alt="Attached issue">` : ""}
                    </div>
                </div>
                <div class="ticket-right">${actionSection}</div>`;
            ticketList.appendChild(card);
        });

        ticketList.querySelectorAll(".cancel-btn").forEach(button => {
            button.addEventListener("click", () => {
                openConfirm("Are you sure you want to cancel this request?", () => {
                    const result = updateTicket(button.dataset.id, { status: "Cancelled" });
                    if (result.error) alert(result.error);
                    loadTickets();
                });
            });
        });

        ticketList.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", () => {
                openConfirm("Delete this cancelled request permanently?", () => {
                    const result = deleteTicket(button.dataset.id, user.email);
                    if (result.error) alert(result.error);
                    loadTickets();
                });
            });
        });

        ticketList.querySelectorAll(".thumb-inline").forEach(button => {
            button.addEventListener("click", () => {
                if (button.dataset.type === "positive") {
                    const result = updateTicket(button.dataset.id, {
                        feedback: "positive",
                        feedback_given: true
                    });
                    if (result.error) alert(result.error);
                    loadTickets();
                    return;
                }

                currentNegativeId = button.dataset.id;
                const ticket = getTicketsForStudent(user.email)
                    .find(item => item.id === currentNegativeId);

                if (negativeTextarea) {
                    // Start with the ticket's current description so the student
                    // can edit/improve it instead of having to rewrite the issue
                    // from scratch. The latest edited description becomes the
                    // new description when the request is reopened.
                    negativeTextarea.value = ticket?.description || ticket?.reopen_reason || "";
                    negativeTextarea.focus();
                    negativeTextarea.select();
                }
                if (negativeModal) {
                    negativeModal.classList.add("active");
                    negativeModal.setAttribute("aria-hidden", "false");
                }
                document.body.classList.add("modal-open");
            });
        });
    }

    submitNegativeBtn?.addEventListener("click", event => {
        event.preventDefault();

        const reason = negativeTextarea?.value.trim() || "";
        if (!reason) {
            alert("Please explain what is still wrong.");
            negativeTextarea?.focus();
            return;
        }

        const result = updateTicket(currentNegativeId, {
            feedback: "negative",
            feedback_given: true,
            description: reason,
            reopen_reason: reason,
            status: "Pending"
        });

        if (result.error) {
            alert(result.error);
            return;
        }

        currentNegativeId = null;
        if (negativeModal) {
            negativeModal.classList.remove("active");
            negativeModal.setAttribute("aria-hidden", "true");
        }
        if (!modal?.classList.contains("active") && !confirmModal?.classList.contains("active")) {
            document.body.classList.remove("modal-open");
        }
        loadTickets();
    });

    cancelNegativeBtn?.addEventListener("click", () => {
        currentNegativeId = null;
        if (negativeModal) {
            negativeModal.classList.remove("active");
            negativeModal.setAttribute("aria-hidden", "true");
        }
        if (!modal?.classList.contains("active") && !confirmModal?.classList.contains("active")) {
            document.body.classList.remove("modal-open");
        }
    });

    loadTickets();
})();
