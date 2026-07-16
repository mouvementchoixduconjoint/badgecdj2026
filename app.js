/**
 * BadgeEvent Djotto Xwé - Application Logic
 * Manages photo upload, text editing, badge preview, canvas rendering, and download
 */

/* =============================================
   DOM ELEMENTS
   ============================================= */
const badgeArea = document.getElementById('badge-area');
const textLayer = document.getElementById('text-layer');
const userPhoto = document.getElementById('user-photo');
const photoInput = document.getElementById('photo-input');
const zoomRange = document.getElementById('zoom-range');
const downloadBtn = document.getElementById('downloadBtn');
const frameImg = document.getElementById('frame-img');

const nameInput = document.getElementById('name-input');
const numberInput = document.getElementById('number-input');
const fontSizeInput = document.getElementById('font-size-input');
const fontWeightSelect = document.getElementById('font-weight-select');
const fontFamilySelect = document.getElementById('font-family-select');
const textColorInput = document.getElementById('text-color');

const textTabs = Array.from(document.querySelectorAll('.text-tab'));
const badgeHint = document.querySelector('.badge-hint');

/* =============================================
   STATE VARIABLES
   ============================================= */
let offsetX = 0;
let offsetY = 0;
let scale = 1;
let activeTextId = 'name';
let dragState = null;
let photoGesture = null;
const photoPointers = new Map();

const textObjects = {
  name: {
    id: 'name',
    text: 'Nom du participant',
    xPercent: 49.29,
    yPercent: 62.98,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'DM Sans',
    color: '#9e1c15'
  },
  number: {
    id: 'number',
    text: 'Participant N°1',
    xPercent: 49.76,
    yPercent: 17.4,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'DM Sans',
    color: '#ffffff'
  }
};

/* =============================================
   UTILITY FUNCTIONS
   ============================================= */

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate distance between two points
 */
function getDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Get midpoint between two points
 */
function getMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/* =============================================
   PHOTO MANAGEMENT
   ============================================= */

/**
 * Apply transformation to photo (zoom, position)
 */
function applyPhotoTransform() {
  userPhoto.style.width = `${scale * 100}%`;
  userPhoto.style.left = `${offsetX}px`;
  userPhoto.style.top = `${offsetY}px`;
}

/**
 * Reset photo to default state
 */
function resetPhotoPosition() {
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  zoomRange.value = 100;
  applyPhotoTransform();
}

/**
 * Load image and wait for it to be ready
 */
function loadImage(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth) {
      resolve();
      return;
    }
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

/* =============================================
   TEXT MANAGEMENT
   ============================================= */

/**
 * Set default positions for text objects
 */
function setTextDefaults() {
  textObjects.number.x = 209;
  textObjects.number.y = 91.3333;
  textObjects.name.x = 207;
  textObjects.name.y = 330.667;
}

/**
 * Update input fields based on active text
 */
function updateActiveTextInputs() {
  const obj = textObjects[activeTextId];
  if (!obj) return;
  nameInput.value = textObjects.name.text;
  numberInput.value = textObjects.number.text;
  fontSizeInput.value = obj.fontSize;
  fontWeightSelect.value = obj.fontWeight;
  fontFamilySelect.value = obj.fontFamily;
  textColorInput.value = obj.color;
}

/**
 * Select text for editing
 */
function selectText(id) {
  activeTextId = id;
  textTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.textId === id);
  });
  updateActiveTextInputs();
  renderTexts();
}

/**
 * Render all text elements on the badge
 */
function renderTexts() {
  const rect = badgeArea.getBoundingClientRect();
  if (!rect.width) return;

  textLayer.innerHTML = '';

  Object.values(textObjects).forEach((obj) => {
    // Calculer les positions en pixels basées sur les pourcentages
    const x = (obj.xPercent / 100) * rect.width;
    const y = (obj.yPercent / 100) * rect.height;
    
    const element = document.createElement('div');
    element.className = `text-item${obj.id === activeTextId ? ' is-active' : ''}`;
    element.dataset.id = obj.id;
    element.textContent = obj.text;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.fontSize = `${obj.fontSize}px`;
    element.style.fontWeight = obj.fontWeight;
    element.style.fontFamily = obj.fontFamily;
    element.style.color = obj.color;
    element.style.maxWidth = `${Math.min(rect.width * 0.8, 260)}px`;
    element.style.transform = `translate(-50%, -50%)`;
    textLayer.appendChild(element);

    element.addEventListener('click', () => {
      selectText(obj.id);
    });
  });

  const activeObj = textObjects[activeTextId];
  if (!activeObj) return;
}

