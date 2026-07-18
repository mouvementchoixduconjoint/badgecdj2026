/**
 * BadgeEvent Djotto Xwé - Application Logic
 * Manages photo upload, badge preview, canvas rendering, and download
 */

/* =============================================
   DOM ELEMENTS
   ============================================= */
const badgeArea = document.getElementById('badge-area');
const userPhoto = document.getElementById('user-photo');
const photoInput = document.getElementById('photo-input');
const zoomRange = document.getElementById('zoom-range');
const downloadBtn = document.getElementById('downloadBtn');
const frameImg = document.getElementById('frame-img');
const badgeHint = document.querySelector('.badge-hint');

/* =============================================
   STATE VARIABLES
   ============================================= */
let offsetX = 0;
let offsetY = 0;
let scale = 1;
let photoGesture = null;
const photoPointers = new Map();

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
  userPhoto.style.height = 'auto';
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

  try {
    if (navigator.msSaveOrOpenBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          navigator.msSaveOrOpenBlob(blob, 'MonBadgeCDJ2026MCC.jpg');
        }
      }, 'image/jpeg', 0.95);
      return;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'MonBadgeCDJ2026MCC.jpg';
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
  try {
    const [file] = event.target.files || [];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    userPhoto.src = objectUrl;
    userPhoto.classList.remove('hidden');
    userPhoto.style.display = 'block'; // Force display
    
    const zoomWrapper = document.getElementById('zoom-wrapper');
    if (zoomWrapper) zoomWrapper.classList.remove('hidden');

    await loadImage(userPhoto);
    resetPhotoPosition();

    if (downloadBtn) {
      downloadBtn.disabled = false;
    }
  } catch (err) {
    console.error('Erreur photo:', err);
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
   EVENT LISTENERS - Badge Area (Photo Gestures)
   ============================================= */

badgeArea.addEventListener('pointerdown', (event) => {
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
});

badgeArea.addEventListener('pointercancel', (event) => {
  photoPointers.delete(event.pointerId);
  if (photoPointers.size === 0) {
    photoGesture = null;
  }
});

/* =============================================
   EVENT LISTENERS - Download
   ============================================= */

downloadBtn.addEventListener('click', () => {
  downloadBadge();
});
