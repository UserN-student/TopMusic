// ==========================================
// 🎵 TopMusic - Renderer Process Logic
// ==========================================
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
const playlistGrid = document.getElementById('playlistGrid');
const playlistCount = document.getElementById('playlistCount');
const recentCards = document.getElementById('recentCards');
const addTrackBtn = document.getElementById('addTrackBtn');
const addFolderBtn = document.getElementById('addFolderBtn');
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
const appVersionEl = document.getElementById('appVersion');
const syncTopBtn = document.getElementById('syncTopBtn');

// Модальные окна и меню
const trackContextMenu = document.getElementById('trackContextMenu');
const detailsModal = document.getElementById('detailsModal');
const playlistModal = document.getElementById('playlistModal');
const syncModal = document.getElementById('syncModal');
const missingFileModal = document.getElementById('missingFileModal');
const trackDetailsContent = document.getElementById('trackDetailsContent');
const playlistListContent = document.getElementById('playlistListContent');
const syncListContent = document.getElementById('syncListContent');
const syncCategoriesContent = document.getElementById('syncCategoriesContent');
const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
const syncFolderBtn = document.getElementById('syncFolderBtn');
const copyMissingPathBtn = document.getElementById('copyMissingPathBtn');
const okMissingFileBtn = document.getElementById('okMissingFileBtn');
const missingFileNameEl = document.getElementById('missingFileName');
const missingFilePathEl = document.getElementById('missingFilePath');

// Данные
let tracks = [];
let playlists = {};
let syncConfigs = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;
let isMuted = false;
let lastVolume = window.appConfig?.defaultVolume ?? 0.7;
let progressInterval = null;
let currentPage = 'home';
let currentCategory = 'all-songs';
let customCategories = [];
let categoryCounter = 0;
let selectedTrackIndex = null;
let selectedPlaylists = new Set();
let currentSortType = 'date-new-old'; // Тип сортировки по умолчанию
// Инициализация
async function init() {
  if (appVersionEl && window.appConfig) appVersionEl.textContent = window.appConfig.version;
  audio.volume = lastVolume;
  updateVolumeUI();
  
  await loadData();
  renderRecent();
  renderSyncList();
  renderSyncCategories();
  setupEventListeners();
  await checkMissingFiles();
}

function setupEventListeners() {
  document.getElementById('minimizeBtn').onclick = () => window.electronAPI?.windowMinimize();
  document.getElementById('maximizeBtn').onclick = async () => {
    if (window.electronAPI?.windowMaximize) {
      await window.electronAPI.windowMaximize();
      const isMax = await window.electronAPI.windowIsMaximized?.();
      document.getElementById('maximizeBtn').textContent = isMax ? '❐' : '☐';
    }
  };
  document.getElementById('closeBtn').onclick = () => window.electronAPI?.windowClose();
  
  addTrackBtn?.addEventListener('click', addFiles);
  addFolderBtn?.addEventListener('click', addFolder);
  addCategoryBtn.addEventListener('click', openModal);
  syncTopBtn?.addEventListener('click', () => openModalById('syncModal'));
  
  playBtn.onclick = togglePlay;
  prevBtn.onclick = handlePrev;
  nextBtn.onclick = handleNext;
  progressContainer.onclick = handleProgressClick;
  volumeContainer.onclick = handleVolumeClick;
  volumeIcon.onclick = toggleMute;
  
  sortBtn?.addEventListener('click', (e) => { e.stopPropagation(); sortDropdown.classList.toggle('open'); });
  sortOptions.forEach(opt => opt.onclick = () => handleSort(opt));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-container')) sortDropdown.classList.remove('open');
    if (!e.target.closest('.track-menu-btn') && !e.target.closest('.context-menu')) {
      trackContextMenu.classList.remove('open');
    }
  });
  
  setupModalListeners();
  
  categoryInput?.addEventListener('input', () => {
    if (createBtn) createBtn.disabled = categoryInput.value.trim().length === 0;
  });
  categoryInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && categoryInput.value.trim()) createCategory();
    if (e.key === 'Escape') closeModal();
  });
  createBtn?.addEventListener('click', createCategory);
  
  likeBtn.onclick = toggleLike;
  shuffleBtn.onclick = toggleShuffle;
  repeatBtn.onclick = toggleRepeat;
  
  audio.onended = handleTrackEnded;
  document.addEventListener('keydown', handleKeyDown);
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      document.body.style.transform = 'translateZ(0)';
      setTimeout(() => document.body.style.transform = '', 50);
    }, 100);
  });
}

