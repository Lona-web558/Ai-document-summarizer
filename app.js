const $ = id => document.getElementById(id);
const text = $('text'), fileInput = $('file'), go = $('go');
let chosenFile = null;

const countWords = s => (s.trim() ? s.trim().split(/\s+/).length: 0);
text.addEventListener('input', () => {
    $('wordCount').textContent = `${countWords(text.value)} words`;
});

function setFile(f) {
    chosenFile = f;
    $('fileLabel').textContent = f ? `${f.name} (${(f.size / 1024).toFixed(0)} KB)`: 'Drop a file here or click to choose (max 10 MB)';
}
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
const dz = $('dropzone');
['dragover', 'dragenter'].forEach(e => dz.addEventListener(e, ev => {
    ev.preventDefault(); dz.classList.add('drag');
}));
['dragleave', 'drop'].forEach(e => dz.addEventListener(e, ev => {
    ev.preventDefault(); dz.classList.remove('drag');
}));
dz.addEventListener('drop', ev => setFile(ev.dataTransfer.files[0]));

function show(state) {
    $('empty').classList.toggle('d-none', state !== 'empty');
    $('loading').classList.toggle('d-none', state !== 'loading');
    $('output').classList.toggle('d-none', state !== 'output');
}

function render(summary) {
    const box = $('summary');
    box.textContent = '';
    const lines = summary.split('\n').filter(Boolean);
    if (lines.every(l => l.startsWith('- '))) {
        const ul = document.createElement('ul');
        lines.forEach(l => {
            const li = document.createElement('li'); li.textContent = l.slice(2); ul.appendChild(li);
        });
        box.appendChild(ul);
    } else box.textContent = summary;
}

go.addEventListener('click', async () => {
    const onFileTab = document.querySelector('#tab-file').classList.contains('active');
    const fd = new FormData();
    if (onFileTab && chosenFile) fd.append('file', chosenFile);
    else fd.append('text', text.value);
    fd.append('length', $('length').value);
    fd.append('style', $('style').value);

    $('error').classList.add('d-none');
    go.disabled = true; show('loading');
    try {
        const res = await fetch('/api/summarize', {
            method: 'POST', body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        render(data.summary);
        const cut = Math.round((1 - data.summaryWords / data.originalWords) * 100);
        $('stats').textContent = `${data.originalWords} → ${data.summaryWords} words (${cut}% shorter)`;
        $('mode').textContent = data.mode === 'ai' ? 'AI summary': 'Extractive summary (add an API key for AI)';
        show('output');
    } catch (e) {
        $('error').textContent = e.message;
        $('error').classList.remove('d-none');
        show('empty');
    } finally {
        go.disabled = false;
    }
});

$('copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('summary').innerText);
    $('copy').textContent = 'Copied';
    setTimeout(() => ($('copy').textContent = 'Copy summary'), 1500);
});