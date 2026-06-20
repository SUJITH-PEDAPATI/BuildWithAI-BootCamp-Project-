import './style.css';
import { properties, destinations } from './data.js';
import { Globe3D } from './globe.js';
import { RoomViewer3D } from './roomViewer.js';
import { BookingSystem } from './booking.js';
import gsap from 'gsap';

// Application State
let activeCategory = 'all';
let selectedCity = null;
let maxPrice = 1000;
let searchQuery = '';
let selectedProperty = null;
let currentView = 'globe'; // 'globe' or 'room'

// Component Instances
let globeInstance = null;
let roomViewerInstance = null;
let bookingSystemInstance = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCustomCursor();
  initListingFilters();
  init3DViews();
  initBookingSystem();
  renderDestinations();
  renderListings();
});

/* ==========================================================================
   Custom Cursor Setup
   ========================================================================== */
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const cursorDot = document.getElementById('custom-cursor-dot');
  
  if (!cursor || !cursorDot) return;
  
  // Track cursor position
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Instantly place the inner dot
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
  });
  
  // Add inertia/lag to outer circle
  function updateCursor() {
    const dx = mouseX - cursorX;
    const dy = mouseY - cursorY;
    
    cursorX += dx * 0.15;
    cursorY += dy * 0.15;
    
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    
    requestAnimationFrame(updateCursor);
  }
  updateCursor();
  
  // Custom cursor hover styling triggers
  const interactiveSelector = 'button, input, select, a, .property-card, .dest-pill';
  
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.add('hovering-interactive');
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.remove('hovering-interactive');
    }
  });
}

/* ==========================================================================
   3D WebGL Views Orchestration
   ========================================================================== */
function init3DViews() {
  // Initialize Globe
  globeInstance = new Globe3D('globe-view-container', (property) => {
    // Globe pin selected callback
    openDetailDrawer(property);
    highlightPropertyCard(property.id);
  });
  
  // Initialize Room Viewer
  roomViewerInstance = new RoomViewer3D('room-canvas', 'room-view-container');
  
  // View controls (Reset / Rotate toggles)
  const resetBtn = document.getElementById('reset-camera-btn');
  resetBtn.addEventListener('click', () => {
    if (currentView === 'globe') {
      globeInstance.resetView();
    } else {
      roomViewerInstance.resetCamera();
    }
  });
  
  const rotationBtn = document.getElementById('toggle-rotation-btn');
  rotationBtn.addEventListener('click', () => {
    if (currentView === 'globe') {
      globeInstance.autoRotate = !globeInstance.autoRotate;
      rotationBtn.classList.toggle('active', !globeInstance.autoRotate);
    }
  });
  
  // Lighting Presets in bottom bar
  const lightingButtons = document.querySelectorAll('#room-controls-overlay [data-light]');
  lightingButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      lightingButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const lightMode = btn.getAttribute('data-light');
      roomViewerInstance.applyLightingMode(lightMode);
    });
  });
  
  // Brand Logo click resets view
  document.getElementById('nav-logo-btn').addEventListener('click', () => {
    switchView('globe');
    resetFilters();
  });
}

function switchView(view) {
  if (currentView === view) return;
  currentView = view;
  
  const globeContainer = document.getElementById('globe-view-container');
  const roomContainer = document.getElementById('room-view-container');
  const badgeText = document.getElementById('view-mode-text');
  const rotationBtn = document.getElementById('toggle-rotation-btn');
  const roomControls = document.getElementById('room-controls-overlay');
  const globeHint = document.getElementById('globe-hint-overlay');
  
  if (view === 'globe') {
    globeContainer.classList.add('active');
    roomContainer.classList.remove('active');
    badgeText.innerText = "GLOBAL EXPLORER (3D)";
    rotationBtn.style.display = 'inline-flex';
    roomControls.style.display = 'none';
    if (globeHint) globeHint.style.display = 'block';
  } else {
    roomContainer.classList.add('active');
    globeContainer.classList.remove('active');
    badgeText.innerText = selectedProperty.type === 'hotel' ? "ROOM CONFIGURATOR (3D)" : "TABLE RESERVATION (3D)";
    rotationBtn.style.display = 'none';
    roomControls.style.display = 'flex';
    if (globeHint) globeHint.style.display = 'none';
  }
}

