const folderInput = document.querySelector("#folderInput");
const styleToggleButton = document.querySelector("#styleToggleButton");
const sortSelect = document.querySelector("#sortSelect");
const thumbs = document.querySelector("#thumbs");
const statusText = document.querySelector("#statusText");
const emptyState = document.querySelector("#emptyState");
const albumCover = document.querySelector("#albumCover");
const openAlbumButton = document.querySelector("#openAlbumButton");
const albumTitle = document.querySelector("#albumTitle");
const albumSummary = document.querySelector("#albumSummary");
const coverCollage = document.querySelector("#coverCollage");
const photoStage = document.querySelector("#photoStage");
const journalPage = document.querySelector("#journalPage");
const journalTitle = document.querySelector("#journalTitle");
const journalFileName = document.querySelector("#journalFileName");
const pageDate = document.querySelector("#pageDate");
const mainPhoto = document.querySelector("#mainPhoto");
const photoName = document.querySelector("#photoName");
const photoCount = document.querySelector("#photoCount");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const fitButton = document.querySelector("#fitButton");
const actualButton = document.querySelector("#actualButton");
const zoomButton = document.querySelector("#zoomButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const playButton = document.querySelector("#playButton");
const speedSelect = document.querySelector("#speedSelect");
const lightbox = document.querySelector("#lightbox");
const lightboxPhoto = document.querySelector("#lightboxPhoto");
const lightboxCaption = document.querySelector("#lightboxCaption");
const photoTime = document.querySelector("#photoTime");
const closeLightboxButton = document.querySelector("#closeLightboxButton");
const lightboxPrevButton = document.querySelector("#lightboxPrevButton");
const lightboxNextButton = document.querySelector("#lightboxNextButton");

const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/avif"]);

let photos = [];
let filteredPhotos = [];
let activeIndex = 0;
let objectUrl = "";
let currentFolderName = "旅途相本";
let isJournalMode = false;
let autoplayTimer = 0;
const metadataCache = new Map();

function fileLabel(file) {
  return file.webkitRelativePath || file.name;
}

function sortPhotos(items) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sortSelect.value === "date-desc") return b.lastModified - a.lastModified;
    if (sortSelect.value === "date-asc") return a.lastModified - b.lastModified;

    const direction = sortSelect.value === "name-desc" ? -1 : 1;
    return fileLabel(a).localeCompare(fileLabel(b), "zh-Hant", {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });

  return sorted;
}

function refreshList() {
  filteredPhotos = sortPhotos(photos);

  thumbs.replaceChildren();
  let lastChapter = "";
  filteredPhotos.forEach((file, index) => {
    const chapter = formatFileDate(file.lastModified) || "未標日期";
    if (chapter !== lastChapter) {
      const heading = document.createElement("div");
      heading.className = "thumb-chapter";
      heading.textContent = chapter;
      thumbs.append(heading);
      lastChapter = chapter;
    }

    const button = document.createElement("button");
    const img = document.createElement("img");
    const caption = document.createElement("span");
    const url = URL.createObjectURL(file);

    button.className = "thumb";
    button.type = "button";
    button.title = fileLabel(file);
    button.dataset.index = String(index);
    button.addEventListener("click", () => showPhoto(index));

    img.src = url;
    img.alt = file.name;
    img.loading = "lazy";
    img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });

    caption.textContent = file.name;
    button.append(img, caption);
    thumbs.append(button);
  });

  if (filteredPhotos.length === 0) {
    showEmpty(photos.length ? "沒有符合搜尋的照片" : "這個資料夾裡沒有可檢視的照片");
    return;
  }

  if (isJournalMode) {
    updateAlbumCover();
    showAlbumCover();
  } else {
    showPhoto(Math.min(activeIndex, filteredPhotos.length - 1));
  }
}

function showEmpty(message) {
  statusText.textContent = message;
  emptyState.classList.remove("is-hidden");
  albumCover.classList.add("is-hidden");
  photoStage.classList.add("is-hidden");
}

function showAlbumCover() {
  stopAutoplay();
  statusText.textContent = `${filteredPhotos.length} 張照片，右側按封面開始翻閱`;
  emptyState.classList.add("is-hidden");
  albumCover.classList.remove("is-hidden");
  photoStage.classList.add("is-hidden");
}

function updateAlbumCover() {
  const dates = filteredPhotos
    .map((file) => formatFileDate(file.lastModified))
    .filter(Boolean);
  const dateRange = getDateRangeText(dates);

  albumTitle.textContent = currentFolderName;
  albumSummary.textContent = dateRange
    ? `${filteredPhotos.length} 張照片｜${dateRange}`
    : `${filteredPhotos.length} 張照片`;

  coverCollage.replaceChildren();
  filteredPhotos.slice(0, 4).forEach((file) => {
    const image = document.createElement("img");
    const url = URL.createObjectURL(file);

    image.src = url;
    image.alt = "";
    image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    coverCollage.append(image);
  });
}

