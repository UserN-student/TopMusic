// ==========================================
// 🎵 TopMusic - Renderer Process Logic (FIXED)
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
const syncModal = document.getElementById('syncModal');
const deleteModal = document.getElementById('deleteModal');
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
const copyTrackNameBtn = document.getElementById('copyTrackNameBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteTrackNameEl = document.getElementById('deleteTrackName');

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
let selectedTracks = new Set(); // Выделенные треки (пути)
let contextTrackIndex = null;   // Индекс трека для контекстного меню
let isSelectionMode = false;    // Режим выделения активен

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
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
    createBtn.disabled = true;
  }
}

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
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
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
  setupEventListeners();
  await checkMissingFiles();
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
  
  // Кнопка настроек - показывать только в категориях
  if (settingsTopBtn) {
    settingsTopBtn.onclick = () => {
      const settingsNav = document.querySelector('[data-page="settings"]');
      if (settingsNav) window.switchPage(settingsNav);
    };
  }
  
  // Плеер
  playBtn.onclick = togglePlay;
  prevBtn.onclick = handlePrev;
  nextBtn.onclick = handleNext;
  progressContainer.onclick = handleProgressClick;
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
  
  // Закрытие выпадающих меню при клике вне
  document.addEventListener('click', (e) => {
    // Закрыть сортировку
    if (!e.target.closest('.sort-container')) {
      sortDropdown.classList.remove('open');
    }
    // Закрыть контекстное меню трека
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
  
  // Фикс мерцания при ресайзе
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
  // ===== Закрытие модалок по кнопкам =====
  document.querySelectorAll('.modal-close, .modal-btn-cancel, .delete-modal-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.modal;
      if (modalId) closeModalById(modalId);
      else closeModal();
    });
  });
  
  // ===== Закрытие по клику на оверлей =====
  [detailsModal, playlistModal, syncModal, deleteModal, missingFileModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModalById(modal.id);
    });
  });
  
  // ===== Обработка пунктов контекстного меню =====
  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleContextMenuAction(action);
      trackContextMenu.classList.remove('open');
    });
  });
  
  // ===== Выбор плейлистов в модалке =====
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
  
  // ===== Добавление в плейлист =====
  if (addToPlaylistBtn) {
    addToPlaylistBtn.addEventListener('click', () => {
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
  }
  
  // ===== Синхронизация папки =====
  if (syncFolderBtn) {
    syncFolderBtn.addEventListener('click', async () => {
      const folder = await window.electronAPI?.openFolder();
      if (folder) await syncFolder(folder);
    });
  }
  
  // ===== Копирование пути отсутствующего файла =====
  if (copyMissingPathBtn) {
    copyMissingPathBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(missingFilePathEl.textContent).then(() => {
        copyMissingPathBtn.innerHTML = '✓ Скопировано!';
        setTimeout(() => {
          copyMissingPathBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Копировать путь';
        }, 2000);
      });
    });
  }
  
  // ===== Удаление трека при подтверждении (модальное окно) =====
  if (okMissingFileBtn) {
    okMissingFileBtn.addEventListener('click', () => {
      removeTrackByPath(missingFilePathEl.textContent);
      closeModalById('missingFileModal');
    });
  }
  
  // ===== Подтверждение удаления выделенных треков =====
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      deleteSelectedTracks();
      closeModalById('deleteModal');
    });
  }
  
  // ===== Кнопка удаления выделенных треков (в плейлисте) =====
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      if (selectedTracks.size > 0) {
        openModalById('deleteModal');
      }
    });
  }
  
  // ===== Копирование названия трека (ДЕЛЕГИРОВАНИЕ) =====
  // Кнопка #copyTrackNameBtn создаётся динамически в showTrackDetails(),
  // поэтому вешаем обработчик на detailsModal и ловим клики по ней
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('#copyTrackNameBtn');
      if (copyBtn && contextTrackIndex !== null && tracks[contextTrackIndex]) {
        e.stopPropagation();
        const name = tracks[contextTrackIndex].name;
        navigator.clipboard.writeText(name).then(() => {
          const originalIcon = copyBtn.innerHTML;
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>';
          setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 1500);
        });
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
  
  files.forEach(file => {
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

// ===== РЕНДЕРИНГ ПЛЕЙЛИСТА =====
function renderPlaylist() {
  if (!playlistGrid) return;
  
  // Получаем треки для текущей категории
  let displayTracks = currentCategory === 'all-songs' 
    ? [...tracks] 
    : tracks.filter(t => t.categories?.includes(currentCategory));

  if (!displayTracks.length) {
    playlistGrid.innerHTML = `<div class="playlist-empty"><i class="fa-regular fa-circle-play"></i>Нет треков</div>`;
    updatePlaylistInfo(displayTracks);
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
  
  displayTracks.forEach((track) => {
    const realIndex = tracks.findIndex(t => t.path === track.path);
    if (realIndex === -1) return;

    const card = document.createElement('div');
    card.className = 'track-card' + (realIndex === currentIndex ? ' active-track' : '');
    if (selectedTracks.has(track.path)) {
      card.classList.add('selected');
    }
    card.dataset.index = realIndex;
    card.dataset.path = track.path;

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

    // Обработчик клика по карточке
    card.addEventListener('click', (e) => {
      if (e.target.closest('.track-menu-btn')) return;
      
      if (selectedTracks.size > 0) {
        e.stopPropagation();
        toggleTrackSelection(track.path);
      } else {
        currentIndex = realIndex;
        loadTrack(realIndex);
        play();
      }
    });

    // Контекстное меню: клик по кнопке
    const menuBtn = card.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      contextTrackIndex = realIndex;
      showContextMenu(e, menuBtn);
    });

    // Контекстное меню: ПКМ по карточке
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextTrackIndex = realIndex;
      showContextMenu(e, card);
    });

    fragment.appendChild(card);
  });
  
  playlistGrid.appendChild(fragment);
}

