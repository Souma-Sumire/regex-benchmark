const REGEXES = [
    { key: "cap-no-src", regex: /^(?<type>20)\|(?<timestamp>[^|]*)\|(?<sourceId>[^|]*)\|(?<source>[^|]*)\|(?<id>B348)\|/i },
    { key: "cap-fix-src", regex: /^(?<type>20)\|(?<timestamp>[^|]*)\|(?<sourceId>[^|]*)\|(?<source>Vamp Fatale|致命美人|ヴァンプ・ファタール)\|(?<id>B348)\|/i },
    { key: "non-cap-no-src", regex: /^20\|[^|]*\|[^|]*\|[^|]*\|B348\|/i },
    { key: "non-cap-fix-src", regex: /^20\|[^|]*\|[^|]*\|(?:Vamp Fatale|致命美人|ヴァンプ・ファタール)\|B348\|/i }
];

const I18N = {
    en: {
        "title": "Regex Performance Benchmark",
        "subtitle": "Regex-only benchmark (I/O removed, warmup enforced, median-based)",
        "runs-label": "Runs per Regex",
        "warmups-label": "Warmup Rounds",
        "start-btn": "Start Benchmark",
        "th-regex": "Regex",
        "th-time": "Median Time (ms)",
        "th-throughput": "Throughput (lines/s)",
        "th-speed": "Speed (MB/s)",
        "th-matches": "Matches",
        "th-relative": "Relative",
        "th-stability": "Stability",
        "cap-no-src": "Capturing + No Source",
        "cap-fix-src": "Capturing + Fixed Source",
        "non-cap-no-src": "Non-Capturing + No Source",
        "non-cap-fix-src": "Non-Capturing + Fixed Source",
        "loading": "Loading file...",
        "running": "Running benchmark...",
        "done": "Done",
        "drop-hint": "Drop your .log file to start",
        "confirm-msg": "The benchmark is about to start.\n\nYour browser tab will freeze for a short period while processing. Please DO NOT switch tabs or interact for maximum accuracy.\n\nClick OK to proceed.",
        "mismatch-err": "Match count mismatch for {0}. Expected {1}, got {2}.",
        "add-btn": "+ Add Pattern",
        "flags-label": "Flags:",
        "name-placeholder": "Regex Name",
        "pattern-placeholder": "Pattern (e.g. ^[0-9]+)",
        "invalid-regex": "Invalid Regex in '{0}': {1}",
        "sec-patterns": "Build Your Patterns",
        "sec-config": "Benchmark Configuration",
        "sec-results": "Analysis Results",
        "file-label": "Select log file (Network_*.log)",
        "no-file-selected": "No file chosen",
        "summary-file": "File:",
        "summary-size": "Size:",
        "summary-lines": "Lines:",
        "summary-runs": "Runs:",
        "summary-warmups": "Warmups:",
        "runs-hint": "Number of times each regex is executed to calculate the median time.",
        "warmups-hint": "Initial runs to trigger JIT optimization; these are NOT included in the results."
    },
    zh: {
        "title": "正则表达式性能跑分",
        "subtitle": "纯正则匹配测试（移除 I/O 干扰，强制预热，基于中位数）",
        "runs-label": "每项运行次数",
        "warmups-label": "预热轮数",
        "start-btn": "开始测试",
        "th-regex": "正则表达式",
        "th-time": "中位数耗时 (ms)",
        "th-throughput": "吞吐量 (行/秒)",
        "th-speed": "速度 (MB/s)",
        "th-matches": "匹配数",
        "th-relative": "相对性能",
        "th-stability": "稳定性",
        "cap-no-src": "捕捉组 + 无source",
        "cap-fix-src": "捕捉组 + 有source",
        "non-cap-no-src": "非捕捉组 + 无source",
        "non-cap-fix-src": "非捕捉组 + 有source",
        "loading": "正在加载文件...",
        "running": "正在进行跑分测试...",
        "done": "完成",
        "drop-hint": "拖入 .log 文件开始测试",
        "confirm-msg": "测试即将开始。\n\n处理期间浏览器标签页会暂时卡住。请不要切换标签或进行任何键鼠操作，以获得最准确的结果。\n\n点击“确定”开始。",
        "mismatch-err": "{0} 的匹配数量不一致。期望 {1}，实际得到 {2}。",
        "add-btn": "+ 添加正则",
        "flags-label": "修饰符:",
        "name-placeholder": "正则名称",
        "pattern-placeholder": "表达式 (例如 ^[0-9]+)",
        "invalid-regex": "项目中存在错误的正则 '{0}': {1}",
        "sec-patterns": "定义正则模式",
        "sec-config": "配置测试参数",
        "sec-results": "查看分析结果",
        "file-label": "选择日志文件 (Network_*.log)",
        "no-file-selected": "未选择任何文件",
        "summary-file": "测试文件:",
        "summary-size": "文件大小:",
        "summary-lines": "总行数:",
        "summary-runs": "运行轮数:",
        "summary-warmups": "预热轮数:",
        "runs-hint": "每个正则实际参与统计的执行次数，用于计算中位数耗时。",
        "warmups-hint": "测试前的热身执行次数，用于触发引擎优化，结果不计入总时。"
    }
};

