// ===== Элементы DOM =====
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const likeBtn = document.getElementById('likeBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const volumeContainer = document.getElementById('volumeContainer');
const volumeFill = document.getElementById('volumeFill');
const volumeIcon = document.getElementById('volumeIcon');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const trackNameEl = document.getElementById('trackName');
const trackArtistEl = document.getElementById('trackArtist');
const playlistBody = document.getElementById('playlistBody');
const playlistCount = document.getElementById('playlistCount');
const recentCards = document.getElementById('recentCards');
const addTrackBtn = document.getElementById('addTrackBtn');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const sortBtn = document.getElementById('sortBtn');
const sortDropdown = document.getElementById('sortDropdown');
const sortOptions = document.querySelectorAll('.sort-option');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const createBtn = document.getElementById('createBtn');
const categoryInput = document.getElementById('categoryInput');
const categoriesList = document.getElementById('categoriesList');

// ===== Состояние приложения =====
let tracks = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0 = off, 1 = all, 2 = one
let isMuted = false;
let lastVolume = 0.7;
let progressInterval = null;
let currentPage = 'home';
let customCategories = [];
let categoryCounter = 0;

// ===== Инициализация =====
function init() {
    audio.volume = lastVolume;
    updateVolumeUI();
    renderRecent();
    setupEventListeners();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Управление окном
    document.getElementById('minimizeBtn').onclick = () => window.electronAPI?.windowMinimize();
    document.getElementById('maximizeBtn').onclick = async () => {
        if (window.electronAPI?.windowMaximize) {
            await window.electronAPI.windowMaximize();
            const isMax = await window.electronAPI.windowIsMaximized?.();
            document.getElementById('maximizeBtn').textContent = isMax ? '❐' : '☐';
        }
    };
    document.getElementById('closeBtn').onclick = () => window.electronAPI?.windowClose();

    // Кнопки добавления
    addTrackBtn?.addEventListener('click', addFiles);
    addCategoryBtn.addEventListener('click', openModal);

    // Плеер
    playBtn.onclick = () => togglePlay();
    prevBtn.onclick = handlePrev;
    nextBtn.onclick = handleNext;
    
    // Прогресс
    progressContainer.onclick = handleProgressClick;
    
    // Громкость
    volumeContainer.onclick = handleVolumeClick;
    volumeIcon.onclick = toggleMute;
    
    // Сортировка
    sortBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('open');
    });
    
    sortOptions.forEach(opt => {
        opt.onclick = () => handleSort(opt);
    });
    
    // Закрытие сортировки при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-container')) {
            sortDropdown.classList.remove('open');
        }
    });
    
    // Модальное окно
    modalClose?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (e) => { 
        if (e.target === modalOverlay) closeModal(); 
    });
    
    categoryInput?.addEventListener('input', () => {
        if (createBtn) createBtn.disabled = categoryInput.value.trim().length === 0;
    });
    
    categoryInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && categoryInput.value.trim()) createCategory();
        if (e.key === 'Escape') closeModal();
    });
    
    createBtn?.addEventListener('click', createCategory);
    
    // Like кнопка
    likeBtn.onclick = toggleLike;
    
    // Shuffle/Repeat
    shuffleBtn.onclick = toggleShuffle;
    repeatBtn.onclick = toggleRepeat;
    
    // Аудио события
    audio.onended = handleTrackEnded;
    
    // Горячие клавиши
    document.addEventListener('keydown', handleKeyDown);
    
    // Resize fix
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            document.body.style.transform = 'translateZ(0)';
            setTimeout(() => document.body.style.transform = '', 50);
        }, 100);
    });
}

// ===== Работа с файлами =====
async function addFiles() {
    if (!window.electronAPI?.openFiles) {
        addDemoTracks();
        return;
    }
    
    const files = await window.electronAPI.openFiles();
    if (!files.length) return;
    
    files.forEach(file => {
        const fileName = file.split(/[\\/]/).pop();
        const name = fileName.replace(/\.[^.]+$/, '');
        tracks.push({
            path: file,
            name: name,
            artist: 'Локальный файл',
            duration: null,
            dateAdded: Date.now(),
            liked: false
        });
    });
    
    renderAll();
    loadTrackDurations();
    
    if (currentIndex === -1 && tracks.length > 0) {
        loadTrack(0);
    }
}