function showPhoto(index) {
  if (!filteredPhotos.length) return;

  activeIndex = (index + filteredPhotos.length) % filteredPhotos.length;
  const file = filteredPhotos[activeIndex];

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  mainPhoto.src = objectUrl;
  mainPhoto.alt = file.name;
  mainPhoto.classList.remove("actual-size");
  journalPage.classList.remove("turning");
  if (isJournalMode) requestAnimationFrame(() => journalPage.classList.add("turning"));
  journalTitle.textContent = currentFolderName;
  journalFileName.textContent = file.name;
  pageDate.textContent = formatFileDate(file.lastModified) || "未標日期";

  photoName.textContent = fileLabel(file);
  photoCount.textContent = `${activeIndex + 1} / ${filteredPhotos.length}`;
  statusText.textContent = `${photos.length} 張照片`;

  emptyState.classList.add("is-hidden");
  albumCover.classList.add("is-hidden");
  photoStage.classList.remove("is-hidden");

  [...thumbs.querySelectorAll(".thumb")].forEach((child) => {
    child.classList.toggle("is-active", Number(child.dataset.index) === activeIndex);
  });

  const activeThumb = thumbs.querySelector(`.thumb[data-index="${activeIndex}"]`);
  activeThumb?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
}

function setJournalMode(enabled) {
  isJournalMode = enabled;
  document.body.classList.toggle("journal-mode", isJournalMode);
  styleToggleButton.setAttribute("aria-pressed", String(isJournalMode));
  styleToggleButton.classList.toggle("is-active", isJournalMode);
  styleToggleButton.textContent = isJournalMode ? "關閉旅行手札" : "旅行手札模式";

  if (!filteredPhotos.length) return;

  stopAutoplay();
  if (isJournalMode) {
    updateAlbumCover();
    showAlbumCover();
  } else {
    showPhoto(activeIndex);
  }
}

function startAutoplay() {
  if (!isJournalMode || !filteredPhotos.length) return;

  stopAutoplay(false);
  playButton.textContent = "暫停";
  autoplayTimer = window.setInterval(() => {
    showPhoto(activeIndex + 1);
  }, Number(speedSelect.value));
}

function stopAutoplay(updateLabel = true) {
  if (autoplayTimer) {
    window.clearInterval(autoplayTimer);
    autoplayTimer = 0;
  }

  if (updateLabel) playButton.textContent = "播放";
}

function toggleAutoplay() {
  if (autoplayTimer) {
    stopAutoplay();
  } else {
    if (albumCover.classList.contains("is-hidden")) startAutoplay();
    else {
      showPhoto(0);
      startAutoplay();
    }
  }
}

function openLightbox() {
  if (!filteredPhotos.length) return;

  const file = filteredPhotos[activeIndex];
  lightboxPhoto.src = objectUrl;
  lightboxPhoto.alt = file.name;
  lightboxCaption.textContent = `${activeIndex + 1} / ${filteredPhotos.length}  ${fileLabel(file)}`;
  photoTime.textContent = "讀取中";
  lightbox.classList.remove("is-hidden");
  updatePhotoInfo(file);
}

function closeLightbox() {
  lightbox.classList.add("is-hidden");
}

async function updatePhotoInfo(file) {
  const selectedFile = file;
  const metadata = await getPhotoMetadata(file);

  if (filteredPhotos[activeIndex] !== selectedFile) return;

  photoTime.textContent = metadata.takenAt || formatFileDate(file.lastModified) || "沒有時間資料";
}

function getFileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function getDateRangeText(dates) {
  if (!dates.length) return "";

  const sortedDates = [...new Set(dates)].sort();
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];

  return first === last ? first : `${first} - ${last}`;
}

async function getPhotoMetadata(file) {
  const cacheKey = getFileKey(file);
  if (metadataCache.has(cacheKey)) return metadataCache.get(cacheKey);

  const metadata = await readExifMetadata(file).catch(() => ({}));
  metadataCache.set(cacheKey, metadata);
  return metadata;
}

async function readExifMetadata(file) {
  if (!file.type.includes("jpeg") && !file.name.match(/\.jpe?g$/i)) return {};

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (view.getUint16(0) !== 0xffd8) return {};

  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;

    if (marker === 0xffe1) {
      const size = view.getUint16(offset);
      const exifStart = offset + 2;
      const signature = readAscii(view, exifStart, 6);

      if (signature === "Exif\0\0") {
        return parseTiff(view, exifStart + 6);
      }

      offset += size;
      continue;
    }

    if ((marker & 0xff00) !== 0xff00) break;
    offset += view.getUint16(offset);
  }

  return {};
}

