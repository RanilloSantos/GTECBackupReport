/* Shared SweetAlert2 helpers for the backup monitoring UI. */
window.BackupAlerts = (() => {
    const toast = (icon, title, text = "") => Swal.fire({
        icon,
        title,
        text,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3200,
        timerProgressBar: true
    });

    const confirm = async ({ title, text, confirmText = "Continue", icon = "warning" }) => {
        const result = await Swal.fire({
            icon,
            title,
            text,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: "Cancel",
            reverseButtons: true,
            focusCancel: true
        });
        return result.isConfirmed;
    };

    const bindFormConfirmations = (selector = "form[data-confirm]") => {
        document.querySelectorAll(selector).forEach((form) => {
            form.addEventListener("submit", async (event) => {
                if (form.dataset.confirmed === "true") {
                    delete form.dataset.confirmed;
                    return;
                }

                event.preventDefault();
                const approved = await confirm({
                    title: form.dataset.confirmTitle || "Are you sure?",
                    text: form.dataset.confirm,
                    confirmText: form.dataset.confirmButton || "Continue"
                });

                if (approved) {
                    form.dataset.confirmed = "true";
                    form.requestSubmit(submitter || undefined);
                }
            });
        });
    };

    return { success: (title, text) => toast("success", title, text), error: (title, text) => toast("error", title, text), info: (title, text) => toast("info", title, text), confirm, bindFormConfirmations };
})();

document.addEventListener("DOMContentLoaded", () => {
    BackupAlerts.bindFormConfirmations();
    const flash = document.getElementById("backup-flash-message");
    if (!flash) return;
    const kind = flash.dataset.kind;
    const message = flash.dataset.message;
    if (!message) return;
    if (kind === "success") BackupAlerts.success(message);
    else if (kind === "error") BackupAlerts.error(message);
    else BackupAlerts.info(message);
});