function addDemoTracks() {
    const demo = [
        { name: 'Midnight Echoes', artist: 'Luna Wave', duration: 227 },
        { name: 'Silver Lining', artist: 'Aether Sound', duration: 252 },
        { name: 'Neon Dreams', artist: 'Cyber Pulse', duration: 213 },
        { name: 'Quiet Storm', artist: 'Velvet Haze', duration: 301 },
        { name: 'Frozen Light', artist: 'Arctic Bloom', duration: 238 }
    ];
    
    demo.forEach((t, i) => tracks.push({
        path: `demo-${i}.mp3`,
        ...t,
        dateAdded: Date.now() - i * 3600000,
        liked: false
    }));
    
    renderAll();
}

// ===== Рендеринг =====
function renderPlaylist() {
    if (!tracks.length) {
        playlistBody.innerHTML = `
            <tr class="track-row">
                <td colspan="4" style="text-align:center;color:#555;padding:60px;font-size:14px">
                    Нет треков. Нажмите "Добавить песню"
                </td>
            </tr>
        `;
        playlistCount.textContent = '0 треков';
        return;
    }
    
    playlistBody.innerHTML = '';
    playlistCount.textContent = `${tracks.length} треков`;
    
    tracks.forEach((track, i) => {
        const tr = document.createElement('tr');
        tr.className = 'track-row' + (i === currentIndex ? ' active-track' : '');
        
        const duration = track.duration ? formatTime(track.duration) : '--:--';
        
        tr.innerHTML = `
            <td class="col-num">
                <div class="track-number">
                    <span>${i + 1}</span>
                    <span class="hover-play"><i class="fa-solid fa-play"></i></span>
                </div>
            </td>
            <td class="col-title">${escapeHtml(track.name)}</td>
            <td class="col-artist">${escapeHtml(track.artist)}</td>
            <td class="col-duration">${duration}</td>
        `;
        
        tr.onclick = () => {
            currentIndex = i;
            loadTrack(i);
            play();
        };
        
        playlistBody.appendChild(tr);
    });
}

function renderRecent() {
    recentCards.innerHTML = '';
    
    if (!tracks.length) {
        recentCards.classList.add('empty');
        recentCards.innerHTML = `
            <div class="empty-message">
                <i class="fa-regular fa-circle-play"></i>
                Послушайте что-нибудь
            </div>
        `;
        return;
    }
    
    recentCards.classList.remove('empty');
    const recent = [...tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 6);
    
    recent.forEach((track, idx) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        
        // Добавляем класс playing если это текущий трек
        const trackIndex = tracks.indexOf(track);
        if (trackIndex === currentIndex && isPlaying) {
            card.classList.add('playing');
        }
        
        card.innerHTML = `
            <div class="song-card-art">
                <i class="fa-solid fa-music"></i>
                <div class="play-overlay">
                    <i class="fa-solid fa-${trackIndex === currentIndex && isPlaying ? 'pause' : 'play'}"></i>
                </div>
            </div>
            <div class="song-card-title">${escapeHtml(track.name)}</div>
            <div class="song-card-artist">${escapeHtml(track.artist)}</div>
        `;
        
        card.onclick = () => {
            const idx = tracks.indexOf(track);
            if (idx !== -1) {
                currentIndex = idx;
                loadTrack(idx);
                play();
            }
        };
        
        recentCards.appendChild(card);
    });
}

function updateRecentlyPlaying() {
    // Обновляем иконки в recently listened
    const cards = recentCards.querySelectorAll('.song-card');
    cards.forEach((card, idx) => {
        const trackIndex = tracks.indexOf(tracks.sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 6)[idx]);
        const playIcon = card.querySelector('.play-overlay i');
        
        if (trackIndex === currentIndex && isPlaying) {
            card.classList.add('playing');
            playIcon.className = 'fa-solid fa-pause';
        } else {
            card.classList.remove('playing');
            playIcon.className = 'fa-solid fa-play';
        }
    });
}

