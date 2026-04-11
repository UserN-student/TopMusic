// ==========================================
// 🎵 TopMusic - Renderer Process Logic v2
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
const settingsTopBtn = document.getElementById('settingsTopBtn');

// Модальные окна и меню
const trackContextMenu = document.getElementById('trackContextMenu');
const detailsModal = document.getElementById('detailsModal');
const playlistModal = document.getElementById('playlistModal');
const deleteModal = document.getElementById('deleteModal');
const missingFileModal = document.getElementById('missingFileModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
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
const searchInput = document.getElementById('searchInput');

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
let currentSortType = 'date-new-old';
let selectedTracks = new Set();
let contextTrackIndex = null;
let searchQuery = '';
let recentlyPlayed = []; // отдельный список недавно воспроизведённых

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getFileTypeText(ext) {
  return ext ? `${ext}-файл` : 'Файл';
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function openModalById(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModalById(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  if (categoryInput) {
    categoryInput.value = '';
    if (createBtn) createBtn.disabled = true;
  }
}

// ===== ТОСТ-УВЕДОМЛЕНИЯ =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = {
    success: `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#10b981;flex-shrink:0"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`,
    error: `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#ef4444;flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    info: `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#3b82f6;flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${icons[type] || icons.success}<span>${message}</span>`;
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init() {
  if (appVersionEl && window.appConfig) {
    appVersionEl.textContent = window.appConfig.version;
  }
  audio.volume = lastVolume;
  updateVolumeUI();
  
  await loadData();
  renderRecent();
  renderSyncList();
  renderSyncCategories();
  renderCategoriesInSidebar();
  setupEventListeners();
  updateNowPlayingCard();
  applyAnimationSetting();
  await checkMissingFiles();
  initGraph();
}

// ===== ОТРИСОВКА КАТЕГОРИЙ В САЙДБАРЕ (исправление бага) =====
function renderCategoriesInSidebar() {
  if (!categoriesList) return;
  
  const allSongsItem = categoriesList.querySelector('[data-page="all-songs"]');
  const likedItem = categoriesList.querySelector('[data-page="liked"]');
  categoriesList.innerHTML = '';
  if (allSongsItem) categoriesList.appendChild(allSongsItem);
  if (likedItem) categoriesList.appendChild(likedItem);
  
  customCategories.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'nav-item custom-category';
    catEl.dataset.page = 'custom';
    catEl.dataset.catId = cat.id;
    catEl.onclick = function() { window.switchPage(this); };
    catEl.innerHTML = `<i class="fa-solid fa-folder"></i><span>${escapeHtml(cat.name)}</span><button class="delete-cat" title="Удалить"><i class="fa-solid fa-xmark"></i></button>`;
    catEl.querySelector('.delete-cat').onclick = (e) => {
      e.stopPropagation();
      deleteCategory(cat.id, catEl);
    };
    categoriesList.appendChild(catEl);
  });
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
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
  
  // Кнопки действий
  addTrackBtn?.addEventListener('click', addFiles);
  addFolderBtn?.addEventListener('click', addFolder);
  addCategoryBtn.addEventListener('click', openModal);
  
  // Кнопка настроек
  if (settingsTopBtn) {
    settingsTopBtn.onclick = () => {
      const settingsNav = document.querySelector('[data-page="settings"]');
      if (settingsNav) window.switchPage(settingsNav);
    };
  }
  
  // Поиск
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderPlaylist();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        renderPlaylist();
      }
    });
  }
  
  // Плеер
  playBtn.onclick = togglePlay;
  prevBtn.onclick = handlePrev;
  nextBtn.onclick = handleNext;
  setupDraggableProgress();
  volumeContainer.onclick = handleVolumeClick;
  volumeIcon.onclick = toggleMute;
  
  // Drag-and-drop для добавления файлов
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', handleDrop);
  
  // Сортировка
  sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.classList.toggle('open');
  });
  sortOptions.forEach(opt => {
    opt.onclick = () => handleSort(opt);
  });
  
  // Закрытие выпадающих меню при клике вне
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-container')) {
      sortDropdown.classList.remove('open');
    }
    if (!e.target.closest('.track-menu-btn') && !e.target.closest('.context-menu') && !e.target.closest('.track-card')) {
      trackContextMenu.classList.remove('open');
    }
  });
  
  // Модалки
  setupModalListeners();
  
  // Создание категории
  if (categoryInput) {
    categoryInput.addEventListener('input', () => {
      if (createBtn) createBtn.disabled = categoryInput.value.trim().length === 0;
    });
    categoryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && categoryInput.value.trim()) createCategory();
      if (e.key === 'Escape') closeModal();
    });
  }
  if (createBtn) {
    createBtn.addEventListener('click', createCategory);
  }
  
  // Лайк, шаффл, рипит
  likeBtn.onclick = toggleLike;
  shuffleBtn.onclick = toggleShuffle;
  repeatBtn.onclick = toggleRepeat;
  
  audio.onended = handleTrackEnded;
  document.addEventListener('keydown', handleKeyDown);
  
  // Кнопка очистки недавних
  const clearRecentBtn = document.getElementById('clearRecentBtn');
  if (clearRecentBtn) {
    clearRecentBtn.onclick = () => {
      recentlyPlayed = [];
      saveData();
      renderRecent();
      showToast('История очищена');
    };
  }
  
  // Wheel scroll for recent cards
  if (recentCards) {
    recentCards.addEventListener('wheel', (e) => {
      e.preventDefault();
      recentCards.scrollLeft += e.deltaY;
    }, { passive: false });
  }
  
  // Prevent browser context menu
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('input') && !e.target.closest('textarea')) {
      e.preventDefault();
    }
  });
  
  // Кнопка очистки библиотеки
  const resetLibraryBtn = document.getElementById('resetLibraryBtn');
  if (resetLibraryBtn) {
    resetLibraryBtn.onclick = () => {
      if (confirm('Очистить всю библиотеку? Это действие нельзя отменить.')) {
        tracks = [];
        recentlyPlayed = [];
        playlists = { 'all-songs': { name: 'Все треки', trackPaths: new Set() } };
        currentIndex = -1;
        audio.src = '';
        audio.load();
        trackNameEl.textContent = 'Выберите трек';
        trackArtistEl.textContent = '—';
        progressFill.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        totalTimeEl.textContent = '0:00';
        isPlaying = false;
        playIcon.className = 'fa-solid fa-play';
        stopProgress();
        renderAll();
        updateSettingsStats();
        saveData();
        showToast('Библиотека очищена');
      }
    };
  }
}

// ===== DRAG AND DROP =====
async function handleDrop(e) {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files).filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return window.appConfig?.supportedFormats?.includes(ext);
  });
  if (!files.length) return;
  
  showLoadingModal(files.length);
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    updateLoadingModal(i + 1, files.length, file.name);
    const filePath = file.path;
    if (!tracks.some(t => t.path === filePath)) {
      const fileName = file.name;
      tracks.push({
        path: filePath,
        name: fileName.replace(/\.[^.]+$/, ''),
        ext: fileName.split('.').pop().toUpperCase(),
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        categories: ['all-songs']
      });
      added++;
    }
    await new Promise(r => setTimeout(r, 0));
  }
  
  hideLoadingModal();
  renderAll();
  loadTrackDurations();
  for (const t of tracks.filter(t => !t._metaLoaded)) {
    t._metaLoaded = true;
    loadMetadataForTrack(t).then(() => {});
  }
  if (currentIndex === -1 && tracks.length > 0) loadTrack(0);
  saveData();
  if (added > 0) showToast(`Добавлено ${added} трек(ов)`);
}

