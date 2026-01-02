const translations = {
    fr: { 
        title: "EQ Audio Player", 
        chooseFile: '<i class="bi bi-music-note-beamed me-2"></i> Charger Musique (MP3, FLAC, AAC, ALAC, WAV)', 
        reset: '<i class="bi bi-arrow-counterclockwise me-1"></i> Réinitialiser', 
        export: '<i class="bi bi-download me-1"></i> Exporter JSON', 
        import: '<i class="bi bi-upload me-1"></i> Importer JSON' 
    },
    en: { 
        title: "EQ Audio Player", 
        chooseFile: '<i class="bi bi-music-note-beamed me-2"></i> Load Music (MP3, FLAC, AAC, ALAC, WAV)', 
        reset: '<i class="bi bi-arrow-counterclockwise me-1"></i> Reset Settings', 
        export: '<i class="bi bi-download me-1"></i> Export JSON', 
        import: '<i class="bi bi-upload me-1"></i> Import JSON' 
    }
};

const audioEl = document.getElementById('audioSource');
const freqs = [60, 250, 1000, 4000, 16000];
let audioCtx, source, filters = [];

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function applyLanguage() {
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerHTML = t.chooseFile;
    document.getElementById('resetBtn').innerHTML = t.reset;
    document.getElementById('exportBtn').innerHTML = t.export;
    document.querySelector('label[for="importInput"]').innerHTML = t.import;
}

function updateThemeUI() {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    icon.className = (theme === 'dark') ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
}

function initUI() {
    updateThemeUI();
    document.getElementById('langSelect').value = lang;
    applyLanguage();
    
    // Initialisation des 5 curseurs
    savedGains.forEach((gain, i) => {
        const slider = document.querySelector(`input[data-index="${i}"]`);
        if(slider) slider.value = gain;
        const label = document.getElementById(`db${i}`);
        if(label) label.innerText = gain + 'dB';
    });
}

function setupAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audioEl);
    let lastNode = source;

    filters = [];
    freqs.forEach((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = f;
        filter.gain.value = savedGains[i];
        lastNode.connect(filter);
        lastNode = filter;
        filters.push(filter);
    });
    lastNode.connect(audioCtx.destination);
}

// Thème et Langue
document.getElementById('themeToggle').onclick = () => {
    theme = (theme === 'dark') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeUI();
};

document.getElementById('langSelect').onchange = (e) => {
    lang = e.target.value;
    localStorage.setItem('lang', lang);
    applyLanguage();
};

// Gestion Fichiers
document.getElementById('fileInput').onchange = (e) => {
    setupAudio();
    const file = e.target.files[0];
    if (file) {
        document.getElementById('formatBadge').innerText = file.name.split('.').pop().toUpperCase();
        document.getElementById('formatBadge').classList.remove('d-none');
        audioEl.src = URL.createObjectURL(file);
        audioEl.play();
    }
};

// Sliders
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.oninput = (e) => {
        const i = e.target.dataset.index;
        const val = parseInt(e.target.value);
        document.getElementById(`db${i}`).innerText = val + 'dB';
        if (filters[i]) filters[i].gain.value = val;
        savedGains[i] = val;
        localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});

// Import / Export
document.getElementById('exportBtn').onclick = () => {
    const config = { gains: savedGains, lang, theme };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eq_config.json';
    a.click();
};

document.getElementById('importInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.gains) {
                savedGains = data.gains;
                lang = data.lang || lang;
                theme = data.theme || theme;
                localStorage.setItem('eq-gains', JSON.stringify(savedGains));
                initUI();
                if(filters.length) filters.forEach((f, i) => f.gain.value = savedGains[i]);
            }
        } catch (err) { alert("Erreur JSON"); }
    };
    reader.readAsText(file);
};

document.getElementById('resetBtn').onclick = () => {
    savedGains = [0, 0, 0, 0, 0];
    localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    initUI();
    filters.forEach(f => f.gain.value = 0);
};

initUI();
window.onclick = () => { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); };