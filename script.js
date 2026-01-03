const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Réinitialiser EQ", import: "Import EQ", export: "Export EQ", playlist: "Ma Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", ready: "Prêt à jouer", unknown: "Inconnu", impSucc: "EQ Importé !", expSucc: "EQ Exporté !", resetSucc: "EQ Réinitialisé !", settings: "Paramètres", dark: "Mode Sombre", light: "Mode Clair" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset EQ", import: "Import EQ", export: "Export EQ", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", ready: "Ready to play", unknown: "Unknown", impSucc: "EQ Imported!", expSucc: "EQ Exported!", resetSucc: "EQ Reseted!", settings: "Settings", dark: "Dark Mode", light: "Light Mode" }
};

const audioEl = document.getElementById('audioSource');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

let audioCtx, source, filters = [], playlist = [], currentTrackIndex = -1, previousVolume = 0.7;
let analyser, dataArray;

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0;
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('themeText').innerText = theme === 'dark' ? translations[lang].dark : translations[lang].light;
    document.getElementById('langSelect').value = lang;
    
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.choose;
    document.getElementById('resetEqBtn').innerText = t.reset;
    document.getElementById('ui-import-label').innerText = t.import;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('ui-playlist-title').innerText = t.playlist;
    document.getElementById('settingsMenuLabel').innerText = t.settings;

    document.getElementById('loopIcon').className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    document.getElementById('loopToggle').style.color = loopState > 0 ? 'var(--accent-color)' : 'inherit';

    if (audioEl.paused) {
        playIcon.className = "bi bi-play-fill";
        playBtn.classList.replace('btn-play-active', 'btn-play-paused') || playBtn.classList.add('btn-play-paused');
    } else {
        playIcon.className = "bi bi-pause-fill";
        playBtn.classList.replace('btn-play-paused', 'btn-play-active') || playBtn.classList.add('btn-play-active');
    }

    const mIcon = document.getElementById('muteIcon');
    mIcon.className = audioEl.volume === 0 ? "bi bi-volume-mute-fill text-danger" : "bi bi-volume-up-fill";

    savedGains.forEach((g, i) => {
        const dbLabel = document.getElementById(`db${i}`);
        const slider = document.querySelector(`input[data-index="${i}"]`);
        if (dbLabel) dbLabel.innerText = g + 'dB';
        if (slider) slider.value = g;
        if (filters[i]) filters[i].gain.setTargetAtTime(g, audioCtx ? audioCtx.currentTime : 0, 0.01);
    });
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    let lastNode = source;
    [60, 250, 1000, 4000, 16000].forEach((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = "peaking"; filter.frequency.value = f; filter.gain.value = savedGains[i];
        lastNode.connect(filter); lastNode = filter; filters.push(filter);
    });
    lastNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for(let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 4;
        canvasCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    initAudio();
    audioEl.src = URL.createObjectURL(playlist[index]);
    audioEl.play().catch(() => {});
    document.getElementById('trackTitle').innerText = playlist[index].name;
    renderPlaylist();
    updateUI();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = playlist.map((f, i) => 
        `<button class="list-group-item list-group-item-action playlist-item ${i === currentTrackIndex ? 'active' : ''}" onclick="loadTrack(${i})">
            ${i+1}. ${f.name}
        </button>`
    ).join('');
}

// Actions
document.getElementById('exportBtn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedGains));
    const dl = document.createElement('a'); dl.setAttribute("href", dataStr); dl.setAttribute("download", "config_eq.json"); dl.click();
    showToast(translations[lang].expSucc);
};

document.getElementById('importInput').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (Array.isArray(imported) && imported.length === 5) {
                savedGains = imported; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
                updateUI(); showToast(translations[lang].impSucc);
            }
        } catch (err) { alert("Format Invalide"); }
    };
    reader.readAsText(file);
};

document.getElementById('themeToggle').onclick = () => {
    theme = (theme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', theme);
    updateUI();
};

document.getElementById('langSelect').onchange = e => {
    lang = e.target.value;
    localStorage.setItem('lang', lang);
    updateUI();
};

// Reste de la logique (Contrôles audio, sliders, etc. identique)
document.getElementById('fileInput').onchange = e => { playlist = [...playlist, ...Array.from(e.target.files)]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); };
playBtn.onclick = () => { if (audioEl.src) audioEl.paused ? audioEl.play() : audioEl.pause(); };
document.getElementById('nextBtn').onclick = () => { if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); };
document.getElementById('prevBtn').onclick = () => { if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1); };
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; localStorage.setItem('eq-loop-state', loopState); updateUI(); };
document.getElementById('resetEqBtn').onclick = () => { savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains)); updateUI(); showToast(translations[lang].resetSucc); };
document.getElementById('volSlider').oninput = e => { audioEl.volume = e.target.value; updateUI(); };

document.querySelectorAll('.vert-range').forEach(s => { 
    s.oninput = e => { 
        const i = e.target.dataset.index, v = parseInt(e.target.value); 
        savedGains[i] = v; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
        if (filters[i]) filters[i].gain.setTargetAtTime(v, audioCtx.currentTime, 0.01);
        document.getElementById(`db${i}`).innerText = v + 'dB';
    }; 
});

audioEl.ontimeupdate = () => { 
    document.getElementById('progressSlider').value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    const fmt = s => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};
document.getElementById('progressSlider').oninput = e => audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
audioEl.onplay = () => updateUI();
audioEl.onpause = () => updateUI();
audioEl.onended = () => { if (loopState === 2) { audioEl.currentTime = 0; audioEl.play(); } else { document.getElementById('nextBtn').click(); } };

updateUI();
