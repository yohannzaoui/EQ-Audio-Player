const translations = {
    fr: { title: "EQ Audio Player", chooseFile: "Charger Musique", reset: "Réinitialiser EQ", export: "Exporter EQ", import: "Importer EQ", unknownArt: "Artiste inconnu", ready: "Prêt à jouer", selectFile: "Sélectionnez un fichier" },
    en: { title: "EQ Audio Player", chooseFile: "Load Music", reset: "Reset EQ", export: "Export EQ", import: "Import EQ", unknownArt: "Unknown Artist", ready: "Ready to play", selectFile: "Select a file" }
};

const audioEl = document.getElementById('audioSource');
const playBtn = document.getElementById('playBtn'), playIcon = document.getElementById('playIcon');
const volSlider = document.getElementById('volSlider'), volValue = document.getElementById('volValue'), volIcon = document.getElementById('volIcon');
const progSlider = document.getElementById('progressSlider'), curTimeTxt = document.getElementById('currentTime'), durTimeTxt = document.getElementById('durationTime');

const freqs = [60, 250, 1000, 4000, 16000];
let audioCtx, source, filters = [];
let playlist = [];
let currentTrackIndex = -1;

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0; 
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');
let savedVol = parseFloat(localStorage.getItem('eq-volume')) || 0.7;
let preMuteVol = savedVol > 0 ? savedVol : 0.7;

function formatTime(s) { const m = Math.floor(s/60); const rs = Math.floor(s%60); return `${m}:${rs < 10 ? '0' + rs : rs}`; }

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    
    const loopBtn = document.getElementById('loopToggle');
    const loopIcon = document.getElementById('loopIcon');
    loopBtn.classList.remove('btn-active-loop-all', 'btn-active-loop-one');
    audioEl.loop = (loopState === 2);
    if (loopState === 1) { loopBtn.classList.add('btn-active-loop-all'); loopIcon.className = 'bi bi-repeat'; } 
    else if (loopState === 2) { loopBtn.classList.add('btn-active-loop-one'); loopIcon.className = 'bi bi-repeat-1'; } 
    else { loopIcon.className = 'bi bi-repeat'; }

    audioEl.volume = savedVol;
    volSlider.value = savedVol;
    volValue.innerText = Math.round(savedVol * 100) + "%";
    volIcon.className = savedVol == 0 ? "bi bi-volume-mute-fill text-danger" : (savedVol < 0.5 ? "bi bi-volume-down-fill" : "bi bi-volume-up-fill");
    
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.chooseFile;
    document.getElementById('resetBtn').innerText = t.reset;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('ui-import-label').innerText = t.import;

    if (currentTrackIndex === -1) {
        document.getElementById('trackTitle').innerText = t.ready;
        document.getElementById('trackArtist').innerText = t.selectFile;
    }
    
    savedGains.forEach((g, i) => {
        document.getElementById(`db${i}`).innerText = g + 'dB';
        const s = document.querySelector(`input[data-index="${i}"]`);
        if(s) s.value = g;
        if(filters[i]) filters[i].gain.value = g;
    });
}

function setupAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audioEl);
    let lastNode = source;
    filters = freqs.map((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = "peaking"; filter.frequency.value = f; filter.gain.value = savedGains[i];
        lastNode.connect(filter); lastNode = filter; return filter;
    });
    lastNode.connect(audioCtx.destination);
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    const file = playlist[index];
    setupAudio();
    audioEl.src = URL.createObjectURL(file);
    audioEl.play();
    playIcon.className = "bi bi-pause-fill";
    renderPlaylist();
    document.getElementById('formatBadge').innerText = file.name.split('.').pop().toUpperCase();
    document.getElementById('formatBadge').classList.remove('d-none');

    jsmediatags.read(file, {
        onSuccess: (tag) => {
            const { title, artist, picture } = tag.tags;
            document.getElementById('trackTitle').innerText = title || file.name;
            document.getElementById('trackArtist').innerText = artist || translations[lang].unknownArt;
            if (picture) {
                const base64 = picture.data.map(c => String.fromCharCode(c)).join("");
                document.getElementById('albumArt').src = `data:${picture.format};base64,${window.btoa(base64)}`;
            } else { document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png"; }
        },
        onError: () => {
            document.getElementById('trackTitle').innerText = file.name;
            document.getElementById('trackArtist').innerText = translations[lang].unknownArt;
        }
    });
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = "";
    document.getElementById('playlistCount').innerText = playlist.length;
    playlist.forEach((file, i) => {
        const btn = document.createElement('button');
        btn.className = `list-group-item list-group-item-action playlist-item ${i === currentTrackIndex ? 'active' : ''}`;
        btn.innerHTML = `<div class="text-truncate small"><i class="bi bi-music-note me-2"></i>${file.name}</div>`;
        btn.onclick = () => loadTrack(i);
        container.appendChild(btn);
    });
}

