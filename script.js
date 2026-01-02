const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Réinitialiser EQ", import: "Import EQ", export: "Export EQ", playlist: "Ma Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", ready: "Prêt à jouer", unknown: "Inconnu" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset EQ", import: "Import EQ", export: "Export EQ", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", ready: "Ready to play", unknown: "Unknown" }
};

const audioEl = document.getElementById('audioSource');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
let audioCtx, source, filters = [], playlist = [], currentTrackIndex = -1, previousVolume = 0.7;

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let loopState = parseInt(localStorage.getItem('eq-loop-state')) || 0;
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

    const lIcon = document.getElementById('loopIcon');
    const lBtn = document.getElementById('loopToggle');
    lIcon.className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    lBtn.style.color = loopState > 0 ? 'var(--accent-color)' : 'inherit';

    // Logique Bouton Play/Pause (Vert/Gris)
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

document.getElementById('muteContainer').onclick = () => {
    if (audioEl.volume > 0) { previousVolume = audioEl.volume; audioEl.volume = 0; }
    else { audioEl.volume = previousVolume || 0.7; }
    document.getElementById('volSlider').value = audioEl.volume;
    updateUI();
};

document.getElementById('volSlider').oninput = e => { audioEl.volume = e.target.value; updateUI(); };

audioEl.onplay = () => updateUI();
audioEl.onpause = () => updateUI();
audioEl.onended = () => {
    if (loopState === 2) { audioEl.currentTime = 0; audioEl.play(); }
    else if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1);
    else if (loopState === 1) loadTrack(0);
    else updateUI();
};

document.getElementById('themeToggle').onclick = () => { theme = (theme === 'dark' ? 'light' : 'dark'); localStorage.setItem('theme', theme); updateUI(); };
document.getElementById('langSelect').onchange = e => { lang = e.target.value; localStorage.setItem('lang', lang); updateUI(); };

playBtn.onclick = () => { if (!audioEl.src) return; audioEl.paused ? audioEl.play() : audioEl.pause(); };
document.getElementById('fileInput').onchange = e => { playlist = [...playlist, ...Array.from(e.target.files)]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); };
document.getElementById('nextBtn').onclick = () => { if (currentTrackIndex < playlist.length - 1) loadTrack(currentTrackIndex + 1); else if (loopState === 1) loadTrack(0); };
document.getElementById('prevBtn').onclick = () => { if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1); };
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; localStorage.setItem('eq-loop-state', loopState); updateUI(); };

document.querySelectorAll('.vert-range').forEach(s => { 
    s.oninput = e => { 
        const i = e.target.dataset.index, v = parseInt(e.target.value); 
        savedGains[i] = v; document.getElementById(`db${i}`).innerText = v + 'dB'; 
        if (filters[i]) filters[i].gain.setTargetAtTime(v, audioCtx.currentTime, 0.01); 
        localStorage.setItem('eq-gains', JSON.stringify(savedGains)); 
    }; 
});

audioEl.ontimeupdate = () => { 
    document.getElementById('progressSlider').value = (audioEl.currentTime / audioEl.duration) * 100 || 0; 
    const fmt = s => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

updateUI();