// Обновление информации о плейлисте
function updatePlaylistInfo(displayTracks) {
  if (!playlistCount) return;
  playlistCount.textContent = `${displayTracks.length} треков`;
}

// Обновление панели выделения
function updateSelectionBar(displayTracks) {
  let selectionBar = document.getElementById('selectionBar');
  
  if (selectedTracks.size > 0) {
    if (!selectionBar) {
      selectionBar = document.createElement('div');
      selectionBar.id = 'selectionBar';
      selectionBar.className = 'selection-bar';
      selectionBar.innerHTML = `
        <span id="selectionCount">Выделено: ${selectedTracks.size}</span>
        <button id="deleteSelectedBtn" class="delete-selected-btn">Удалить</button>
        <button id="cancelSelectionBtn" class="cancel-selection-btn">Отмена</button>
      `;
      if (playlistCount?.parentElement) {
        playlistCount.parentElement.insertBefore(selectionBar, playlistCount);
      }
    } else {
      const countEl = selectionBar.querySelector('#selectionCount');
      if (countEl) countEl.textContent = `Выделено: ${selectedTracks.size}`;
      selectionBar.style.display = 'flex';
    }
    
    const deleteBtn = selectionBar.querySelector('#deleteSelectedBtn');
    const cancelBtn = selectionBar.querySelector('#cancelSelectionBtn');
    
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (selectedTracks.size > 0) openModalById('deleteModal');
      };
    }
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        selectedTracks.clear();
        renderPlaylist();
      };
    }
  } else {
    if (selectionBar) selectionBar.style.display = 'none';
  }
}


// Переключение выделения трека
function toggleTrackSelection(trackPath) {
  if (selectedTracks.has(trackPath)) {
    selectedTracks.delete(trackPath);
  } else {
    selectedTracks.add(trackPath);
  }
  renderPlaylist();
}

// Удаление выделенных треков
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
}

// Позиционирование контекстного меню
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

// ===== РЕНДЕРИНГ "НЕДАВНО ПРОСЛУШАННЫЕ" =====
function renderRecent() {
  if (!recentCards) return;
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
    card.onclick = () => {
      if (idx !== -1) {
        currentIndex = idx;
        loadTrack(idx);
        play();
      }
    };
    // ПКМ для контекстного меню
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextTrackIndex = idx;
      showContextMenu(e, card);
    });
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

// ===== ЗАГРУЗКА ДЛИТЕЛЬНОСТИ ТРЕКОВ =====
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
      renderPlaylist();
    };
    a.onerror = () => {
      console.warn('Не удалось прочитать метаданные:', track.path);
      tracks[i].duration = null;
    };
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
  trackArtistEl.textContent = getFileTypeText(track.ext);
  totalTimeEl.textContent = track.duration ? formatTime(track.duration) : '--:--';
  
  const heart = likeBtn.querySelector('i');
  heart.className = track.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  heart.style.color = track.liked ? '#fff' : '';
  
  updateRecentlyPlaying();
  renderPlaylist();
}

// ===== ПЛЕЕР =====
function play() {
  if (currentIndex === -1) return;
  audio.play().catch(err => console.warn('Ошибка воспроизведения:', err));
  isPlaying = true;
  playIcon.className = 'fa-solid fa-pause';
  startProgress();
  updateRecentlyPlaying();
  renderPlaylist();
}

