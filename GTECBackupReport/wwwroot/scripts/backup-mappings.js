(() => {
    const defaults = [
        { id: "onesys", name: "GTEC OneSys", patterns: "GTECOnesys*", folder: "", color: "onesys", schedule: "Daily", active: true },
        { id: "mongo", name: "GTEC MongoDB", patterns: "GTEC_PROD_database*", folder: "", color: "mongo", schedule: "Daily", active: true },
        { id: "gtec", name: "GTEC", patterns: "GTEC_backup*", folder: "", color: "gtec", schedule: "Daily", active: true }
    ];
    const storageKey = "gtec-backup-database-mappings";
    const formatStorageKey = "gtec-backup-file-formats";
    const defaultFormats = [".bak", ".archive", ".zip"];
    const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const load = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (Array.isArray(stored)) return stored;
        } catch { /* Use the built-in examples when browser storage is unavailable. */ }
        return defaults.map(item => ({ ...item }));
    };
    let mappings = load();
    const loadFormats = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(formatStorageKey));
            if (Array.isArray(stored)) return stored;
        } catch { /* Use the built-in examples when browser storage is unavailable. */ }
        return defaultFormats.map(extension => ({ extension, active: true }));
    };
    let formats = loadFormats();
    const save = (nextMappings, nextFormats) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(nextMappings));
            localStorage.setItem(formatStorageKey, JSON.stringify(nextFormats));
        } catch { window.BackupAlerts.error("Could not save settings", "Browser storage is unavailable."); return false; }
        mappings = nextMappings;
        formats = nextFormats;
        window.dispatchEvent(new CustomEvent("backup:mappings-changed", { detail: mappings }));
        window.dispatchEvent(new CustomEvent("backup:formats-changed", { detail: formats }));
        return true;
    };    const escapePattern = pattern => pattern.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    const matches = (filename, pattern) => {
        try { return new RegExp(`^${escapePattern(pattern.trim())}$`, "i").test(filename); }
        catch { return false; }
    };
    const resolve = (filename, expectedName, folderPath = "") => {
        if (filename) {
            const found = mappings.filter(mapping => mapping.active && (!mapping.folder || folderPath.toLowerCase().includes(mapping.folder.toLowerCase())) && mapping.patterns.split(/[;,\n]/).map(p => p.trim()).filter(Boolean).some(pattern => matches(filename, pattern)));
            if (found.length === 1) return { mapping: found[0], ambiguous: false };
            if (found.length > 1) return { mapping: null, ambiguous: true };
            return { mapping: null, ambiguous: false };
        }
        return { mapping: mappings.find(mapping => mapping.name === expectedName) || null, ambiguous: false };
    };
    const modalMarkup = () => `
        <nav class="settings-tabs" role="tablist" aria-label="Backup settings">
            <button class="settings-tab active" type="button" role="tab" aria-selected="true" aria-controls="mappings-panel" data-settings-tab="mappings">Database mappings</button>
            <button class="settings-tab" type="button" role="tab" aria-selected="false" aria-controls="formats-panel" data-settings-tab="formats">File formats</button>
        </nav>
        <section class="settings-panel" id="mappings-panel" role="tabpanel" data-settings-panel="mappings">
            <p class="mapping-note">Map database names to filename patterns. A match gives each report row its database label and marker color.</p>
            <input class="mapping-search" id="mapping-search" type="search" placeholder="Search mappings by name or pattern" aria-label="Search mappings">
            <div class="mapping-list" id="mapping-list"></div>
            <button class="mapping-add" id="mapping-new" type="button">Add database mapping</button>
            <p class="mapping-storage-note">Database mappings are currently saved in this browser only.</p>
        </section>
        <section class="settings-panel" id="formats-panel" role="tabpanel" data-settings-panel="formats" hidden>
            <p class="mapping-note">Choose which filename extensions the report recognizes. Active formats appear in the File format filter.</p>
            <form class="format-add-form" id="format-add-form"><label for="format-new-input">Add a file extension</label><div><input id="format-new-input" type="text" placeholder="For example: .bak or .tar.gz" autocomplete="off"><button class="mapping-add" type="submit">Add format</button></div><small id="format-error" role="status"></small></form>
            <div class="format-list" id="format-list"></div>
            <p class="mapping-storage-note">File formats are currently saved in this browser only.</p>
        </section>`;    const openSettings = async () => {
        const draft = mappings.map(item => ({ ...item }));
        const formatDraft = formats.map(item => ({ ...item }));
        const result = await Swal.fire({
            title: "Backup settings", html: modalMarkup(), width: 760,
            showCancelButton: true, confirmButtonText: "Save settings", cancelButtonText: "Cancel", focusConfirm: false,
            didOpen: popup => {
                const $ = id => popup.querySelector(`#${id}`);
                const list = $("mapping-list"), search = $("mapping-search");
                const openEditor = (item = {}) => {
                    const backdrop = document.createElement("div");
                    backdrop.className = "mapping-editor-backdrop";
                    backdrop.innerHTML = '<section class="mapping-editor" role="dialog" aria-modal="true" aria-labelledby="mapping-editor-title"><header class="mapping-editor-header"><span class="mapping-editor-icon">&#8226;</span><div><p>DATABASE SETUP</p><h3 id="mapping-editor-title">' + (item.id ? 'Edit database mapping' : 'Add Database Mapping') + '</h3><small>Connect a database name to the backup files you expect to find.</small></div></header><form class="mapping-form" id="mapping-form"><label>Database name<input id="mapping-name" required maxlength="80" placeholder="Example: GTEC OneSys"></label><label>Filename patterns<input id="mapping-patterns" required maxlength="300" placeholder="Example: GTECOnesys*; Onesys*.bak"></label><p class="mapping-field-help">Use * as a wildcard. Separate multiple patterns with a semicolon.</p><label>Marker color<select id="mapping-color"><option value="onesys">Blue</option><option value="gtec">Green</option><option value="mongo">Purple</option><option value="other">Gray</option></select></label><label>Expected schedule<select id="mapping-schedule"><option>Daily</option><option>Weekdays</option><option>Weekly</option></select></label><label>Folder scope (optional)<input id="mapping-folder" maxlength="300" placeholder="Subfolder under monitored root"></label><div class="mapping-editor-actions"><button class="mapping-cancel" type="button">Cancel</button><button class="mapping-add" type="submit">' + (item.id ? 'Save changes' : 'Add mapping') + '</button></div></form></section>';
                    popup.appendChild(backdrop);
                    const field = id => backdrop.querySelector('#' + id);
                    field('mapping-name').value = item.name || '';
                    field('mapping-patterns').value = item.patterns || '';
                    field('mapping-folder').value = item.folder || '';
                    field('mapping-color').value = item.color || 'onesys';
                    field('mapping-schedule').value = item.schedule || 'Daily';
                    const close = () => backdrop.remove();
                    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
                    backdrop.querySelector('.mapping-cancel').addEventListener('click', close);
                    field('mapping-form').addEventListener('submit', event => {
                        event.preventDefault();
                        const id = item.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'mapping-' + Date.now());
                        const next = { id, name: field('mapping-name').value.trim(), patterns: field('mapping-patterns').value.trim(), color: field('mapping-color').value, schedule: field('mapping-schedule').value, folder: field('mapping-folder').value.trim(), active: item.id ? item.active : true };
                        if (!next.name || !next.patterns) return;
                        const index = draft.findIndex(entry => entry.id === id);
                        if (index >= 0) draft[index] = { ...draft[index], ...next }; else draft.push(next);
                        close(); renderList();
                    });
                    field('mapping-name').focus();
                };                const renderList = () => {
                    const query = search.value.trim().toLowerCase();
                    const visible = draft.filter(item => `${item.name} ${item.patterns} ${item.folder}`.toLowerCase().includes(query));
                    list.innerHTML = visible.length ? visible.map(item => `<div class="mapping-row"><i class="file-group-dot ${escapeHtml(item.color)}"></i><div><strong>${escapeHtml(item.name)}${item.active ? "" : " · Inactive"}</strong><small>${escapeHtml(item.patterns)}${item.schedule ? ` · ${escapeHtml(item.schedule)}` : ""}</small></div><button type="button" data-edit="${escapeHtml(item.id)}">Edit</button><button type="button" data-toggle="${escapeHtml(item.id)}">${item.active ? "Deactivate" : "Activate"}</button><button type="button" class="mapping-delete" data-delete="${escapeHtml(item.id)}">Delete</button></div>`).join("") : `<p class="mapping-note">No mappings match this search.</p>`;
                    list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
                        const item = draft.find(entry => entry.id === button.dataset.edit); if (!item) return;

                        openEditor(item);

                    }));
                    list.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => {
                        const item = draft.find(entry => entry.id === button.dataset.toggle); if (!item) return;
                        item.active = !item.active; renderList();
                    }));
                    list.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
                        const item = draft.find(entry => entry.id === button.dataset.delete); if (!item) return;
                        const backdrop = document.createElement("div");
                        backdrop.className = "mapping-editor-backdrop mapping-delete-backdrop";
                        backdrop.innerHTML = '<section class="mapping-editor mapping-delete-dialog" role="dialog" aria-modal="true"><span class="mapping-delete-icon">!</span><h3>Delete this mapping?</h3><p>The mapping for <strong>' + escapeHtml(item.name) + '</strong> will be removed when you save these settings.</p><div class="mapping-editor-actions"><button type="button" class="mapping-cancel">Keep mapping</button><button type="button" class="mapping-confirm-delete">Delete mapping</button></div></section>';
                        popup.appendChild(backdrop);
                        const close = () => backdrop.remove();
                        backdrop.querySelector(".mapping-cancel").addEventListener("click", close);
                        backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
                        backdrop.querySelector(".mapping-confirm-delete").addEventListener("click", () => {
                            draft.splice(draft.findIndex(entry => entry.id === item.id), 1);
                            close(); renderList();
                        });
                    }));
                };
                const formatList = $("format-list"), formatForm = $("format-add-form"), formatInput = $("format-new-input"), formatError = $("format-error");
                const renderFormats = () => {
                    formatList.innerHTML = formatDraft.length ? formatDraft.map(item => `<div class="format-row"><div><strong>${escapeHtml(item.extension)}</strong><small>${item.active ? "Included in monitored formats" : "Not shown in the filter"}</small></div><label><input type="checkbox" data-format-toggle="${escapeHtml(item.extension)}" ${item.active ? "checked" : ""}> Monitor</label><button class="mapping-delete" type="button" data-format-delete="${escapeHtml(item.extension)}">Remove</button></div>`).join("") : `<p class="mapping-note">No file formats configured yet.</p>`;
                    formatList.querySelectorAll("[data-format-toggle]").forEach(input => input.addEventListener("change", () => {
                        const item = formatDraft.find(entry => entry.extension === input.dataset.formatToggle); if (!item) return;
                        item.active = input.checked; renderFormats();
                    }));
                    formatList.querySelectorAll("[data-format-delete]").forEach(button => button.addEventListener("click", () => {
                        const item = formatDraft.find(entry => entry.extension === button.dataset.formatDelete); if (!item) return;
                        const backdrop = document.createElement("div");
                        backdrop.className = "mapping-editor-backdrop mapping-delete-backdrop";
                        backdrop.innerHTML = '<section class="mapping-editor mapping-delete-dialog" role="dialog" aria-modal="true"><span class="mapping-delete-icon">!</span><h3>Remove this file format?</h3><p><strong>' + escapeHtml(item.extension) + '</strong> will be removed from the monitored formats when you save settings.</p><div class="mapping-editor-actions"><button type="button" class="mapping-cancel">Keep format</button><button type="button" class="mapping-confirm-delete">Remove format</button></div></section>';
                        popup.appendChild(backdrop);
                        const close = () => backdrop.remove();
                        backdrop.querySelector(".mapping-cancel").addEventListener("click", close);
                        backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
                        backdrop.querySelector(".mapping-confirm-delete").addEventListener("click", () => {
                            formatDraft.splice(formatDraft.findIndex(entry => entry.extension === item.extension), 1);
                            close(); renderFormats();
                        });
                    }));
                };
                formatForm.addEventListener("submit", event => {
                    event.preventDefault();
                    let extension = formatInput.value.trim().toLowerCase();
                    if (extension && !extension.startsWith(".")) extension = "." + extension;
                    if (!/^\.[a-z0-9][a-z0-9._+-]*$/i.test(extension)) { formatError.textContent = "Enter an extension such as .bak or .tar.gz."; return; }
                    if (formatDraft.some(item => item.extension.toLowerCase() === extension)) { formatError.textContent = "That extension is already configured."; return; }
                    formatDraft.push({ extension, active: true });
                    formatInput.value = ""; formatError.textContent = ""; renderFormats(); formatInput.focus();
                });
                popup.querySelectorAll("[data-settings-tab]").forEach(tab => tab.addEventListener("click", () => {
                    const active = tab.dataset.settingsTab;
                    popup.querySelectorAll("[data-settings-tab]").forEach(item => { const selected = item === tab; item.classList.toggle("active", selected); item.setAttribute("aria-selected", String(selected)); });
                    popup.querySelectorAll("[data-settings-panel]").forEach(panel => { panel.hidden = panel.dataset.settingsPanel !== active; });
                }));                search.addEventListener("input", renderList);
                $("mapping-new").addEventListener("click", () => openEditor());
                renderList();
                renderFormats();
            },
            preConfirm: () => save(draft, formatDraft) || false
        });
        if (result.isConfirmed) window.BackupAlerts.success("Settings saved", "These settings are saved in this browser.");
        return result;
    };
    window.BackupMappingStore = { getAll: () => mappings.map(item => ({ ...item })), getFormats: () => formats.map(item => ({ ...item })), resolve, openSettings };
    document.addEventListener("DOMContentLoaded", () => document.getElementById("mapping-settings")?.addEventListener("click", openSettings));
})();







