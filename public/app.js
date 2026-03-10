const state = {
  screen: 'login',
  user: null,
  doctors: [],
  categories: [],
  symptoms: [],
  favorites: new Set(),
  appointments: [],
  chats: [],
  activeChatDoctorId: null,
  activeChatMessages: [],
  activeAppointmentTab: 'scheduled',
  search: '',
  category: '',
  specialistSearch: '',
  specialistCategory: '',
  selectedDoctorId: null
};

const view = document.getElementById('view');
const drawer = document.getElementById('drawer');
const menuToggle = document.getElementById('menuToggle');
const closeDrawer = document.getElementById('closeDrawer');
const refreshBtn = document.getElementById('refreshBtn');
const navLinks = [...document.querySelectorAll('.nav-link')];
const drawerLinks = [...document.querySelectorAll('.drawer-link')];

const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

function api(path, options = {}) {
  return fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Request failed');
    }
    return payload;
  });
}

function setScreen(screen) {
  state.screen = screen;
  drawer.classList.remove('open');
  if (screen === 'home' || screen === 'favorites' || screen === 'appointments' || screen === 'chat' || screen === 'specialists') {
    navLinks.forEach((node) => {
      node.classList.toggle('active', node.dataset.screen === screen);
    });
  }
  render();
}

function showToast(message) {
  window.alert(message);
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed);
}

function getDoctorById(id) {
  return state.doctors.find((doctor) => doctor.id === id) || null;
}

function doctorCard(doctor, options = {}) {
  const favoriteClass = state.favorites.has(doctor.id) ? 'active' : '';
  const favoriteIcon = state.favorites.has(doctor.id) ? '♥' : '♡';
  const detailsLabel = options.detailsLabel || 'Details';
  const actionLabel = options.actionLabel || 'Make Appointment';

  return `
    <article class="doctor-card">
      <img class="doctor-image" src="${doctor.image}" alt="${doctor.name}" />
      <div class="doctor-content">
        <div class="doctor-title-row">
          <div>
            <h3 class="doctor-name">${doctor.name}</h3>
            <p class="doctor-sub">${doctor.specialty}</p>
          </div>
          <button class="icon-btn favorite-btn ${favoriteClass}" data-action="favorite" data-doctor-id="${doctor.id}" type="button">${favoriteIcon}</button>
        </div>
        <p class="doctor-meta">⭐ ${doctor.rating} | ${doctor.experience} yrs exp | ${doctor.location} | From $${doctor.fee}</p>
        <div class="doctor-actions">
          <button class="ghost-btn" data-action="details" data-doctor-id="${doctor.id}" type="button">${detailsLabel}</button>
          <button class="solid-btn" data-action="book-flow" data-doctor-id="${doctor.id}" type="button">${actionLabel}</button>
        </div>
      </div>
    </article>
  `;
}

function appointmentCard(appointment) {
  const doctor = appointment.doctor || getDoctorById(appointment.doctorId);
  return `
    <article class="appointment-item">
      <div class="doctor-title-row">
        <div>
          <h4>${doctor ? doctor.name : 'Doctor unavailable'}</h4>
          <p class="muted">${doctor ? doctor.specialty : 'Unknown specialty'}</p>
        </div>
        <span class="badge ${appointment.status}">${appointment.status}</span>
      </div>
      <p class="muted">${formatDate(appointment.date)} at ${appointment.time} | ${appointment.reason}</p>
      <div class="row-actions">
        <button class="ghost-btn" data-action="details" data-doctor-id="${appointment.doctorId}" type="button">Doctor Details</button>
        ${appointment.status === 'scheduled' ? `<button class="ghost-btn" data-action="complete-appt" data-id="${appointment.id}" type="button">Complete</button>` : ''}
        ${appointment.status === 'scheduled' ? `<button class="ghost-btn" data-action="reschedule-appt" data-id="${appointment.id}" type="button">Reschedule</button>` : ''}
        ${appointment.status === 'scheduled' ? `<button class="solid-btn" data-action="cancel-appt" data-id="${appointment.id}" type="button">Cancel</button>` : ''}
      </div>
    </article>
  `;
}

