"use strict";

// Globals
let appDatabase = null;
let deferredInstallPrompt = null;
let currentModalStateCode = null;

document.addEventListener("DOMContentLoaded", function onReady() {
  void initializeApp();
});

// Entry
async function initializeApp() {
  await setupServiceWorker();
  setupInstallPrompt();

  appDatabase = await openDatabase();

  renderTabs();
  setupSearch();
  renderStatesGrid(getStates());
  await refreshStatesProgress();
  await renderGallery();

  const addGalleryPhotoBtn = document.getElementById("addGalleryPhotoBtn");
  addGalleryPhotoBtn.addEventListener(
    "click",
    function handleAddGalleryClick() {
      openFilePicker("gallery");
    }
  );
}

// PWA
async function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch (_) {
      // no-op
    }
  }
}

function setupInstallPrompt() {
  const installBtn = document.getElementById("installBtn");
  window.addEventListener(
    "beforeinstallprompt",
    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      installBtn.classList.remove("hidden");
    }
  );
  installBtn.addEventListener("click", async function onInstallClick() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add("hidden");
  });
}

// UI: Tabs
function renderTabs() {
  const tabStates = document.getElementById("tabStates");
  const tabGallery = document.getElementById("tabGallery");
  const statesView = document.getElementById("statesView");
  const galleryView = document.getElementById("galleryView");

  tabStates.addEventListener("click", function onTabStates() {
    tabStates.classList.add("active");
    tabStates.setAttribute("aria-selected", "true");
    tabGallery.classList.remove("active");
    tabGallery.setAttribute("aria-selected", "false");
    statesView.classList.remove("hidden");
    galleryView.classList.add("hidden");
  });

  tabGallery.addEventListener("click", function onTabGallery() {
    tabGallery.classList.add("active");
    tabGallery.setAttribute("aria-selected", "true");
    tabStates.classList.remove("active");
    tabStates.setAttribute("aria-selected", "false");
    galleryView.classList.remove("hidden");
    statesView.classList.add("hidden");
  });
}

// UI: States
function renderStatesGrid(states) {
  const grid = document.getElementById("statesGrid");
  grid.innerHTML = "";

  for (const state of states) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.setAttribute("data-state-code", state.code);
    card.setAttribute("aria-label", "Add photo for " + state.name);

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = state.name;

    const badge = document.createElement("div");
    badge.className = "card-badge";
    badge.textContent = state.code;

    card.appendChild(title);
    card.appendChild(badge);
    grid.appendChild(card);

    // Load existing thumbnail if present
    void updateCardWithPhoto(card, state.code);

    card.addEventListener("click", function onCardClick() {
      currentModalStateCode = state.code;
      void openStateModal(state);
    });
  }
}

async function updateCardWithPhoto(cardElement, stateCode) {
  const record = await getStatePhoto(stateCode);
  const existing = cardElement.querySelector(".thumb-bg");
  if (existing) existing.remove();

  if (record && record.blob) {
    const url = URL.createObjectURL(record.blob);
    const bg = document.createElement("div");
    bg.className = "thumb-bg";
    bg.style.backgroundImage = `url('${url}')`;
    const overlay = document.createElement("div");
    overlay.className = "thumb-overlay";
    cardElement.prepend(overlay);
    cardElement.prepend(bg);
    cardElement.classList.add("has-photo");
  } else {
    cardElement.classList.remove("has-photo");
  }
}

async function refreshStatesProgress() {
  const count = await countStatesWithPhotos();
  const countEl = document.getElementById("statesCount");
  const totalEl = document.getElementById("statesTotal");
  countEl.textContent = String(count);
  totalEl.textContent = "/ 50";
}

// Modal
async function openStateModal(state) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalPreview = document.getElementById("modalPreview");
  const replaceBtn = document.getElementById("modalReplaceBtn");
  const closeBtn = document.getElementById("modalCloseBtn");
  const backdrop = document.getElementById("modalBackdrop");

  modalTitle.textContent = `Add plate photo — ${state.name}`;
  modalPreview.innerHTML = "";
  modalPreview.classList.remove("has-image");

  const existing = await getStatePhoto(state.code);
  if (existing && existing.blob) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(existing.blob);
    img.alt = `${state.name} plate photo`;
    img.className = "thumb";
    modalPreview.appendChild(img);
    modalPreview.classList.add("has-image");
  }

  function onReplace() {
    openFilePicker("state");
  }
  function onClose() {
    closeModal();
  }

  replaceBtn.addEventListener("click", onReplace, { once: true });
  closeBtn.addEventListener("click", onClose, { once: true });
  backdrop.addEventListener("click", onClose, { once: true });

  modal.classList.remove("hidden");
  document.body.classList.add("no-scroll");
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  currentModalStateCode = null;
  document.body.classList.remove("no-scroll");
}

// File picking
function openFilePicker(context) {
  const input = document.getElementById("fileInput");
  input.value = "";

  function onChange(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    void handleSelectedFile(file, context);
    input.removeEventListener("change", onChange);
  }

  input.addEventListener("change", onChange);
  input.click();
}

