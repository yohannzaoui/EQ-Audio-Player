const jsmediatags = window.jsmediatags;
const audioEl = document.getElementById('audioSource');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const progressFill = document.getElementById('progressFill');
const volSlider = document.getElementById('volSlider');
const volIcon = document.getElementById('volIcon');
const formatTag = document.getElementById('formatTag');

let lastVolume = 0.05;
audioEl.volume = 0.05;

function updateVolumeUI(val) {
    volSlider.value = val;
    if (val == 0) volIcon.className = "bi bi-volume-mute-fill volume-icon text-danger";
    else if (val < 0.5) volIcon.className = "bi bi-volume-down-fill volume-icon";
    else volIcon.className = "bi bi-volume-up-fill volume-icon";
}

volSlider.oninput = (e) => {
    const val = parseFloat(e.target.value);
    audioEl.volume = val;
    if (val > 0) lastVolume = val;
    updateVolumeUI(val);
};

volIcon.onclick = () => {
    if (audioEl.volume > 0) { lastVolume = audioEl.volume; audioEl.volume = 0; }
    else { audioEl.volume = lastVolume || 0.05; }
    updateVolumeUI(audioEl.volume);
};

let playlist = [], currentIndex = 0, isShuffle = false, repeatMode = 0; 
let theme = localStorage.getItem('theme') || 'dark';
let savedGains = JSON.parse(localStorage.getItem('eq-gains') || '[0,0,0,0,0]');
let audioCtx, source, filters = [], freqs = [60, 250, 1000, 4000, 16000];

function createEqUI() {
    const eqBars = document.getElementById('eqBars');
    eqBars.innerHTML = '';
    freqs.forEach((f, i) => {
        eqBars.innerHTML += `<div class="text-center">
            <span class="small d-block" style="font-size:0.65rem;" id="db${i}">${savedGains[i]}dB</span>
            <div class="range-wrapper"><input type="range" class="vertical eq-slider" min="-20" max="20" value="${savedGains[i]}" data-index="${i}"></div>
            <span class="small d-block mt-2" style="font-size:0.7rem;">${f >= 1000 ? (f/1000)+'k' : f}Hz</span>
        </div>`;
    });
    attachSliderEvents();
}

