(() => {
    const defaults = [
        { id: "onesys", name: "GTEC OneSys", patterns: "GTECOnesys*", folder: "", color: "onesys", schedule: "Daily", active: true },
        { id: "mongo", name: "GTEC MongoDB", patterns: "GTEC_PROD_database*", folder: "", color: "mongo", schedule: "Daily", active: true },
        { id: "gtec", name: "GTEC", patterns: "GTEC_backup*", folder: "", color: "gtec", schedule: "Daily", active: true }
    ];
    const storageKey = "gtec-backup-database-mappings";
    const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const load = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (Array.isArray(stored)) return stored;
        } catch { /* Use the built-in examples when browser storage is unavailable. */ }
        return defaults.map(item => ({ ...item }));
    };
    let mappings = load();
    const save = next => {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); }
        catch { window.BackupAlerts.error("Could not save mappings", "Browser storage is unavailable."); return false; }
        mappings = next;
        window.dispatchEvent(new CustomEvent("backup:mappings-changed", { detail: mappings }));
        return true;
    };
    const escapePattern = pattern => pattern.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
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
        <p class="mapping-note">Map database names to filename patterns. A match gives the report row its database label and marker color.</p>
        <input class="mapping-search" id="mapping-search" type="search" placeholder="Search mappings by name or pattern" aria-label="Search mappings">
        <div class="mapping-list" id="mapping-list"></div>
        <button class="mapping-add" id="mapping-new" type="button">Add database mapping</button>
        <p class="mapping-storage-note">Prototype storage: mappings stay in this browser. They are not shared with other users until server settings are connected.</p>`;
    const openSettings = async () => {
        const draft = mappings.map(item => ({ ...item }));
        const result = await Swal.fire({
            title: "Database file mappings", html: modalMarkup(), width: 760,
            showCancelButton: true, confirmButtonText: "Save mappings", cancelButtonText: "Cancel", focusConfirm: false,
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
                search.addEventListener("input", renderList);
                $("mapping-new").addEventListener("click", () => openEditor());
                renderList();
            },
            preConfirm: () => save(draft) || false
        });
        if (result.isConfirmed) window.BackupAlerts.success("Mappings saved", "These settings are saved in this browser.");
        return result;
    };
    window.BackupMappingStore = { getAll: () => mappings.map(item => ({ ...item })), resolve, openSettings };
    document.addEventListener("DOMContentLoaded", () => document.getElementById("mapping-settings")?.addEventListener("click", openSettings));
})();