function renderLogin() {
  return `
    <section class="panel login-card">
      <h2>Log In</h2>
      <p class="muted">Use the seeded account or your own API user.</p>
      <form id="loginForm">
        <label>Email</label>
        <input type="email" name="email" value="mary@example.com" required />
        <label>Password</label>
        <input type="password" name="password" value="password123" required />
        <div class="row-actions" style="margin-top:12px;">
          <button class="solid-btn" type="submit">Log In</button>
        </div>
      </form>
    </section>
  `;
}

function renderHome() {
  const filteredDoctors = state.doctors.filter((doctor) => {
    const search = state.search.toLowerCase();
    const bySearch =
      !search ||
      doctor.name.toLowerCase().includes(search) ||
      doctor.specialty.toLowerCase().includes(search) ||
      doctor.symptoms.join(' ').toLowerCase().includes(search);
    const byCategory = !state.category || doctor.category === state.category;
    return bySearch && byCategory;
  });

  return `
    <section class="grid-two">
      <article class="panel">
        <h2>Find Your Desired Doctor</h2>
        <div class="search-row">
          <input id="homeSearch" placeholder="Search doctor or issue" value="${state.search}" />
          <button class="solid-btn" data-action="home-search" type="button">Search</button>
        </div>
        <h3 style="margin-top:14px;">Categories</h3>
        <div class="chips">
          <button class="chip ${state.category === '' ? 'active' : ''}" data-action="set-category" data-value="">All</button>
          ${state.categories
            .map(
              (category) =>
                `<button class="chip ${state.category === category ? 'active' : ''}" data-action="set-category" data-value="${category}">${category}</button>`
            )
            .join('')}
        </div>
        <h3 style="margin-top:14px;">Most Common Symptoms</h3>
        <div class="chips">
          ${state.symptoms
            .slice(0, 8)
            .map((symptom) => `<button class="chip" data-action="symptom-search" data-value="${symptom}">${symptom}</button>`)
            .join('')}
        </div>
      </article>

      <article class="panel">
        <h2>Top Doctors</h2>
        <div class="doctor-stack">
          ${filteredDoctors.slice(0, 4).map((doctor) => doctorCard(doctor)).join('') || '<p class="muted">No doctors found.</p>'}
        </div>
        <div class="row-actions" style="margin-top:12px;">
          <button class="ghost-btn" data-action="go-specialists" type="button">See All Specialists</button>
        </div>
      </article>
    </section>
  `;
}

function renderFavorites() {
  const doctors = state.doctors.filter((doctor) => state.favorites.has(doctor.id));
  return `
    <section class="panel">
      <h2>Favorite Doctors</h2>
      <div class="doctor-stack">
        ${doctors.map((doctor) => doctorCard(doctor)).join('') || '<p class="muted">No favorites yet.</p>'}
      </div>
    </section>
  `;
}

function renderAppointments() {
  const appointments = state.appointments.filter((appointment) => appointment.status === state.activeAppointmentTab);

  return `
    <section class="panel">
      <h2>Appointments</h2>
      <div class="tab-row">
        ${['scheduled', 'completed', 'cancelled']
          .map(
            (status) =>
              `<button class="tab ${state.activeAppointmentTab === status ? 'active' : ''}" data-action="appt-tab" data-value="${status}" type="button">${status}</button>`
          )
          .join('')}
      </div>
      <div class="appointment-stack">
        ${appointments.map((appointment) => appointmentCard(appointment)).join('') || '<p class="muted">No appointments in this tab.</p>'}
      </div>
    </section>
  `;
}

