const translations = {
    fr: { title: "Audio Master EQ", choose: "Charger", record: "Enregistrer", stop: "Arrêter", reset: "Reset EQ", confirm: "Vider la playlist ?" },
    en: { title: "Audio Master EQ", choose: "Load", record: "Record", stop: "Stop", reset: "Reset EQ", confirm: "Clear playlist?" }
};

const audioEl = document.getElementById('audioSource');
const playIcon = document.getElementById('playIcon');
let audioCtx, source, filters = [], recorder, recordedChunks = [];

// État et Préférences
let playlist = [], currentTrackIndex = -1, isRecording = false;
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
    document.getElementById('ui-record').innerText = isRecording ? t.stop : t.record;

    document.getElementById('loopIcon').className = loopState === 2 ? 'bi bi-repeat-1' : 'bi bi-repeat';
    document.getElementById('loopToggle').style.color = loopState > 0 ? 'var(--accent)' : '';

    savedGains.forEach((g, i) => {
        document.getElementById(`db${i}`).innerText = g + 'dB';
        const el = document.querySelector(`input[data-index="${i}"]`);
        if(el) el.value = g;
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
    
    // Setup Destination pour Record
    const dest = audioCtx.createMediaStreamDestination();
    lastNode.connect(dest);
    recorder = new MediaRecorder(dest.stream);
    recorder.ondataavailable = e => recordedChunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'recording.webm'; a.click();
        recordedChunks = [];
    };
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    initAudio();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    audioEl.src = URL.createObjectURL(playlist[index]);
    audioEl.load();
    audioEl.play().then(() => playIcon.className = "bi bi-pause-fill");
    document.getElementById('trackTitle').innerText = playlist[index].name;
    renderPlaylist();
}

function renderPlaylist() {
    const container = document.getElementById('playlistContainer');
    container.innerHTML = playlist.map((f, i) => 
        `<button class="list-group-item list-group-item-action playlist-item ${i===currentTrackIndex?'active':''}" onclick="loadTrack(${i})">${f.name}</button>`
    ).join('');
}

// Events
document.getElementById('recordBtn').onclick = () => {
    if (!isRecording) {
        initAudio(); recorder.start(); isRecording = true;
    } else {
        recorder.stop(); isRecording = false;
    }
    updateUI();
};

document.getElementById('fileInput').onchange = e => {
    playlist = [...playlist, ...e.target.files]; renderPlaylist();
    if(currentTrackIndex === -1) loadTrack(0);
};

document.getElementById('playBtn').onclick = () => {
    if(audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-fill"; }
};

document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1);
document.getElementById('loopToggle').onclick = () => { loopState = (loopState + 1) % 3; updateUI(); };

document.getElementById('resetBtn').onclick = () => { 
    savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains)); updateUI(); 
};

document.getElementById('clearPlaylistBtn').onclick = () => {
    if(confirm(translations[lang].confirm)) { playlist = []; currentTrackIndex = -1; audioEl.src = ""; renderPlaylist(); }
};

document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({gains: savedGains, theme, lang})], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'config.json'; a.click();
};

document.querySelectorAll('input.vertical').forEach(s => {
    s.oninput = e => {
        const i = e.target.dataset.index, v = e.target.value;
        document.getElementById(`db${i}`).innerText = v + 'dB';
        if(filters[i]) filters[i].gain.value = v;
        savedGains[i] = v; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    };
});

audioEl.ontimeupdate = () => {
    progSlider.value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    const fmt = s => Math.floor(s/60) + ":" + ("0"+Math.floor(s%60)).slice(-2);
    document.getElementById('currentTime').innerText = fmt(audioEl.currentTime);
    document.getElementById('durationTime').innerText = fmt(audioEl.duration || 0);
};

document.getElementById('themeToggle').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; updateUI(); };
document.getElementById('langSelect').onchange = e => { lang = e.target.value; updateUI(); };

updateUI();