function setupModalListeners() {
  document.querySelectorAll('.modal-close, .modal-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.modal;
      if (modalId) closeModalById(modalId);
      else closeModal();
    });
  });
  
  [detailsModal, playlistModal, syncModal, missingFileModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModalById(modal.id);
    });
  });
  
  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleContextMenuAction(action);
      trackContextMenu.classList.remove('open');
    });
  });
  
  playlistListContent?.addEventListener('click', (e) => {
    const checkbox = e.target.closest('.playlist-checkbox');
    if (checkbox) {
      const playlistId = checkbox.dataset.playlistId;
      checkbox.classList.toggle('checked');
      if (checkbox.classList.contains('checked')) selectedPlaylists.add(playlistId);
      else selectedPlaylists.delete(playlistId);
    }
  });
  
  addToPlaylistBtn?.addEventListener('click', () => {
    if (selectedTrackIndex !== null && selectedTrackIndex < tracks.length) {
      const trackPath = tracks[selectedTrackIndex].path;
      selectedPlaylists.forEach(pid => {
        if (playlists[pid]) playlists[pid].trackPaths.add(trackPath);
      });
      saveData();
      closeModalById('playlistModal');
      renderPlaylist();
    }
  });
  
  syncFolderBtn?.addEventListener('click', async () => {
    const folder = await window.electronAPI?.openFolder();
    if (folder) await syncFolder(folder);
  });
  
  copyMissingPathBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText(missingFilePathEl.textContent).then(() => {
      copyMissingPathBtn.innerHTML = '✓ Скопировано!';
      setTimeout(() => {
        copyMissingPathBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Копировать путь';
      }, 2000);
    });
  });
  
  okMissingFileBtn?.addEventListener('click', () => {
    removeTrackByPath(missingFilePathEl.textContent);
    closeModalById('missingFileModal');
  });
}

// ===== Работа с файлами =====
async function addFiles() {
  if (!window.electronAPI?.openFiles) { addDemoTracks(); return; }
  const files = await window.electronAPI.openFiles();
  if (!files.length) return;
  
  files.forEach(file => {
    const fileName = file.split(/[\/\\]/).pop();
    tracks.push({
      path: file,
      name: fileName.replace(/\.[^.]+$/, ''),
      ext: fileName.split('.').pop().toUpperCase(),
      duration: null,
      dateAdded: Date.now(),
      liked: false,
      categories: ['all-songs'] // ИСПРАВЛЕНО: только в "Все песни"
    });
  });
  
  renderAll();
  loadTrackDurations();
  if (currentIndex === -1 && tracks.length > 0) loadTrack(0);
  saveData();
}

async function addFolder() {
  if (!window.electronAPI?.openFolder) return;
  const folder = await window.electronAPI.openFolder();
  if (!folder) return;
  
  const files = await window.electronAPI?.getAudioFilesInFolder?.(folder);
  if (!files?.length) return;
  
  files.forEach(file => {
    if (!tracks.some(t => t.path === file)) {
      const fileName = file.split(/[\/\\]/).pop();
      tracks.push({
        path: file,
        name: fileName.replace(/\.[^.]+$/, ''),
        ext: fileName.split('.').pop().toUpperCase(),
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        categories: ['all-songs']
      });
    }
  });
  
  renderAll();
  loadTrackDurations();
  if (currentIndex === -1 && tracks.length > 0) loadTrack(0);
  saveData();
}

