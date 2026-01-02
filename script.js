const translations = {
    fr: { title: "Lecteur Audio EQ", chooseFile: "Charger", unknown: "Artiste inconnu", clear: "Vider", confirmClear: "Vider la playlist ?" },
    en: { title: "EQ Audio Player", chooseFile: "Load", unknown: "Unknown Artist", clear: "Clear", confirmClear: "Clear playlist?" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
const volSlider = document.getElementById('volSlider');
const progSlider = document.getElementById('progressSlider');
const playlistContainer = document.getElementById('playlistContainer');

let audioCtx, source, filters = [];
let playlist = [], currentTrackIndex = -1;

// Chargement des préférences
let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.chooseFile;
    document.getElementById('ui-clear').innerText = t.clear;

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

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    initAudio();
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const file = playlist[index];
    audioEl.src = URL.createObjectURL(file);
    audioEl.load(); 
    audioEl.play().then(() => playIcon.className = "bi bi-pause-fill").catch(e => console.log("Interaction requise"));

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
    playlistContainer.innerHTML = "";
    playlist.forEach((file, i) => {
        const btn = document.createElement('button');
        btn.className = `list-group-item list-group-item-action playlist-item ${i === currentTrackIndex ? 'active' : ''}`;
        btn.innerHTML = `<i class="bi bi-music-note me-2"></i> ${file.name}`;
        btn.onclick = () => loadTrack(i);
        playlistContainer.appendChild(btn);
    });
}

// Actions
document.getElementById('fileInput').onchange = (e) => {
    const newFiles = Array.from(e.target.files);
    playlist = [...playlist, ...newFiles];
    renderPlaylist();
    if(currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('clearPlaylistBtn').onclick = () => {
    if(playlist.length > 0 && confirm(translations[lang].confirmClear)) {
        playlist = [];
        currentTrackIndex = -1;
        audioEl.pause();
        audioEl.src = "";
        document.getElementById('trackTitle').innerText = "Prêt à jouer";
        document.getElementById('trackArtist').innerText = "Playlist vide";
        document.getElementById('albumArt').src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";
        renderPlaylist();
    }
};

document.getElementById('playBtn').onclick = () => {
    if(!audioEl.src) return;
    if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; }
};

document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1);

volSlider.oninput = (e) => audioEl.volume = e.target.value;

document.querySelectorAll('input.vertical').forEach(s => {
    s.oninput = (e) => {
        const i = e.target.dataset.index, v = e.target.value;
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = v;
        localStorage.setItem('eq-gains', JSON.stringify(savedGains));
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

audioEl.ontimeupdate = () => {
    progSlider.value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    const fmt = (s) => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

progSlider.oninput = () => audioEl.currentTime = (progSlider.value / 100) * audioEl.duration;

// Fix iOS AudioContext
["click", "touchstart"].forEach(v => window.addEventListener(v, () => { if(audioCtx) audioCtx.resume(); }, {once:true}));

updateUI();