// LOGIQUE EXPORT / IMPORT
document.getElementById('exportBtn').onclick = () => {
    const config = { gains: savedGains, theme: theme, lang: lang, volume: savedVol, loop: loopState };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eq-config-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
};

document.getElementById('importInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const config = JSON.parse(event.target.result);
            if (config.gains) savedGains = config.gains;
            if (config.theme) theme = config.theme;
            if (config.lang) lang = config.lang;
            if (config.volume) savedVol = config.volume;
            if (config.loop !== undefined) loopState = config.loop;
            
            localStorage.setItem('eq-gains', JSON.stringify(savedGains));
            localStorage.setItem('theme', theme);
            localStorage.setItem('lang', lang);
            localStorage.setItem('eq-volume', savedVol);
            localStorage.setItem('eq-loop-state', loopState);
            
            updateUI();
            alert("Configuration importée avec succès !");
        } catch (err) { alert("Erreur lors de la lecture du fichier."); }
    };
    reader.readAsText(file);
};

// Events standards
document.getElementById('fileInput').onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) { playlist = [...playlist, ...files]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); }
};
document.getElementById('prevBtn').onclick = () => { if (audioEl.currentTime > 3) audioEl.currentTime = 0; else if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1); };
document.getElementById('nextBtn').onclick = () => { if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); else if (loopState === 1) loadTrack(0); };
audioEl.onended = () => { if (loopState === 2) audioEl.play(); else if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); else if (loopState === 1) loadTrack(0); };
volIcon.onclick = () => { if (savedVol > 0) { preMuteVol = savedVol; savedVol = 0; } else { savedVol = preMuteVol; } localStorage.setItem('eq-volume', savedVol); updateUI(); };
playBtn.onclick = () => { if(!audioEl.src) return; if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; } else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; } };
volSlider.oninput = (e) => { savedVol = parseFloat(e.target.value); if (savedVol > 0) preMuteVol = savedVol; localStorage.setItem('eq-volume', savedVol); updateUI(); };
document.querySelectorAll('input[type="range"].vertical').forEach(s => {
    s.oninput = (e) => {
        const i = e.target.dataset.index, v = parseInt(e.target.value);
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = v; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; localStorage.setItem('eq-loop-state', loopState); updateUI(); };
document.getElementById('themeToggle').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('theme', theme); updateUI(); };
document.getElementById('langSelect').onchange = (e) => { lang = e.target.value; localStorage.setItem('lang', lang); updateUI(); renderPlaylist(); };
document.getElementById('resetBtn').onclick = () => { savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains)); updateUI(); filters.forEach(f => f.gain.value = 0); };
audioEl.ontimeupdate = () => { if(!isNaN(audioEl.duration)) { progSlider.value = (audioEl.currentTime / audioEl.duration) * 100; curTimeTxt.innerText = formatTime(audioEl.currentTime); durTimeTxt.innerText = formatTime(audioEl.duration); } };
progSlider.oninput = () => { audioEl.currentTime = (progSlider.value / 100) * audioEl.duration; };

updateUI();
window.onclick = () => { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); };