async function syncFolder(folderPath) {
  const files = await window.electronAPI?.getAudioFilesInFolder?.(folderPath);
  if (!files?.length) return;
  
  const syncId = `sync-${Date.now()}`;
  syncConfigs.push({ id: syncId, path: folderPath, categories: ['all-songs'] });
  
  let added = 0;
  files.forEach(file => {
    if (!tracks.some(t => t.path === file)) {
      const fileName = file.split(/[\/\\]/).pop();
      tracks.push({
        path: file,
        name: fileName.replace(/\.[^.]+$/, ''),
        ext: fileName.split('.').pop().toUpperCase(),
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        synced: syncId,
        categories: ['all-songs']
      });
      added++;
    }
  });
  
  renderAll();
  renderSyncList();
  renderSyncCategories();
  loadTrackDurations();
  saveData();
}

function addDemoTracks() {
  const demo = [
    { name: 'Midnight Echoes', ext: 'MP3', duration: 227 },
    { name: 'Silver Lining', ext: 'WAV', duration: 252 },
    { name: 'Neon Dreams', ext: 'FLAC', duration: 213 }
  ];
  demo.forEach((t, i) => tracks.push({
    path: `demo-${i}.${t.ext.toLowerCase()}`, ...t,
    dateAdded: Date.now() - i * 3600000, liked: false, categories: ['all-songs']
  }));
  renderAll();
}

function getFileTypeText(ext) { return ext ? `${ext}-файл` : 'Файл'; }
function formatTime(sec) { if (!sec || isNaN(sec)) return '0:00'; return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ===== Рендеринг (Оптимизировано через CSS content-visibility) =====
// ===== Рендеринг плейлиста (ИСПРАВЛЕНО) =====
function renderPlaylist() {
  if (!playlistGrid) return;
  
  let displayTracks = currentCategory === 'all-songs' 
    ? [...tracks] 
    : tracks.filter(t => t.categories?.includes(currentCategory));

  if (!displayTracks.length) {
    playlistGrid.innerHTML = `<div class="playlist-empty"><i class="fa-regular fa-circle-play"></i>Нет треков</div>`;
    updatePlaylistInfo(displayTracks);
    return;
  }

  // Применяем сортировку только к отображаемому списку
  switch(currentSortType) {
    case 'name-az': displayTracks.sort((a, b) => a.name.localeCompare(b.name, 'ru')); break;
    case 'name-za': displayTracks.sort((a, b) => b.name.localeCompare(a.name, 'ru')); break;
    case 'date-new-old': displayTracks.sort((a, b) => b.dateAdded - a.dateAdded); break;
    case 'date-old-new': displayTracks.sort((a, b) => a.dateAdded - b.dateAdded); break;
  }

  playlistGrid.innerHTML = '';
  updatePlaylistInfo(displayTracks);

  const fragment = document.createDocumentFragment();
  displayTracks.forEach((track) => {
    const realIndex = tracks.findIndex(t => t.path === track.path);
    if (realIndex === -1) return;

    const card = document.createElement('div');
    card.className = 'track-card' + (realIndex === currentIndex ? ' active-track' : '');
    card.dataset.index = realIndex;

    const duration = track.duration ? formatTime(track.duration) : '--:--';
    const fileType = getFileTypeText(track.ext);
    const iconClass = realIndex === currentIndex && isPlaying ? 'pause' : 'play';

    card.innerHTML = `
      <div class="track-card-art">
        <i class="fa-solid fa-music"></i>
        <div class="play-overlay"><i class="fa-solid fa-${iconClass}"></i></div>
      </div>
      <div class="track-card-info">
        <div class="track-card-title">${escapeHtml(track.name)}</div>
        <div class="track-card-meta">
          <span class="track-card-type"><i class="fa-regular fa-file-audio"></i> ${fileType}</span>
          <span class="track-card-duration"><i class="fa-regular fa-clock"></i> ${duration}</span>
        </div>
      </div>
      <div class="track-card-menu">
        <button class="track-menu-btn" data-index="${realIndex}"><i class="fa-solid fa-ellipsis"></i></button>
      </div>
    `;

    // Клик по обложке
    card.querySelector('.track-card-art').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = realIndex;
      loadTrack(realIndex);
      play();
    });

    // Клик по названию/инфо
    card.querySelector('.track-card-info').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = realIndex;
      loadTrack(realIndex);
      play();
    });

    // Контекстное меню
    const menuBtn = card.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedTrackIndex = realIndex;
      showContextMenu(e, menuBtn);
    });

    fragment.appendChild(card);
  });
  playlistGrid.appendChild(fragment);
}