// ===== Загрузка треков =====
function loadTrackDurations() {
    tracks.forEach((track, i) => {
        if (track.duration) return;
        
        const a = new Audio();
        a.preload = 'metadata';
        a.src = track.path;
        
        a.onloadedmetadata = () => {
            tracks[i].duration = a.duration;
            renderPlaylist();
        };
    });
}

function loadTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    
    currentIndex = index;
    const track = tracks[index];
    
    audio.src = track.path;
    trackNameEl.textContent = track.name;
    trackArtistEl.textContent = track.artist;
    totalTimeEl.textContent = track.duration ? formatTime(track.duration) : '--:--';
    
    // Обновляем активный трек в плейлисте
    document.querySelectorAll('.track-row').forEach((tr, i) => {
        tr.classList.toggle('active-track', i === index);
    });
    
    // Обновляем иконку like
    const heart = likeBtn.querySelector('i');
    heart.className = track.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    heart.style.color = track.liked ? '#fff' : '';
    
    // Обновляем recently
    updateRecentlyPlaying();
}

// ===== Управление воспроизведением =====
function play() {
    if (currentIndex === -1) return;
    
    audio.play().catch(err => {
        console.error('Error playing:', err);
    });
    
    isPlaying = true;
    playIcon.className = 'fa-solid fa-pause';
    startProgress();
    updateRecentlyPlaying();
}

function pause() {
    audio.pause();
    isPlaying = false;
    playIcon.className = 'fa-solid fa-play';
    stopProgress();
    updateRecentlyPlaying();
}

function togglePlay() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function handlePrev() {
    if (audio.currentTime > 5) {
        audio.currentTime = 0;
        return;
    }
    
    if (!tracks.length) return;
    
    currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentIndex);
    play();
}

function handleNext() {
    if (!tracks.length) return;
    
    if (repeatMode === 2) {
        audio.currentTime = 0;
        play();
        return;
    }
    
    if (isShuffle) {
        let next;
        do {
            next = Math.floor(Math.random() * tracks.length);
        } while (next === currentIndex && tracks.length > 1);
        currentIndex = next;
    } else {
        currentIndex = (currentIndex + 1) % tracks.length;
    }
    
    loadTrack(currentIndex);
    play();
}

function handleTrackEnded() {
    if (repeatMode === 1 || isShuffle) {
        handleNext();
    } else if (currentIndex < tracks.length - 1) {
        handleNext();
    } else {
        pause();
        progressFill.style.width = '0%';
        currentTimeEl.textContent = '0:00';
    }
}

// ===== Прогресс =====
function startProgress() {
    stopProgress();
    progressInterval = setInterval(() => {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = pct + '%';
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }, 100);
}

function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function handleProgressClick(e) {
    if (!audio.duration) return;
    
    const rect = progressContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
}

// ===== Сортировка =====
function handleSort(option) {
    sortOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    
    const sortType = option.dataset.sort;
    sortTracks(sortType);
    renderPlaylist();
    
    setTimeout(() => sortDropdown.classList.remove('open'), 150);
}

function sortTracks(type) {
    switch(type) {
        case 'name-az':
            tracks.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-za':
            tracks.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'date-new-old':
            tracks.sort((a, b) => b.dateAdded - a.dateAdded);
            break;
        case 'date-old-new':
            tracks.sort((a, b) => a.dateAdded - b.dateAdded);
            break;
        case 'artist-az':
            tracks.sort((a, b) => a.artist.localeCompare(b.artist));
            break;
        case 'artist-za':
            tracks.sort((a, b) => b.artist.localeCompare(a.artist));
            break;
    }
}

// ===== Shuffle / Repeat / Like =====
function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    repeatBtn.classList.toggle('active', repeatMode > 0);
    
    if (repeatMode === 2) {
        repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;">1</span>';
        repeatBtn.style.position = 'relative';
    } else {
        repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        repeatBtn.style.position = '';
    }
}

function toggleLike() {
    if (currentIndex === -1) return;
    
    tracks[currentIndex].liked = !tracks[currentIndex].liked;
    const icon = likeBtn.querySelector('i');
    
    icon.className = tracks[currentIndex].liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    icon.style.color = tracks[currentIndex].liked ? '#fff' : '';
}

