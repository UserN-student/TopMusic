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
const playlistBody = document.getElementById('playlistBody');
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

// Новые элементы
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
let playlists = {}; // { id: { name, trackPaths: Set } }
let syncConfigs = []; // { id, path, categories: [] }
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;
let isMuted = false;
let lastVolume = window.appConfig?.defaultVolume ?? 0.7;
let progressInterval = null;
let currentPage = 'home';
let customCategories = [];
let categoryCounter = 0;
let selectedTrackIndex = null; // для контекстного меню
let selectedPlaylists = new Set(); // для модального окна плейлистов

// Инициализация
async function init() {
  if (appVersionEl && window.appConfig) appVersionEl.textContent = window.appConfig.version;
  audio.volume = lastVolume;
  updateVolumeUI();
  
  // Загрузка данных
  await loadData();
  
  renderRecent();
  renderSyncList();
  renderSyncCategories();
  setupEventListeners();
  
  // Проверка файлов при запуске
  await checkMissingFiles();
}

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
  addFolderBtn?.addEventListener('click', addFolder);
  addCategoryBtn.addEventListener('click', openModal);

  // Плеер
  playBtn.onclick = togglePlay;
  prevBtn.onclick = handlePrev;
  nextBtn.onclick = handleNext;
  progressContainer.onclick = handleProgressClick;
  volumeContainer.onclick = handleVolumeClick;
  volumeIcon.onclick = toggleMute;
  
  // Сортировка
  sortBtn?.addEventListener('click', (e) => { e.stopPropagation(); sortDropdown.classList.toggle('open'); });
  sortOptions.forEach(opt => opt.onclick = () => handleSort(opt));
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-container')) sortDropdown.classList.remove('open');
    if (!e.target.closest('.track-menu-btn') && !e.target.closest('.context-menu')) {
      trackContextMenu.classList.remove('open');
    }
  });
  
  // Модальные окна
  setupModalListeners();
  
  // Категория
  categoryInput?.addEventListener('input', () => {
    if (createBtn) createBtn.disabled = categoryInput.value.trim().length === 0;
  });
  categoryInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && categoryInput.value.trim()) createCategory();
    if (e.key === 'Escape') closeModal();
  });
  createBtn?.addEventListener('click', createCategory);
  
  // Плеер контролы
  likeBtn.onclick = toggleLike;
  shuffleBtn.onclick = toggleShuffle;
  repeatBtn.onclick = toggleRepeat;
  
  // Аудио
  audio.onended = handleTrackEnded;
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

function setupModalListeners() {
  // Закрытие по кнопкам
  document.querySelectorAll('.modal-close, .modal-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.modal;
      if (modalId) closeModalById(modalId);
      else closeModal();
    });
  });
  
  // Закрытие по оверлею
  [detailsModal, playlistModal, syncModal, missingFileModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModalById(modal.id);
    });
  });
  
  // Контекстное меню трека
  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleContextMenuAction(action);
      trackContextMenu.classList.remove('open');
    });
  });
  
  // Плейлисты - чекбоксы
  playlistListContent?.addEventListener('click', (e) => {
    const checkbox = e.target.closest('.playlist-checkbox');
    if (checkbox) {
      const playlistId = checkbox.dataset.playlistId;
      checkbox.classList.toggle('checked');
      if (checkbox.classList.contains('checked')) {
        selectedPlaylists.add(playlistId);
      } else {
        selectedPlaylists.delete(playlistId);
      }
    }
  });
  
  // Добавить в плейлист
  addToPlaylistBtn?.addEventListener('click', () => {
    if (selectedTrackIndex !== null && selectedTrackIndex < tracks.length) {
      const trackPath = tracks[selectedTrackIndex].path;
      selectedPlaylists.forEach(playlistId => {
        if (playlists[playlistId]) {
          playlists[playlistId].trackPaths.add(trackPath);
        }
      });
      saveData();
      closeModalById('playlistModal');
    }
  });
  
  // Синхронизация - выбор папки
  syncFolderBtn?.addEventListener('click', async () => {
    const folder = await window.electronAPI?.openFolder();
    if (folder) {
      await syncFolder(folder);
    }
  });
  
  // Копировать путь недостающего файла
  copyMissingPathBtn?.addEventListener('click', () => {
    const path = missingFilePathEl.textContent;
    navigator.clipboard?.writeText(path).then(() => {
      copyMissingPathBtn.innerHTML = '<i class="fa-solid fa-check"></i> Скопировано!';
      setTimeout(() => {
        copyMissingPathBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Копировать путь';
      }, 2000);
    });
  });
  
  // ОК для недостающего файла
  okMissingFileBtn?.addEventListener('click', () => {
    const path = missingFilePathEl.textContent;
    removeTrackByPath(path);
    closeModalById('missingFileModal');
  });
}