function renderSpecialists() {
  const list = state.doctors.filter((doctor) => {
    const search = state.specialistSearch.toLowerCase();
    const bySearch =
      !search ||
      doctor.name.toLowerCase().includes(search) ||
      doctor.specialty.toLowerCase().includes(search) ||
      doctor.category.toLowerCase().includes(search);
    const byCategory = !state.specialistCategory || doctor.category === state.specialistCategory;
    return bySearch && byCategory;
  });

  return `
    <section class="panel">
      <h2>Top Specialist Doctors</h2>
      <div class="search-row">
        <input id="specialistSearch" placeholder="Search specialist" value="${state.specialistSearch}" />
        <button class="solid-btn" data-action="specialist-search" type="button">Search</button>
      </div>
      <div class="chips" style="margin-top:12px;">
        <button class="chip ${state.specialistCategory === '' ? 'active' : ''}" data-action="set-specialist-category" data-value="">All</button>
        ${state.categories
          .map(
            (category) =>
              `<button class="chip ${state.specialistCategory === category ? 'active' : ''}" data-action="set-specialist-category" data-value="${category}">${category}</button>`
          )
          .join('')}
      </div>
      <div class="doctor-stack" style="margin-top:14px;">
        ${list.map((doctor) => doctorCard(doctor)).join('') || '<p class="muted">No specialists match current filters.</p>'}
      </div>
    </section>
  `;
}

function renderChat() {
  const list = state.chats;
  const activeDoctor = list.find((entry) => entry.doctor.id === state.activeChatDoctorId)?.doctor || null;

  return `
    <section class="grid-two">
      <article class="panel">
        <h2>Available For Chat</h2>
        <div class="chat-list">
          ${list
            .map(
              (entry) => `
            <article class="chat-item">
              <div>
                <h4>${entry.doctor.name}</h4>
                <p class="muted">${entry.doctor.specialty}</p>
                <p class="muted">${entry.lastMessage ? entry.lastMessage.text : 'No messages yet.'}</p>
              </div>
              <button class="solid-btn" data-action="open-chat" data-doctor-id="${entry.doctor.id}" type="button">Chat</button>
            </article>
          `
            )
            .join('') || '<p class="muted">No doctors available for chat.</p>'}
        </div>
      </article>

      <article class="panel">
        <h2>${activeDoctor ? `Chat with ${activeDoctor.name}` : 'Select a doctor'}</h2>
        <div class="message-list">
          ${state.activeChatMessages
            .map(
              (msg) => `
            <article class="message ${msg.sender}">
              <strong>${msg.sender === 'doctor' ? 'Doctor' : 'You'}</strong>
              <p>${msg.text}</p>
              <p class="muted">${msg.time}</p>
            </article>
          `
            )
            .join('') || '<p class="muted">No messages.</p>'}
        </div>
        ${
          activeDoctor
            ? `
          <form id="chatForm" style="margin-top:10px;">
            <input name="text" placeholder="Type your message" required />
            <div class="row-actions" style="margin-top:8px;">
              <button class="solid-btn" type="submit">Send</button>
            </div>
          </form>
        `
            : ''
        }
      </article>
    </section>
  `;
}

function renderDetails() {
  const doctor = getDoctorById(state.selectedDoctorId);
  if (!doctor) {
    return `
      <section class="panel">
        <p class="muted">Doctor not found.</p>
        <button class="ghost-btn" data-action="go-home" type="button">Back Home</button>
      </section>
    `;
  }

  const slots = doctor.availableSlots || [];
  return `
    <section class="grid-two">
      <article class="panel">
        <h2>Doctor Details</h2>
        <article class="doctor-card">
          <img class="doctor-image" src="${doctor.image}" alt="${doctor.name}" />
          <div>
            <h3>${doctor.name}</h3>
            <p class="doctor-sub">${doctor.specialty}</p>
            <p class="doctor-meta">${doctor.experience} years | ⭐ ${doctor.rating} | ${doctor.location}</p>
            <p class="muted">${doctor.bio}</p>
          </div>
        </article>
      </article>

      <article class="panel">
        <h2>Book Appointment</h2>
        <form id="bookForm">
          <label>Date</label>
          <input name="date" type="date" required />
          <label>Select Time</label>
          <select name="time" required>
            <option value="">Choose slot</option>
            ${slots.map((slot) => `<option value="${slot}">${slot}</option>`).join('')}
          </select>
          <label>Reason</label>
          <textarea name="reason" placeholder="Symptoms or concern"></textarea>
          <div class="row-actions" style="margin-top:12px;">
            <button class="ghost-btn" data-action="go-home" type="button">Cancel</button>
            <button class="solid-btn" type="submit">Book Appointment</button>
          </div>
        </form>
      </article>
    </section>
  `;
}

