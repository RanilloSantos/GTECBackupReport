(() => {
    const $ = id => document.getElementById(id);
    const ui = { rows: $("backup-rows"), search: $("search-term-input"), chips: $("search-terms"), source: $("source-filter"), status: $("status-filter"), format: $("format-filter"), from: $("date-from"), to: $("date-to"), range: $("date-control"), empty: $("empty-state"), emptyKicker: $("empty-kicker"), emptyTitle: $("empty-title"), emptyDescription: $("empty-description"), emptyClear: $("empty-clear"), scanner: $("scanner-status"), scannerDetail: $("scanner-detail"), size: $("page-size"), count: $("result-count"), summary: $("page-summary"), page: $("page-number"), prev: $("previous-page"), next: $("next-page"), periodText: $("period-summary"), printMeta: $("print-meta") };
    const state = { period: "week", sort: "date", descending: true, page: 1, printing: false, searchTerms: [], scanError: null };
    let scannedFiles = [];
    let allRows = [];
    const pad = n => String(n).padStart(2, "0");
    const key = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const mondayOf = d => { const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };
    const showDate = s => new Date(`${s}T12:00:00`).toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"});
    const showTime = s => s ? new Date(s).toLocaleString(undefined,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Not available";
    const mappingInfo=row=>{
        const result=window.BackupMappingStore.resolve(row.file,row.source,row.path);
        const name=result.ambiguous?"Unmapped":result.mapping?.name||(row.file?"Unmapped":row.source);
        return {...result,name,color:result.ambiguous||!result.mapping?"other":result.mapping.color,status:(result.ambiguous||(row.file&&!result.mapping))?"Unmapped":row.status};
    };
    const buildRows=()=>{
        const activeFormats=window.BackupMappingStore.getFormats().filter(item=>item.active).map(item=>item.extension.toLowerCase()).sort((a,b)=>b.length-a.length);
        const foundByMappingAndDate=new Set();
        const actualRows=scannedFiles.map(file=>{
            const resolved=window.BackupMappingStore.resolve(file.fileName,"",file.relativePath);
            if(resolved.mapping)foundByMappingAndDate.add(`${resolved.mapping.id}|${file.date}`);
            const lower=file.fileName.toLowerCase();
            const extension=activeFormats.find(item=>lower.endsWith(item))||file.extension||"";
            const dateObject=new Date(`${file.date}T12:00:00`);
            return {id:file.id,day:dateObject.toLocaleDateString(undefined,{weekday:"long"}),date:file.date,source:resolved.mapping?.name||"Unmapped",file:file.fileName,ext:extension,status:resolved.mapping?"Working":"Unmapped",backupAt:file.modifiedAt,foundAt:file.detectedAt,path:file.relativePath};
        });
        const range=bounds();
        const start=range.from?new Date(`${range.from}T12:00:00`):null;
        const end=range.to?new Date(`${range.to}T12:00:00`):null;
        const expectedRows=[];
        const activeMappings=window.BackupMappingStore.getAll().filter(item=>item.active);
        if(start&&end&&!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&start<=end){
            for(let cursor=new Date(start),days=0;cursor<=end&&days<366;cursor.setDate(cursor.getDate()+1),days++){
                const date=key(cursor),weekday=cursor.getDay(),day=cursor.toLocaleDateString(undefined,{weekday:"long"});
                for(const mapping of activeMappings){
                    const schedule=(mapping.schedule||"Daily").toLowerCase();
                    if(schedule==="weekdays"&&(weekday===0||weekday===6))continue;
                    if(schedule==="weekly"&&weekday!==1)continue;
                    if(!foundByMappingAndDate.has(`${mapping.id}|${date}`))expectedRows.push({id:`missing-${mapping.id}-${date}`,day,date,source:mapping.name,file:"",ext:"",status:"No Backup",backupAt:"",foundAt:"",path:mapping.folder||""});
                }
            }
        }
        return [...actualRows,...expectedRows];
    };
    const bounds=()=>{
        const today=new Date();
        if(state.period==="month")return{from:key(new Date(today.getFullYear(),today.getMonth(),1)),to:key(today),label:`${today.toLocaleDateString(undefined,{month:"long",year:"numeric"})} · month to date`};
        if(state.period==="custom")return{from:ui.from.value,to:ui.to.value,label:"Custom date range"};
        const weekStart=new Date(today.getFullYear(),today.getMonth(),today.getDate()-6);
        return{from:key(weekStart),to:key(today),label:`${showDate(key(weekStart))} – ${showDate(key(today))}`};
    };
    const filtered=()=>{
        const range=bounds(),terms=state.searchTerms.map(term=>term.toLocaleLowerCase());
        return allRows.filter(row=>{
            if(range.from&&row.date<range.from)return false;
            if(range.to&&row.date>range.to)return false;
            const mapped=mappingInfo(row);
            if(ui.source.value&&mapped.name!==ui.source.value)return false;
            if(ui.status.value&&mapped.status!==ui.status.value)return false;
            if(ui.format.value&&row.ext!==ui.format.value)return false;
            const haystack=`${row.day} ${row.date} ${mapped.name} ${row.file} ${row.ext} ${row.path}`.toLocaleLowerCase();
            return terms.length===0||terms.some(term=>haystack.includes(term));
        }).sort((a,b)=>{
            const read=row=>state.sort==="source"?mappingInfo(row).name:state.sort==="status"?mappingInfo(row).status:row[state.sort]||"";
            const order=String(read(a)).localeCompare(String(read(b)));
            return state.descending?-order:order;
        });
    };
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const details=row=>{
        const mapped=mappingInfo(row);
        return Swal.fire({title:"Backup record details",text:[`Database: ${mapped.name}`,`Expected date: ${showDate(row.date)}`,`Status: ${mapped.status}`,`File: ${row.file||"No matching file found"}`,`Format: ${row.ext||"Not available"}`,`Backup date/time: ${showTime(row.backupAt)}`,`Detected date/time: ${showTime(row.foundAt)}`,`Relative path: ${row.path}`].join("\n"),icon:mapped.status==="Working"?"info":"warning",confirmButtonText:"Close"});
    };
    const updateSortArrows=()=>document.querySelectorAll("[data-sort]").forEach(button=>{
        const active=button.dataset.sort===state.sort, arrow=button.querySelector(".sort-arrow");
        if(arrow)arrow.innerHTML=active?(state.descending?"&#8595;":"&#8593;"):"&#8597;";
        button.closest("th").setAttribute("aria-sort",active?(state.descending?"descending":"ascending"):"none");
    });
    const renderSearchTerms=()=>{
        ui.chips.innerHTML=state.searchTerms.map((term,index)=>`<button class="search-chip" type="button" data-remove-term="${index}" title="${esc(term)}"><span>${esc(term)}</span><b aria-label="Remove search term">&times;</b></button>`).join("");
        ui.chips.parentElement.classList.toggle("has-search-terms", state.searchTerms.length > 0);
        ui.chips.lastElementChild?.scrollIntoView({ block: "nearest", inline: "start" });
        ui.chips.querySelectorAll("[data-remove-term]").forEach(button=>button.addEventListener("click",()=>{state.searchTerms.splice(Number(button.dataset.removeTerm),1);state.page=1;renderSearchTerms();render();}));
    };
    const render=()=>{
        allRows=buildRows();
        const results=filtered(),pageSize=state.printing?Math.max(results.length,1):Number(ui.size.value),pageCount=Math.max(1,Math.ceil(results.length/pageSize));
        state.page=Math.min(state.page,pageCount);
        const offset=(state.page-1)*pageSize,shown=results.slice(offset,offset+pageSize);
        ui.rows.innerHTML=shown.map(row=>{
            const mapped=mappingInfo(row),statusClass=mapped.status==="Working"?"working":mapped.status==="Unmapped"?"unmapped":"missing";
            return `<tr><td>${esc(row.day)}</td><td><time datetime="${row.date}">${showDate(row.date)}</time></td><td class="database-cell"><i class="database-group-dot ${esc(mapped.color)}" aria-hidden="true"></i><strong>${esc(mapped.name)}</strong></td><td class="filename"><div class="filename-main">${row.file?`<span title="${esc(row.file)}">${esc(row.file)}</span>`:`<span class="missing-file">No matching backup file</span>`}</div><small>${esc(row.ext||"Not available")}</small></td><td><span class="status-badge ${statusClass}"><i></i>${esc(mapped.status)}</span></td><td class="actions"><button class="details-button" type="button" data-detail="${esc(row.id)}">Details</button></td></tr>`;
        }).join("");
        updateSortArrows();
        ui.empty.hidden=results.length>0; $("backup-table").hidden=results.length===0;
        const configuredDirectory=window.BackupMappingStore.getTargetDirectory(), settingsAvailable=Boolean($("mapping-settings"));
        if(!configuredDirectory){ui.emptyKicker.textContent=settingsAvailable?"SETUP REQUIRED":"SIGN IN REQUIRED";ui.emptyTitle.textContent=settingsAvailable?"Choose a target directory":"Sign in to configure backup monitoring";ui.emptyDescription.textContent=settingsAvailable?"Open Backup settings and enter the server-visible directory path.":"A signed-in user must configure the directory before files can be scanned.";}
        else if(state.scanError){ui.emptyKicker.textContent="SCAN ISSUE";ui.emptyTitle.textContent="Could not read the target directory";ui.emptyDescription.textContent=state.scanError;}
        else{ui.emptyKicker.textContent="NO RESULTS";ui.emptyTitle.textContent="No backup records match";ui.emptyDescription.textContent="Try another period or clear a filter.";}
        ui.emptyClear.hidden=!configuredDirectory||Boolean(state.scanError);
        const openSettings=$("empty-open-settings");if(openSettings)openSettings.hidden=Boolean(configuredDirectory)&&!state.scanError;
        ui.count.textContent=`${results.length} ${results.length===1?"record":"records"}`;
        ui.summary.textContent=results.length?`Showing ${offset+1}–${Math.min(offset+shown.length,results.length)} of ${results.length} records`:"Showing 0 records";
        ui.page.textContent=`${state.page} / ${pageCount}`;ui.prev.disabled=state.page<=1;ui.next.disabled=state.page>=pageCount;
        $("expected-count").textContent=results.length;
        $("working-count").textContent=results.filter(row=>mappingInfo(row).status==="Working").length;
        $("missing-count").textContent=results.filter(row=>mappingInfo(row).status==="No Backup").length;
        $("expected-caption").textContent=state.period==="month"?"month to date":"selected period";
        ui.periodText.textContent=`${state.period==="week"?"Weekly report · ":state.period==="month"?"Monthly report · ":""}${bounds().label}`;
        const searchSummary=state.searchTerms.length?` · Search: ${state.searchTerms.join(" OR ")}`:"";
        ui.printMeta.textContent=`GTEC Production Backup Report · ${bounds().label}${searchSummary} · ${results.length} records · Printed ${new Date().toLocaleString()}`;
        ui.rows.querySelectorAll("[data-detail]").forEach(button=>button.addEventListener("click",()=>{const row=allRows.find(item=>item.id===button.dataset.detail);if(row)details(row);}));
    };
    let scanSequence=0;
    const scanDirectory=async()=>{
        const directoryPath=window.BackupMappingStore.getTargetDirectory(),sequence=++scanSequence;
        state.scanError=null;scannedFiles=[];
        if(!directoryPath){ui.scanner.textContent=$("mapping-settings")?"Not configured":"Sign in required";ui.scannerDetail.textContent=$("mapping-settings")?"Set a target directory":"Sign in to configure backup monitoring";render();return;}
        ui.scanner.textContent="Scanning";ui.scannerDetail.textContent="Reading files and subfolders";render();
        try{
            const response=await fetch("/api/backup-files/scan",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({directoryPath})});
            const finalUrl=new URL(response.url,window.location.href);
            if(response.redirected&&finalUrl.searchParams.get("auth")==="login")throw new Error("Sign in to scan the configured directory.");
            const payload=await response.json();
            if(!response.ok)throw new Error(payload.message||"The target directory could not be scanned.");
            if(sequence!==scanSequence)return;
            const detectedAt=new Date().toISOString();
            scannedFiles=(payload.files||[]).map(file=>({...file,detectedAt}));
            ui.scanner.textContent=payload.truncated?"Scan limited":"Connected";ui.scannerDetail.textContent=payload.truncated?`Showing the first ${scannedFiles.length.toLocaleString()} files`:`${scannedFiles.length.toLocaleString()} files found`;
        }catch(error){if(sequence!==scanSequence)return;scannedFiles=[];state.scanError=error.message||"The target directory could not be scanned.";ui.scanner.textContent=state.scanError.startsWith("Sign in")?"Sign in required":"Unavailable";ui.scannerDetail.textContent=state.scanError;}
        state.page=1;render();
    };
    const refreshSourceOptions=()=>{
        const current=ui.source.value, options=window.BackupMappingStore.getAll().filter(item=>item.active).map(item=>`<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("");
        ui.source.innerHTML=`<option value="">All databases</option>${options}<option value="Unmapped">Unmapped</option>`;
        ui.source.value=[...ui.source.options].some(option=>option.value===current)?current:"";
    };
    const refreshFormatOptions=()=>{
        const current=ui.format.value, options=window.BackupMappingStore.getFormats().filter(item=>item.active).map(item=>`<option value="${esc(item.extension)}">${esc(item.extension)}</option>`).join("");
        ui.format.innerHTML=`<option value="">All formats</option>${options}`;
        ui.format.value=[...ui.format.options].some(option=>option.value===current)?current:"";
    };

    document.querySelectorAll("[data-period]").forEach(button=>button.addEventListener("click",()=>{
        state.period=button.dataset.period;state.page=1;
        document.querySelectorAll("[data-period]").forEach(item=>item.classList.toggle("active",item===button));
        ui.range.hidden=state.period!=="custom";
        if(state.period==="custom"&&!ui.from.value){const today=new Date();const yearStart=new Date(today.getFullYear(),0,1);ui.from.value=key(yearStart);ui.to.value=key(today);}
        render();
    }));
    [ui.source,ui.status,ui.format,ui.from,ui.to,ui.size].forEach(element=>element.addEventListener("change",()=>{state.page=1;render();}));
    document.querySelectorAll("[data-sort]").forEach(button=>button.addEventListener("click",()=>{if(state.sort===button.dataset.sort)state.descending=!state.descending;else{state.sort=button.dataset.sort;state.descending=false;}render();}));
    ui.prev.addEventListener("click",()=>{state.page--;render();});ui.next.addEventListener("click",()=>{state.page++;render();});
    const addSearchTerm=()=>{
        const term=ui.search.value.trim();if(!term)return;
        if(!state.searchTerms.some(value=>value.toLocaleLowerCase()===term.toLocaleLowerCase()))state.searchTerms.push(term);
        ui.search.value="";state.page=1;renderSearchTerms();render();
    };
    $("add-search-term").addEventListener("click",addSearchTerm);
    ui.search.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addSearchTerm();}});
    const clear=()=>{
        ui.search.value="";state.searchTerms=[];renderSearchTerms();ui.source.value="";ui.status.value="";ui.format.value="";ui.from.value="";ui.to.value="";
        state.period="week";state.page=1;ui.range.hidden=true;
        document.querySelectorAll("[data-period]").forEach(button=>button.classList.toggle("active",button.dataset.period==="week"));
        render();
    };
    $("clear-filters").addEventListener("click",clear);$("empty-clear").addEventListener("click",clear);
    $("empty-open-settings")?.addEventListener("click",()=>$("mapping-settings")?.click());
    $("print-report").addEventListener("click",()=>{state.printing=true;render();window.print();});
    window.addEventListener("afterprint",()=>{state.printing=false;render();});
    window.addEventListener("backup:mappings-changed",()=>{refreshSourceOptions();state.page=1;render();});
    window.addEventListener("backup:formats-changed",()=>{refreshFormatOptions();state.page=1;render();});
    window.addEventListener("backup:directory-changed",scanDirectory);
    refreshSourceOptions();refreshFormatOptions();scanDirectory();
})();


