const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Réinitialiser EQ", import: "Import EQ", export: "Export EQ", playlist: "Ma Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", ready: "Prêt à jouer", unknown: "Artiste inconnu", theme: "Mode" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset EQ", import: "Import EQ", export: "Export EQ", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", ready: "Ready to play", unknown: "Unknown Artist", theme: "Mode" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
let audioCtx, source, filters = [];
let playlist = [], currentTrackIndex = -1;

// Chargement auto des préférences
let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0; // 0:Off, 1:Playlist, 2:Track
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.choose;
    document.getElementById('resetBtn').innerText = t.reset;
    document.getElementById('ui-import-label').innerText = t.import;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('ui-playlist-title').innerText = t.playlist;
    document.getElementById('ui-theme-text').innerText = t.theme;

    const lIcon = document.getElementById('loopIcon');
    const lBtn = document.getElementById('loopToggle');
    lIcon.className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    lBtn.style.color = loopState > 0 ? 'var(--accent-color)' : 'inherit';

    savedGains.forEach((g, i) => {
        document.getElementById(`db${i}`).innerText = g + 'dB';
        document.querySelector(`input[data-index="${i}"]`).value = g;
        if (filters[i]) filters[i].gain.setTargetAtTime(g, audioCtx.currentTime, 0.01);
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
    const file = playlist[index];
    initAudio();
    audioEl.src = URL.createObjectURL(file);
    audioEl.play().catch(() => {});
    playIcon.className = "bi bi-pause-fill";
    
    // Reset Infos
    document.getElementById('trackTitle').innerText = file.name;
    document.getElementById('trackArtist').innerText = translations[lang].unknown;
    document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";

    // Lecture Métadonnées
    if (window.jsmediatags) {
        window.jsmediatags.read(file, {
            onSuccess: (tag) => {
                const { title, artist, picture } = tag.tags;
                if (title) document.getElementById('trackTitle').innerText = title;
                if (artist) document.getElementById('trackArtist').innerText = artist;
                if (picture) {
                    const base64 = picture.data.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
                    document.getElementById('albumArt').src = `data:${picture.format};base64,${window.btoa(base64)}`;
                }
            }
        });
    }
    renderPlaylist();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = playlist.map((f, i) => 
        `<button class="list-group-item list-group-item-action playlist-item ${i === currentTrackIndex ? 'active' : ''}" onclick="loadTrack(${i})">${f.name}</button>`
    ).join('');
}

// Events Audio
audioEl.onended = () => {
    if (loopState === 2) { audioEl.currentTime = 0; audioEl.play(); }
    else if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1);
    else if (loopState === 1) loadTrack(0);
    else playIcon.className = "bi bi-play-fill";
};

// Events Système
document.getElementById('themeToggle').onclick = () => { theme = (theme === 'dark' ? 'light' : 'dark'); localStorage.setItem('theme', theme); updateUI(); };
document.getElementById('langSelect').onchange = e => { lang = e.target.value; localStorage.setItem('lang', lang); updateUI(); };
document.getElementById('resetBtn').onclick = () => { 
    savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains)); 
    filters.forEach(f => f.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01)); updateUI(); 
};

// Events Contrôles
document.getElementById('fileInput').onchange = e => { playlist = [...playlist, ...Array.from(e.target.files)]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); };
document.getElementById('playBtn').onclick = () => { if (!audioEl.src) return; if (audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; } else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; } };
document.getElementById('nextBtn').onclick = () => { if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); else if (loopState === 1) loadTrack(0); };
document.getElementById('prevBtn').onclick = () => { if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1); };
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; localStorage.setItem('eq-loop-state', loopState); updateUI(); };
document.getElementById('clearPlaylistBtn').onclick = () => { if(confirm(translations[lang].confirmClear)) { playlist = []; currentTrackIndex = -1; audioEl.src = ""; renderPlaylist(); updateUI(); } };

// Sliders EQ
document.querySelectorAll('.vert-range').forEach(s => { 
    s.oninput = e => { 
        const i = e.target.dataset.index, v = parseInt(e.target.value); 
        savedGains[i] = v; document.getElementById(`db${i}`).innerText = v + 'dB'; 
        if (filters[i]) filters[i].gain.setTargetAtTime(v, audioCtx.currentTime, 0.01); 
        localStorage.setItem('eq-gains', JSON.stringify(savedGains)); 
    }; 
});

// Sync Barre & Volume
document.getElementById('volSlider').oninput = e => audioEl.volume = e.target.value;
document.getElementById('progressSlider').oninput = e => audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
audioEl.ontimeupdate = () => { 
    document.getElementById('progressSlider').value = (audioEl.currentTime / audioEl.duration) * 100 || 0; 
    const fmt = s => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

// Import/Export
document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ gains: savedGains, theme, lang })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eq-config.json'; a.click();
};
document.getElementById('importInput').onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
        const d = JSON.parse(ev.target.result);
        if(d.gains) savedGains = d.gains; if(d.theme) theme = d.theme; if(d.lang) lang = d.lang;
        localStorage.setItem('eq-gains', JSON.stringify(savedGains));
        localStorage.setItem('theme', theme); localStorage.setItem('lang', lang);
        updateUI();
    };
    reader.readAsText(e.target.files[0]);
};

updateUI();