function renderThankYou() {
  return `
    <section class="panel thank-you">
      <div class="thank-icon">✓</div>
      <h2>Thank You!</h2>
      <p class="muted">Your appointment was created successfully.</p>
      <div class="row-actions" style="justify-content:center; margin-top:12px;">
        <button class="solid-btn" data-action="go-appointments" type="button">View Appointment</button>
      </div>
    </section>
  `;
}

function render() {
  const hideNav = state.screen === 'login' || state.screen === 'details' || state.screen === 'thankyou';
  document.querySelector('.bottom-nav').style.display = hideNav ? 'none' : 'grid';

  if (state.screen === 'login') {
    view.innerHTML = renderLogin();
    return;
  }

  if (state.screen === 'home') {
    view.innerHTML = renderHome();
    return;
  }

  if (state.screen === 'favorites') {
    view.innerHTML = renderFavorites();
    return;
  }

  if (state.screen === 'appointments') {
    view.innerHTML = renderAppointments();
    return;
  }

  if (state.screen === 'specialists') {
    view.innerHTML = renderSpecialists();
    return;
  }

  if (state.screen === 'chat') {
    view.innerHTML = renderChat();
    return;
  }

  if (state.screen === 'details') {
    view.innerHTML = renderDetails();
    return;
  }

  if (state.screen === 'thankyou') {
    view.innerHTML = renderThankYou();
    return;
  }

  view.innerHTML = '<section class="panel"><p class="muted">Unknown screen.</p></section>';
}

async function loadDoctors() {
  const payload = await api('/api/doctors');
  state.doctors = payload.doctors || [];
}

async function loadCategoriesAndSymptoms() {
  const [categoryPayload, symptomPayload] = await Promise.all([api('/api/categories'), api('/api/symptoms')]);
  state.categories = categoryPayload.categories || [];
  state.symptoms = symptomPayload.symptoms || [];
}

async function loadFavorites() {
  const payload = await api('/api/favorites');
  state.favorites = new Set((payload.doctors || []).map((doctor) => doctor.id));
}

async function loadAppointments() {
  const payload = await api('/api/appointments');
  state.appointments = payload.appointments || [];
}

async function loadChats() {
  const payload = await api('/api/chats');
  state.chats = payload.chats || [];
  if (!state.activeChatDoctorId && state.chats.length > 0) {
    state.activeChatDoctorId = state.chats[0].doctor.id;
  }
}

async function loadChatMessages(doctorId) {
  const payload = await api(`/api/chats/${doctorId}/messages`);
  state.activeChatDoctorId = doctorId;
  state.activeChatMessages = payload.messages || [];
}

async function hydrateDashboard() {
  await Promise.all([loadDoctors(), loadCategoriesAndSymptoms(), loadFavorites(), loadAppointments(), loadChats()]);
  if (state.activeChatDoctorId) {
    await loadChatMessages(state.activeChatDoctorId);
  }
}

async function toggleFavorite(doctorId) {
  await api(`/api/favorites/${doctorId}`, { method: 'POST' });
  if (state.favorites.has(doctorId)) {
    state.favorites.delete(doctorId);
  } else {
    state.favorites.add(doctorId);
  }
  render();
}

async function updateAppointment(appointmentId, payload) {
  await api(`/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  await loadAppointments();
  render();
}

async function submitLogin(form) {
  const data = new FormData(form);
  const email = String(data.get('email') || '');
  const password = String(data.get('password') || '');
  try {
    const payload = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    state.user = payload.user;
    await hydrateDashboard();
    setScreen('home');
  } catch (err) {
    showToast(err.message);
  }
}

async function submitBooking(form) {
  const doctor = getDoctorById(state.selectedDoctorId);
  if (!doctor) {
    return;
  }

  const data = new FormData(form);
  const date = String(data.get('date') || '');
  const time = String(data.get('time') || '');
  const reason = String(data.get('reason') || '');

  if (!date || !time) {
    showToast('Please choose date and time.');
    return;
  }

  await api('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      doctorId: doctor.id,
      date,
      time,
      reason
    })
  });

  await loadAppointments();
  setScreen('thankyou');
}

async function submitChat(form) {
  if (!state.activeChatDoctorId) {
    return;
  }

  const data = new FormData(form);
  const text = String(data.get('text') || '').trim();
  if (!text) {
    return;
  }

  await api(`/api/chats/${state.activeChatDoctorId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });

  await Promise.all([loadChats(), loadChatMessages(state.activeChatDoctorId)]);
  render();
}