/* ==========================================================================
   Filters and Search UI bindings
   ========================================================================== */
function initListingFilters() {
  // Category tabs (All vs Hotels vs Dining)
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      activeCategory = tab.getAttribute('data-category');
      renderListings();
    });
  });
  
  // Search input
  const searchInput = document.getElementById('search-destination');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderListings();
  });
  
  // Budget slider
  const slider = document.getElementById('price-slider');
  const priceDisplay = document.getElementById('price-val-display');
  slider.addEventListener('input', (e) => {
    maxPrice = parseInt(e.target.value);
    priceDisplay.innerText = `$${maxPrice}`;
    renderListings();
  });
}

function resetFilters() {
  activeCategory = 'all';
  selectedCity = null;
  maxPrice = 1000;
  searchQuery = '';
  
  // Reset DOM inputs
  document.getElementById('search-destination').value = '';
  document.getElementById('price-slider').value = 1000;
  document.getElementById('price-val-display').innerText = '$1,000';
  
  // Reset tabs
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(t => t.classList.remove('active'));
  document.getElementById('category-all').classList.add('active');
  
  // Reset pills
  const pills = document.querySelectorAll('.dest-pill');
  pills.forEach(p => p.classList.remove('active'));
  
  renderListings();
  if (globeInstance) globeInstance.resetView();
}

/* ==========================================================================
   Destinations Render
   ========================================================================== */
function renderDestinations() {
  const container = document.getElementById('city-pills-container');
  if (!container) return;
  
  container.innerHTML = destinations.map(dest => `
    <button class="dest-pill" data-city="${dest.city}">
      📍 ${dest.city}
    </button>
  `).join('');
  
  // Event listeners on pills
  const pills = container.querySelectorAll('.dest-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const isAlreadySelected = pill.classList.contains('active');
      
      pills.forEach(p => p.classList.remove('active'));
      
      if (isAlreadySelected) {
        selectedCity = null;
        globeInstance.resetView();
      } else {
        pill.classList.add('active');
        selectedCity = pill.getAttribute('data-city');
        
        // Find matching property coords to guide globe camera zoom
        const match = properties.find(p => p.city === selectedCity);
        if (match && globeInstance) {
          const pin = globeInstance.pins.find(p => p.property.id === match.id);
          if (pin) globeInstance.focusOnPin(pin);
        }
      }
      renderListings();
    });
  });
}

/* ==========================================================================
   Properties List Feed
   ========================================================================== */