function updatePlaylistInfo(displayTracks) {
  if (!playlistCount) return;
  playlistCount.textContent = `${displayTracks.length} треков`;
}

// Позиционирование контекстного меню с защитой от выхода за экран
function showContextMenu(event, button) {
  const rect = button.getBoundingClientRect();
  const menu = trackContextMenu;
  const menuW = 220;
  const menuH = 100;
  
  let left = rect.right + 8;
  let top = rect.top;
  
  if (left + menuW > window.innerWidth - 10) left = rect.left - menuW - 8;
  if (top + menuH > window.innerHeight - 10) top = window.innerHeight - menuH - 10;
  
  left = Math.max(10, left);
  top = Math.max(10, top);
  
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.classList.add('open');
}

function renderRecent() {
  recentCards.innerHTML = '';
  if (!tracks.length) {
    recentCards.classList.add('empty');
    recentCards.innerHTML = `<div class="empty-message"><i class="fa-regular fa-circle-play"></i>Послушайте что-нибудь</div>`;
    return;
  }
  recentCards.classList.remove('empty');
  
  const recent = [...tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 6);
  recent.forEach(track => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.path = track.path;
    const idx = tracks.findIndex(t => t.path === track.path);
    if (idx === currentIndex && isPlaying) card.classList.add('playing');
    
    card.innerHTML = `
      <div class="song-card-art"><i class="fa-solid fa-music"></i><div class="play-overlay"><i class="fa-solid fa-${idx === currentIndex && isPlaying ? 'pause' : 'play'}"></i></div></div>
      <div class="song-card-title">${escapeHtml(track.name)}</div>
      <div class="song-card-artist">${getFileTypeText(track.ext)}</div>
    `;
    card.onclick = () => { if (idx !== -1) { currentIndex = idx; loadTrack(idx); play(); } };
    recentCards.appendChild(card);
  });
}

function updateRecentlyPlaying() {
  if (currentIndex === -1) return;
  const currentPath = tracks[currentIndex].path;
  recentCards.querySelectorAll('.song-card').forEach(card => {
    const isCurrent = card.dataset.path === currentPath;
    const icon = card.querySelector('.play-overlay i');
    if (isCurrent && isPlaying) {
      card.classList.add('playing');
      icon.className = 'fa-solid fa-pause';
    } else {
      card.classList.remove('playing');
      icon.className = 'fa-solid fa-play';
    }
  });
}

function loadTrackDurations() {
  tracks.forEach((track, i) => {
    if (track.duration) return;
    
    const a = new Audio();
    a.preload = 'metadata';
    
    let srcPath = track.path;
    if (!srcPath.startsWith('file://')) {
      srcPath = 'file:///' + srcPath.replace(/\\/g, '/');
    }
    a.src = srcPath;
    
    a.onloadedmetadata = () => {
      tracks[i].duration = a.duration;
      renderPlaylist(); // Обновляем отображение длительности
    };
    a.onerror = () => {
      console.warn('Не удалось прочитать метаданные:', track.path);
      tracks[i].duration = null;
    };
  });
}


function loadTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  
  let safePath = track.path;
  if (!safePath.startsWith('file://')) {
    safePath = 'file:///' + safePath.replace(/\\/g, '/');
  }
  audio.src = safePath;
  audio.load();
  
  trackNameEl.textContent = track.name;
  trackArtistEl.textContent = getFileTypeText(track.ext);
  totalTimeEl.textContent = track.duration ? formatTime(track.duration) : '--:--';
  
  const heart = likeBtn.querySelector('i');
  heart.className = track.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  heart.style.color = track.liked ? '#fff' : '';
  
  updateRecentlyPlaying();
  renderPlaylist();
}

// ===== Плеер =====
function play() {
  if (currentIndex === -1) return;
  audio.play().catch(err => console.warn('Ошибка воспроизведения:', err));
  isPlaying = true;
  playIcon.className = 'fa-solid fa-pause';
  startProgress();
  updateRecentlyPlaying();
  renderPlaylist(); // Обновляем иконки в карточках
}

function pause() {
  audio.pause();
  isPlaying = false;
  playIcon.className = 'fa-solid fa-play';
  stopProgress();
  updateRecentlyPlaying();
  renderPlaylist();
}


function togglePlay() { isPlaying ? pause() : play(); }

function handlePrev() {
  if (audio.currentTime > 5) { audio.currentTime = 0; return; }
  if (!tracks.length) return;
  currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(currentIndex);
  play();
}

function handleNext() {
  if (!tracks.length) return;
  if (repeatMode === 2) { audio.currentTime = 0; play(); return; }
  if (isShuffle) {
    let next;
    do { next = Math.floor(Math.random() * tracks.length); } while (next === currentIndex && tracks.length > 1);
    currentIndex = next;
  } else {
    currentIndex = (currentIndex + 1) % tracks.length;
  }
  loadTrack(currentIndex);
  play();
}

function handleTrackEnded() {
  if (repeatMode === 1 || isShuffle) handleNext();
  else if (currentIndex < tracks.length - 1) handleNext();
  else { pause(); progressFill.style.width = '0%'; currentTimeEl.textContent = '0:00'; }
}

function startProgress() {
  stopProgress();
  progressInterval = setInterval(() => {
    if (audio.duration) {
      progressFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  }, 100);
}

function stopProgress() { if (progressInterval) { clearInterval(progressInterval); progressInterval = null; } }

function handleProgressClick(e) {
  if (!audio.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration;
}

function handleSort(option) {
  sortOptions.forEach(o => o.classList.remove('active'));
  option.classList.add('active');
  currentSortType = option.dataset.sort;
  sortDropdown.classList.remove('open');
  renderPlaylist(); // Перерисовываем с учётом сортировки
}

function toggleShuffle() { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); }
function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.innerHTML = repeatMode === 2 ? '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;">1</span>' : '<i class="fa-solid fa-repeat"></i>';
  repeatBtn.style.position = repeatMode === 2 ? 'relative' : '';
}
function toggleLike() {
  if (currentIndex === -1) return;
  tracks[currentIndex].liked = !tracks[currentIndex].liked;
  const icon = likeBtn.querySelector('i');
  icon.className = tracks[currentIndex].liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  icon.style.color = tracks[currentIndex].liked ? '#fff' : '';
  saveData();
}
function handleVolumeClick(e) {
  const rect = volumeContainer.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = pct; lastVolume = pct; isMuted = (pct === 0); updateVolumeUI();
}
function toggleMute() {
  isMuted = !isMuted;
  audio.volume = isMuted ? 0 : lastVolume;
  updateVolumeUI();
}
function updateVolumeUI() {
  const vol = audio.volume;
  volumeFill.style.width = (vol * 100) + '%';
  if (isMuted || vol === 0) volumeIcon.className = 'fa-solid fa-volume-xmark volume-icon';
  else if (vol < 0.4) volumeIcon.className = 'fa-solid fa-volume-low volume-icon';
  else volumeIcon.className = 'fa-solid fa-volume-high volume-icon';
}