function initAudio() {
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

function attachSliderEvents() {
    document.querySelectorAll('.eq-slider').forEach(s => {
        s.oninput = (e) => {
            const i = e.target.dataset.index;
            const val = parseInt(e.target.value);
            document.getElementById(`db${i}`).innerText = val + 'dB';
            savedGains[i] = val;
            localStorage.setItem('eq-gains', JSON.stringify(savedGains));
            if (filters[i]) filters[i].gain.setTargetAtTime(val, audioCtx.currentTime, 0.01);
        };
    });
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    initAudio();
    currentIndex = index;
    if (audioEl.src) URL.revokeObjectURL(audioEl.src);
    const trackFile = playlist[index];
    audioEl.src = URL.createObjectURL(trackFile);
    
    const ext = trackFile.name.split('.').pop().toUpperCase();
    formatTag.innerText = ext;
    formatTag.style.display = 'block';

    document.getElementById('metaTitle').innerText = trackFile.name;
    document.getElementById('metaArtist').innerText = "Unknown Artist";
    resetArt();
    audioEl.play().catch(e => console.log("Playback error:", e));
    playIcon.className = "bi bi-pause-circle-fill";
    jsmediatags.read(trackFile, {
        onSuccess: (tag) => {
            const { title, artist, picture } = tag.tags;
            if (title) document.getElementById('metaTitle').innerText = title;
            if (artist) document.getElementById('metaArtist').innerText = artist;
            if (picture) {
                let base64 = "";
                for (let i = 0; i < picture.data.length; i++) base64 += String.fromCharCode(picture.data[i]);
                document.getElementById('albumArtImg').src = `data:${picture.format};base64,${window.btoa(base64)}`;
                document.getElementById('albumArtImg').style.display = 'block';
                document.getElementById('artIcon').style.display = 'none';
            }
        }
    });
    renderPlaylist();
}

playPauseBtn.onclick = () => {
    if (!audioEl.src && playlist.length > 0) loadTrack(0);
    else if (audioEl.paused) { audioEl.play(); playIcon.className = "bi bi-pause-circle-fill"; }
    else { audioEl.pause(); playIcon.className = "bi bi-play-circle-fill"; }
};

audioEl.ontimeupdate = () => {
    const pct = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    progressFill.style.width = pct + "%";
    document.getElementById('currentTime').innerText = formatTime(audioEl.currentTime);
    document.getElementById('duration').innerText = formatTime(audioEl.duration || 0);
};

document.getElementById('progressContainer').onclick = (e) => {
    const pct = e.offsetX / e.currentTarget.offsetWidth;
    audioEl.currentTime = pct * audioEl.duration;
};

function formatTime(s) {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function handleNext() {
    if (playlist.length === 0) return;
    if (isShuffle) {
        let next; do { next = Math.floor(Math.random() * playlist.length); } while (next === currentIndex && playlist.length > 1);
        loadTrack(next);
    } else {
        if (currentIndex < playlist.length - 1) loadTrack(currentIndex + 1);
        else if (repeatMode === 2) loadTrack(0);
    }
}

document.getElementById('nextBtn').onclick = handleNext;
document.getElementById('prevBtn').onclick = () => loadTrack(currentIndex - 1);
audioEl.onended = () => { if (repeatMode === 1) loadTrack(currentIndex); else handleNext(); };

document.getElementById('shuffleBtn').onclick = (e) => { isShuffle = !isShuffle; e.currentTarget.classList.toggle('active', isShuffle); };

document.getElementById('repeatBtn').onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('repeatBtn');
    const badge = document.getElementById('repeatBadge');
    btn.classList.remove('active'); badge.style.display = 'none';
    if (repeatMode === 1) { btn.classList.add('active'); badge.style.display = 'flex'; }
    else if (repeatMode === 2) { btn.classList.add('active'); }
};

document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ gains: savedGains, theme: theme })], {type: "application/json"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "eq_settings.json"; a.click();
};

document.getElementById('resetBtn').onclick = () => {
    savedGains = [0,0,0,0,0]; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
    createEqUI(); if (audioCtx) filters.forEach((f, i) => f.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01));
};

document.getElementById('importInput').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        if (data.gains) {
            savedGains = data.gains; localStorage.setItem('eq-gains', JSON.stringify(savedGains));
            createEqUI(); if (audioCtx) filters.forEach((f, i) => f.gain.setTargetAtTime(savedGains[i], audioCtx.currentTime, 0.01));
        }
    };
    reader.readAsText(file);
};

document.getElementById('themeToggle').onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    applyTheme();
};

function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
}

document.getElementById('fileInput').onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) { playlist = [...playlist, ...files]; renderPlaylist(); if (!audioEl.src) loadTrack(0); }
};

document.getElementById('clearBtn').onclick = () => {
    if(confirm("Clear library?")) { 
        playlist = []; currentIndex = 0; audioEl.pause(); audioEl.src = ""; 
        formatTag.style.display = 'none';
        renderPlaylist(); resetArt(); 
    }
};

function renderPlaylist() {
    const p = document.getElementById('playlist');
    p.innerHTML = playlist.length ? '' : '<div class="p-5 text-center opacity-50">Empty</div>';
    playlist.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = `playlist-item ${i === currentIndex ? 'active' : ''}`;
        div.innerHTML = `<i class="bi bi-music-note"></i> <span class="text-truncate">${f.name}</span>`;
        div.onclick = () => loadTrack(i);
        p.appendChild(div);
    });
}

function resetArt() { 
    document.getElementById('albumArtImg').style.display = 'none'; 
    document.getElementById('artIcon').style.display = 'block'; 
    document.getElementById('metaTitle').innerText = "No track selected";
    document.getElementById('metaArtist').innerText = "Please load your music";
}

createEqUI();
applyTheme();
renderPlaylist();
updateVolumeUI(0.05);