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
        "cap-no-src": "Capturing + No Source",
        "cap-fix-src": "Capturing + Fixed Source",
        "non-cap-no-src": "Non-Capturing + No Source",
        "non-cap-fix-src": "Non-Capturing + Fixed Source",
        "loading": "Loading file...",
        "running": "Running benchmark...",
        "done": "Done",
        "drop-hint": "Drop your .log file to start",
        "confirm-msg": "The benchmark is about to start.\n\nYour browser tab will freeze for a short period while processing. Please DO NOT switch tabs or interact for maximum accuracy.\n\nClick OK to proceed.",
        "mismatch-err": "Match count mismatch for {0}. Expected {1}, got {2}."
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
        "cap-no-src": "捕捉组 + 无source",
        "cap-fix-src": "捕捉组 + 有source",
        "non-cap-no-src": "非捕捉组 + 无source",
        "non-cap-fix-src": "非捕捉组 + 有source",
        "loading": "正在加载文件...",
        "running": "正在进行跑分测试...",
        "done": "完成",
        "drop-hint": "拖入 .log 文件开始测试",
        "confirm-msg": "测试即将开始。\n\n处理期间浏览器标签页会暂时卡住。请不要切换标签或进行任何键鼠操作，以获得最准确的结果。\n\n点击“确定”开始。",
        "mismatch-err": "{0} 的匹配数量不一致。期望 {1}，实际得到 {2}。"
    }
};

let currentLang = 'en';

function applyLang() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (I18N[currentLang][key]) el.textContent = I18N[currentLang][key];
    });

    // Update drop hint
    const dropP = document.querySelector("#drag-overlay p");
    if (dropP) dropP.textContent = I18N[currentLang]["drop-hint"];

    // Update list
    regexList.innerHTML = REGEXES.map(r => {
        const escaped = r.regex.toString().replace(/[<>]/g, m => ({ '<': '&lt;', '>': '&gt;' }[m]));
        return `<div><strong>${I18N[currentLang][r.key]}</strong><code>${escaped}</code></div>`;
    }).join("");
}

const fileInput = document.getElementById("file");
const startBtn = document.getElementById("start");
const statusTxt = document.getElementById("status");
const resultsTbody = document.querySelector("#result tbody");
const regexList = document.getElementById("regex-list");
const dragOverlay = document.getElementById("drag-overlay");
const langToggle = document.getElementById("lang-toggle");
const chartContainer = document.getElementById("chart");

langToggle.onclick = () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    applyLang();
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
    }
});

applyLang();

startBtn.disabled = true;

fileInput.onchange = () => {
    startBtn.disabled = !fileInput.files.length;
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
    statusTxt.textContent = I18N[currentLang]["running"];

    const results = REGEXES.map(entry => ({
        key: entry.key,
        regex: new RegExp(entry.regex.source, entry.regex.flags),
        times: [],
        matches: null
    }));

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
                const msg = I18N[currentLang]["mismatch-err"]
                    .replace("{0}", I18N[currentLang][res.key])
                    .replace("{1}", res.matches)
                    .replace("{2}", matches);
                throw new Error(msg);
            }
        }
    }

    const processedResults = results.map(res => {
        res.times.sort((a, b) => a - b);
        const median = res.times[Math.floor(res.times.length / 2)];
        return {
            name: I18N[currentLang][res.key],
            time: median,
            throughput: lines.length / (median / 1000),
            speed: sizeMB / (median / 1000),
            matches: res.matches
        };
    });

    const fastest = Math.min(...processedResults.map(r => r.time));

    for (const r of processedResults) {
        const tr = document.createElement("tr");
        if (r.time === fastest) tr.classList.add("fastest");
        tr.innerHTML = `<td>${r.name}</td><td>${r.time.toFixed(2)}</td><td>${Number(r.throughput.toFixed(0)).toLocaleString()}</td><td>${r.speed.toFixed(2)}</td><td>${r.matches.toLocaleString()}</td><td>${(fastest / r.time * 100).toFixed(1)}%</td>`;
        resultsTbody.appendChild(tr);
    }

    renderChart(processedResults, fastest);
    statusTxt.textContent = I18N[currentLang]["done"];
    startBtn.disabled = false;
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