// ===== Навигация =====
window.switchPage = function(el) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  el.classList.add('active');
  
  const pageName = el.querySelector('span')?.textContent || '';
  document.getElementById('pageTitle').textContent = pageName;
  currentPage = el.dataset.page;
  
  if (currentPage === 'custom') currentCategory = el.dataset.catId;
  else if (currentPage === 'all-songs') currentCategory = 'all-songs';
  else currentCategory = null;
  
  const graph = document.getElementById('graphSection');
  const playlist = document.getElementById('playlistView');
  const settings = document.getElementById('settingsView');
  const recent = document.getElementById('recentSection');
  const sortCont = document.getElementById('sortContainer');
  
  [graph, playlist, settings].forEach(s => s?.classList.remove('active'));
  recent?.classList.remove('hidden');
  sortCont?.classList.add('hidden');
  syncTopBtn?.classList.add('hidden');
  
  switch(currentPage) {
    case 'home': graph?.classList.add('active'); break;
    case 'settings': settings?.classList.add('active'); recent?.classList.add('hidden'); break;
    case 'all-songs': case 'custom':
      playlist?.classList.add('active');
      sortCont?.classList.remove('hidden');
      recent?.classList.add('hidden');
      if (currentCategory === 'all-songs') syncTopBtn?.classList.remove('hidden');
      renderPlaylist();
      break;
  }
  sortDropdown?.classList.remove('open');
};

// ===== Категории =====
function openModal() { modalOverlay.classList.add('open'); setTimeout(() => categoryInput?.focus(), 200); }
function closeModal() { modalOverlay.classList.remove('open'); if (categoryInput) { categoryInput.value = ''; createBtn.disabled = true; } }
function closeModalById(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }

function createCategory() {
  const name = categoryInput?.value.trim();
  if (!name) return;
  if (name.toLowerCase() === 'все песни' || name.toLowerCase() === 'all songs') {
    alert('Нельзя создать категорию с названием "Все песни"');
    return;
  }
  categoryCounter++;
  const catId = `cat-${categoryCounter}`;
  if (!playlists[catId]) playlists[catId] = { name, trackPaths: new Set() };
  customCategories.push({ id: catId, name });

  const catEl = document.createElement('div');
  catEl.className = 'nav-item custom-category';
  catEl.dataset.page = 'custom';
  catEl.dataset.catId = catId;
  catEl.onclick = function() { window.switchPage(this); };
  catEl.innerHTML = `<i class="fa-solid fa-folder"></i><span>${escapeHtml(name)}</span><button class="delete-cat" title="Удалить"><i class="fa-solid fa-xmark"></i></button>`;
  catEl.querySelector('.delete-cat').onclick = (e) => { e.stopPropagation(); deleteCategory(catId, catEl); };
  categoriesList?.appendChild(catEl);
  closeModal();
  saveData();
}

function showTrackDetails(track) {
  const details = [
    ['Название', track.name],
    ['Тип файла', getFileTypeText(track.ext)],
    ['Путь', track.path],
    ['Длительность', track.duration ? formatTime(track.duration) : 'Неизвестно'],
    ['Добавлен', new Date(track.dateAdded).toLocaleDateString('ru-RU')],
    ['В избранном', track.liked ? 'Да' : 'Нет']
  ];
  trackDetailsContent.innerHTML = details.map(([l, v]) =>
    `<span class="track-details-label">${l}</span><span class="track-details-value">${escapeHtml(v)}</span>`
  ).join('');
}

function renderSyncList() {
  if (!syncConfigs.length) { 
    syncListContent.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Нет синхронизаций</div>'; 
    return; 
  }
  syncListContent.innerHTML = syncConfigs.map((cfg, i) => {
    const count = tracks.filter(t => t.synced === cfg.id).length;
    return `<div class="sync-item"><span class="sync-item-name">#${i+1}</span><span class="sync-item-path" title="${escapeHtml(cfg.path)}">${escapeHtml(cfg.path)}</span><span class="sync-item-count">${count} песен</span></div>`;
  }).join('');
}