function renderListings() {
  const container = document.getElementById('listings-feed-container');
  if (!container) return;
  
  // Filter Properties
  const filtered = properties.filter(prop => {
    const matchesCategory = activeCategory === 'all' || prop.type === activeCategory;
    const matchesCity = !selectedCity || prop.city === selectedCity;
    const matchesPrice = prop.priceValue <= maxPrice;
    const matchesSearch = !searchQuery || 
                          prop.name.toLowerCase().includes(searchQuery) ||
                          prop.city.toLowerCase().includes(searchQuery);
    
    return matchesCategory && matchesCity && matchesPrice && matchesSearch;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="padding: 30px; text-align: center; color: var(--text-secondary);">
        <p>No luxurious spots match your criteria.</p>
        <button class="tour-3d-btn" id="filter-reset-btn" style="margin-top: 14px; padding: 8px 16px;">
          Reset Filters
        </button>
      </div>
    `;
    const reset = document.getElementById('filter-reset-btn');
    if (reset) reset.addEventListener('click', resetFilters);
    return;
  }
  
  container.innerHTML = filtered.map(prop => {
    const isHotel = prop.type === 'hotel';
    const tagClass = isHotel ? 'tag-hotel' : 'tag-restaurant';
    const tagLabel = isHotel ? 'Resort' : 'Gourmet';
    const subLabel = isHotel ? 'night' : 'guest';
    
    return `
      <div class="property-card" id="card-${prop.id}" data-id="${prop.id}">
        <div class="card-img-wrapper">
          <img src="${prop.images[0]}" alt="${prop.name}" loading="lazy" />
          <div class="card-tag ${tagClass}">
            <span>${isHotel ? '🏨' : '🍽️'}</span> ${tagLabel}
          </div>
        </div>
        
        <div class="card-info">
          <div class="card-header-row">
            <h2 class="card-name font-title">${prop.name}</h2>
            <div class="card-rating">★ ${prop.rating}</div>
          </div>
          <div class="card-tagline">${prop.tagline}</div>
          
          <div class="card-location">
            <span>📍</span> ${prop.city}
          </div>
          
          <div class="card-footer">
            <div class="card-price">
              ${prop.price} <span class="price-sub">/ ${subLabel}</span>
            </div>
            <div class="card-cta">Explore details →</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Bind card clicks
  const cards = container.querySelectorAll('.property-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const prop = properties.find(p => p.id === id);
      openDetailDrawer(prop);
      
      // Update selected states
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      // Zoom globe camera to matching pin
      if (globeInstance) {
        const pin = globeInstance.pins.find(p => p.property.id === id);
        if (pin) globeInstance.focusOnPin(pin);
      }
    });
  });
}