/* =============================================
   DRAG & DROP INTERACTIONS
   ============================================= */

/**
 * Start moving text element
 */
function startMove(event, id) {
  return;
}

/**
 * Start resizing text element
 */
function startResize(event, id) {
  return;
}

/**
 * Start rotating text element
 */
function startRotate(event, id) {
  return;
}

/**
 * Update drag operation based on mouse movement
 */
function updateDrag(event) {
  if (!dragState) return;
  const rect = badgeArea.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const obj = textObjects[dragState.id];

  if (dragState.mode === 'move') {
    const element = textLayer.querySelector(`[data-id="${obj.id}"]`);
    const width = element ? element.offsetWidth || 80 : 80;
    const height = element ? element.offsetHeight || 24 : 24;
    const padding = 16;
    obj.x = clamp(x, padding + width / 2, rect.width - padding - width / 2);
    obj.y = clamp(y, padding + height / 2, rect.height - padding - height / 2);
  } else if (dragState.mode === 'resize') {
    const delta = (event.clientY - dragState.startY) * 0.12 + (event.clientX - dragState.startX) * 0.08;
    obj.fontSize = clamp(dragState.startFontSize + delta, 8, 90);
    fontSizeInput.value = obj.fontSize;
  }

  renderTexts();
}

/**
 * Finish drag operation
 */
function finishDrag() {
  dragState = null;
}

/* =============================================
   BADGE DOWNLOAD
   ============================================= */

/**
 * Download the badge as PNG image
 */