function renderSyncCategories() {
  const cats = [{ id: 'all-songs', name: 'Все песни', def: true, chk: true }];
  customCategories.forEach(c => cats.push({ id: c.id, name: c.name, def: false, chk: syncConfigs[0]?.categories?.includes(c.id) ?? false }));
  syncCategoriesContent.innerHTML = cats.map(c => 
    `<label class="category-toggle${c.def ? ' default' : ''}">
      <input type="checkbox" ${c.def ? 'checked disabled' : c.chk ? 'checked' : ''} data-category-id="${c.id}" ${!c.def ? 'onchange="toggleSyncCategory(this)"' : ''}>
      <span>${escapeHtml(c.name)}${c.def ? ' (по умолчанию)' : ''}</span>
    </label>`
  ).join('');
}

function deleteCategory(catId, el) {
  el.style.transition = 'all 0.25s ease';
  el.style.opacity = '0'; el.style.transform = 'translateX(-16px)';
  setTimeout(() => {
    el.remove();
    customCategories = customCategories.filter(c => c.id !== catId);
    delete playlists[catId];
    if (currentPage === 'custom' && currentCategory === catId) {
      const allSongs = document.querySelector('[data-page="all-songs"]');
      if (allSongs) window.switchPage(allSongs);
    }
    saveData();
  }, 250);
}

// ===== Контекстное меню & Модалки =====
function handleContextMenuAction(action) {
  if (selectedTrackIndex === null || selectedTrackIndex >= tracks.length) return;
  const track = tracks[selectedTrackIndex];
  switch(action) {
    case 'details': showTrackDetails(track); openModalById('detailsModal'); break;
    case 'playlist': showPlaylistSelection(); openModalById('playlistModal'); break;
  }
}

function openModalById(id) { const m = document.getElementById(id); if (m) m.classList.add('open'); }

function showTrackDetails(track) {
  const details = [
    ['Название', track.name], ['Тип файла', getFileTypeText(track.ext)], ['Путь', track.path],
    ['Длительность', track.duration ? formatTime(track.duration) : 'Неизвестно'],
    ['Добавлен', new Date(track.dateAdded).toLocaleDateString('ru-RU')],
    ['В избранном', track.liked ? 'Да' : 'Нет']
  ];
  trackDetailsContent.innerHTML = details.map(([l, v]) => `<span class="track-details-label">${l}</span><span class="track-details-value">${escapeHtml(v)}</span>`).join('');
}

function showPlaylistSelection() {
  const userPL = Object.entries(playlists).filter(([id]) => id !== 'all-songs');
  if (userPL.length === 0) {
    playlistListContent.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Нет созданных плейлистов</div>';
    return;
  }
  playlistListContent.innerHTML = userPL.map(([id, pl]) => 
    `<div class="playlist-item"><div class="playlist-checkbox ${selectedPlaylists.has(id)?'checked':''}" data-playlist-id="${id}"></div><span class="playlist-name">${escapeHtml(pl.name)}</span><span class="playlist-count">${pl.trackPaths.size} треков</span></div>`
  ).join('');
  selectedPlaylists.clear();
}

