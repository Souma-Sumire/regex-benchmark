const REGEXES = [
    {
        name: "Capturing + No Source",
        regex: /^(?<type>20)\|(?<timestamp>[^|]*)\|(?<sourceId>[^|]*)\|(?<source>[^|]*)\|(?<id>B348)\|/i
    },
    {
        name: "Capturing + Fixed Source",
        regex: /^(?<type>20)\|(?<timestamp>[^|]*)\|(?<sourceId>[^|]*)\|(?<source>Vamp Fatale|致命美人|ヴァンプ・ファタール)\|(?<id>B348)\|/i
    },
    {
        name: "Non-Capturing + No Source",
        regex: /^20\|[^|]*\|[^|]*\|[^|]*\|B348\|/i
    },
    {
        name: "Non-Capturing + Fixed Source",
        regex: /^20\|[^|]*\|[^|]*\|(?:Vamp Fatale|致命美人|ヴァンプ・ファタール)\|B348\|/i
    }
];

const fileInput = document.getElementById("file");
const startBtn = document.getElementById("start");
const statusTxt = document.getElementById("status");
const resultsTbody = document.querySelector("#result tbody");
const regexList = document.getElementById("regex-list");
const dragOverlay = document.getElementById("drag-overlay");

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

regexList.innerHTML = REGEXES.map(r => {
    const escaped = r.regex.toString().replace(/[<>]/g, m => ({ '<': '&lt;', '>': '&gt;' }[m]));
    return `<div><strong>${r.name}</strong><code>${escaped}</code></div>`;
}).join("");

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

    const confirmed = window.confirm(
        "The benchmark is about to start.\n\n" +
        "Your browser tab will freeze for a short period while processing. " +
        "Please DO NOT switch tabs or interact with your keyboard/mouse for maximum accuracy.\n\n" +
        "Click OK to proceed."
    );
    if (!confirmed) {
        startBtn.disabled = false;
        return;
    }

    status.textContent = "Loading file…";
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const sizeMB = file.size / 1024 / 1024;

    resultsTbody.innerHTML = "";
    statusTxt.textContent = "Running benchmark…";

    const results = REGEXES.map(entry => ({
        name: entry.name,
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
                throw new Error(`Match count mismatch for ${res.name}. Expected ${res.matches}, got ${matches}.`);
            }
        }
    }

    const processedResults = results.map(res => {
        res.times.sort((a, b) => a - b);
        const median = res.times[Math.floor(res.times.length / 2)];
        return {
            name: res.name,
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

    statusTxt.textContent = "Done";
    startBtn.disabled = false;
};

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