function parseTiff(view, tiffStart) {
  const littleEndian = readAscii(view, tiffStart, 2) === "II";
  const firstIfdOffset = readUint32(view, tiffStart + 4, littleEndian);
  const primary = readIfd(view, tiffStart, tiffStart + firstIfdOffset, littleEndian);
  const exif = primary[0x8769] ? readIfd(view, tiffStart, tiffStart + primary[0x8769], littleEndian) : {};

  return {
    takenAt: formatExifDate(exif[0x9003] || exif[0x9004] || primary[0x0132]),
  };
}

function readIfd(view, tiffStart, ifdOffset, littleEndian) {
  const entryCount = readUint16(view, ifdOffset, littleEndian);
  const result = {};

  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdOffset + 2 + index * 12;
    const tag = readUint16(view, entry, littleEndian);
    const type = readUint16(view, entry + 2, littleEndian);
    const count = readUint32(view, entry + 4, littleEndian);
    const valueOffset = entry + 8;
    result[tag] = readExifValue(view, tiffStart, valueOffset, type, count, littleEndian);
  }

  return result;
}

function readExifValue(view, tiffStart, valueOffset, type, count, littleEndian) {
  const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
  const totalSize = (typeSizes[type] || 1) * count;
  const offset = totalSize <= 4 ? valueOffset : tiffStart + readUint32(view, valueOffset, littleEndian);

  if (type === 2) return readAscii(view, offset, count).replace(/\0+$/, "");
  if (type === 3) return count === 1 ? readUint16(view, offset, littleEndian) : readArray(count, (i) => readUint16(view, offset + i * 2, littleEndian));
  if (type === 4) return count === 1 ? readUint32(view, offset, littleEndian) : readArray(count, (i) => readUint32(view, offset + i * 4, littleEndian));
  if (type === 5) return readArray(count, (i) => readRational(view, offset + i * 8, littleEndian));

  return undefined;
}

function formatExifDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!match) return String(value);

  const [, year, month, day] = match;
  return `${year}年${month}月${day}日`;
}

function formatFileDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}年${month}月${day}日`;
}

function readAscii(view, offset, length) {
  return String.fromCharCode(...new Uint8Array(view.buffer, offset, length));
}

function readArray(count, reader) {
  return Array.from({ length: count }, (_, index) => reader(index));
}

function readUint16(view, offset, littleEndian) {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view, offset, littleEndian) {
  return view.getUint32(offset, littleEndian);
}

function readRational(view, offset, littleEndian) {
  const numerator = readUint32(view, offset, littleEndian);
  const denominator = readUint32(view, offset + 4, littleEndian);
  return denominator ? numerator / denominator : 0;
}

folderInput.addEventListener("change", () => {
  stopAutoplay();
  photos = [...folderInput.files].filter((file) => imageTypes.has(file.type) || file.name.match(/\.(jpe?g|png|gif|webp|bmp|avif)$/i));
  activeIndex = 0;
  const firstPath = photos[0]?.webkitRelativePath || "";
  currentFolderName = firstPath.split("/")[0] || "旅途相本";
  refreshList();
});

sortSelect.addEventListener("change", () => {
  stopAutoplay();
  activeIndex = 0;
  refreshList();
});

styleToggleButton.addEventListener("click", () => setJournalMode(!isJournalMode));
openAlbumButton.addEventListener("click", () => showPhoto(0));
prevButton.addEventListener("click", () => showPhoto(activeIndex - 1));
nextButton.addEventListener("click", () => showPhoto(activeIndex + 1));
fitButton.addEventListener("click", () => mainPhoto.classList.remove("actual-size"));
actualButton.addEventListener("click", () => mainPhoto.classList.add("actual-size"));
zoomButton.addEventListener("click", openLightbox);
mainPhoto.addEventListener("click", openLightbox);
closeLightboxButton.addEventListener("click", closeLightbox);
lightboxPrevButton.addEventListener("click", () => {
  showPhoto(activeIndex - 1);
  openLightbox();
});
lightboxNextButton.addEventListener("click", () => {
  showPhoto(activeIndex + 1);
  openLightbox();
});
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await photoStage.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

playButton.addEventListener("click", toggleAutoplay);
speedSelect.addEventListener("change", () => {
  if (autoplayTimer) startAutoplay();
});

window.addEventListener("keydown", (event) => {
  const isLightboxOpen = !lightbox.classList.contains("is-hidden");

  if (event.key === "ArrowLeft") {
    showPhoto(activeIndex - 1);
    if (isLightboxOpen) openLightbox();
  }

  if (event.key === "ArrowRight") {
    showPhoto(activeIndex + 1);
    if (isLightboxOpen) openLightbox();
  }

  if (event.key === "Escape" && isLightboxOpen) closeLightbox();
  if (event.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
});

window.addEventListener("beforeunload", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
