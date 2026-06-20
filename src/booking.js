import gsap from 'gsap';

export class BookingSystem {
  constructor(modalId, backdropId, onBookingSuccess) {
    this.modal = document.getElementById(modalId);
    this.backdrop = document.getElementById(backdropId);
    this.onBookingSuccess = onBookingSuccess;
    
    this.property = null;
    this.selectedOption = null; // room or table
    
    this.init();
  }
  
  init() {
    // Bind close events
    const closeBtn = this.modal.querySelector('.close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    this.backdrop.addEventListener('click', () => this.close());
  }
  
  open(property, selectedOption) {
    this.property = property;
    this.selectedOption = selectedOption;
    
    this.backdrop.classList.add('active');
    this.modal.classList.add('active');
    
    this.renderForm();
  }
  
  close() {
    this.backdrop.classList.remove('active');
    this.modal.classList.remove('active');
  }
  
  renderForm() {
    const isHotel = this.property.type === 'hotel';
    const priceLabel = isHotel ? '/night' : '/guest';
    const optionName = this.selectedOption ? this.selectedOption.name : (isHotel ? 'Standard Suite' : 'Main Seating');
    
    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const container = document.getElementById('booking-modal-content');
    container.innerHTML = `
      <div class="ticket-wrapper">
        <div class="ticket-header">
          <div class="ticket-title">CONFIRMING RESERVATION</div>
          <div class="ticket-name">${this.property.name}</div>
          <div class="ticket-tagline" style="font-size: 11px; margin-top: 4px; opacity: 0.8;">${optionName}</div>
        </div>
        
        <div class="ticket-body">
          <form class="booking-form" id="checkout-form">
            <div class="form-row">
              <div class="form-group">
                <label>${isHotel ? 'Check In' : 'Date'}</label>
                <input type="date" id="book-date-start" min="${todayStr}" value="${todayStr}" required />
              </div>
              ${isHotel ? `
              <div class="form-group">
                <label>Check Out</label>
                <input type="date" id="book-date-end" min="${tomorrowStr}" value="${tomorrowStr}" required />
              </div>
              ` : ''}
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Guests</label>
                <select id="book-guests">
                  <option value="1">1 Guest</option>
                  <option value="2" selected>2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                </select>
              </div>
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="book-name" placeholder="John Doe" required />
              </div>
            </div>
            
            <div class="ticket-divider"></div>
            
            <div id="price-breakdown-area">
              <!-- Dynamically updated -->
            </div>
          </form>
        </div>
        
        <div class="ticket-footer">
          <button class="checkout-btn font-title" id="confirm-pay-btn">
            Proceed with Booking
          </button>
        </div>
      </div>
    `;
    
    // Bind change listeners to update price breakdown
    const dateStartInput = document.getElementById('book-date-start');
    const dateEndInput = document.getElementById('book-date-end');
    const guestsInput = document.getElementById('book-guests');
    const form = document.getElementById('checkout-form');
    
    const updateCalculator = () => this.calculatePrices();
    
    if (dateStartInput) dateStartInput.addEventListener('change', () => {
      if (dateEndInput) {
        // Ensure end date is after start date
        const start = new Date(dateStartInput.value);
        const minEnd = new Date(start);
        minEnd.setDate(minEnd.getDate() + 1);
        dateEndInput.min = minEnd.toISOString().split('T')[0];
        if (new Date(dateEndInput.value) <= start) {
          dateEndInput.value = dateEndInput.min;
        }
      }
      updateCalculator();
    });
    
    if (dateEndInput) dateEndInput.addEventListener('change', updateCalculator);
    if (guestsInput) guestsInput.addEventListener('change', updateCalculator);
    
    // Trigger initial calculation
    this.calculatePrices();
    
    // Form submission
    const payBtn = document.getElementById('confirm-pay-btn');
    payBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (form.checkValidity()) {
        this.startPaymentSimulation();
      } else {
        form.reportValidity();
      }
    });
  }
  
  calculatePrices() {
    const isHotel = this.property.type === 'hotel';
    const guests = parseInt(document.getElementById('book-guests').value);
    
    let quantity = 1;
    let label = "1 guest";
    
    if (isHotel) {
      const start = new Date(document.getElementById('book-date-start').value);
      const end = new Date(document.getElementById('book-date-end').value);
      const diffTime = Math.abs(end - start);
      quantity = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      label = `${quantity} ${quantity === 1 ? 'night' : 'nights'}`;
    } else {
      quantity = guests;
      label = `${guests} ${guests === 1 ? 'guest' : 'guests'}`;
    }
    
    const baseRate = this.property.priceValue;
    const subtotal = baseRate * quantity;
    const cleaningFee = isHotel ? Math.round(baseRate * 0.12) : 25; // Hotel: 12%, Restaurant: flat $25 cover fee
    const tax = Math.round((subtotal + cleaningFee) * 0.08); // 8% occupancy tax
    const total = subtotal + cleaningFee + tax;
    
    const area = document.getElementById('price-breakdown-area');
    area.innerHTML = `
      <div class="ticket-row">
        <span class="label">$${baseRate} x ${label}</span>
        <span class="val">$${subtotal}</span>
      </div>
      <div class="ticket-row">
        <span class="label">${isHotel ? 'Resort Service Fee' : 'Gourmet Cover Charge'}</span>
        <span class="val">$${cleaningFee}</span>
      </div>
      <div class="ticket-row">
        <span class="label">Occupancy Tax (8%)</span>
        <span class="val">$${tax}</span>
      </div>
      <div class="ticket-divider"></div>
      <div class="ticket-total">
        <span class="font-title">Grand Total</span>
        <span class="total-price font-title">$${total}</span>
      </div>
    `;
    
    // Save total for final screen
    this.lastTotal = total;
  }
  
  startPaymentSimulation() {
    const footer = this.modal.querySelector('.ticket-footer');
    const payBtn = document.getElementById('confirm-pay-btn');
    
    payBtn.disabled = true;
    payBtn.innerText = "Securing transaction tunnel...";
    
    // Animate payment loading spinner in ticket
    const ticketBody = this.modal.querySelector('.ticket-body');
    gsap.to(ticketBody, { opacity: 0.3, duration: 0.3 });
    
    setTimeout(() => {
      payBtn.innerText = "Authorizing credit card...";
      setTimeout(() => {
        payBtn.innerText = "Finalizing luxury reservation...";
        setTimeout(() => {
          this.renderSuccessScreen();
        }, 1200);
      }, 1000);
    }, 1000);
  }
  
  renderSuccessScreen() {
    const container = document.getElementById('booking-modal-content');
    const isHotel = this.property.type === 'hotel';
    const clientName = document.getElementById('book-name').value || "Valued Client";
    const dateVal = document.getElementById('book-date-start').value;
    
    container.innerHTML = `
      <div class="success-message">
        <div class="success-icon">✓</div>
        <h2 class="success-title">Reservation Secured</h2>
        <p class="success-desc">
          Congratulations <strong>${clientName}</strong>, your reservation at the <strong>${this.property.name}</strong> has been booked and confirmed.
        </p>
        <div class="ticket-divider" style="width: 100%; margin: 10px 0;"></div>
        <div style="font-size: 13px; text-align: left; width: 100%; display: flex; flex-direction: column; gap: 8px;">
          <div class="ticket-row"><span class="label">Confirmation:</span><span class="val" style="color: var(--accent-teal); font-weight: 600;">#LV-${Math.floor(100000 + Math.random() * 900000)}</span></div>
          <div class="ticket-row"><span class="label">Date:</span><span class="val">${dateVal}</span></div>
          <div class="ticket-row"><span class="label">Total Paid:</span><span class="val" style="color: var(--accent-gold); font-weight: bold;">$${this.lastTotal}</span></div>
        </div>
      </div>
    `;
    
    // Replace checkout button in footer with close
    const footer = this.modal.querySelector('.ticket-footer');
    footer.innerHTML = `
      <button class="checkout-btn font-title" id="success-close-btn" style="background: var(--accent-teal);">
        Return to Explorer
      </button>
    `;
    
    document.getElementById('success-close-btn').addEventListener('click', () => {
      this.close();
      if (this.onBookingSuccess) {
        this.onBookingSuccess();
      }
    });
  }
}