let currentLang = 'en';

function applyLang() {
    // 1. First pass: Handle static translatable elements
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (I18N[currentLang][key]) {
            if (!el.classList.contains("info-icon")) {
                el.textContent = I18N[currentLang][key];
            }
        }
    });

    // 2. Special handling for overlays
    const dropP = document.querySelector("#drag-overlay p");
    if (dropP) dropP.textContent = I18N[currentLang]["drop-hint"];

    // 3. Render dynamic content
    renderRegexList();

    // 4. Final pass: Update all hints including newly rendered ones
    document.querySelectorAll(".info-icon[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (I18N[currentLang][key]) {
            el.setAttribute("data-hint", I18N[currentLang][key]);
        }
    });
}

function renderRegexList() {
    regexList.innerHTML = REGEXES.map((r, i) => `
        <div class="regex-card" data-index="${i}">
            <div class="card-header">
                <input type="text" class="regex-name" 
                       value="${I18N[currentLang][r.key] || r.name || ''}" 
                       placeholder="${I18N[currentLang]['name-placeholder']}"
                       oninput="REGEXES[${i}].name = this.value; delete REGEXES[${i}].key">
                <button class="btn-delete" onclick="removeRegex(${i})">×</button>
            </div>
            <textarea class="regex-pattern" 
                      placeholder="${I18N[currentLang]['pattern-placeholder']}"
                      spellcheck="false"
                      oninput="REGEXES[${i}].source = this.value">${r.regex ? r.regex.source : (r.source || '')}</textarea>
            <div class="card-footer">
                <label>${I18N[currentLang]['flags-label']} 
                    <input type="text" class="regex-flags" 
                           value="${r.regex ? r.regex.flags : (r.flags || 'i')}" 
                           oninput="REGEXES[${i}].flags = this.value">
                </label>
            </div>
        </div>
    `).join("") + `
        <button class="btn-add-regex" onclick="addRegex()">
            ${I18N[currentLang]['add-btn']}
        </button>
    `;
}

window.removeRegex = (index) => {
    REGEXES.splice(index, 1);
    renderRegexList();
};

window.addRegex = () => {
    REGEXES.push({ name: "", source: "", flags: "i" });
    renderRegexList();
};

const fileInput = document.getElementById("file");
const startBtn = document.getElementById("start");
const statusTxt = document.getElementById("status");
const resultsTbody = document.querySelector("#result tbody");
const regexList = document.getElementById("regex-list");
const dragOverlay = document.getElementById("drag-overlay");
const langToggle = document.getElementById("lang-toggle");
const chartContainer = document.getElementById("chart");
const resultsSection = document.getElementById("results-section");
const fileNameDisplay = document.getElementById("file-name");
const resultsSummary = document.getElementById("results-summary");

function updateFileName() {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
        fileNameDisplay.classList.add("selected");
    } else {
        fileNameDisplay.textContent = I18N[currentLang]["no-file-selected"];
        fileNameDisplay.classList.remove("selected");
    }
}

langToggle.onclick = () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    applyLang();
    updateFileName();
};

// Global Drag and Drop
let dragCounter = 0;
window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dragOverlay.classList.add('active');
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) dragOverlay.classList.remove('active');
});

window.addEventListener('dragover', (e) => e.preventDefault());

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.classList.remove('active');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        startBtn.disabled = false;
        updateFileName();
    }
});

applyLang();

startBtn.disabled = true;

fileInput.onchange = () => {
    startBtn.disabled = !fileInput.files.length;
    updateFileName();
};

startBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    startBtn.disabled = true;

    const runs = Number(document.getElementById("runs").value);
    const warmups = Number(document.getElementById("warmups").value);

    const confirmed = window.confirm(I18N[currentLang]["confirm-msg"]);
    if (!confirmed) {
        startBtn.disabled = false;
        return;
    }

    statusTxt.textContent = I18N[currentLang]["loading"];
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const sizeMB = file.size / 1024 / 1024;

    resultsTbody.innerHTML = "";
    resultsSection.classList.remove("hidden");

    // Update summary
    resultsSummary.innerHTML = `
        <span><strong>${I18N[currentLang]["summary-file"]}</strong> ${file.name}</span>
        <span><strong>${I18N[currentLang]["summary-size"]}</strong> ${sizeMB.toFixed(2)} MB</span>
        <span><strong>${I18N[currentLang]["summary-lines"]}</strong> ${lines.length.toLocaleString()}</span>
        <span><strong>${I18N[currentLang]["summary-runs"]}</strong> ${runs}</span>
        <span><strong>${I18N[currentLang]["summary-warmups"]}</strong> ${warmups}</span>
    `;

    statusTxt.textContent = I18N[currentLang]["running"];

    const results = [];
    for (const entry of REGEXES) {
        try {
            const source = entry.source !== undefined ? entry.source : entry.regex.source;
            const flags = entry.flags !== undefined ? entry.flags : entry.regex.flags;
            if (!source) continue;

            results.push({
                name: I18N[currentLang][entry.key] || entry.name || source,
                regex: new RegExp(source, flags),
                times: [],
                matches: null,
                key: entry.key
            });
        } catch (e) {
            const errorMsg = I18N[currentLang]["invalid-regex"]
                .replace("{0}", entry.name || "Unknown")
                .replace("{1}", e.message);
            alert(errorMsg);
            startBtn.disabled = false;
            statusTxt.textContent = "Error";
            return;
        }
    }

    if (results.length === 0) {
        startBtn.disabled = false;
        statusTxt.textContent = "No valid regex";
        return;
    }

    // Warmup phase (sequentially is fine for JIT)
    for (const res of results) {
        for (let i = 0; i < warmups; i++) runRegex(lines, res.regex);
    }

    // Interleaved formal runs for fairness
    for (let i = 0; i < runs; i++) {
        for (const res of results) {
            const { time, matches } = runRegex(lines, res.regex);
            res.times.push(time);
            if (res.matches === null) res.matches = matches;
            else if (res.matches !== matches) {
                const name = res.key ? I18N[currentLang][res.key] : res.name;
                const msg = I18N[currentLang]["mismatch-err"]
                    .replace("{0}", name)
                    .replace("{1}", res.matches)
                    .replace("{2}", matches);
                throw new Error(msg);
            }
        }
    }

    const processedResults = results.map(res => {
        const n = res.times.length;
        const avg = res.times.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(res.times.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / n);
        const cv = (stdDev / avg) * 100; // Coefficient of Variation

        res.times.sort((a, b) => a - b);
        const median = res.times[Math.floor(n / 2)];

        return {
            name: I18N[currentLang][res.key],
            time: median,
            throughput: lines.length / (median / 1000),
            speed: sizeMB / (median / 1000),
            matches: res.matches,
            stability: cv
        };
    });

    const fastest = Math.min(...processedResults.map(r => r.time));

    for (const r of processedResults) {
        const tr = document.createElement("tr");
        if (r.time === fastest) tr.classList.add("fastest");

        // Stability color coding
        let stabColor = "var(--good)";
        if (r.stability > 10) stabColor = "#f59e0b"; // Warning
        if (r.stability > 25) stabColor = "#ef4444"; // Meta-unstable

        tr.innerHTML = `<td>${r.name}</td><td>${r.time.toFixed(2)}</td><td>${Number(r.throughput.toFixed(0)).toLocaleString()}</td><td>${r.speed.toFixed(2)}</td><td>${r.matches.toLocaleString()}</td><td>${(fastest / r.time * 100).toFixed(1)}%</td><td style="color: ${stabColor}">${r.stability < 1 ? '<1' : r.stability.toFixed(1)}%</td>`;
        resultsTbody.appendChild(tr);
    }

    renderChart(processedResults, fastest);
    statusTxt.textContent = I18N[currentLang]["done"];
    startBtn.disabled = false;

    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function renderChart(results, fastestTime) {
    chartContainer.style.display = 'block';
    chartContainer.innerHTML = results.map(r => {
        const ratio = (fastestTime / r.time) * 100;
        const isWinner = r.time === fastestTime;
        return `
            <div class="chart-row ${isWinner ? 'winner' : ''}">
                <div class="chart-label">
                    <span>${r.name}</span>
                    <span>${ratio.toFixed(1)}%</span>
                </div>
                <div class="chart-bar-bg">
                    <div class="chart-bar" style="width: ${ratio}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function runRegex(lines, regex) {
    let matches = 0;
    const start = performance.now();
    for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) matches++;
    }
    return { time: performance.now() - start, matches };
}

function measureBaseline(lines, runs) {
    const times = [];
    for (let r = 0; r < runs; r++) {
        const start = performance.now();
        for (let i = 0; i < lines.length; i++) { }
        times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)];
}
