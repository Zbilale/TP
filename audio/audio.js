const audio = new Audio();
audio.crossOrigin = "anonymous";
let audioCtx, sourceNode, analyser;
const files = []; // {file, url, title, duration}
let idx = -1;
let isShuffle = false;
let isRepeat = false;
const plList = document.getElementById('plList');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const playBtn = document.getElementById('play');
const play2 = document.getElementById('play2');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const prev2 = document.getElementById('prev2');
const next2 = document.getElementById('next2');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const discEl = document.getElementById('disc');
const seek = document.getElementById('seek');
const curTime = document.getElementById('curTime');
const durationEl = document.getElementById('duration');
const vol = document.getElementById('vol');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const clearBtn = document.getElementById('clear');
const importExample = document.getElementById('importExample');

function formatTime(s){
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return m+':'+(sec<10?'0':'')+sec;
}

function ensureAudioContext(){
    if (!audioCtx){
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        startVisualizer();
    }
}

function addFiles(fileList){
    const arr = Array.from(fileList).filter(f=>f.type.startsWith('audio/'));
    if (!arr.length) return;
    arr.forEach(f=>{
        const url = URL.createObjectURL(f);
        const item = {file:f, url, title: f.name, duration:0};
        files.push(item);
        // create temporary audio to load metadata for duration
        const a = new Audio();
        a.src = url;
        a.addEventListener('loadedmetadata', ()=>{
            item.duration = a.duration || 0;
            renderPlaylist();
        });
    });
    renderPlaylist();
    if (idx === -1) playIndex(files.length- arr.length); // play first added if nothing playing
}

function renderPlaylist(){
    plList.innerHTML = '';
    files.forEach((t,i)=>{
        const row = document.createElement('div');
        row.className = 'track-row' + (i===idx? ' active':'');
        row.innerHTML = `
            <div class="track-index">${i+1}</div>
            <div class="track-title">${escapeHtml(t.title)}</div>
            <div class="track-duration">${t.duration? formatTime(t.duration):'—'}</div>
            <button class="trash" title="Remove">✖</button>
        `;
        row.addEventListener('click', (e)=>{
            if (e.target.classList.contains('trash')) return;
            playIndex(i);
        });
        row.querySelector('.trash').addEventListener('click',(e)=>{
            e.stopPropagation();
            removeIndex(i);
        });
        plList.appendChild(row);
    });
}

function playIndex(i){
    if (i<0 || i>=files.length) return;
    idx = i;
    const track = files[idx];
    audio.src = track.url;
    titleEl.textContent = track.title;
    artistEl.textContent = track.file.type || 'Local file';
    discEl.textContent = '♪';
    ensureAudioContext();
    audio.play().then(()=>{ updatePlayUI(true) }).catch(()=>{ /* resume context on user gesture */ });
    renderPlaylist();
}

function updatePlayUI(playing){
    playBtn.textContent = playing? '⏸' : '▶';
    play2.textContent = playing? '⏸' : '▶';
    discEl.style.animationPlayState = playing? 'running':'paused';
}

playBtn.addEventListener('click', ()=>{
    if (!audio.src) return;
    if (audio.paused){ audio.play(); } else audio.pause();
});
play2.addEventListener('click', ()=>{ playBtn.click(); });
audio.addEventListener('play', ()=> updatePlayUI(true));
audio.addEventListener('pause', ()=> updatePlayUI(false));

prevBtn.addEventListener('click', prevTrack);
prev2.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
next2.addEventListener('click', nextTrack);

function prevTrack(){
    if (!files.length) return;
    if (isShuffle) playIndex(Math.floor(Math.random()*files.length));
    else playIndex((idx-1+files.length)%files.length);
}
function nextTrack(){
    if (!files.length) return;
    if (isShuffle) playIndex(Math.floor(Math.random()*files.length));
    else{
        const next = idx+1;
        if (next < files.length) playIndex(next);
        else if (isRepeat) playIndex(0);
        else { audio.pause(); audio.currentTime = 0; }
    }
}

audio.addEventListener('timeupdate', ()=>{
    seek.max = audio.duration || 0;
    seek.value = audio.currentTime || 0;
    curTime.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
});
seek.addEventListener('input', ()=>{ audio.currentTime = seek.value; });

audio.addEventListener('ended', ()=>{
    if (isRepeat) { audio.currentTime = 0; audio.play(); }
    else nextTrack();
});

vol.addEventListener('input', ()=>{ audio.volume = vol.value; });
vol.value = audio.volume = 0.8;

shuffleBtn.addEventListener('click', ()=>{
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle? 'var(--neon1)':'';
    shuffleBtn.style.transform = isShuffle? 'scale(1.06)':'';
});
repeatBtn.addEventListener('click', ()=>{
    isRepeat = !isRepeat;
    repeatBtn.style.color = isRepeat? 'var(--neon1)':'';
    repeatBtn.style.transform = isRepeat? 'scale(1.06)':'';
});