// ===== Работа с файлами =====
async function addFiles() {
  if (!window.electronAPI?.openFiles) { addDemoTracks(); return; }
  
  const files = await window.electronAPI.openFiles();
  if (!files.length) return;
  
  files.forEach(file => {
    const fileName = file.split(/[\\/]/).pop();
    const name = fileName.replace(/\.[^.]+$/, '');
    const ext = fileName.split('.').pop().toUpperCase();
    tracks.push({
      path: file,
      name: name,
      ext: ext,
      duration: null,
      dateAdded: Date.now(),
      liked: false
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
    const fileName = file.split(/[\\/]/).pop();
    const name = fileName.replace(/\.[^.]+$/, '');
    const ext = fileName.split('.').pop().toUpperCase();
    // Проверяем, нет ли уже такого трека
    if (!tracks.some(t => t.path === file)) {
      tracks.push({
        path: file,
        name: name,
        ext: ext,
        duration: null,
        dateAdded: Date.now(),
        liked: false
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
  
  // Создаём конфигурацию синхронизации
  const syncId = `sync-${Date.now()}`;
  const syncConfig = {
    id: syncId,
    path: folderPath,
    categories: ['all-songs'] // по умолчанию только "Все песни"
  };
  syncConfigs.push(syncConfig);
  
  // Добавляем треки
  let added = 0;
  files.forEach(file => {
    if (!tracks.some(t => t.path === file)) {
      const fileName = file.split(/[\\/]/).pop();
      const name = fileName.replace(/\.[^.]+$/, '');
      const ext = fileName.split('.').pop().toUpperCase();
      tracks.push({
        path: file,
        name: name,
        ext: ext,
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        synced: syncId
      });
      added++;
    }
  });
  
  renderAll();
  renderSyncList();
  renderSyncCategories();
  loadTrackDurations();
  saveData();
  
  // Показываем уведомление (опционально)
  console.log(`Синхронизация: добавлено ${added} треков`);
}

function addDemoTracks() {
  const demo = [
    { name: 'Midnight Echoes', ext: 'MP3', duration: 227 },
    { name: 'Silver Lining', ext: 'WAV', duration: 252 },
    { name: 'Neon Dreams', ext: 'FLAC', duration: 213 }
  ];
  demo.forEach((t, i) => tracks.push({
    path: `demo-${i}.${t.ext.toLowerCase()}`,
    ...t,
    dateAdded: Date.now() - i * 3600000,
    liked: false
  }));
  renderAll();
}

// ===== Утилиты =====
function getFileTypeText(ext) {
  if (!ext) return 'Файл';
  return `${ext}-файл`;
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

// ===== Рендеринг =====
function renderPlaylist() {
  if (!tracks.length) {
    playlistBody.innerHTML = `<tr class="track-row empty-message"><td colspan="5">Нет треков. Нажмите "Добавить песню"</td></tr>`;
    playlistCount.textContent = '0 треков';
    return;
  }
  
  playlistBody.innerHTML = '';
  playlistCount.textContent = `${tracks.length} треков`;
  
  tracks.forEach((track, i) => {
    const tr = document.createElement('tr');
    tr.className = 'track-row' + (i === currentIndex ? ' active-track' : '');
    tr.dataset.index = i;
    
    const duration = track.duration ? formatTime(track.duration) : '--:--';
    const fileType = getFileTypeText(track.ext);
    
    tr.innerHTML = `
      <td class="col-num">
        <div class="track-number">
          <span>${i + 1}</span>
          <span class="hover-play"><i class="fa-solid fa-play"></i></span>
        </div>
      </td>
      <td class="col-title">${escapeHtml(track.name)}</td>
      <td class="col-artist">${fileType}</td>
      <td class="col-duration">${duration}</td>
      <td class="col-actions">
        <button class="track-menu-btn" data-index="${i}"><i class="fa-solid fa-ellipsis"></i></button>
      </td>
    `;
    
    // Клик по строке - воспроизведение
    tr.querySelector('.col-title').parentElement.onclick = () => {
      const idx = parseInt(tr.dataset.index);
      currentIndex = idx;
      loadTrack(idx);
      play();
    };
    
    // Клик по кнопке меню
    const menuBtn = tr.querySelector('.track-menu-btn');
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      selectedTrackIndex = parseInt(tr.dataset.index);
      showContextMenu(e, menuBtn);
    };
    
    playlistBody.appendChild(tr);
  });
}

function showContextMenu(event, button) {
  const rect = button.getBoundingClientRect();
  trackContextMenu.style.left = `${rect.right + 8}px`;
  trackContextMenu.style.top = `${rect.top}px`;
  trackContextMenu.classList.add('open');
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
  
  recent.forEach((track) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.path = track.path;
    
    const trackIndex = tracks.findIndex(t => t.path === track.path);
    if (trackIndex === currentIndex && isPlaying) card.classList.add('playing');
    
    card.innerHTML = `
      <div class="song-card-art">
        <i class="fa-solid fa-music"></i>
        <div class="play-overlay">
          <i class="fa-solid fa-${trackIndex === currentIndex && isPlaying ? 'pause' : 'play'}"></i>
        </div>
      </div>
      <div class="song-card-title">${escapeHtml(track.name)}</div>
      <div class="song-card-artist">${getFileTypeText(track.ext)}</div>
    `;
    
    card.onclick = () => {
      const idx = tracks.findIndex(t => t.path === track.path);
      if (idx !== -1) { currentIndex = idx; loadTrack(idx); play(); }
    };
    
    recentCards.appendChild(card);
  });
}

function updateRecentlyPlaying() {
  if (currentIndex === -1) return;
  const currentPath = tracks[currentIndex].path;
  const cards = recentCards.querySelectorAll('.song-card');
  
  cards.forEach(card => {
    const isCurrent = card.dataset.path === currentPath;
    const playIcon = card.querySelector('.play-overlay i');
    if (isCurrent && isPlaying) {
      card.classList.add('playing');
      playIcon.className = 'fa-solid fa-pause';
    } else {
      card.classList.remove('playing');
      playIcon.className = 'fa-solid fa-play';
    }
  });
}

function loadTrackDurations() {
  tracks.forEach((track, i) => {
    if (track.duration) return;
    const a = new Audio();
    a.preload = 'metadata';
    a.src = track.path;
    a.onloadedmetadata = () => { tracks[i].duration = a.duration; renderPlaylist(); };
  });
}

function loadTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  
  audio.src = track.path;
  trackNameEl.textContent = track.name;
  trackArtistEl.textContent = getFileTypeText(track.ext);
  totalTimeEl.textContent = track.duration ? formatTime(track.duration) : '--:--';
  
  document.querySelectorAll('.track-row').forEach(tr => {
    const trIndex = parseInt(tr.dataset.index);
    tr.classList.toggle('active-track', trIndex === index);
  });
  
  const heart = likeBtn.querySelector('i');
  heart.className = track.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  heart.style.color = track.liked ? '#fff' : '';
  
  updateRecentlyPlaying();
}

// ===== Плеер =====
function play() {
  if (currentIndex === -1) return;
  audio.play().catch(() => {});
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

function stopProgress() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
}

function handleProgressClick(e) {
  if (!audio.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration;
}

// ===== Сортировка =====
function handleSort(option) {
  sortOptions.forEach(o => o.classList.remove('active'));
  option.classList.add('active');
  const sortType = option.dataset.sort;
  const currentPath = tracks[currentIndex]?.path;
  sortTracks(sortType);
  if (currentPath) currentIndex = tracks.findIndex(t => t.path === currentPath);
  renderPlaylist();
  setTimeout(() => sortDropdown.classList.remove('open'), 150);
}

function sortTracks(type) {
  switch(type) {
    case 'name-az': tracks.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-za': tracks.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'date-new-old': tracks.sort((a, b) => b.dateAdded - a.dateAdded); break;
    case 'date-old-new': tracks.sort((a, b) => a.dateAdded - b.dateAdded); break;
  }
}

// ===== Контролы =====
function toggleShuffle() { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); }
function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.innerHTML = repeatMode === 2 
    ? '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;">1</span>'
    : '<i class="fa-solid fa-repeat"></i>';
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
  
  const graphSection = document.getElementById('graphSection');
  const playlistView = document.getElementById('playlistView');
  const settingsView = document.getElementById('settingsView');
  const recentSection = document.getElementById('recentSection');
  const sortContainer = document.getElementById('sortContainer');
  
  [graphSection, playlistView, settingsView].forEach(s => s?.classList.remove('active'));
  recentSection?.classList.remove('hidden');
  sortContainer?.classList.add('hidden');
  
  switch(currentPage) {
    case 'home': graphSection?.classList.add('active'); break;
    case 'settings': settingsView?.classList.add('active'); recentSection?.classList.add('hidden'); break;
    case 'all-songs': case 'custom':
      playlistView?.classList.add('active');
      sortContainer?.classList.remove('hidden');
      recentSection?.classList.add('hidden');
      renderPlaylist();
      break;
  }
  sortDropdown?.classList.remove('open');
};

// ===== Категории =====
function openModal() { modalOverlay.classList.add('open'); setTimeout(() => categoryInput?.focus(), 200); }
function closeModal() {
  modalOverlay.classList.remove('open');
  if (categoryInput) { categoryInput.value = ''; createBtn.disabled = true; }
}
function closeModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
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
  catEl.innerHTML = `<i class="fa-solid fa-folder"></i><span>${escapeHtml(name)}</span><button class="delete-cat" title="Удалить"><i class="fa-solid fa-xmark"></i></button>`;
  catEl.querySelector('.delete-cat').onclick = (e) => { e.stopPropagation(); deleteCategory(catId, catEl); };
  categoriesList?.appendChild(catEl);
  closeModal();
  saveData();
}

function deleteCategory(catId, el) {
  el.style.transition = 'all 0.25s ease';
  el.style.opacity = '0'; el.style.transform = 'translateX(-16px)';
  setTimeout(() => {
    el.remove();
    customCategories = customCategories.filter(c => c.id !== catId);
    if (currentPage === 'custom' && document.querySelector('.nav-item.active')?.dataset.catId === catId) {
      window.switchPage(document.querySelector('[data-page="all-songs"]'));
    }
    saveData();
  }, 250);
}

// ===== Контекстное меню =====
function handleContextMenuAction(action) {
  if (selectedTrackIndex === null || selectedTrackIndex >= tracks.length) return;
  const track = tracks[selectedTrackIndex];
  
  switch(action) {
    case 'details':
      showTrackDetails(track);
      openModalById('detailsModal');
      break;
    case 'playlist':
      showPlaylistSelection();
      openModalById('playlistModal');
      break;
    case 'sync':
      openModalById('syncModal');
      break;
  }
}

function openModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
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
  
  trackDetailsContent.innerHTML = details.map(([label, value]) => 
    `<span class="track-details-label">${label}</span><span class="track-details-value">${escapeHtml(value)}</span>`
  ).join('');
}

function showPlaylistSelection() {
  // Фильтруем: только пользовательские плейлисты (не "all-songs")
  const userPlaylists = Object.entries(playlists).filter(([id]) => id !== 'all-songs');
  
  if (userPlaylists.length === 0) {
    playlistListContent.innerHTML = '<p style="color:#666;font-size:13px;text-align:center">Нет созданных плейлистов</p>';
    return;
  }
  
  playlistListContent.innerHTML = userPlaylists.map(([id, playlist]) => {
    const isChecked = selectedPlaylists.has(id) ? 'checked' : '';
    return `
      <div class="playlist-item">
        <div class="playlist-checkbox ${isChecked}" data-playlist-id="${id}"></div>
        <span class="playlist-name">${escapeHtml(playlist.name)}</span>
        <span class="playlist-count">${playlist.trackPaths.size} треков</span>
      </div>
    `;
  }).join('');
  
  selectedPlaylists.clear();
}

// ===== Синхронизация =====
function renderSyncList() {
  if (syncConfigs.length === 0) {
    syncListContent.innerHTML = '<p style="color:#666;font-size:13px">Нет настроенных синхронизаций</p>';
    return;
  }
  
  syncListContent.innerHTML = syncConfigs.map(config => {
    const count = tracks.filter(t => t.synced === config.id).length;
    return `
      <div class="sync-item">
        <span class="sync-item-name">Синхронизация #${syncConfigs.indexOf(config) + 1}</span>
        <span class="sync-item-path" title="${escapeHtml(config.path)}">${escapeHtml(config.path)}</span>
        <span class="sync-item-count">${count} песен</span>
      </div>
    `;
  }).join('');
}

function renderSyncCategories() {
  // "Все песни" всегда включена и не удаляется
  const categories = [
    { id: 'all-songs', name: 'Все песни', default: true, checked: true }
  ];
  
  // Добавляем пользовательские категории
  customCategories.forEach(cat => {
    const isChecked = syncConfigs[0]?.categories?.includes(cat.id) ?? false;
    categories.push({ id: cat.id, name: cat.name, default: false, checked: isChecked });
  });
  
  syncCategoriesContent.innerHTML = categories.map(cat => `
    <label class="category-toggle${cat.default ? ' default' : ''}">
      <input type="checkbox" ${cat.default ? 'checked disabled' : (cat.checked ? 'checked' : '')} 
             data-category-id="${cat.id}" ${!cat.default ? 'onchange="toggleSyncCategory(this)"' : ''}>
      <span>${escapeHtml(cat.name)}${cat.default ? ' (по умолчанию)' : ''}</span>
    </label>
  `).join('');
}

window.toggleSyncCategory = function(checkbox) {
  const catId = checkbox.dataset.categoryId;
  const isChecked = checkbox.checked;
  
  // Обновляем все конфиги синхронизации
  syncConfigs.forEach(config => {
    if (isChecked) {
      if (!config.categories.includes(catId)) {
        config.categories.push(catId);
      }
    } else {
      config.categories = config.categories.filter(id => id !== catId);
    }
  });
  
  saveData();
};

// ===== Проверка недостающих файлов =====
async function checkMissingFiles() {
  const missing = [];
  
  for (const track of tracks) {
    const exists = await window.electronAPI?.checkFileExists?.(track.path);
    if (!exists) {
      missing.push(track);
    }
  }
  
  if (missing.length > 0) {
    // Показываем первый недостающий файл
    showMissingFileModal(missing[0]);
  }
}

function showMissingFileModal(track) {
  missingFileNameEl.textContent = track.name;
  missingFilePathEl.textContent = track.path;
  openModalById('missingFileModal');
}

function removeTrackByPath(path) {
  const index = tracks.findIndex(t => t.path === path);
  if (index !== -1) {
    tracks.splice(index, 1);
    if (currentIndex === index) {
      currentIndex = -1;
      audio.src = '';
      trackNameEl.textContent = 'Выберите трек';
      trackArtistEl.textContent = '—';
      currentTimeEl.textContent = '0:00';
      totalTimeEl.textContent = '0:00';
      progressFill.style.width = '0%';
      pause();
    } else if (currentIndex > index) {
      currentIndex--;
    }
    renderAll();
    saveData();
  }
}

// ===== Сохранение/загрузка =====
async function saveData() {
  if (!window.electronAPI?.saveData) return;
  
  const data = {
    tracks,
    playlists,
    syncConfigs,
    customCategories,
    categoryCounter,
    settings: {
      volume: lastVolume,
      isMuted,
      isShuffle,
      repeatMode
    }
  };
  
  await window.electronAPI.saveData(data);
}

async function loadData() {
  if (!window.electronAPI?.loadData) return;
  
  try {
    const data = await window.electronAPI.loadData();
    if (data) {
      tracks = data.tracks || [];
      playlists = data.playlists || { 'all-songs': { name: 'Все песни', trackPaths: new Set(tracks.map(t => t.path)) } };
      syncConfigs = data.syncConfigs || [];
      customCategories = data.customCategories || [];
      categoryCounter = data.categoryCounter || 0;
      
      // Применяем настройки
      if (data.settings) {
        lastVolume = data.settings.volume ?? lastVolume;
        isMuted = data.settings.isMuted ?? isMuted;
        isShuffle = data.settings.isShuffle ?? isShuffle;
        repeatMode = data.settings.repeatMode ?? repeatMode;
        
        audio.volume = lastVolume;
        updateVolumeUI();
        shuffleBtn.classList.toggle('active', isShuffle);
        repeatBtn.classList.toggle('active', repeatMode > 0);
        if (repeatMode === 2) {
          repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;">1</span>';
          repeatBtn.style.position = 'relative';
        }
      }
      
      // Обновляем плейлист "Все песни"
      if (!playlists['all-songs']) {
        playlists['all-songs'] = { name: 'Все песни', trackPaths: new Set(tracks.map(t => t.path)) };
      } else {
        playlists['all-songs'].trackPaths = new Set(tracks.map(t => t.path));
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
  }
}

// ===== Утилиты рендеринга =====
function renderAll() { renderPlaylist(); renderRecent(); }

function handleKeyDown(e) {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight' && audio.duration) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
  if (e.code === 'ArrowLeft') audio.currentTime = Math.max(audio.currentTime - 5, 0);
}

// Запуск
init();