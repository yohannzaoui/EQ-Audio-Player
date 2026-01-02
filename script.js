const translations = {
    fr: { title: "Lecteur Audio EQ", chooseFile: "Charger", reset: "Réinitialiser EQ", export: "Exporter EQ", import: "Importer EQ", unknownArt: "Artiste inconnu", ready: "Prêt à jouer", selectFile: "Sélectionnez un fichier", clearPlaylist: "Vider", confirmClear: "Voulez-vous vraiment vider toute la playlist ?" },
    en: { title: "EQ Audio Player", chooseFile: "Load", reset: "Reset EQ", export: "Export EQ", import: "Import EQ", unknownArt: "Unknown Artist", ready: "Ready to play", selectFile: "Select a file", clearPlaylist: "Clear", confirmClear: "Are you sure?" }
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

function formatTime(s) { 
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s/60); const rs = Math.floor(s%60); 
    return `${m}:${rs < 10 ? '0' + rs : rs}`; 
}

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    
    const loopIcon = document.getElementById('loopIcon');
    audioEl.loop = (loopState === 2);
    loopIcon.className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    document.getElementById('loopToggle').style.color = loopState > 0 ? 'var(--accent)' : '';

    audioEl.volume = savedVol;
    volSlider.value = savedVol;
    volValue.innerText = Math.round(savedVol * 100) + "%";
    
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.chooseFile;
    document.getElementById('resetBtn').innerText = t.reset;
    document.getElementById('ui-clear-playlist').innerText = t.clearPlaylist;

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
    
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const fileURL = URL.createObjectURL(file);
    audioEl.src = fileURL;
    audioEl.load(); // Primordial pour iOS
    
    audioEl.play().then(() => {
        playIcon.className = "bi bi-pause-fill";
    }).catch(e => console.log("Lecture en attente d'interaction"));

    renderPlaylist();

    // Extension & Badge
    const extension = file.name.split('.').pop().toLowerCase();
    const badge = document.getElementById('formatBadge');
    badge.innerText = extension.toUpperCase();
    badge.className = `badge ms-2 badge-format fmt-${['mp3','wav','flac','m4a'].includes(extension) ? extension : 'default'}`;
    badge.classList.remove('d-none');

    // Tags
    jsmediatags.read(file, {
        onSuccess: (tag) => {
            const { title, artist, picture } = tag.tags;
            document.getElementById('trackTitle').innerText = title || file.name;
            document.getElementById('trackArtist').innerText = artist || translations[lang].unknownArt;
            if (picture) {
                let base64String = "";
                for (let i = 0; i < picture.data.length; i++) base64String += String.fromCharCode(picture.data[i]);
                document.getElementById('albumArt').src = `data:${picture.format};base64,${window.btoa(base64String)}`;
            } else {
                document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";
            }
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

// Events
document.getElementById('fileInput').onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) { playlist = [...playlist, ...files]; renderPlaylist(); if (currentTrackIndex === -1) loadTrack(0); }
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

document.getElementById('prevBtn').onclick = () => {
    if (audioEl.currentTime > 3) audioEl.currentTime = 0;
    else if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1);
};

audioEl.onended = () => {
    if (loopState === 2) audioEl.play();
    else document.getElementById('nextBtn').click();
};

volSlider.oninput = (e) => {
    savedVol = parseFloat(e.target.value);
    audioEl.volume = savedVol;
    volValue.innerText = Math.round(savedVol * 100) + "%";
    localStorage.setItem('eq-volume', savedVol);
};

document.querySelectorAll('input[type="range"].vertical').forEach(s => {
    s.oninput = (e) => {
        const i = e.target.dataset.index, v = parseInt(e.target.value);
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = v; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});

document.getElementById('themeToggle').onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateUI();
};

document.getElementById('langSelect').onchange = (e) => {
    lang = e.target.value;
    localStorage.setItem('lang', lang);
    updateUI();
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

audioEl.ontimeupdate = () => {
    if(!isNaN(audioEl.duration)) {
        progSlider.value = (audioEl.currentTime / audioEl.duration) * 100;
        curTimeTxt.innerText = formatTime(audioEl.currentTime);
        durTimeTxt.innerText = formatTime(audioEl.duration);
    }
};

progSlider.oninput = () => { audioEl.currentTime = (progSlider.value / 100) * audioEl.duration; };

// Fix iOS AudioContext
["click", "touchstart"].forEach(evt => 
    window.addEventListener(evt, () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true })
);

updateUI();