function pause() {
  audio.pause();
  isPlaying = false;
  playIcon.className = 'fa-solid fa-play';
  stopProgress();
  updateRecentlyPlaying();
  renderPlaylist();
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
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration;
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
  document.getElementById('pageTitle').textContent = pageName;
  currentPage = el.dataset.page;
  
  if (currentPage === 'custom') {
    currentCategory = el.dataset.catId;
  } else if (currentPage === 'all-songs') {
    currentCategory = 'all-songs';
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
  
  // Показывать кнопку настроек только в категориях
  if (settingsTopBtn) {
    if (currentPage === 'all-songs' || currentPage === 'custom') {
      settingsTopBtn.classList.remove('hidden');
    } else {
      settingsTopBtn.classList.add('hidden');
    }
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
      break;
    case 'all-songs':
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
    syncListContent.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Нет синхронизаций</div>';
    return;
  }
  syncListContent.innerHTML = syncConfigs.map((cfg, i) => {
    const count = tracks.filter(t => t.synced === cfg.id).length;
    return `<div class="sync-item"><span class="sync-item-name">#${i+1}</span><span class="sync-item-path" title="${escapeHtml(cfg.path)}">${escapeHtml(cfg.path)}</span><span class="sync-item-count">${count} треков</span></div>`;
  }).join('');
}

function renderSyncCategories() {
  if (!syncCategoriesContent) return;
  const cats = [{ id: 'all-songs', name: 'Все треки', def: true, chk: true }];
  customCategories.forEach(c => cats.push({
    id: c.id,
    name: c.name,
    def: false,
    chk: syncConfigs[0]?.categories?.includes(c.id) ?? false
  }));
  syncCategoriesContent.innerHTML = cats.map(c =>
    `<label class="category-toggle${c.def ? ' default' : ''}">
      <input type="checkbox" ${c.def ? 'checked disabled' : c.chk ? 'checked' : ''} data-category-id="${c.id}" ${!c.def ? 'onchange="toggleSyncCategory(this)"' : ''}>
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

// ===== КОНТЕКСТНОЕ МЕНЮ: ДЕЙСТВИЯ =====
function handleContextMenuAction(action) {
  if (contextTrackIndex === null || contextTrackIndex >= tracks.length) return;
  const track = tracks[contextTrackIndex];
  
  switch(action) {
    case 'details':
      showTrackDetails(track);
      openModalById('detailsModal');
      break;
    case 'playlist':
      showPlaylistSelection();
      openModalById('playlistModal');
      break;
    case 'select':
      toggleTrackSelection(track.path);
      break;
    case 'delete':
      deleteTrackNameEl.textContent = track.name;
      openModalById('deleteModal');
      break;
    case 'open-explorer':
      window.electronAPI?.openFolderWithFile?.(track.path);
      break;
  }
}
function toggleTrackSelection(trackPath) {
  if (selectedTracks.has(trackPath)) {
    selectedTracks.delete(trackPath);
  } else {
    selectedTracks.add(trackPath);
  }
  renderPlaylist();
}
// ===== ДЕТАЛИ ТРЕКА =====
function showTrackDetails(track) {
  if (!trackDetailsContent) return;
  
  trackDetailsContent.innerHTML = `
    <div class="track-details-block">
      <div class="track-details-row name-row">
        <span class="track-details-label">Название</span>
        <span class="track-details-value" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</span>
        <button class="copy-name-btn" id="copyTrackNameBtn" title="Копировать название">
          <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
      </div>
      <div class="track-details-row"><span class="track-details-label">Формат</span><span class="track-details-value">${getFileTypeText(track.ext)}</span></div>
      <div class="track-details-row"><span class="track-details-label">Длительность</span><span class="track-details-value">${track.duration ? formatTime(track.duration) : 'Неизвестно'}</span></div>
      <div class="track-details-row"><span class="track-details-label">Добавлен</span><span class="track-details-value">${new Date(track.dateAdded).toLocaleDateString('ru-RU')}</span></div>
    </div>
    <div class="track-details-block">
      <div class="track-details-row" style="flex-direction:column;align-items:stretch;gap:6px;">
        <span class="track-details-label">Путь к файлу</span>
        <span class="track-details-value mono">${escapeHtml(track.path)}</span>
      </div>
    </div>
    <div class="track-details-row"><span class="track-details-label">В избранном</span><span class="track-details-value">${track.liked ? 'Да' : 'Нет'}</span></div>
  `;
}

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

// Запуск
init();