function attachGlobalListeners() {
  menuToggle.addEventListener('click', () => {
    drawer.classList.add('open');
  });

  closeDrawer.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  refreshBtn.addEventListener('click', async () => {
    if (state.screen === 'login') {
      render();
      return;
    }
    await hydrateDashboard();
    render();
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', async () => {
      const screen = link.dataset.screen;
      if (!screen) {
        return;
      }
      if (screen === 'chat') {
        await loadChats();
        if (state.activeChatDoctorId) {
          await loadChatMessages(state.activeChatDoctorId);
        }
      }
      setScreen(screen);
    });
  });

  drawerLinks.forEach((link) => {
    link.addEventListener('click', async () => {
      const screen = link.dataset.screen;
      if (!screen) {
        return;
      }
      if (screen === 'chat') {
        await loadChats();
        if (state.activeChatDoctorId) {
          await loadChatMessages(state.activeChatDoctorId);
        }
      }
      setScreen(screen);
    });
  });

  view.addEventListener('click', async (event) => {
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) {
      return;
    }

    const action = actionNode.dataset.action;
    const doctorId = actionNode.dataset.doctorId;
    const value = actionNode.dataset.value;
    const id = actionNode.dataset.id;

    if (action === 'home-search') {
      const input = document.getElementById('homeSearch');
      state.search = input ? input.value : '';
      render();
      return;
    }

    if (action === 'specialist-search') {
      const input = document.getElementById('specialistSearch');
      state.specialistSearch = input ? input.value : '';
      render();
      return;
    }

    if (action === 'set-category') {
      state.category = value || '';
      render();
      return;
    }

    if (action === 'set-specialist-category') {
      state.specialistCategory = value || '';
      render();
      return;
    }

    if (action === 'symptom-search') {
      state.search = value || '';
      render();
      return;
    }

    if (action === 'go-specialists') {
      setScreen('specialists');
      return;
    }

    if (action === 'go-home') {
      setScreen('home');
      return;
    }

    if (action === 'go-appointments') {
      setScreen('appointments');
      return;
    }

    if (action === 'favorite' && doctorId) {
      await toggleFavorite(doctorId);
      return;
    }

    if ((action === 'details' || action === 'book-flow') && doctorId) {
      state.selectedDoctorId = doctorId;
      setScreen('details');
      return;
    }

    if (action === 'appt-tab' && value) {
      state.activeAppointmentTab = value;
      render();
      return;
    }

    if (action === 'cancel-appt' && id) {
      await updateAppointment(id, { status: 'cancelled' });
      return;
    }

    if (action === 'complete-appt' && id) {
      await updateAppointment(id, { status: 'completed' });
      return;
    }

    if (action === 'reschedule-appt' && id) {
      const newDate = window.prompt('Enter new date (YYYY-MM-DD):');
      if (!newDate) {
        return;
      }
      const newTime = window.prompt('Enter new time (HH:MM):');
      if (!newTime) {
        return;
      }
      await updateAppointment(id, { date: newDate, time: newTime, status: 'scheduled' });
      return;
    }

    if (action === 'open-chat' && doctorId) {
      await loadChatMessages(doctorId);
      render();
    }
  });

  view.addEventListener('submit', async (event) => {
    const form = event.target;
    event.preventDefault();

    if (form.id === 'loginForm') {
      await submitLogin(form);
      return;
    }

    if (form.id === 'bookForm') {
      await submitBooking(form);
      return;
    }

    if (form.id === 'chatForm') {
      await submitChat(form);
    }
  });
}

async function bootstrap() {
  attachGlobalListeners();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

bootstrap();
