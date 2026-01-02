const translations = {
    fr: { title: "Lecteur Audio EQ", chooseFile: "Charger", unknown: "Artiste inconnu", clear: "Vider", confirmClear: "Vider la playlist ?", reset: "Réinitialiser EQ", import: "Importer EQ" },
    en: { title: "EQ Audio Player", chooseFile: "Load", unknown: "Unknown Artist", clear: "Clear", confirmClear: "Clear playlist?", reset: "Reset EQ", import: "Import EQ" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
const volSlider = document.getElementById('volSlider');
const progSlider = document.getElementById('progressSlider');
const loopIcon = document.getElementById('loopIcon');

let audioCtx, source, filters = [];
let playlist = [], currentTrackIndex = -1;

// Préférences
let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0; // 0: Off, 1: All, 2: One
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.chooseFile;
    document.getElementById('ui-clear').innerText = t.clear;
    document.getElementById('resetBtn').innerText = t.reset;
    document.getElementById('ui-import-label').innerText = t.import;

    // Répétition UI
    loopIcon.className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    document.getElementById('loopToggle').style.color = loopState > 0 ? 'var(--accent)' : '';
    audioEl.loop = (loopState === 2);

    savedGains.forEach((g, i) => {
        document.getElementById(`db${i}`).innerText = g + 'dB';
        document.querySelector(`input[data-index="${i}"]`).value = g;
        if(filters[i]) filters[i].gain.value = g;
    });
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audioEl);
    let lastNode = source;
    [60, 250, 1000, 4000, 16000].forEach((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = "peaking"; filter.frequency.value = f; filter.gain.value = savedGains[i];
        lastNode.connect(filter); lastNode = filter; filters.push(filter);
    });
    lastNode.connect(audioCtx.destination);
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    initAudio();
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const file = playlist[index];
    audioEl.src = URL.createObjectURL(file);
    audioEl.load();
    audioEl.play().then(() => playIcon.className = "bi bi-pause-fill");

    document.getElementById('trackTitle').innerText = file.name;
    document.getElementById('trackArtist').innerText = translations[lang].unknown;

    jsmediatags.read(file, {
        onSuccess: (tag) => {
            const { title, artist, picture } = tag.tags;
            if(title) document.getElementById('trackTitle').innerText = title;
            if(artist) document.getElementById('trackArtist').innerText = artist;
            if (picture) {
                let base64 = "";
                for (let i = 0; i < picture.data.length; i++) base64 += String.fromCharCode(picture.data[i]);
                document.getElementById('albumArt').src = `data:${picture.format};base64,${window.btoa(base64)}`;
            } else {
                document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";
            }
        }
    });
    renderPlaylist();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = "";
    playlist.forEach((file, i) => {
        const btn = document.createElement('button');
        btn.className = `list-group-item list-group-item-action playlist-item ${i === currentTrackIndex ? 'active' : ''}`;
        btn.innerHTML = `<i class="bi bi-music-note me-2"></i> ${file.name}`;
        btn.onclick = () => loadTrack(i);
        container.appendChild(btn);
    });
}

// Event Listeners
document.getElementById('fileInput').onchange = (e) => {
    playlist = [...playlist, ...Array.from(e.target.files)];
    renderPlaylist();
    if(currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('playBtn').onclick = () => {
    if(!audioEl.src) return;
    if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; }
};

document.getElementById('nextBtn').onclick = () => {
    if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1);
    else if (loopState === 1) loadTrack(0);
};

document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1);

audioEl.onended = () => {
    if (loopState === 2) audioEl.play();
    else if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1);
    else if (loopState === 1) loadTrack(0);
    else playIcon.className = "bi bi-play-fill";
};

document.getElementById('loopToggle').onclick = () => {
    loopState = (loopState + 1) % 3;
    localStorage.setItem('eq-loop-state', loopState);
    updateUI();
};

document.getElementById('resetBtn').onclick = () => {
    savedGains = [0,0,0,0,0];
    localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    updateUI();
};

document.getElementById('clearPlaylistBtn').onclick = () => {
    if(confirm(translations[lang].confirmClear)) {
        playlist = []; currentTrackIndex = -1; audioEl.src = ""; renderPlaylist();
    }
};

document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({gains: savedGains, theme, lang})], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eq-config.json'; a.click();
};

document.getElementById('importInput').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        if(data.gains) savedGains = data.gains;
        localStorage.setItem('eq-gains', JSON.stringify(savedGains));
        updateUI();
    };
    reader.readAsText(e.target.files[0]);
};

volSlider.oninput = (e) => audioEl.volume = e.target.value;

document.querySelectorAll('input.vertical').forEach(s => {
    s.oninput = (e) => {
        const i = e.target.dataset.index, v = e.target.value;
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = v; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});

document.getElementById('themeToggle').onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme); updateUI();
};

document.getElementById('langSelect').onchange = (e) => {
    lang = e.target.value; localStorage.setItem('lang', lang); updateUI();
};

audioEl.ontimeupdate = () => {
    progSlider.value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    const fmt = (s) => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

progSlider.oninput = () => audioEl.currentTime = (progSlider.value / 100) * audioEl.duration;

["click", "touchstart"].forEach(v => window.addEventListener(v, () => { if(audioCtx) audioCtx.resume(); }, {once:true}));

updateUI();
