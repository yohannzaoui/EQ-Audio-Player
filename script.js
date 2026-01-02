const translations = {
    fr: { title: "Lecteur Audio EQ", chooseFile: "Charger", unknown: "Artiste inconnu" },
    en: { title: "EQ Audio Player", chooseFile: "Load", unknown: "Unknown Artist" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
const volSlider = document.getElementById('volSlider');
const progSlider = document.getElementById('progressSlider');

let audioCtx, source, filters = [];
let playlist = [], currentTrackIndex = -1;

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    document.getElementById('ui-title').innerText = translations[lang].title;
    document.getElementById('ui-btn-label').innerText = translations[lang].chooseFile;

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
    audioEl.load(); // Indispensable pour iOS
    audioEl.play().then(() => playIcon.className = "bi bi-pause-fill");

    document.getElementById('trackTitle').innerText = file.name;
    jsmediatags.read(file, {
        onSuccess: (tag) => {
            const { title, artist, picture } = tag.tags;
            if(title) document.getElementById('trackTitle').innerText = title;
            document.getElementById('trackArtist').innerText = artist || translations[lang].unknown;
            if (picture) {
                let base64 = "";
                for (let i = 0; i < picture.data.length; i++) base64 += String.fromCharCode(picture.data[i]);
                document.getElementById('albumArt').src = `data:${picture.format};base64,${window.btoa(base64)}`;
            }
        }
    });
    renderPlaylist();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = playlist.map((f, i) => 
        `<button class="list-group-item list-group-item-action small ${i===currentTrackIndex?'active':''}" onclick="loadTrack(${i})">${f.name}</button>`
    ).join('');
}

document.getElementById('fileInput').onchange = (e) => {
    playlist = [...playlist, ...e.target.files];
    renderPlaylist();
    if(currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('playBtn').onclick = () => {
    if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; }
};

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

["click", "touchstart"].forEach(v => window.addEventListener(v, () => { if(audioCtx) audioCtx.resume(); }, {once:true}));

updateUI();
