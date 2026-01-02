const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Réinitialiser EQ", import: "Import EQ", export: "Export EQ", playlist: "Ma Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", ready: "Prêt à jouer", unknown: "Inconnu", impSucc: "EQ Importé !", expSucc: "EQ Exporté !", resetSucc: "EQ Réinitialisé !" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset EQ", import: "Import EQ", export: "Export EQ", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", ready: "Ready to play", unknown: "Unknown", impSucc: "EQ Imported!", expSucc: "EQ Exported!", resetSucc: "EQ Reseted!" }
};

const audioEl = document.getElementById('audioSource');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
let audioCtx, source, filters = [], playlist = [], currentTrackIndex = -1, previousVolume = 0.7;

// --- INITIALISATION DES PRÉFÉRENCES ---
let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0;
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

// --- SYSTÈME DE NOTIFICATION ---
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
    document.getElementById('langSelect').value = lang;
    const t = translations[lang];
    
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.choose;
    document.getElementById('resetEqBtn').innerText = t.reset;
    document.getElementById('ui-import-label').innerText = t.import;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('ui-playlist-title').innerText = t.playlist;

    const lIcon = document.getElementById('loopIcon');
    const lBtn = document.getElementById('loopToggle');
    lIcon.className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    lBtn.style.color = loopState > 0 ? 'var(--accent-color)' : 'inherit';

    // Bouton Play/Pause Dynamique
    if (audioEl.paused) {
        playIcon.className = "bi bi-play-fill";
        playBtn.classList.remove('btn-play-active');
        playBtn.classList.add('btn-play-paused');
    } else {
        playIcon.className = "bi bi-pause-fill";
        playBtn.classList.add('btn-play-active');
        playBtn.classList.remove('btn-play-paused');
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
    
    document.getElementById('trackTitle').innerText = file.name;
    document.getElementById('trackArtist').innerText = translations[lang].unknown;
    document.getElementById('trackAlbum').innerText = translations[lang].unknown;
    document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";

    if (window.jsmediatags) {
        window.jsmediatags.read(file, {
            onSuccess: (tag) => {
                const { title, artist, album, picture } = tag.tags;
                if (title) document.getElementById('trackTitle').innerText = title;
                if (artist) document.getElementById('trackArtist').innerText = artist;
                if (album) document.getElementById('trackAlbum').innerText = album;
                if (picture) {
                    const base64 = window.btoa(picture.data.reduce((acc, b) => acc + String.fromCharCode(b), ""));
                    document.getElementById('albumArt').src = `data:${picture.format};base64,${base64}`;
                }
            }
        });
    }
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

// --- LOGIQUE IMPORT / EXPORT ---
document.getElementById('exportBtn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedGains));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "eq_config.json");
    dl.click();
    showToast(translations[lang].expSucc);
};

document.getElementById('importInput').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (Array.isArray(imported) && imported.length === 5) {
                savedGains = imported;
                localStorage.setItem('eq-gains', JSON.stringify(savedGains));
                updateUI();
                showToast(translations[lang].impSucc);
            }
        } catch (err) { alert("Format Invalide"); }
    };
    reader.readAsText(file);
};

// --- RACCOURCIS CLAVIER ---
window.addEventListener('keydown', e => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
    if (e.code === 'ArrowRight') { e.preventDefault(); document.getElementById('nextBtn').click(); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); document.getElementById('prevBtn').click(); }
    if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
    if (e.code === 'ArrowUp') { e.preventDefault(); audioEl.volume = Math.min(1, audioEl.volume + 0.05); document.getElementById('volSlider').value = audioEl.volume; updateUI(); }
    if (e.code === 'ArrowDown') { e.preventDefault(); audioEl.volume = Math.max(0, audioEl.volume - 0.05); document.getElementById('volSlider').value = audioEl.volume; updateUI(); }
});

function toggleMute() {
    if (audioEl.volume > 0) { previousVolume = audioEl.volume; audioEl.volume = 0; }
    else { audioEl.volume = previousVolume || 0.7; }
    document.getElementById('volSlider').value = audioEl.volume;
    updateUI();
}

document.getElementById('muteContainer').onclick = toggleMute;
document.getElementById('volSlider').oninput = e => { audioEl.volume = e.target.value; updateUI(); };
document.getElementById('resetEqBtn').onclick = () => { savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains)); updateUI(); showToast(translations[lang].resetSucc); };
document.getElementById('themeToggle').onclick = () => { theme = (theme === 'dark' ? 'light' : 'dark'); localStorage.setItem('theme', theme); updateUI(); };
document.getElementById('langSelect').onchange = e => { lang = e.target.value; localStorage.setItem('lang', lang); updateUI(); };
playBtn.onclick = () => { if (!audioEl.src) return; audioEl.paused ? audioEl.play() : audioEl.pause(); };
document.getElementById('fileInput').onchange = e => { playlist = [...playlist, ...Array.from(e.target.files)]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); };
document.getElementById('nextBtn').onclick = () => { if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); else if (loopState === 1) loadTrack(0); };
document.getElementById('prevBtn').onclick = () => { if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1); };
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; localStorage.setItem('eq-loop-state', loopState); updateUI(); };
document.getElementById('clearPlaylistBtn').onclick = () => { if(confirm(translations[lang].confirmClear)) { playlist = []; currentTrackIndex = -1; audioEl.src = ""; renderPlaylist(); updateUI(); } };

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
audioEl.onended = () => {
    if (loopState === 2) { audioEl.currentTime = 0; audioEl.play(); }
    else if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1);
    else if (loopState === 1) loadTrack(0);
};

updateUI();
