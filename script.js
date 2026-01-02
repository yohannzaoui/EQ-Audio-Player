const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Réinitialiser EQ", import: "Importer JSON", export: "Exporter JSON", playlist: "Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", ready: "Prêt à jouer", unknownArtist: "Artiste inconnu" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset EQ", import: "Import JSON", export: "Export JSON", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", ready: "Ready to play", unknownArtist: "Unknown Artist" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
let audioCtx, source, filters = [];
let playlist = [], currentTrackIndex = -1;

// Chargement des préférences
let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0;
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    // Appliquer Thème
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    
    // Traduction
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.choose;
    document.getElementById('resetBtn').innerText = t.reset;
    document.getElementById('ui-import-label').innerText = t.import;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('ui-playlist-title').innerText = t.playlist;
    document.getElementById('langSelect').value = lang;

    // EQ et Boucle
    document.getElementById('loopIcon').className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    document.getElementById('loopToggle').style.color = loopState > 0 ? 'var(--accent)' : '';
    
    savedGains.forEach((g, i) => {
        document.getElementById(`db${i}`).innerText = g + 'dB';
        const slider = document.querySelector(`input[data-index="${i}"]`);
        if(slider) slider.value = g;
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

// GESTION DES BOUTONS
document.getElementById('themeToggle').onclick = () => {
    theme = (theme === 'dark') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateUI();
};

document.getElementById('resetBtn').onclick = () => {
    savedGains = [0,0,0,0,0];
    localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    updateUI();
};

document.getElementById('exportBtn').onclick = () => {
    const data = { gains: savedGains, theme: theme, lang: lang };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eq-player-config.json';
    a.click();
};

document.getElementById('importInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if(data.gains) savedGains = data.gains;
            if(data.theme) theme = data.theme;
            if(data.lang) lang = data.lang;
            
            localStorage.setItem('eq-gains', JSON.stringify(savedGains));
            localStorage.setItem('theme', theme);
            localStorage.setItem('lang', lang);
            updateUI();
        } catch(err) { alert("Fichier invalide"); }
    };
    reader.readAsText(file);
};

// Lecture et Playlist
function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    initAudio();
    audioEl.src = URL.createObjectURL(playlist[index]);
    audioEl.play();
    playIcon.className = "bi bi-pause-fill";
    document.getElementById('trackTitle').innerText = playlist[index].name;
    renderPlaylist();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = playlist.map((f, i) => 
        `<button class="list-group-item list-group-item-action playlist-item ${i===currentTrackIndex?'active':''}" onclick="loadTrack(${i})">${f.name}</button>`
    ).join('');
}

document.getElementById('fileInput').onchange = e => {
    playlist = [...playlist, ...Array.from(e.target.files)];
    renderPlaylist();
    if(currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('playBtn').onclick = () => {
    if(!audioEl.src) return;
    if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; }
};

document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1);

document.getElementById('loopToggle').onclick = () => {
    loopState = (loopState + 1) % 3;
    localStorage.setItem('eq-loop-state', loopState);
    updateUI();
};

document.getElementById('clearPlaylistBtn').onclick = () => {
    if(confirm(translations[lang].confirmClear)) {
        playlist = []; currentTrackIndex = -1; audioEl.src = "";
        renderPlaylist(); updateUI();
    }
};

document.getElementById('langSelect').onchange = e => {
    lang = e.target.value;
    localStorage.setItem('lang', lang);
    updateUI();
};

document.querySelectorAll('.vert-range').forEach(s => {
    s.oninput = e => {
        const i = e.target.dataset.index, v = e.target.value;
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = parseInt(v);
        localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});

// Sync temps
audioEl.ontimeupdate = () => {
    const prog = document.getElementById('progressSlider');
    prog.value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    const fmt = s => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

document.getElementById('progressSlider').oninput = e => audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
document.getElementById('volSlider').oninput = e => audioEl.volume = e.target.value;

updateUI();