// ===== НАСТРОЙКА МОДАЛЬНЫХ ОКОН =====
function setupModalListeners() {
  // Закрытие модалок по кнопкам
  document.querySelectorAll('.modal-close, .modal-btn-cancel, .delete-modal-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.modal;
      if (modalId) closeModalById(modalId);
      else closeModal();
    });
  });
  
  // Закрытие по клику на оверлей
  [detailsModal, playlistModal, deleteModal, missingFileModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModalById(modal.id);
    });
  });
  
  // editTrackModal — сохраняем при клике вне
  const editModal = document.getElementById('editTrackModal');
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        const idx = editModal._editIndex;
        if (idx !== undefined) saveEditTrack(idx);
        else closeModalById('editTrackModal');
      }
    });
  }
  
  // Обработка пунктов контекстного меню
  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleContextMenuAction(action);
      trackContextMenu.classList.remove('open');
    });
  });
  
  // Выбор плейлистов в модалке
  if (playlistListContent) {
    playlistListContent.addEventListener('click', (e) => {
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
  }
  
  // Добавление в плейлист
  if (addToPlaylistBtn) {
    addToPlaylistBtn.addEventListener('click', () => {
      if (selectedTrackIndex !== null && selectedTrackIndex < tracks.length) {
        const trackPath = tracks[selectedTrackIndex].path;
        selectedPlaylists.forEach(pid => {
          if (playlists[pid]) {
            playlists[pid].trackPaths.add(trackPath);
            // Also update track.categories
            const trackObj = tracks.find(t => t.path === trackPath);
            if (trackObj && !trackObj.categories.includes(pid)) {
              trackObj.categories.push(pid);
            }
          }
        });
        saveData();
        closeModalById('playlistModal');
        renderPlaylist();
        showToast('Добавлено в плейлист');
      }
    });
  }
  
  // Синхронизация папки
  if (syncFolderBtn) {
    syncFolderBtn.addEventListener('click', async () => {
      const folder = await window.electronAPI?.openFolder();
      if (folder) {
        await syncFolder(folder);
        showToast('Папка синхронизирована');
      }
    });
  }
  
  // Копирование пути отсутствующего файла
  if (copyMissingPathBtn) {
    copyMissingPathBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(missingFilePathEl.textContent).then(() => {
        showToast('Скопировано!');
      });
    });
  }
  
  // Удаление трека при подтверждении (missingFile)
  if (okMissingFileBtn) {
    okMissingFileBtn.addEventListener('click', () => {
      removeTrackByPath(missingFilePathEl.textContent);
      closeModalById('missingFileModal');
    });
  }
  
  // Подтверждение удаления
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      deleteSelectedTracks();
      closeModalById('deleteModal');
    });
  }
  
  // Делегирование кликов по кнопкам копирования в деталях трека
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.copy-name-btn');
      if (copyBtn) {
        e.stopPropagation();
        const text = copyBtn.dataset.copy;
        if (text) {
          navigator.clipboard.writeText(text).then(() => showToast('Скопировано!'));
        }
      }
    });
  }
}

// ===== РАБОТА С ФАЙЛАМИ =====
async function addFiles() {
  if (!window.electronAPI?.openFiles) {
    addDemoTracks();
    return;
  }
  const files = await window.electronAPI.openFiles();
  if (!files.length) return;
  
  showLoadingModal(files.length);
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.split(/[\/\\]/).pop();
    updateLoadingModal(i + 1, files.length, fileName);
    if (!tracks.some(t => t.path === file)) {
      tracks.push({
        path: file,
        name: fileName.replace(/\.[^.]+$/, ''),
        ext: fileName.split('.').pop().toUpperCase(),
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        categories: ['all-songs']
      });
      added++;
    }
    await new Promise(r => setTimeout(r, 0));
  }
  
  hideLoadingModal();
  renderAll();
  loadTrackDurations();
  // Load metadata for new tracks
  const newTracks = tracks.slice(tracks.length - added);
  for (const t of tracks.filter(t => !t._metaLoaded)) {
    t._metaLoaded = true;
    loadMetadataForTrack(t).then(() => {});
  }
  if (currentIndex === -1 && tracks.length > 0) loadTrack(0);
  saveData();
  if (added > 0) showToast(`Добавлено ${added} трек(ов)`);
}

async function addFolder() {
  if (!window.electronAPI?.openFolder) return;
  const folder = await window.electronAPI.openFolder();
  if (!folder) return;
  
  const files = await window.electronAPI?.getAudioFilesInFolder?.(folder);
  if (!files?.length) return;
  
  showLoadingModal(files.length);
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.split(/[\/\\]/).pop();
    updateLoadingModal(i + 1, files.length, fileName);
    if (!tracks.some(t => t.path === file)) {
      tracks.push({
        path: file,
        name: fileName.replace(/\.[^.]+$/, ''),
        ext: fileName.split('.').pop().toUpperCase(),
        duration: null,
        dateAdded: Date.now(),
        liked: false,
        categories: ['all-songs']
      });
      added++;
    }
    await new Promise(r => setTimeout(r, 0));
  }
  
  hideLoadingModal();
  renderAll();
  loadTrackDurations();
  for (const t of tracks.filter(t => !t._metaLoaded)) {
    t._metaLoaded = true;
    loadMetadataForTrack(t).then(() => {});
  }
  if (currentIndex === -1 && tracks.length > 0) loadTrack(0);
  saveData();
  showToast(`Добавлено ${added} трек(ов) из папки`);
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