function downloadBadge() {
  if (!userPhoto.src || userPhoto.classList.contains('hidden') || !userPhoto.complete || !userPhoto.naturalWidth) {
    alert('Veuillez d\'abord charger une photo avant de télécharger le badge.');
    return;
  }

  const canvas = document.createElement('canvas');
  const rect = badgeArea.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Badge background
  ctx.fillStyle = '#f3eee0';
  ctx.fillRect(0, 0, rect.width, rect.height);

  // User photo
  ctx.save();
  ctx.globalAlpha = 0.9;
  const photoWidth = userPhoto.offsetWidth || rect.width * scale;
  const photoHeight = userPhoto.offsetHeight || (photoWidth * userPhoto.naturalHeight) / userPhoto.naturalWidth;
  ctx.drawImage(userPhoto, offsetX, offsetY, photoWidth, photoHeight);
  ctx.restore();

  // Frame overlay
  ctx.drawImage(frameImg, 0, 0, rect.width, rect.height);

  // Text elements
  Object.values(textObjects).forEach((obj) => {
    const rect = badgeArea.getBoundingClientRect();
    const x = (obj.xPercent / 100) * rect.width;
    const y = (obj.yPercent / 100) * rect.height;
    
    ctx.save();
    ctx.fillStyle = obj.color;
    ctx.font = `${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(x, y);
    ctx.fillText(obj.text, 0, 0);
    ctx.restore();
  });

  try {
    if (navigator.msSaveOrOpenBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          navigator.msSaveOrOpenBlob(blob, 'badge-djotto-xwe.jpg');
        }
      }, 'image/jpeg', 0.95);
      return;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'badge-djotto-xwe.jpg';
    link.style.display = 'none';
    document.body.appendChild(link);

    try {
      link.click();
    } catch (clickError) {
      console.warn('link.click() a échoué, utilisation de dispatchEvent', clickError);
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      link.dispatchEvent(event);
    }

    document.body.removeChild(link);
  } catch (error) {
    console.error('Téléchargement impossible :', error);
  }
}

/* =============================================
   EVENT LISTENERS - Photo Upload
   ============================================= */

photoInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  userPhoto.src = objectUrl;
  userPhoto.classList.remove('hidden');
  document.getElementById('zoom-wrapper').classList.remove('hidden');

  await loadImage(userPhoto);
  resetPhotoPosition();

  if (downloadBtn) {
    downloadBtn.disabled = false;
  }
});

/* =============================================
   EVENT LISTENERS - Zoom
   ============================================= */

zoomRange.addEventListener('input', () => {
  scale = Number(zoomRange.value) / 100;
  applyPhotoTransform();
});

/* =============================================
   EVENT LISTENERS - Text Input
   ============================================= */

nameInput.addEventListener('input', () => {
  textObjects.name.text = nameInput.value.trim() || 'Nom du participant';
  renderTexts();
});

numberInput.addEventListener('input', () => {
  textObjects.number.text = numberInput.value.trim() || 'Participant N°1';
  renderTexts();
});

fontSizeInput.addEventListener('input', () => {
  const value = Number(fontSizeInput.value);
  textObjects[activeTextId].fontSize = Number.isFinite(value) ? clamp(value, 8, 90) : 14;
  fontSizeInput.value = textObjects[activeTextId].fontSize;
  renderTexts();
});

fontWeightSelect.addEventListener('change', () => {
  textObjects[activeTextId].fontWeight = fontWeightSelect.value;
  renderTexts();
});

fontFamilySelect.addEventListener('change', () => {
  textObjects[activeTextId].fontFamily = fontFamilySelect.value;
  renderTexts();
});

textColorInput.addEventListener('input', () => {
  textObjects[activeTextId].color = textColorInput.value;
  renderTexts();
});

/* =============================================
   EVENT LISTENERS - Text Tabs
   ============================================= */

textTabs.forEach((tab) => {
  tab.addEventListener('click', () => selectText(tab.dataset.textId));
});

/* =============================================
   EVENT LISTENERS - Badge Area (Photo Gestures)
   ============================================= */

badgeArea.addEventListener('pointerdown', (event) => {
  if (dragState) return;
  if (event.target.closest('.text-item, .selection-handle')) return;
  if (!userPhoto.src || userPhoto.classList.contains('hidden')) return;

  const point = { x: event.clientX, y: event.clientY };
  photoPointers.set(event.pointerId, point);

  if (photoPointers.size === 1) {
    photoGesture = {
      mode: 'drag',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY
    };
  } else if (photoPointers.size === 2) {
    const points = [...photoPointers.values()];
    photoGesture = {
      mode: 'pinch',
      startDistance: getDistance(points[0], points[1]),
      startScale: scale,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
      startCenter: getMidpoint(points[0], points[1])
    };
  }

  badgeArea.setPointerCapture(event.pointerId);
});

badgeArea.addEventListener('pointermove', (event) => {
  if (dragState) {
    updateDrag(event);
    return;
  }

  if (!photoGesture || !photoPointers.has(event.pointerId)) return;
  photoPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (photoGesture.mode === 'drag') {
    offsetX = photoGesture.startOffsetX + (event.clientX - photoGesture.startX);
    offsetY = photoGesture.startOffsetY + (event.clientY - photoGesture.startY);
  } else if (photoGesture.mode === 'pinch' && photoPointers.size === 2) {
    const points = [...photoPointers.values()];
    const currentDistance = getDistance(points[0], points[1]);
    const ratio = currentDistance / photoGesture.startDistance;
    const nextScale = clamp(photoGesture.startScale * ratio, 0.7, 3);
    const newCenter = getMidpoint(points[0], points[1]);
    const deltaX = newCenter.x - photoGesture.startCenter.x;
    const deltaY = newCenter.y - photoGesture.startCenter.y;

    scale = nextScale;
    offsetX = photoGesture.startOffsetX + deltaX;
    offsetY = photoGesture.startOffsetY + deltaY;
  }

  applyPhotoTransform();
});

badgeArea.addEventListener('pointerup', (event) => {
  photoPointers.delete(event.pointerId);

  if (photoPointers.size === 0) {
    photoGesture = null;
  } else if (photoGesture && photoGesture.mode === 'pinch' && photoPointers.size === 1) {
    const [remainingPoint] = photoPointers.entries();
    photoGesture = {
      mode: 'drag',
      pointerId: remainingPoint[0],
      startX: remainingPoint[1].x,
      startY: remainingPoint[1].y,
      startOffsetX: offsetX,
      startOffsetY: offsetY
    };
  }

  if (!photoGesture) {
    finishDrag();
  }
});

badgeArea.addEventListener('pointercancel', (event) => {
  photoPointers.delete(event.pointerId);
  if (photoPointers.size === 0) {
    photoGesture = null;
  }
  finishDrag();
});

/* =============================================
   EVENT LISTENERS - Download & Resize
   ============================================= */

downloadBtn.addEventListener('click', () => {
  downloadBadge();
});

window.addEventListener('resize', () => {
  setTextDefaults();
  renderTexts();
});

/* =============================================
   INITIALIZATION
   ============================================= */

window.addEventListener('load', () => {
  setTextDefaults();
  renderTexts();
  updateActiveTextInputs();
});
