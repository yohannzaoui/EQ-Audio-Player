const translations = {
    fr: { title: "EQ Audio Player", choose: "Charger", reset: "Reset", playlist: "Playlist", clear: "Vider", confirmClear: "Vider la playlist ?", unknown: "Inconnu" },
    en: { title: "EQ Audio Player", choose: "Load", reset: "Reset", playlist: "Playlist", clear: "Clear", confirmClear: "Clear playlist?", unknown: "Unknown" }
};

const audioEl = document.getElementById('audioSource');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const albumArt = document.getElementById('albumArt');

let audioCtx, source, filters = [], playlist = [], currentTrackIndex = -1;
let analyser, dataArray, lastVolume = 0.7;

let theme = localStorage.getItem('theme') || 'dark';
let lang = localStorage.getItem('lang') || 'fr';
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');

function updateUI() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    document.getElementById('langSelect').value = lang;
    const t = translations[lang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-btn-label').innerText = t.choose;
    document.getElementById('ui-playlist-title').innerText = t.playlist;

    if (audioEl.paused) {
        playIcon.className = "bi bi-play-fill";
        playBtn.className = "btn btn-round btn-play-main btn-play-paused";
    } else {
        playIcon.className = "bi bi-pause-fill";
        playBtn.className = "btn btn-round btn-play-main btn-play-active";
    }

    const mIcon = document.getElementById('muteIcon');
    mIcon.className = audioEl.volume === 0 ? "bi bi-volume-mute-fill text-danger" : "bi bi-volume-up-fill";
}

function initAudio() {
    if (audioCtx) { if(audioCtx.state === 'suspended') audioCtx.resume(); return; }
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
    lastNode.connect(analyser); analyser.connect(audioCtx.destination);
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for(let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 4;
        canvasCtx.fillStyle = theme === 'dark' ? '#1abc9c' : '#3498db';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    const file = playlist[index];
    initAudio();
    audioEl.src = URL.createObjectURL(file);
    audioEl.play().then(() => audioCtx.resume());
    
    document.getElementById('trackTitle').innerText = file.name;
    // Reset Pochette par défaut
    albumArt.src = "https://cdn-icons-png.flaticon.com/512/3844/3844724.png";

    // Lecture de la pochette réelle
    if (window.jsmediatags) {
        window.jsmediatags.read(file, {
            onSuccess: (tag) => {
                const { picture, artist } = tag.tags;
                if (artist) document.getElementById('trackArtist').innerText = artist;
                if (picture) {
                    const base64String = picture.data.reduce((acc, b) => acc + String.fromCharCode(b), "");
                    albumArt.src = `data:${picture.format};base64,${window.btoa(base64String)}`;
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

// GESTION MUET
document.getElementById('muteBtn').onclick = () => {
    if (audioEl.volume > 0) {
        lastVolume = audioEl.volume;
        audioEl.volume = 0;
    } else {
        audioEl.volume = lastVolume || 0.7;
    }
    document.getElementById('volSlider').value = audioEl.volume;
    updateUI();
};

document.getElementById('volSlider').oninput = (e) => {
    audioEl.volume = e.target.value;
    updateUI();
};

document.getElementById('themeToggle').onclick = () => {
    theme = (theme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', theme);
    updateUI();
};

document.getElementById('langSelect').onchange = (e) => {
    lang = e.target.value;
    localStorage.setItem('lang', lang);
    updateUI();
};

playBtn.onclick = () => {
    if (!audioEl.src) return;
    initAudio();
    audioEl.paused ? audioEl.play() : audioEl.pause();
};

document.getElementById('fileInput').onchange = e => {
    playlist = [...playlist, ...Array.from(e.target.files)];
    renderPlaylist();
    if (currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1);

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
audioEl.onended = () => document.getElementById('nextBtn').click();

updateUI();