// ===== РЕНДЕРИНГ ПЛЕЙЛИСТА =====
function renderPlaylist() {
  if (!playlistGrid) return;
  
  let displayTracks = currentCategory === 'all-songs' 
    ? [...tracks] 
    : currentCategory === 'liked'
      ? tracks.filter(t => t.liked)
      : tracks.filter(t => t.categories?.includes(currentCategory));

  // Фильтрация по поиску
  if (searchQuery) {
    displayTracks = displayTracks.filter(t => 
      t.name.toLowerCase().includes(searchQuery) ||
      (t.ext && t.ext.toLowerCase().includes(searchQuery)) ||
      (t.artist && t.artist.toLowerCase().includes(searchQuery))
    );
  }

  if (!displayTracks.length) {
    playlistGrid.innerHTML = `
      <div class="playlist-empty">
        <i class="fa-regular fa-circle-play"></i>
        ${searchQuery ? 'Ничего не найдено' : 'Нет треков'}
      </div>`;
    updatePlaylistInfo(displayTracks);
    updateSelectionBar(displayTracks);
    return;
  }

  // Сортировка
  switch(currentSortType) {
    case 'name-az': displayTracks.sort((a, b) => a.name.localeCompare(b.name, 'ru')); break;
    case 'name-za': displayTracks.sort((a, b) => b.name.localeCompare(a.name, 'ru')); break;
    case 'date-new-old': displayTracks.sort((a, b) => b.dateAdded - a.dateAdded); break;
    case 'date-old-new': displayTracks.sort((a, b) => a.dateAdded - b.dateAdded); break;
  }

  playlistGrid.innerHTML = '';
  updatePlaylistInfo(displayTracks);
  updateSelectionBar(displayTracks);

  const fragment = document.createDocumentFragment();
  const isSelecting = selectedTracks.size > 0;
  
  displayTracks.forEach((track) => {
    const realIndex = tracks.findIndex(t => t.path === track.path);
    if (realIndex === -1) return;

    const isActive = realIndex === currentIndex;
    const isSelected = selectedTracks.has(track.path);
    const card = document.createElement('div');
    card.className = 'track-card' + (isActive ? ' active-track' : '') + (isSelected ? ' selected' : '');
    card.dataset.index = realIndex;
    card.dataset.path = track.path;

    const duration = track.duration ? formatTime(track.duration) : '--:--';
    const fileType = getFileTypeText(track.ext);
    const iconClass = isActive && isPlaying ? 'pause' : 'play';

    const artContent = isSelected
      ? `<div class="select-check"><i class="fa-solid fa-check"></i></div>`
      : track.cover
        ? `<img src="${track.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;"><div class="play-overlay"><i class="fa-solid fa-${iconClass}"></i></div>`
        : `<i class="fa-solid fa-music"></i><div class="play-overlay"><i class="fa-solid fa-${iconClass}"></i></div>`;

    card.innerHTML = `
      <div class="track-card-art">
        ${artContent}
      </div>
      <div class="track-card-info">
        <div class="track-card-title">${escapeHtml(track.name)}</div>
        <div class="track-card-meta">
          <span class="track-card-type"><i class="fa-regular fa-file-audio"></i> ${track.artist ? escapeHtml(track.artist) : fileType}</span>
          <span class="track-card-duration"><i class="fa-regular fa-clock"></i> ${duration}</span>
          ${track.liked ? '<span class="track-liked-badge"><i class="fa-solid fa-heart"></i></span>' : ''}
        </div>
      </div>
      <div class="track-card-menu">
        <button class="track-menu-btn" data-index="${realIndex}"><i class="fa-solid fa-ellipsis"></i></button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.track-menu-btn')) return;
      if (isSelecting || e.ctrlKey || e.metaKey) {
        e.stopPropagation();
        toggleTrackSelection(track.path);
      } else if (realIndex === currentIndex) {
        togglePlay();
      } else {
        currentIndex = realIndex;
        loadTrack(realIndex);
        play();
      }
    });

    const menuBtn = card.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      contextTrackIndex = realIndex;
      showContextMenu(e, menuBtn);
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextTrackIndex = realIndex;
      showContextMenu(e, card);
    });

    fragment.appendChild(card);
  });
  
  playlistGrid.appendChild(fragment);
}

function updatePlaylistInfo(displayTracks) {
  if (!playlistCount) return;
  const total = displayTracks.length;
  playlistCount.textContent = `${total} трек${total === 1 ? '' : total < 5 ? 'а' : 'ов'}`;
}

// ===== ПАНЕЛЬ ВЫДЕЛЕНИЯ =====
function updateSelectionBar(displayTracks) {
  let selectionBar = document.getElementById('selectionBar');
  
  if (selectedTracks.size > 0) {
    if (!selectionBar) {
      selectionBar = document.createElement('div');
      selectionBar.id = 'selectionBar';
      selectionBar.className = 'selection-bar';
      if (playlistCount?.parentElement) {
        playlistCount.parentElement.insertBefore(selectionBar, playlistCount);
      }
    }
    selectionBar.style.display = 'flex';
    selectionBar.innerHTML = `
      <span id="selectionCount">Выделено: <strong>${selectedTracks.size}</strong></span>
      <button id="selectAllBtn" class="select-all-btn">Выделить всё</button>
      <button id="addSelectedToPlaylistBtn" class="add-selected-to-playlist-btn"><i class="fa-solid fa-list"></i> В плейлист</button>
      <button id="deleteSelectedBtn" class="delete-selected-btn"><i class="fa-solid fa-trash"></i> Удалить</button>
      <button id="cancelSelectionBtn" class="cancel-selection-btn"><i class="fa-solid fa-xmark"></i> Отмена</button>
    `;
    
    selectionBar.querySelector('#deleteSelectedBtn').onclick = () => {
      if (selectedTracks.size > 0) openModalById('deleteModal');
    };
    selectionBar.querySelector('#cancelSelectionBtn').onclick = () => {
      selectedTracks.clear();
      renderPlaylist();
    };
    selectionBar.querySelector('#selectAllBtn').onclick = () => {
      displayTracks.forEach(track => selectedTracks.add(track.path));
      renderPlaylist();
    };
    selectionBar.querySelector('#addSelectedToPlaylistBtn').onclick = () => {
      if (selectedTracks.size > 0) {
        const firstTrackPath = Array.from(selectedTracks)[0];
        selectedTrackIndex = tracks.findIndex(t => t.path === firstTrackPath);
        showPlaylistSelection();
        openModalById('playlistModal');
      }
    };
  } else {
    if (selectionBar) selectionBar.style.display = 'none';
  }
}

// ===== ВЫДЕЛЕНИЕ ТРЕКА =====
function toggleTrackSelection(trackPath) {
  if (selectedTracks.has(trackPath)) {
    selectedTracks.delete(trackPath);
  } else {
    selectedTracks.add(trackPath);
  }
  // Update only the affected card visually, avoid full re-render
  const card = playlistGrid?.querySelector(`[data-path="${CSS.escape(trackPath)}"]`);
  if (card) {
    const isSelected = selectedTracks.has(trackPath);
    card.classList.toggle('selected', isSelected);
    const artEl = card.querySelector('.track-card-art');
    if (artEl) {
      if (isSelected) {
        artEl.innerHTML = `<div class="select-check"><i class="fa-solid fa-check"></i></div>`;
      } else {
        const track = tracks.find(t => t.path === trackPath);
        const realIndex = tracks.findIndex(t => t.path === trackPath);
        const isActive = realIndex === currentIndex;
        const iconClass = isActive && isPlaying ? 'pause' : 'play';
        if (track?.cover) {
          artEl.innerHTML = `<img src="${track.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;"><div class="play-overlay"><i class="fa-solid fa-${iconClass}"></i></div>`;
        } else {
          artEl.innerHTML = `<i class="fa-solid fa-music"></i><div class="play-overlay"><i class="fa-solid fa-${iconClass}"></i></div>`;
        }
      }
    }
  }
  // Update selection bar count
  const selectionBar = document.getElementById('selectionBar');
  if (selectedTracks.size > 0) {
    if (!selectionBar) {
      renderPlaylist(); // full render only if bar doesn't exist yet
    } else {
      selectionBar.style.display = 'flex';
      const countEl = selectionBar.querySelector('#selectionCount');
      if (countEl) countEl.innerHTML = `Выделено: <strong>${selectedTracks.size}</strong>`;
    }
  } else {
    if (selectionBar) selectionBar.style.display = 'none';
  }
}

// ===== УДАЛЕНИЕ ВЫБРАННЫХ ТРЕКОВ =====
function deleteSelectedTracks() {
  const indicesToDelete = [];
  tracks.forEach((track, index) => {
    if (selectedTracks.has(track.path)) indicesToDelete.push(index);
  });
  indicesToDelete.sort((a, b) => b - a);
  
  indicesToDelete.forEach(idx => {
    const track = tracks[idx];
    tracks.splice(idx, 1);
    Object.values(playlists).forEach(pl => pl.trackPaths?.delete(track.path));
    
    if (currentIndex === idx) {
      currentIndex = -1;
      audio.src = '';
      audio.load();
      trackNameEl.textContent = 'Выберите трек';
      trackArtistEl.textContent = '—';
      currentTimeEl.textContent = '0:00';
      totalTimeEl.textContent = '0:00';
      progressFill.style.width = '0%';
      pause();
    } else if (currentIndex > idx) {
      currentIndex--;
    }
  });
  
  selectedTracks.clear();
  renderAll();
  saveData();
  updateNowPlayingCard();
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function showContextMenu(event, anchor) {
  const menu = trackContextMenu;
  const menuW = 220;
  const menuH = 180;
  
  let left = event.clientX + 8;
  let top = event.clientY + 8;
  
  if (left + menuW > window.innerWidth - 10) {
    left = event.clientX - menuW - 8;
  }
  if (top + menuH > window.innerHeight - 10) {
    top = event.clientY - menuH - 8;
  }
  
  left = Math.max(10, left);
  top = Math.max(10, top);
  
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.classList.add('open');
}

// ===== ДЕЙСТВИЯ КОНТЕКСТНОГО МЕНЮ =====
function handleContextMenuAction(action) {
  if (contextTrackIndex === null || contextTrackIndex >= tracks.length) return;
  const track = tracks[contextTrackIndex];
  
  switch(action) {
    case 'details':
      showTrackDetails(track);
      openModalById('detailsModal');
      break;
    case 'edit':
      openEditTrackModal(contextTrackIndex);
      break;
    case 'playlist':
      selectedTrackIndex = contextTrackIndex;
      showPlaylistSelection();
      openModalById('playlistModal');
      break;
    case 'select':
      toggleTrackSelection(track.path);
      break;
    case 'delete':
      selectedTracks.add(track.path);
      openModalById('deleteModal');
      break;
    case 'open-explorer':
      window.electronAPI?.openFolderWithFile?.(track.path);
      break;
  }
}

// ===== ДЕТАЛИ ТРЕКА (с кнопками копирования) =====
function showTrackDetails(track) {
  if (!trackDetailsContent) return;
  
  const folderPath = track.path.split(/[\/\\]/).slice(0, -1).join('/');
  
  trackDetailsContent.innerHTML = `
    <div class="track-details-block">
      <div class="track-details-row name-row">
        <span class="track-details-label">Название</span>
        <span class="track-details-value" title="${escapeHtml(track.name)}" style="max-width:none;text-align:right;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(track.name)}</span>
        <button class="copy-name-btn" data-copy="${escapeHtml(track.name)}" title="Копировать название">
          <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
      </div>
      <div class="track-details-row"><span class="track-details-label">Формат</span><span class="track-details-value">${getFileTypeText(track.ext)}</span></div>
      <div class="track-details-row"><span class="track-details-label">Длительность</span><span class="track-details-value">${track.duration ? formatTime(track.duration) : 'Неизвестно'}</span></div>
      <div class="track-details-row"><span class="track-details-label">Добавлен</span><span class="track-details-value">${new Date(track.dateAdded).toLocaleDateString('ru-RU')}</span></div>
    </div>
    <div class="track-details-block">
      <div class="track-details-row">
        <span class="track-details-label">Путь к файлу</span>
        <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end;">
          <span class="track-details-value mono" style="max-width:70%;">${escapeHtml(track.path)}</span>
          <button class="copy-name-btn" data-copy="${escapeHtml(track.path)}" title="Копировать путь">
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
        </div>
      </div>
      <div class="track-details-row">
        <span class="track-details-label">Путь к папке</span>
        <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end;">
          <span class="track-details-value mono" style="max-width:70%;">${escapeHtml(folderPath)}</span>
          <button class="copy-name-btn" data-copy="${escapeHtml(folderPath)}" title="Копировать путь к папке">
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="track-details-row"><span class="track-details-label">В избранном</span><span class="track-details-value">${track.liked ? 'Да' : 'Нет'}</span></div>
  `;
}

// ===== ВЫБОР ПЛЕЙЛИСТА =====
function showPlaylistSelection() {
  if (!playlistListContent) return;
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

// ===== РЕНДЕРИНГ "НЕДАВНО ПРОСЛУШАННЫЕ" =====
function renderRecent() {
  if (!recentCards) return;
  recentCards.innerHTML = '';
  
  // Используем recentlyPlayed если есть, иначе fallback на tracks по dateAdded
  const source = recentlyPlayed.length > 0 ? recentlyPlayed : [];
  
  if (!source.length) {
    recentCards.classList.add('empty');
    recentCards.innerHTML = `<div class="empty-message"><i class="fa-regular fa-circle-play"></i>Послушайте что-нибудь</div>`;
    return;
  }
  recentCards.classList.remove('empty');
  
  source.slice(0, 8).forEach(path => {
    const track = tracks.find(t => t.path === path);
    if (!track) return;
    const idx = tracks.findIndex(t => t.path === path);
    
    const card = document.createElement('div');
    card.className = 'song-card' + (idx === currentIndex && isPlaying ? ' playing' : '');
    card.dataset.path = track.path;
    
    card.innerHTML = `
      <div class="song-card-art">
        ${track.cover ? `<img src="${track.cover}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px;">` : '<i class="fa-solid fa-music"></i>'}
        <div class="play-overlay"><i class="fa-solid fa-${idx === currentIndex && isPlaying ? 'pause' : 'play'}"></i></div>
      </div>
      <div class="song-card-title">${escapeHtml(track.name)}</div>
      <div class="song-card-artist">${track.artist || getFileTypeText(track.ext)}${track.duration ? ' · ' + formatTime(track.duration) : ''}</div>
    `;
    card.onclick = () => {
      if (idx !== -1) {
        currentIndex = idx;
        loadTrack(idx);
        play();
      }
    };
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextTrackIndex = idx;
      showContextMenu(e, card);
    });
    recentCards.appendChild(card);
  });
}

// Добавить трек в список недавних
function addToRecentlyPlayed(path) {
  recentlyPlayed = recentlyPlayed.filter(p => p !== path);
  recentlyPlayed.unshift(path);
  if (recentlyPlayed.length > 20) recentlyPlayed = recentlyPlayed.slice(0, 20);
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

// ===== ЗАГРУЗКА МЕТАДАННЫХ =====
async function loadMetadataForTrack(track) {
  if (!window.electronAPI?.getAudioMetadata) return;
  try {
    const meta = await window.electronAPI.getAudioMetadata(track.path);
    if (meta) {
      let changed = false;
      if (meta.title && meta.title.trim()) { track.name = meta.title.trim(); changed = true; }
      if (meta.artist && meta.artist.trim()) { track.artist = meta.artist.trim(); changed = true; }
      if (meta.album) track.album = meta.album;
      if (meta.cover) { track.cover = meta.cover; changed = true; }
      if (changed) {
        // Update card in-place if visible
        const card = playlistGrid?.querySelector(`[data-path="${CSS.escape(track.path)}"]`);
        if (card) {
          const titleEl = card.querySelector('.track-card-title');
          if (titleEl) titleEl.textContent = track.name;
          const typeEl = card.querySelector('.track-card-type');
          if (typeEl) typeEl.innerHTML = `<i class="fa-regular fa-file-audio"></i> ${track.artist || getFileTypeText(track.ext)}`;
          const artEl = card.querySelector('.track-card-art');
          if (artEl && track.cover && !card.classList.contains('selected')) {
            const existing = artEl.querySelector('img');
            if (!existing) {
              const img = document.createElement('img');
              img.src = track.cover;
              img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
              artEl.insertBefore(img, artEl.firstChild);
            }
          }
        }
        // Update player bar if this is current track
        if (tracks[currentIndex]?.path === track.path) {
          trackNameEl.textContent = track.name;
          trackArtistEl.textContent = track.artist || getFileTypeText(track.ext);
          updateNowPlayingCard();
        }
      }
    }
  } catch {}
}

// ===== ЗАГРУЗКА ДЛИТЕЛЬНОСТИ =====
function loadTrackDurations() {
  let pendingUpdate = false;
  tracks.forEach((track, i) => {
    if (track.duration) return;
    const a = new Audio();
    a.preload = 'metadata';
    let srcPath = track.path;
    if (!srcPath.startsWith('file://')) srcPath = 'file:///' + srcPath.replace(/\\/g, '/');
    a.src = srcPath;
    a.onloadedmetadata = () => {
      tracks[i].duration = a.duration;
      if (!pendingUpdate) {
        pendingUpdate = true;
        requestAnimationFrame(() => {
          pendingUpdate = false;
          // Only re-render if playlist view is visible
          if (currentPage === 'all-songs' || currentPage === 'liked' || currentPage === 'custom') {
            renderPlaylist();
          }
        });
      }
    };
    a.onerror = () => { tracks[i].duration = null; };
  });
}

// ===== ЗАГРУЗКА ТРЕКА =====
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
  trackArtistEl.textContent = track.artist || getFileTypeText(track.ext);
  totalTimeEl.textContent = track.duration ? formatTime(track.duration) : '--:--';
  
  const heart = likeBtn.querySelector('i');
  heart.className = track.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  heart.style.color = track.liked ? '#fff' : '';
  
  // Обновляем список недавних
  addToRecentlyPlayed(track.path);
  
  // Применяем скорость воспроизведения
  audio.playbackRate = track.speed || 1;
  
  updateActiveCardIcon();
  updateRecentlyPlaying();
  updateNowPlayingCard();
}

// ===== ПЛЕЕР =====
function play() {
  if (currentIndex === -1) return;
  audio.play().catch(err => console.warn('Ошибка воспроизведения:', err));
  isPlaying = true;
  playIcon.className = 'fa-solid fa-pause';
  startProgress();
  updateRecentlyPlaying();
  updateActiveCardIcon();
  updateNowPlayingCard();
}

function pause() {
  audio.pause();
  isPlaying = false;
  playIcon.className = 'fa-solid fa-play';
  stopProgress();
  updateRecentlyPlaying();
  updateActiveCardIcon();
  updateNowPlayingCard();
}

// Обновляет только иконку play/pause на активной карточке без полного ре-рендера
function updateActiveCardIcon() {
  if (!playlistGrid) return;
  playlistGrid.querySelectorAll('.track-card').forEach(card => {
    const idx = parseInt(card.dataset.index);
    const overlay = card.querySelector('.play-overlay i');
    if (!overlay) return;
    if (idx === currentIndex) {
      card.classList.add('active-track');
      overlay.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    } else {
      card.classList.remove('active-track');
      overlay.className = 'fa-solid fa-play';
    }
  });
}

function togglePlay() {
  isPlaying ? pause() : play();
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

function startProgress() {
  stopProgress();
  progressInterval = setInterval(() => {
    if (audio.duration) {
      progressFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
      // Update now-playing card progress
      const npFill = document.getElementById('nowPlayingProgressFill');
      const npTime = document.getElementById('nowPlayingTime');
      if (npFill) npFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      if (npTime) npTime.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    }
  }, 100);
}

function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ===== DRAGGABLE PROGRESS BAR =====
let isDraggingProgress = false;
let wasPlayingBeforeDrag = false;

function setupDraggableProgress() {
  progressContainer.addEventListener('mousedown', (e) => {
    if (!audio.duration) return;
    isDraggingProgress = true;
    wasPlayingBeforeDrag = isPlaying;
    if (isPlaying) { audio.pause(); stopProgress(); }
    progressFill.style.transition = 'none';
    seekProgress(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDraggingProgress) return;
    seekProgress(e);
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDraggingProgress) return;
    isDraggingProgress = false;
    progressFill.style.transition = '';
    if (wasPlayingBeforeDrag) { audio.play().catch(() => {}); startProgress(); isPlaying = true; }
  });
}

function seekProgress(e) {
  const rect = progressContainer.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
  progressFill.style.width = (pct * 100) + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
}

function handleProgressClick(e) {
  seekProgress(e);
}

function handleSort(option) {
  sortOptions.forEach(o => o.classList.remove('active'));
  option.classList.add('active');
  currentSortType = option.dataset.sort;
  sortDropdown.classList.remove('open');
  renderPlaylist();
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
}

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

// ===== НАВИГАЦИЯ =====
window.switchPage = function(el) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  el.classList.add('active');
  
  const pageName = el.querySelector('span')?.textContent || '';
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = pageName;
  currentPage = el.dataset.page;
  
  if (currentPage === 'custom') {
    currentCategory = el.dataset.catId;
  } else if (currentPage === 'all-songs') {
    currentCategory = 'all-songs';
  } else if (currentPage === 'liked') {
    currentCategory = 'liked';
  } else {
    currentCategory = null;
  }
  
  const graph = document.getElementById('graphSection');
  const playlist = document.getElementById('playlistView');
  const settings = document.getElementById('settingsView');
  const recent = document.getElementById('recentSection');
  const sortCont = document.getElementById('sortContainer');
  
  [graph, playlist, settings].forEach(s => s?.classList.remove('active'));
  recent?.classList.remove('hidden');
  sortCont?.classList.add('hidden');
  
  if (settingsTopBtn) {
    if (currentPage === 'all-songs' || currentPage === 'custom' || currentPage === 'liked') {
      settingsTopBtn.classList.remove('hidden');
    } else {
      settingsTopBtn.classList.add('hidden');
    }
  }
  
  // Показывать поиск только в категориях
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer) {
    if (currentPage === 'all-songs' || currentPage === 'custom' || currentPage === 'liked') {
      searchContainer.classList.remove('hidden');
    } else {
      searchContainer.classList.add('hidden');
    }
  }
  
  // Сброс поиска при переключении
  if (searchInput) {
    searchInput.value = '';
    searchQuery = '';
  }
  
  // Сброс выделения при переключении
  if (selectedTracks.size > 0) {
    selectedTracks.clear();
  }
  
  switch(currentPage) {
    case 'home':
      graph?.classList.add('active');
      break;
    case 'settings':
      settings?.classList.add('active');
      recent?.classList.add('hidden');
      renderSyncList();
      renderSyncCategories();
      updateSettingsStats();
      break;
    case 'all-songs':
    case 'liked':
    case 'custom':
      playlist?.classList.add('active');
      sortCont?.classList.remove('hidden');
      recent?.classList.add('hidden');
      renderPlaylist();
      break;
  }
  sortDropdown?.classList.remove('open');
};

// ===== КАТЕГОРИИ =====
function openModal() {
  modalOverlay.classList.add('open');
  setTimeout(() => categoryInput?.focus(), 200);
}

function createCategory() {
  const name = categoryInput?.value.trim();
  if (!name) return;
  if (name.toLowerCase() === 'все треки' || name.toLowerCase() === 'all tracks') {
    alert('Нельзя создать категорию с названием "Все треки"');
    return;
  }
  categoryCounter++;
  const catId = `cat-${categoryCounter}`;
  if (!playlists[catId]) {
    playlists[catId] = { name, trackPaths: new Set() };
  }
  customCategories.push({ id: catId, name });

  const catEl = document.createElement('div');
  catEl.className = 'nav-item custom-category';
  catEl.dataset.page = 'custom';
  catEl.dataset.catId = catId;
  catEl.onclick = function() { window.switchPage(this); };
  catEl.innerHTML = `<i class="fa-solid fa-folder"></i><span>${escapeHtml(name)}</span><button class="delete-cat" title="Удалить"><i class="fa-solid fa-xmark"></i></button>`;
  catEl.querySelector('.delete-cat').onclick = (e) => {
    e.stopPropagation();
    deleteCategory(catId, catEl);
  };
  categoriesList?.appendChild(catEl);
  closeModal();
  saveData();
}

function deleteCategory(catId, el) {
  el.style.transition = 'all 0.25s ease';
  el.style.opacity = '0';
  el.style.transform = 'translateX(-16px)';
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

// ===== СИНХРОНИЗАЦИЯ =====
function renderSyncList() {
  if (!syncListContent) return;
  if (!syncConfigs.length) {
    syncListContent.innerHTML = '<div style="text-align:center;color:#555;padding:16px;font-size:13px">Нет синхронизированных папок</div>';
    return;
  }
  syncListContent.innerHTML = syncConfigs.map((cfg, i) => {
    const count = tracks.filter(t => t.synced === cfg.id).length;
    const folderName = cfg.path.split(/[\/\\]/).pop() || cfg.path;
    return `
      <div class="sync-item">
        <div class="sync-item-icon"><i class="fa-solid fa-folder"></i></div>
        <div class="sync-item-info">
          <div class="sync-item-name">${escapeHtml(folderName)}</div>
          <div class="sync-item-path" title="${escapeHtml(cfg.path)}">${escapeHtml(cfg.path)}</div>
        </div>
        <span class="sync-item-count">${count} тр.</span>
      </div>`;
  }).join('');
}

function renderSyncCategories() {
  if (!syncCategoriesContent) return;
  const cats = [{ id: 'all-songs', name: 'Все треки', def: true, chk: true }];
  customCategories.forEach(c => cats.push({
    id: c.id, name: c.name, def: false,
    chk: syncConfigs[0]?.categories?.includes(c.id) ?? false
  }));
  syncCategoriesContent.innerHTML = cats.map(c =>
    `<label class="category-toggle${c.def ? ' default' : ''}">
      <input type="checkbox" ${c.def ? 'checked disabled' : c.chk ? 'checked' : ''} data-category-id="${c.id}" ${!c.def ? 'onchange="toggleSyncCategory(this)"' : ''}>
      <div class="cb-box"></div>
      <span>${escapeHtml(c.name)}${c.def ? ' (по умолчанию)' : ''}</span>
    </label>`
  ).join('');
}

window.toggleSyncCategory = function(cb) {
  const id = cb.dataset.categoryId;
  syncConfigs.forEach(cfg => {
    if (cb.checked) {
      if (!cfg.categories.includes(id)) cfg.categories.push(id);
    } else {
      cfg.categories = cfg.categories.filter(i => i !== id);
    }
  });
  saveData();
};

// ===== ПРОВЕРКА ФАЙЛОВ =====
async function checkMissingFiles() {
  const missing = [];
  for (const t of tracks) {
    const exists = await window.electronAPI?.checkFileExists?.(t.path);
    if (!exists) missing.push(t);
  }
  if (missing.length > 0) showMissingFileModal(missing[0]);
}

function showMissingFileModal(t) {
  missingFileNameEl.textContent = t.name;
  missingFilePathEl.textContent = t.path;
  openModalById('missingFileModal');
}

// ===== УДАЛЕНИЕ ТРЕКА =====
function removeTrack(index) {
  const track = tracks[index];
  tracks.splice(index, 1);
  selectedTracks.delete(track.path);
  Object.values(playlists).forEach(pl => pl.trackPaths?.delete(track.path));
  
  if (currentIndex === index) {
    currentIndex = -1;
    audio.src = '';
    audio.load();
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

function removeTrackByPath(path) {
  const idx = tracks.findIndex(t => t.path === path);
  if (idx !== -1) removeTrack(idx);
}

// ===== ДАННЫЕ =====
async function saveData() {
  if (!window.electronAPI?.saveData) return;
  await window.electronAPI.saveData({
    tracks,
    playlists,
    syncConfigs,
    customCategories,
    categoryCounter,
    recentlyPlayed,
    settings: { volume: lastVolume, isMuted, isShuffle, repeatMode }
  });
}

async function loadData() {
  if (!window.electronAPI?.loadData) return;
  try {
    const data = await window.electronAPI.loadData();
    if (data) {
      tracks = data.tracks || [];
      playlists = data.playlists || { 'all-songs': { name: 'Все треки', trackPaths: new Set(tracks.map(t=>t.path)) } };
      syncConfigs = data.syncConfigs || [];
      customCategories = data.customCategories || [];
      categoryCounter = data.categoryCounter || 0;
      recentlyPlayed = data.recentlyPlayed || [];
      
      if (data.settings) {
        lastVolume = data.settings.volume ?? lastVolume;
        isMuted = data.settings.isMuted ?? isMuted;
        isShuffle = data.settings.isShuffle ?? isShuffle;
        repeatMode = data.settings.repeatMode ?? repeatMode;
        audio.volume = lastVolume;
        updateVolumeUI();
        shuffleBtn.classList.toggle('active', isShuffle);
        repeatBtn.classList.toggle('active', repeatMode > 0);
      }
      
      if (!playlists['all-songs']) {
        playlists['all-songs'] = { name: 'Все треки', trackPaths: new Set(tracks.map(t=>t.path)) };
      } else {
        playlists['all-songs'].trackPaths = new Set(tracks.map(t=>t.path));
      }
      
      tracks.forEach(t => {
        if (!t.categories) t.categories = ['all-songs'];
        else if (!t.categories.includes('all-songs')) t.categories.push('all-songs');
        // Mark as already loaded so we don't re-fetch metadata
        t._metaLoaded = true;
      });
    }
  } catch(e) {
    console.error('Ошибка загрузки:', e);
  }
}

function renderAll() {
  renderPlaylist();
  renderRecent();
}

// ===== СТАТИСТИКА НАСТРОЕК =====
function updateSettingsStats() {
  const totalEl = document.getElementById('statTotalTracks');
  const timeEl = document.getElementById('statTotalTime');
  const likedEl = document.getElementById('statLiked');
  if (totalEl) totalEl.textContent = tracks.length;
  if (timeEl) {
    const total = tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    timeEl.textContent = h > 0 ? `${h}ч ${m}м` : `${m}м`;
  }
  if (likedEl) likedEl.textContent = tracks.filter(t => t.liked).length;
}

// ===== СОХРАНЕНИЕ НАСТРОЕК ТОГЛОВ =====
window.saveSettingToggle = function(key, value) {
  if (key === 'animations') {
    document.body.classList.toggle('no-animations', !value);
  }
  if (key === 'graph') {
    const graphContainer = document.querySelector('.graph-container');
    const canvas = document.getElementById('graphCanvas');
    if (graphContainer) graphContainer.style.display = value ? '' : 'none';
    if (value && canvas) {
      graphEventsSetup = false;
      initGraph();
    } else if (!value && graphAnimFrame) {
      cancelAnimationFrame(graphAnimFrame);
      graphAnimFrame = null;
    }
  }
  showToast(value ? 'Включено' : 'Выключено');
};

function handleKeyDown(e) {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === 'ArrowRight' && audio.duration && !e.target.matches('input, textarea')) {
    audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
  }
  if (e.code === 'ArrowLeft' && !e.target.matches('input, textarea')) {
    audio.currentTime = Math.max(audio.currentTime - 5, 0);
  }
  if (e.code === 'Escape') {
    trackContextMenu.classList.remove('open');
    sortDropdown.classList.remove('open');
    if (selectedTracks.size > 0) {
      selectedTracks.clear();
      renderPlaylist();
    }
  }
}

// ===== МОДАЛКА ЗАГРУЗКИ =====
function showLoadingModal(total) {
  const m = document.getElementById('loadingModal');
  if (!m) return;
  document.getElementById('loadingProgressBar').style.width = '0%';
  document.getElementById('loadingStats').textContent = `0 / ${total}`;
  document.getElementById('loadingCurrent').textContent = 'Подготовка...';
  m.classList.add('open');
}

function updateLoadingModal(current, total, fileName) {
  const pct = Math.round((current / total) * 100);
  const bar = document.getElementById('loadingProgressBar');
  const stats = document.getElementById('loadingStats');
  const cur = document.getElementById('loadingCurrent');
  if (bar) bar.style.width = pct + '%';
  if (stats) stats.textContent = `${current} / ${total}`;
  if (cur) cur.textContent = fileName;
}

function hideLoadingModal() {
  const m = document.getElementById('loadingModal');
  if (m) m.classList.remove('open');
}

// ===== КАРТОЧКА "СЕЙЧАС ИГРАЕТ" =====
function updateNowPlayingCard() {
  const card = document.getElementById('nowPlayingCard');
  const artEl = document.getElementById('nowPlayingArt');
  const titleEl = document.getElementById('nowPlayingTitle');
  const artistEl = document.getElementById('nowPlayingArtist');
  const eqEl = document.getElementById('nowPlayingEq');
  const progressWrap = document.getElementById('nowPlayingProgressWrap');
  const progressFillEl = document.getElementById('nowPlayingProgressFill');
  const timeEl = document.getElementById('nowPlayingTime');
  const dateEl = document.getElementById('nowPlayingDate');
  if (!card) return;
  
  if (currentIndex === -1 || !tracks[currentIndex]) {
    card.classList.remove('has-track');
    if (artEl) {
      const img = artEl.querySelector('img');
      if (img) img.remove();
      const musicIcon = artEl.querySelector('.fa-music');
      if (!musicIcon) {
        const i = document.createElement('i');
        i.className = 'fa-solid fa-music';
        artEl.insertBefore(i, artEl.firstChild);
      }
    }
    if (titleEl) titleEl.innerHTML = '<span class="now-playing-empty">Ничего не воспроизводится</span>';
    if (artistEl) artistEl.textContent = '';
    if (progressWrap) progressWrap.style.display = 'none';
    if (dateEl) dateEl.style.display = 'none';
    // Update overlay icon
    const overlayIcon = document.getElementById('nowPlayingPlayIcon');
    if (overlayIcon) overlayIcon.className = 'fa-solid fa-play';
    return;
  }
  
  const track = tracks[currentIndex];
  card.classList.add('has-track');
  
  // Update cover without full innerHTML replace
  if (artEl) {
    let img = artEl.querySelector('img');
    let musicIcon = artEl.querySelector('i.fa-music');
    if (track.cover) {
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px;';
        artEl.insertBefore(img, artEl.firstChild);
      }
      img.src = track.cover;
      if (musicIcon) musicIcon.style.display = 'none';
    } else {
      if (img) img.remove();
      if (musicIcon) musicIcon.style.display = '';
    }
  }
  
  if (titleEl) titleEl.textContent = track.name;
  if (artistEl) artistEl.textContent = track.artist || getFileTypeText(track.ext);
  
  // Update overlay icon
  const overlayIcon = document.getElementById('nowPlayingPlayIcon');
  if (overlayIcon) overlayIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  
  // Progress
  if (progressWrap) progressWrap.style.display = 'block';
  if (audio.duration && progressFillEl) {
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFillEl.style.width = pct + '%';
    if (timeEl) timeEl.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
  } else if (track.duration && progressFillEl) {
    progressFillEl.style.width = '0%';
    if (timeEl) timeEl.textContent = '0:00 / ' + formatTime(track.duration);
  }
  
  // Date
  if (dateEl) {
    dateEl.textContent = 'Добавлен: ' + formatDate(track.dateAdded);
    dateEl.style.display = 'block';
  }
  
  // EQ animation
  if (eqEl) {
    eqEl.classList.toggle('paused', !isPlaying);
  }
}

// ===== МОДАЛКА РЕДАКТИРОВАНИЯ ТРЕКА =====
const EQ_BANDS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

function openEditTrackModal(trackIndex) {
  if (trackIndex === null || trackIndex >= tracks.length) return;
  const track = tracks[trackIndex];
  
  // Заполняем поля
  document.getElementById('editTrackName').value = track.name || '';
  document.getElementById('editTrackArtist').value = track.artist || '';
  
  const speedSlider = document.getElementById('editSpeedSlider');
  const speedVal = document.getElementById('editSpeedVal');
  const speed = track.speed || 1;
  speedSlider.value = speed;
  speedVal.textContent = speed.toFixed(2) + '×';
  speedSlider.oninput = () => {
    speedVal.textContent = parseFloat(speedSlider.value).toFixed(2) + '×';
  };
  
  // Обложка
  const preview = document.getElementById('editCoverPreview');
  if (track.cover) {
    preview.innerHTML = `<img src="${track.cover}" alt=""><div class="edit-cover-overlay"><i class="fa-solid fa-camera"></i><span>Изменить</span></div>`;
  } else {
    preview.innerHTML = `<i class="fa-solid fa-music"></i><div class="edit-cover-overlay"><i class="fa-solid fa-camera"></i><span>Загрузить GIF/изображение</span></div>`;
  }
  preview.onclick = () => document.getElementById('editCoverInput').click();
  
  document.getElementById('editCoverInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      preview.innerHTML = `<img src="${src}" alt=""><div class="edit-cover-overlay"><i class="fa-solid fa-camera"></i><span>Изменить</span></div>`;
      preview.onclick = () => document.getElementById('editCoverInput').click();
      track._pendingCover = src;
    };
    reader.readAsDataURL(file);
  };
  
  // EQ
  const eqGrid = document.getElementById('eqGrid');
  const eq = track.eq || Array(10).fill(0);
  eqGrid.innerHTML = EQ_BANDS.map((band, i) => `
    <div class="eq-band">
      <div class="eq-val" id="eqVal${i}">${eq[i] > 0 ? '+' : ''}${eq[i]}</div>
      <input type="range" class="eq-range" id="eqRange${i}" min="-12" max="12" step="1" value="${eq[i]}"
        oninput="document.getElementById('eqVal${i}').textContent=(this.value>0?'+':'')+this.value">
      <div class="eq-band-label">${band}</div>
    </div>
  `).join('');
  
  // Кнопка сброса
  document.getElementById('editResetBtn').onclick = () => {
    document.getElementById('editTrackName').value = track._origName || track.name;
    document.getElementById('editTrackArtist').value = track._origArtist || '';
    speedSlider.value = 1;
    speedVal.textContent = '1.00×';
    EQ_BANDS.forEach((_, i) => {
      document.getElementById(`eqRange${i}`).value = 0;
      document.getElementById(`eqVal${i}`).textContent = '0';
    });
    if (track._origCover !== undefined) {
      track._pendingCover = track._origCover;
      if (track._origCover) {
        preview.innerHTML = `<img src="${track._origCover}" alt=""><div class="edit-cover-overlay"><i class="fa-solid fa-camera"></i><span>Изменить</span></div>`;
      } else {
        preview.innerHTML = `<i class="fa-solid fa-music"></i><div class="edit-cover-overlay"><i class="fa-solid fa-camera"></i><span>Загрузить GIF/изображение</span></div>`;
      }
    }
  };
  
  // Кнопка сохранения
  document.getElementById('editSaveBtn').onclick = () => saveEditTrack(trackIndex);
  
  // Сохранение при клике вне модалки
  const modal = document.getElementById('editTrackModal');
  modal._saveOnOutsideClick = true;
  modal._editIndex = trackIndex;
  
  openModalById('editTrackModal');
}

function saveEditTrack(trackIndex) {
  if (trackIndex === null || trackIndex >= tracks.length) return;
  const track = tracks[trackIndex];
  
  // Сохраняем оригиналы при первом редактировании
  if (track._origName === undefined) track._origName = track.name;
  if (track._origArtist === undefined) track._origArtist = track.artist || '';
  if (track._origCover === undefined) track._origCover = track.cover || null;
  
  track.name = document.getElementById('editTrackName').value.trim() || track.name;
  track.artist = document.getElementById('editTrackArtist').value.trim();
  track.speed = parseFloat(document.getElementById('editSpeedSlider').value);
  track.eq = EQ_BANDS.map((_, i) => parseInt(document.getElementById(`eqRange${i}`)?.value || 0));
  
  if (track._pendingCover !== undefined) {
    track.cover = track._pendingCover;
    delete track._pendingCover;
  }
  
  // Применяем скорость если это текущий трек
  if (currentIndex === trackIndex) {
    audio.playbackRate = track.speed || 1;
    trackNameEl.textContent = track.name;
    trackArtistEl.textContent = track.artist || getFileTypeText(track.ext);
    updateNowPlayingCard();
  }
  
  closeModalById('editTrackModal');
  renderAll();
  saveData();
  showToast('Изменения сохранены');
}

// ===== НАСТРОЙКА АНИМАЦИЙ =====
function applyAnimationSetting() {
  const animToggle = document.getElementById('animationsToggle');
  const enabled = animToggle ? animToggle.classList.contains('on') : true;
  document.body.classList.toggle('no-animations', !enabled);
}

// ===== ГРАФ АКТИВНОСТИ (Canvas) =====
let graphNodes = [];
let graphEdges = [];
let graphTransform = { x: 0, y: 0, scale: 1 };
let graphDragging = null;
let graphPanning = false;
let graphPanStart = null;
let graphAnimFrame = null;
let graphHover = null;
let graphEventsSetup = false;

function initGraph() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  
  // Build nodes
  graphNodes = [];
  graphEdges = [];
  graphTransform = { x: 0, y: 0, scale: 1 };
  
  // Wait for canvas to have real dimensions
  requestAnimationFrame(() => {
    const w = canvas.offsetWidth || 600;
    const h = canvas.offsetHeight || 400;
    canvas.width = w;
    canvas.height = h;
    _buildGraphData(canvas, w, h);
    if (!graphEventsSetup) {
      setupGraphEvents(canvas);
      graphEventsSetup = true;
    }
    if (graphAnimFrame) cancelAnimationFrame(graphAnimFrame);
    runGraphLoop(canvas);
  });
}

function _buildGraphData(canvas, w, h) {
  
  // Center "You" node
  const youNode = { id: 'you', label: 'Вы', type: 'you', x: w / 2, y: h / 2, vx: 0, vy: 0, r: 28 };
  graphNodes.push(youNode);
  
  // Category nodes
  const cats = [{ id: 'all-songs', name: 'Все треки' }, ...customCategories];
  cats.forEach((cat, i) => {
    const angle = (i / cats.length) * Math.PI * 2;
    const dist = Math.min(w, h) * 0.28;
    graphNodes.push({
      id: cat.id, label: cat.name, type: 'category',
      x: w / 2 + Math.cos(angle) * dist,
      y: h / 2 + Math.sin(angle) * dist,
      vx: 0, vy: 0, r: 18
    });
    graphEdges.push({ from: 'you', to: cat.id });
  });
  
  // Track nodes (max 30)
  const displayTracks = tracks.slice(0, 30);
  displayTracks.forEach((track, i) => {
    const angle = (i / displayTracks.length) * Math.PI * 2;
    const dist = Math.min(w, h) * 0.45;
    graphNodes.push({
      id: track.path, label: track.name, type: 'track',
      x: w / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
      y: h / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0, r: 10, track
    });
    // Connect to categories
    (track.categories || ['all-songs']).forEach(catId => {
      if (graphNodes.find(n => n.id === catId)) {
        graphEdges.push({ from: catId, to: track.path });
      }
    });
  });
  
  // Same-artist edges
  for (let i = 0; i < displayTracks.length; i++) {
    for (let j = i + 1; j < displayTracks.length; j++) {
      if (displayTracks[i].artist && displayTracks[i].artist === displayTracks[j].artist) {
        graphEdges.push({ from: displayTracks[i].path, to: displayTracks[j].path, type: 'artist' });
      }
    }
  }
}

function setupGraphEvents(canvas) {
  canvas.onmousedown = (e) => {
    e.stopPropagation();
    const pos = canvasPos(canvas, e);
    const node = hitNode(pos);
    if (node) {
      graphDragging = node;
      node.vx = 0; node.vy = 0;
    } else {
      graphPanning = true;
      graphPanStart = { x: e.clientX - graphTransform.x, y: e.clientY - graphTransform.y };
    }
  };
  canvas.onmousemove = (e) => {
    const pos = canvasPos(canvas, e);
    if (graphDragging) {
      graphDragging.x = (e.clientX - graphTransform.x) / graphTransform.scale;
      graphDragging.y = (e.clientY - graphTransform.y) / graphTransform.scale;
    } else if (graphPanning) {
      graphTransform.x = e.clientX - graphPanStart.x;
      graphTransform.y = e.clientY - graphPanStart.y;
    } else {
      graphHover = hitNode(pos);
      canvas.style.cursor = graphHover ? 'pointer' : 'default';
    }
  };
  canvas.onmouseup = () => { graphDragging = null; graphPanning = false; };
  canvas.onmouseleave = () => { graphDragging = null; graphPanning = false; graphHover = null; };
  canvas.onwheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    graphTransform.scale = Math.max(0.3, Math.min(3, graphTransform.scale * factor));
  };
}

function canvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - graphTransform.x) / graphTransform.scale,
    y: (e.clientY - rect.top - graphTransform.y) / graphTransform.scale
  };
}

function hitNode(pos) {
  for (let i = graphNodes.length - 1; i >= 0; i--) {
    const n = graphNodes[i];
    const dx = pos.x - n.x, dy = pos.y - n.y;
    if (Math.sqrt(dx * dx + dy * dy) < n.r + 4) return n;
  }
  return null;
}

function runGraphLoop(canvas) {
  const ctx = canvas.getContext('2d');
  
  function loop() {
    // Resize canvas
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    
    // Physics
    if (!graphDragging) {
      graphNodes.forEach(n => {
        if (n === graphDragging) return;
        // Spring to center
        const cx = w / 2, cy = h / 2;
        n.vx += (cx - n.x) * 0.0005;
        n.vy += (cy - n.y) * 0.0005;
        // Repulsion
        graphNodes.forEach(m => {
          if (m === n) return;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        });
        // Spring along edges
        graphEdges.forEach(edge => {
          const other = edge.from === n.id ? graphNodes.find(x => x.id === edge.to)
                      : edge.to === n.id ? graphNodes.find(x => x.id === edge.from) : null;
          if (!other) return;
          const dx = other.x - n.x, dy = other.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = edge.type === 'artist' ? 80 : 120;
          const force = (dist - targetDist) * 0.01;
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        });
        // Damping
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        // Wall bounce
        const margin = n.r + 8;
        if (n.x < margin) { n.x = margin; n.vx = Math.abs(n.vx); }
        if (n.x > w - margin) { n.x = w - margin; n.vx = -Math.abs(n.vx); }
        if (n.y < margin) { n.y = margin; n.vy = Math.abs(n.vy); }
        if (n.y > h - margin) { n.y = h - margin; n.vy = -Math.abs(n.vy); }
      });
    }
    
    // Draw
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(graphTransform.x, graphTransform.y);
    ctx.scale(graphTransform.scale, graphTransform.scale);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    const ox = (-graphTransform.x / graphTransform.scale) % gridSize;
    const oy = (-graphTransform.y / graphTransform.scale) % gridSize;
    for (let x = ox; x < w / graphTransform.scale; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h / graphTransform.scale); ctx.stroke();
    }
    for (let y = oy; y < h / graphTransform.scale; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w / graphTransform.scale, y); ctx.stroke();
    }
    
    const hoverId = graphHover?.id;
    const connectedIds = hoverId ? new Set(
      graphEdges.filter(e => e.from === hoverId || e.to === hoverId).flatMap(e => [e.from, e.to])
    ) : null;
    
    // Edges
    graphEdges.forEach(edge => {
      const from = graphNodes.find(n => n.id === edge.from);
      const to = graphNodes.find(n => n.id === edge.to);
      if (!from || !to) return;
      const isHighlighted = connectedIds && (connectedIds.has(edge.from) && connectedIds.has(edge.to));
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = isHighlighted ? 'rgba(255,255,255,0.5)' : hoverId ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = edge.type === 'artist' ? 1 : 1.5;
      ctx.setLineDash(edge.type === 'artist' ? [4, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    
    // Nodes
    graphNodes.forEach(node => {
      const isDimmed = hoverId && !connectedIds?.has(node.id) && node.id !== hoverId;
      const alpha = isDimmed ? 0.3 : 1;
      ctx.globalAlpha = alpha;
      
      if (node.type === 'you') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.max(9, node.r * 0.55)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);
      } else if (node.type === 'category') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `500 ${Math.max(8, node.r * 0.6)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label, node.x, node.y);
      } else {
        const isActive = node.track && tracks[currentIndex]?.path === node.track.path;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.08)';
        ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        if (node.r > 8) {
          ctx.fillStyle = isActive ? '#000' : '#aaa';
          ctx.font = `${Math.max(7, node.r * 0.7)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const lbl = node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label;
          ctx.fillText(lbl, node.x, node.y + node.r + 10);
        }
      }
      ctx.globalAlpha = 1;
    });
    
    ctx.restore();
    graphAnimFrame = requestAnimationFrame(loop);
  }
  loop();
}

// Запуск
init();