function removeIndex(i){
    if (i<0 || i>=files.length) return;
    const wasCurrent = i===idx;
    URL.revokeObjectURL(files[i].url);
    files.splice(i,1);
    if (files.length===0){ idx=-1; audio.pause(); audio.src=''; titleEl.textContent='No track loaded'; artistEl.textContent='Upload audio files from your device'; }
    else if (wasCurrent) {
        const next = Math.min(i, files.length-1);
        playIndex(next);
    } else if (i < idx) idx--; // shift current index
    renderPlaylist();
}

clearBtn.addEventListener('click', ()=>{
    files.forEach(t=>URL.revokeObjectURL(t.url));
    files.length = 0; idx=-1; audio.pause(); audio.src=''; renderPlaylist();
});

fileInput.addEventListener('change', (e)=> addFiles(e.target.files));

dropzone.addEventListener('dragenter', (e)=>{ e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragover', (e)=>{ e.preventDefault(); });
dropzone.addEventListener('dragleave', (e)=>{ e.preventDefault(); dropzone.classList.remove('drag'); });
dropzone.addEventListener('drop', (e)=>{ e.preventDefault(); dropzone.classList.remove('drag'); addFiles(e.dataTransfer.files); });

document.addEventListener('click', ()=>{ if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); });

/* Visualizer */
const canvas = document.getElementById('visCanvas');
const ctx = canvas.getContext('2d');
let animId;
function resizeCanvas(){
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startVisualizer(){
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);

    function draw(){
        animId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        ctx.clearRect(0,0,canvas.width,canvas.height);

        const w = canvas.width, h = canvas.height;
        const barWidth = (w / bufferLength) * 1.6;
        let x = 0;
        for (let i=0;i<bufferLength;i++){
            const v = data[i] / 255;
            const barHeight = v * h * 0.75;
            const hue = 200 + (i / bufferLength) * 160;
            const alpha = 0.18 + v*0.85;
            // glow
            ctx.fillStyle = `hsla(${hue},100%,55%,${alpha})`;
            ctx.fillRect(x, h - barHeight, barWidth*0.9, barHeight);
            x += barWidth + 1 * devicePixelRatio;
        }
        // center radial pulse
        const avg = data.reduce((a,b)=>a+b,0)/bufferLength;
        const r = 20 + avg/2;
        const grd = ctx.createRadialGradient(w-140, 80, r*0.2, w-140, 80, r*3);
        grd.addColorStop(0, 'rgba(0,255,213,0.06)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0,0,w,h);
    }
    if (animId) cancelAnimationFrame(animId);
    draw();
}

/* Small helper to escape HTML in playlist titles */
function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* Demo import: creates three short generated tones as blobs (no copyright) */
importExample.addEventListener('click', async ()=>{
    function tone(freq,dur=2){
        const context = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100*dur, 44100);
        const o = context.createOscillator();
        const g = context.createGain();
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.001,0);
        g.gain.exponentialRampToValueAtTime(0.7,0.05);
        g.gain.exponentialRampToValueAtTime(0.0001,dur);
        o.connect(g); g.connect(context.destination);
        o.start(0);
        o.stop(dur);
        return context.startRendering().then(buffer=>{
            const wav = bufferToWav(buffer);
            return new Blob([new DataView(wav)],{type:'audio/wav'});
        });
    }
    function bufferToWav(buffer){
        const numOfChan = buffer.numberOfChannels, length = buffer.length * numOfChan * 2 + 44;
        const bufferArr = new ArrayBuffer(length), view = new DataView(bufferArr);
        function writeString(view, offset, string){
            for (let i=0;i<string.length;i++) view.setUint8(offset+i,string.charCodeAt(i));
        }
        let offset = 0;
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, length - 8, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numOfChan, true); offset += 2;
        view.setUint32(offset, buffer.sampleRate, true); offset += 4;
        view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4;
        view.setUint16(offset, numOfChan * 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, length - offset - 4, true); offset += 4;
        const interleaved = interleave(buffer);
        let pos = 44;
        for (let i=0;i<interleaved.length;i++,pos+=2){
            const sample = Math.max(-1, Math.min(1, interleaved[i]));
            view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
        return bufferArr;
    }
    function interleave(inputBuffer){
        if (inputBuffer.numberOfChannels === 1) return inputBuffer.getChannelData(0);
        const chan0 = inputBuffer.getChannelData(0), chan1 = inputBuffer.getChannelData(1);
        const length = chan0.length + chan1.length;
        const result = new Float32Array(length);
        let index = 0;
        for (let i = 0; i < chan0.length; i++){
            result[index++] = chan0[i];
            result[index++] = chan1[i];
        }
        return result;
    }

    const blobs = await Promise.all([tone(220,2.8), tone(330,3.2), tone(440,3.6)]);
    const demoFiles = blobs.map((b,i)=> new File([b], `Demo ${i+1}.wav`, {type:'audio/wav'}));
    addFiles(demoFiles);
});

/* Optional keyboard shortcuts */
document.addEventListener('keydown',(e)=>{
    if (e.code === 'Space'){ e.preventDefault(); playBtn.click(); }
    if (e.code === 'ArrowRight') nextTrack();
    if (e.code === 'ArrowLeft') prevTrack();
});

/* Clean up object URLs on unload */
window.addEventListener('unload', ()=>{
    files.forEach(f=>URL.revokeObjectURL(f.url));
});