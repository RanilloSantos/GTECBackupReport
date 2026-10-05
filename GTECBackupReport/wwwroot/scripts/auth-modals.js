(() => {
    const clearErrors = form => {
        form.querySelectorAll(".auth-field-error").forEach(node => { node.textContent = ""; });
        form.querySelectorAll(".is-invalid").forEach(node => node.classList.remove("is-invalid"));
        const summary = form.closest(".modal-body").querySelector(".auth-validation-summary");
        summary.replaceChildren();
        summary.hidden = true;
    };

    const showErrors = (form, html) => {
        const page = new DOMParser().parseFromString(html, "text/html");
        let hasErrors = false;
        page.querySelectorAll("[data-valmsg-for]").forEach(source => {
            const message = source.textContent.trim();
            if (!message) return;
            const target = form.querySelector(`[data-validation-for="${source.dataset.valmsgFor}"]`);
            if (target) {
                target.textContent = message;
                target.previousElementSibling?.classList.add("is-invalid");
                hasErrors = true;
            }
        });
        const summaryItems = [...page.querySelectorAll(".validation-summary-errors li")]
            .map(item => item.textContent.trim()).filter(Boolean);
        if (summaryItems.length) {
            const summary = form.closest(".modal-body").querySelector(".auth-validation-summary");
            summary.textContent = summaryItems.join(" ");
            summary.hidden = false;
            hasErrors = true;
        }
        if (!hasErrors) {
            const summary = form.closest(".modal-body").querySelector(".auth-validation-summary");
            summary.textContent = "We could not complete that request. Check your details and try again.";
            summary.hidden = false;
        }
    };

    document.querySelectorAll(".auth-modal").forEach(modal => {
        modal.addEventListener("hidden.bs.modal", () => {
            const form = modal.querySelector("form");
            if (!form) return;
            form.reset();
            clearErrors(form);
        });
        modal.addEventListener("shown.bs.modal", () => modal.querySelector("input:not([type=hidden])")?.focus());
    });

    document.querySelectorAll(".auth-modal form").forEach(form => {
        form.addEventListener("submit", async event => {
            event.preventDefault();
            clearErrors(form);
            if (!form.reportValidity()) return;
            const submit = form.querySelector(".auth-submit");
            const originalText = submit.textContent;
            submit.disabled = true;
            submit.textContent = "Please wait…";
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin",
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });
                const finalUrl = new URL(response.url, window.location.href);
                const stayedOnAuthPage = /\/Identity\/Account\/(Login|Register)(\/|$)/i.test(finalUrl.pathname);
                if (response.redirected && !stayedOnAuthPage) {
                    window.location.assign(finalUrl.href);
                    return;
                }
                showErrors(form, await response.text());
            } catch {
                const summary = form.closest(".modal-body").querySelector(".auth-validation-summary");
                summary.textContent = "We could not reach the server. Check your connection and try again.";
                summary.hidden = false;
            } finally {
                submit.disabled = false;
                submit.textContent = originalText;
            }
        });
    });

    document.querySelectorAll("[data-auth-switch]").forEach(button => {
        button.addEventListener("click", () => {
            const current = button.closest(".auth-modal");
            const target = document.getElementById(button.dataset.authSwitch === "login" ? "loginModal" : "registerModal");
            if (!target || !window.bootstrap) return;
            if (!current || current === target) {
                bootstrap.Modal.getOrCreateInstance(target).show();
                return;
            }
            current.addEventListener("hidden.bs.modal", () => {
                bootstrap.Modal.getOrCreateInstance(target).show();
            }, { once: true });
            bootstrap.Modal.getOrCreateInstance(current).hide();
        });
    });
    const auth = new URLSearchParams(window.location.search).get("auth");
    const modalId = auth === "login" ? "loginModal" : auth === "register" ? "registerModal" : null;
    if (modalId) {
        const element = document.getElementById(modalId);
        if (element && window.bootstrap) bootstrap.Modal.getOrCreateInstance(element).show();
        history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
})();