// ===== Громкость =====
function handleVolumeClick(e) {
    const rect = volumeContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    audio.volume = pct;
    lastVolume = pct;
    isMuted = (pct === 0);
    updateVolumeUI();
}

function toggleMute() {
    isMuted = !isMuted;
    audio.volume = isMuted ? 0 : lastVolume;
    updateVolumeUI();
}

function updateVolumeUI() {
    const vol = audio.volume;
    volumeFill.style.width = (vol * 100) + '%';
    
    if (isMuted || vol === 0) {
        volumeIcon.className = 'fa-solid fa-volume-xmark volume-icon';
    } else if (vol < 0.4) {
        volumeIcon.className = 'fa-solid fa-volume-low volume-icon';
    } else {
        volumeIcon.className = 'fa-solid fa-volume-high volume-icon';
    }
}

// ===== Переключение страниц =====
window.switchPage = function(el) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    
    const pageName = el.querySelector('span')?.textContent || '';
    document.getElementById('pageTitle').textContent = pageName;
    currentPage = el.dataset.page;
    
    const graphSection = document.getElementById('graphSection');
    const playlistView = document.getElementById('playlistView');
    const settingsView = document.getElementById('settingsView');
    const recentSection = document.getElementById('recentSection');
    const sortContainer = document.getElementById('sortContainer');
    
    [graphSection, playlistView, settingsView].forEach(s => s?.classList.remove('active'));
    recentSection?.classList.remove('hidden');
    sortContainer?.classList.add('hidden');
    
    switch(currentPage) {
        case 'home':
            graphSection?.classList.add('active');
            break;
        case 'settings':
            settingsView?.classList.add('active');
            recentSection?.classList.add('hidden');
            break;
        case 'all-songs':
        case 'custom':
            playlistView?.classList.add('active');
            sortContainer?.classList.remove('hidden');
            recentSection?.classList.add('hidden');
            renderPlaylist();
            break;
    }
    
    sortDropdown?.classList.remove('open');
};

// ===== Модальное окно =====
function openModal() {
    modalOverlay.classList.add('open');
    setTimeout(() => categoryInput?.focus(), 200);
}

function closeModal() {
    modalOverlay.classList.remove('open');
    if (categoryInput) {
        categoryInput.value = '';
        createBtn.disabled = true;
    }
}

function createCategory() {
    const name = categoryInput?.value.trim();
    if (!name) return;
    
    categoryCounter++;
    const catId = `cat-${categoryCounter}`;
    customCategories.push({ id: catId, name });
    
    const catEl = document.createElement('div');
    catEl.className = 'nav-item custom-category';
    catEl.dataset.page = 'custom';
    catEl.dataset.catId = catId;
    catEl.onclick = function() { window.switchPage(this); };
    
    catEl.innerHTML = `
        <i class="fa-solid fa-folder"></i>
        <span>${escapeHtml(name)}</span>
        <button class="delete-cat" title="Удалить">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    catEl.querySelector('.delete-cat').onclick = (e) => {
        e.stopPropagation();
        deleteCategory(catId, catEl);
    };
    
    categoriesList?.appendChild(catEl);
    closeModal();
}

function deleteCategory(catId, el) {
    el.style.transition = 'all 0.25s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-16px)';
    
    setTimeout(() => {
        el.remove();
        customCategories = customCategories.filter(c => c.id !== catId);
        
        if (currentPage === 'custom' && document.querySelector('.nav-item.active')?.dataset.catId === catId) {
            window.switchPage(document.querySelector('[data-page="all-songs"]'));
        }
    }, 250);
}

// ===== Утилиты =====
function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function renderAll() {
    renderPlaylist();
    renderRecent();
}

function handleKeyDown(e) {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        togglePlay();
    }
    if (e.code === 'ArrowRight' && audio.duration) {
        audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
    }
    if (e.code === 'ArrowLeft') {
        audio.currentTime = Math.max(audio.currentTime - 5, 0);
    }
}

// ===== Запуск =====
init();