function highlightPropertyCard(propertyId) {
  const cards = document.querySelectorAll('.property-card');
  cards.forEach(c => {
    c.classList.remove('active');
    if (c.getAttribute('data-id') === propertyId) {
      c.classList.add('active');
      c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* ==========================================================================
   Details Slide Drawer
   ========================================================================== */
function openDetailDrawer(property) {
  selectedProperty = property;
  
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');
  const content = document.getElementById('drawer-content-container');
  
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.classList.add('active');
  drawer.classList.add('active');
  
  const isHotel = property.type === 'hotel';
  const ctaLabel = isHotel ? 'Tour Suite Room in 3D' : 'Map Table Seating in 3D';
  const subLabel = isHotel ? 'night' : 'guest';
  
  // Render details inside drawer
  content.innerHTML = `
    <!-- Hero Slider -->
    <div class="drawer-hero">
      <img src="${property.images[0]}" alt="${property.name}" />
      <div class="drawer-hero-overlay"></div>
    </div>
    
    <!-- Title / Subtitle Info -->
    <div class="drawer-header">
      <div class="drawer-title-row">
        <h2 class="drawer-title font-title">${property.name}</h2>
      </div>
      <div class="drawer-tagline">${property.tagline}</div>
      <div class="drawer-location">
        <span>📍</span> ${property.city} | ★ ${property.rating} (${property.reviewsCount} reviews)
      </div>
    </div>
    
    <!-- 3D Interactive Call to Action Card -->
    <div class="tour-3d-card">
      <div class="tour-3d-info">
        <div class="tour-3d-title">
          <span>🕶️</span> Virtual Walkthrough
        </div>
        <p class="tour-3d-desc">Immerse yourself inside this space. Tweak variables and select configurations in 3D.</p>
      </div>
      <button class="tour-3d-btn font-title" id="tour-3d-trigger-btn">
        ${ctaLabel}
      </button>
    </div>
    
    <!-- Description Section -->
    <div class="drawer-section">
      <h3 class="section-title font-title">About the Space</h3>
      <p class="drawer-desc">${property.description}</p>
    </div>
    
    <!-- Amenities Section -->
    <div class="drawer-section">
      <h3 class="section-title font-title">Key Amenities</h3>
      <div class="amenities-list">
        ${property.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
      </div>
    </div>
    
    <!-- Reviews Listing -->
    <div class="drawer-section">
      <h3 class="section-title font-title">Visitor Reviews</h3>
      <div class="reviews-container">
        ${property.reviews.map(rev => `
          <div class="review-item">
            <div class="review-header">
              <img src="${rev.avatar}" class="review-avatar" alt="${rev.author}" />
              <div class="review-author-info">
                <div class="review-author">${rev.author}</div>
                <div class="review-date">${rev.date}</div>
              </div>
              <div class="review-stars">${'★'.repeat(rev.rating)}</div>
            </div>
            <p class="review-text">${rev.text}</p>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Sticky Footer Book Bar -->
    <div class="drawer-booking-bar">
      <div class="booking-price-col">
        <span class="booking-price-label">ESTIMATED PRICE</span>
        <div class="booking-price-val">
          ${property.price} <span class="price-sub" style="font-size: 12px; color: var(--text-muted);">/ ${subLabel}</span>
        </div>
      </div>
      <button class="booking-btn font-title" id="drawer-book-now-btn">
        Reserve Space
      </button>
    </div>
  `;
  
  // Close drawer binder
  document.getElementById('close-drawer-btn').addEventListener('click', closeDetailDrawer);
  backdrop.addEventListener('click', closeDetailDrawer);
  
  // "Tour in 3D" trigger event
  document.getElementById('tour-3d-trigger-btn').addEventListener('click', () => {
    switchView('room');
    
    // Initialize procedural Three.js room geometry
    roomViewerInstance.loadPropertyScene(property, (selectedOptionId) => {
      // 3D option chosen callback
      update3DControlsState(selectedOptionId);
    });
    
    // Build options toolbar on the bottom viewport control bar
    render3DControlsToolbar();
    
    // Close detail drawer so user can interact with 3D canvas
    closeDetailDrawer();
  });
  
  // "Reserve Space" booking ticket modal popup
  document.getElementById('drawer-book-now-btn').addEventListener('click', () => {
    const selectedOption = isHotel 
      ? property.rooms.find(r => r.id === roomViewerInstance.selectedOptionId) 
      : property.rooms.find(t => t.id === roomViewerInstance.selectedOptionId);
      
    bookingSystemInstance.open(property, selectedOption);
  });
}

function closeDetailDrawer() {
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.classList.remove('active');
  drawer.classList.remove('active');
}

/* ==========================================================================
   Room Configuration Toolbar (Bottom Overlay of Canvas)
   ========================================================================== */
function render3DControlsToolbar() {
  const selectLabel = document.getElementById('selection-label');
  const buttonsContainer = document.getElementById('selection-buttons-container');
  if (!selectedProperty) return;
  
  const isHotel = selectedProperty.type === 'hotel';
  selectLabel.innerText = isHotel ? "Select Suite Level:" : "Select Dining Table:";
  
  // Generate option buttons
  buttonsContainer.innerHTML = selectedProperty.rooms.map((opt, i) => `
    <button class="control-btn ${i === 0 ? 'active' : ''}" data-opt-id="${opt.id}">
      ${isHotel ? '🛌' : '🍽️'} ${opt.name}
    </button>
  `).join('');
  
  const buttons = buttonsContainer.querySelectorAll('.control-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const optId = btn.getAttribute('data-opt-id');
      roomViewerInstance.selectOption(optId);
    });
  });
}

function update3DControlsState(optionId) {
  const buttons = document.querySelectorAll('#selection-buttons-container .control-btn');
  buttons.forEach(btn => {
    const isMatching = btn.getAttribute('data-opt-id') === optionId;
    btn.classList.toggle('active', isMatching);
  });
}

/* ==========================================================================
   Booking Modal Setup
   ========================================================================== */
function initBookingSystem() {
  bookingSystemInstance = new BookingSystem('booking-modal', 'booking-modal-backdrop', () => {
    // Success callback
    resetFilters();
    switchView('globe');
  });
}