// ===== Синхронизация =====
function renderSyncList() {
  if (!syncConfigs.length) { syncListContent.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Нет синхронизаций</div>'; return; }
  syncListContent.innerHTML = syncConfigs.map((cfg, i) => {
    const count = tracks.filter(t => t.synced === cfg.id).length;
    return `<div class="sync-item"><span class="sync-item-name">#${i+1}</span><span class="sync-item-path" title="${escapeHtml(cfg.path)}">${escapeHtml(cfg.path)}</span><span class="sync-item-count">${count} песен</span></div>`;
  }).join('');
}

function renderSyncCategories() {
  const cats = [{ id: 'all-songs', name: 'Все песни', def: true, chk: true }];
  customCategories.forEach(c => cats.push({ id: c.id, name: c.name, def: false, chk: syncConfigs[0]?.categories?.includes(c.id) ?? false }));
  syncCategoriesContent.innerHTML = cats.map(c => 
    `<label class="category-toggle${c.def?' default':''}"><input type="checkbox" ${c.def?'checked disabled':c.chk?'checked':''} data-category-id="${c.id}" ${!c.def?'onchange="toggleSyncCategory(this)"':''}><span>${escapeHtml(c.name)}${c.def?' (по умолчанию)':''}</span></label>`
  ).join('');
}

window.toggleSyncCategory = function(cb) {
  const id = cb.dataset.categoryId;
  syncConfigs.forEach(cfg => {
    if (cb.checked) { if (!cfg.categories.includes(id)) cfg.categories.push(id); }
    else { cfg.categories = cfg.categories.filter(i => i !== id); }
  });
  saveData();
};

// ===== Проверка файлов =====
async function checkMissingFiles() {
  const missing = [];
  for (const t of tracks) {
    const exists = await window.electronAPI?.checkFileExists?.(t.path);
    if (!exists) missing.push(t);
  }
  if (missing.length > 0) showMissingFileModal(missing[0]);
}

function showMissingFileModal(t) { missingFileNameEl.textContent = t.name; missingFilePathEl.textContent = t.path; openModalById('missingFileModal'); }

function removeTrackByPath(path) {
  const idx = tracks.findIndex(t => t.path === path);
  if (idx !== -1) {
    tracks.splice(idx, 1);
    if (currentIndex === idx) {
      currentIndex = -1; audio.src = ''; audio.load();
      trackNameEl.textContent = 'Выберите трек'; trackArtistEl.textContent = '—';
      currentTimeEl.textContent = '0:00'; totalTimeEl.textContent = '0:00';
      progressFill.style.width = '0%'; pause();
    } else if (currentIndex > idx) currentIndex--;
    renderAll(); saveData();
  }
}

// ===== Данные =====
async function saveData() {
  if (!window.electronAPI?.saveData) return;
  await window.electronAPI.saveData({ tracks, playlists, syncConfigs, customCategories, categoryCounter, settings: { volume: lastVolume, isMuted, isShuffle, repeatMode } });
}

async function loadData() {
  if (!window.electronAPI?.loadData) return;
  try {
    const data = await window.electronAPI.loadData();
    if (data) {
      tracks = data.tracks || [];
      playlists = data.playlists || { 'all-songs': { name: 'Все песни', trackPaths: new Set(tracks.map(t=>t.path)) } };
      syncConfigs = data.syncConfigs || [];
      customCategories = data.customCategories || [];
      categoryCounter = data.categoryCounter || 0;
      
      if (data.settings) {
        lastVolume = data.settings.volume ?? lastVolume;
        isMuted = data.settings.isMuted ?? isMuted;
        isShuffle = data.settings.isShuffle ?? isShuffle; // ИСПРАВЛЕНО: i sShuffle -> isShuffle
        repeatMode = data.settings.repeatMode ?? repeatMode;
        audio.volume = lastVolume; updateVolumeUI();
        shuffleBtn.classList.toggle('active', isShuffle);
        repeatBtn.classList.toggle('active', repeatMode > 0);
      }
      
      if (!playlists['all-songs']) playlists['all-songs'] = { name: 'Все песни', trackPaths: new Set(tracks.map(t=>t.path)) };
      else playlists['all-songs'].trackPaths = new Set(tracks.map(t=>t.path));
      
      tracks.forEach(t => { if (!t.categories) t.categories = ['all-songs']; else if (!t.categories.includes('all-songs')) t.categories.push('all-songs'); });
    }
  } catch(e) { console.error('Ошибка загрузки:', e); }
}

function renderAll() { renderPlaylist(); renderRecent(); }

function handleKeyDown(e) {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight' && audio.duration) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
  if (e.code === 'ArrowLeft') audio.currentTime = Math.max(audio.currentTime - 5, 0);
}

init();