async function handleSelectedFile(file, context) {
  const normalizedBlob = await convertHeicIfNeeded(file);
  const resizedBlob = await resizeImage(normalizedBlob, 1600);

  if (context === "state" && currentModalStateCode) {
    await setStatePhoto(currentModalStateCode, resizedBlob);

    // Update UI
    const card = document.querySelector(
      `[data-state-code="${currentModalStateCode}"]`
    );
    if (card) await updateCardWithPhoto(card, currentModalStateCode);
    await refreshStatesProgress();
    closeModal();
  }

  if (context === "gallery") {
    await addGalleryPhoto(resizedBlob);
    await renderGallery();
  }
}

// Gallery
async function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";
  const items = await getAllGalleryPhotos();
  for (const item of items) {
    const wrap = document.createElement("div");
    wrap.className = "card thumb-wrap";
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = URL.createObjectURL(item.blob);
    img.alt = "Fun plate";
    const del = document.createElement("button");
    del.className = "thumb-delete";
    del.textContent = "Delete";
    del.addEventListener("click", async function onDelete() {
      await deleteGalleryPhoto(item.id);
      await renderGallery();
    });
    wrap.appendChild(del);
    wrap.appendChild(img);
    grid.appendChild(wrap);
  }
}

// Search
function setupSearch() {
  const input = document.getElementById("stateSearch");
  const allStates = getStates();
  input.addEventListener("input", function onSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderStatesGrid(allStates);
      return;
    }
    const filtered = allStates.filter(function filterState(s) {
      return (
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    });
    renderStatesGrid(filtered);
  });
}

// Data: States
function getStates() {
  return [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
  ];
}

// Image resize
function resizeImage(file, maxDimension) {
  return new Promise(function executor(resolve) {
    const reader = new FileReader();
    reader.onload = function onLoad() {
      const img = new Image();
      img.onload = function onImgLoad() {
        const ratio = Math.min(
          1,
          maxDimension / Math.max(img.width, img.height)
        );
        const targetW = Math.round(img.width * ratio);
        const targetH = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(
          function toBlob(blob) {
            resolve(blob || file);
          },
          "image/jpeg",
          0.85
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// HEIC/HEIF conversion
async function convertHeicIfNeeded(file) {
  const lowerType = (file.type || "").toLowerCase();
  const heicLike =
    lowerType.includes("heic") ||
    lowerType.includes("heif") ||
    /\.hei[cf]$/i.test(file.name || "");
  if (!heicLike) return file;
  try {
    if (typeof window.heic2any === "function") {
      const result = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });
      // heic2any can return a Blob or an array of Blobs
      const blob = Array.isArray(result) ? result[0] : result;
      return new File([blob], (file.name || "photo") + ".jpg", {
        type: "image/jpeg",
      });
    }
  } catch (_) {
    // Fallback to original if conversion fails
  }
  return file;
}

// IndexedDB layer
async function openDatabase() {
  return new Promise(function executor(resolve, reject) {
    const request = indexedDB.open("usa-plates-db", 1);
    request.onupgradeneeded = function onUpgrade(event) {
      const db = request.result;
      if (!db.objectStoreNames.contains("statePhotos")) {
        db.createObjectStore("statePhotos", { keyPath: "stateCode" });
      }
      if (!db.objectStoreNames.contains("galleryPhotos")) {
        db.createObjectStore("galleryPhotos", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onerror = function onError() {
      reject(request.error);
    };
    request.onsuccess = function onSuccess() {
      resolve(request.result);
    };
  });
}

function withStore(storeName, mode, callback) {
  return new Promise(function executor(resolve, reject) {
    const tx = appDatabase.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = function onComplete() {
      resolve(result);
    };
    tx.onerror = function onTxError() {
      reject(tx.error);
    };
    tx.onabort = function onTxAbort() {
      reject(tx.error);
    };
  });
}

function setStatePhoto(stateCode, blob) {
  const record = { stateCode: stateCode, blob: blob, updatedAt: Date.now() };
  return withStore("statePhotos", "readwrite", function runner(store) {
    store.put(record);
  });
}

async function getStatePhoto(stateCode) {
  return new Promise(function executor(resolve, reject) {
    const tx = appDatabase.transaction("statePhotos", "readonly");
    const store = tx.objectStore("statePhotos");
    const req = store.get(stateCode);
    req.onsuccess = function onSuccess() {
      resolve(req.result || null);
    };
    req.onerror = function onError() {
      reject(req.error);
    };
  });
}

async function countStatesWithPhotos() {
  return new Promise(function executor(resolve, reject) {
    const tx = appDatabase.transaction("statePhotos", "readonly");
    const store = tx.objectStore("statePhotos");
    const req = store.getAllKeys();
    req.onsuccess = function onSuccess() {
      resolve((req.result || []).length);
    };
    req.onerror = function onError() {
      reject(req.error);
    };
  });
}

function addGalleryPhoto(blob) {
  const record = { blob: blob, createdAt: Date.now() };
  return withStore("galleryPhotos", "readwrite", function runner(store) {
    store.add(record);
  });
}

async function deleteGalleryPhoto(id) {
  return withStore("galleryPhotos", "readwrite", function runner(store) {
    store.delete(id);
  });
}

async function getAllGalleryPhotos() {
  return new Promise(function executor(resolve, reject) {
    const tx = appDatabase.transaction("galleryPhotos", "readonly");
    const store = tx.objectStore("galleryPhotos");
    const req = store.getAll();
    req.onsuccess = function onSuccess() {
      resolve(req.result || []);
    };
    req.onerror = function onError() {
      reject(req.error);
    };
  });
}
