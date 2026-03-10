const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

async function readStore() {
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getUserId(req, store) {
  return req.headers['x-user-id'] || store.currentUserId;
}

function parseId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const body = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(body);
  } catch (_err) {
    return null;
  }
}

function findDoctor(store, doctorId) {
  return store.doctors.find((doctor) => doctor.id === doctorId);
}

function attachDoctorData(appointment, store) {
  return {
    ...appointment,
    doctor: findDoctor(store, appointment.doctorId) || null
  };
}

function buildChatList(store, userId) {
  const favorites = store.favorites[userId] || [];
  const favoriteSet = new Set(favorites);

  return store.doctors
    .filter((doctor) => doctor.chatAvailable)
    .map((doctor) => {
      const messages = store.chats[doctor.id] || [];
      return {
        doctor,
        favorite: favoriteSet.has(doctor.id),
        lastMessage: messages.length ? messages[messages.length - 1] : null,
        messageCount: messages.length
      };
    });
}

function toIsoDateString(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeSlot(slot) {
  return String(slot || '').trim();
}

function parseTimeToMinutes(value) {
  const [h, m] = String(value || '').split(':');
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return Number.NaN;
  }
  return hour * 60 + minute;
}

function sortSlots(slots) {
  return [...slots].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

function pickBestSlot(slots, preferredTime) {
  if (!slots.length) {
    return null;
  }

  const preferred = parseTimeToMinutes(preferredTime);
  if (Number.isNaN(preferred)) {
    return sortSlots(slots)[0];
  }

  return [...slots].sort((left, right) => {
    const leftDelta = Math.abs(parseTimeToMinutes(left) - preferred);
    const rightDelta = Math.abs(parseTimeToMinutes(right) - preferred);
    return leftDelta - rightDelta;
  })[0];
}

function ensureDoctorSchedules(store) {
  if (!store.doctorSchedules || typeof store.doctorSchedules !== 'object') {
    store.doctorSchedules = {};
  }
}

function getConfiguredSlotsForDate(store, doctorId, date) {
  ensureDoctorSchedules(store);
  const doctor = findDoctor(store, doctorId);
  if (!doctor) {
    return [];
  }

  const scopedSchedule = store.doctorSchedules[doctorId] || {};
  const custom = scopedSchedule[date];
  const baseSlots = Array.isArray(custom) ? custom : doctor.availableSlots || [];
  return sortSlots([...new Set(baseSlots.map(sanitizeSlot).filter(Boolean))]);
}

function getAvailableSlotsForDate(store, doctorId, date, options = {}) {
  const configuredSlots = getConfiguredSlotsForDate(store, doctorId, date);
  const blocked = new Set(
    store.appointments
      .filter(
        (appointment) =>
          appointment.status === 'scheduled' &&
          appointment.doctorId === doctorId &&
          appointment.date === date &&
          appointment.id !== options.ignoreAppointmentId
      )
      .map((appointment) => appointment.time)
  );

  return configuredSlots.filter((slot) => !blocked.has(slot));
}

function hasUserConflict(store, userId, date, time, ignoreAppointmentId) {
  return store.appointments.some(
    (appointment) =>
      appointment.status === 'scheduled' &&
      appointment.userId === userId &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.id !== ignoreAppointmentId
  );
}

async function handleApi(req, res, url) {
  const store = await readStore();
  const userId = getUserId(req, store);
  const user = store.users.find((entry) => entry.id === userId) || null;

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await parseJsonBody(req);
    if (!body || !body.email || !body.password) {
      return sendJson(res, 400, { error: 'Invalid login payload.' });
    }

    const found = store.users.find(
      (entry) => entry.email.toLowerCase() === String(body.email).toLowerCase() && entry.password === body.password
    );

    if (!found) {
      return sendJson(res, 401, { error: 'Invalid credentials.' });
    }

    store.currentUserId = found.id;
    await writeStore(store);
    return sendJson(res, 200, {
      message: 'Login successful.',
      user: { id: found.id, name: found.name, email: found.email }
    });
  }

  if (!user) {
    return sendJson(res, 401, { error: 'Unauthorized user.' });
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    return sendJson(res, 200, {
      user: { id: user.id, name: user.name, email: user.email }
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/categories') {
    const categories = [...new Set(store.doctors.map((doctor) => doctor.category))];
    return sendJson(res, 200, { categories });
  }

  if (req.method === 'GET' && url.pathname === '/api/symptoms') {
    const symptoms = [...new Set(store.doctors.flatMap((doctor) => doctor.symptoms))];
    return sendJson(res, 200, { symptoms });
  }

  if (req.method === 'GET' && url.pathname === '/api/doctors') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const category = (url.searchParams.get('category') || '').toLowerCase();
    const location = (url.searchParams.get('location') || '').toLowerCase();
    const favorites = new Set(store.favorites[user.id] || []);

    const doctors = store.doctors
      .filter((doctor) => {
        const matchesSearch =
          !search ||
          doctor.name.toLowerCase().includes(search) ||
          doctor.specialty.toLowerCase().includes(search) ||
          doctor.category.toLowerCase().includes(search) ||
          doctor.symptoms.some((symptom) => symptom.toLowerCase().includes(search));

        const matchesCategory = !category || doctor.category.toLowerCase() === category;
        const matchesLocation = !location || doctor.location.toLowerCase().includes(location);

        return matchesSearch && matchesCategory && matchesLocation;
      })
      .map((doctor) => ({
        ...doctor,
        favorite: favorites.has(doctor.id)
      }));

    return sendJson(res, 200, { doctors });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/doctors/') && url.pathname.endsWith('/schedule')) {
    const doctorId = url.pathname.split('/')[3];
    const doctor = findDoctor(store, doctorId);
    if (!doctor) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const date = url.searchParams.get('date') || toIsoDateString();
    const configuredSlots = getConfiguredSlotsForDate(store, doctorId, date);
    const availableSlots = getAvailableSlotsForDate(store, doctorId, date);
    return sendJson(res, 200, {
      doctorId,
      date,
      configuredSlots,
      availableSlots
    });
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/doctors/') && url.pathname.endsWith('/schedule')) {
    const doctorId = url.pathname.split('/')[3];
    const doctor = findDoctor(store, doctorId);
    if (!doctor) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const body = await parseJsonBody(req);
    if (!body || !body.date || !Array.isArray(body.slots)) {
      return sendJson(res, 400, { error: 'date and slots[] are required.' });
    }

    const sanitizedSlots = sortSlots([...new Set(body.slots.map(sanitizeSlot).filter(Boolean))]);
    ensureDoctorSchedules(store);
    if (!store.doctorSchedules[doctorId]) {
      store.doctorSchedules[doctorId] = {};
    }
    store.doctorSchedules[doctorId][body.date] = sanitizedSlots;
    await writeStore(store);

    return sendJson(res, 200, {
      doctorId,
      date: body.date,
      configuredSlots: sanitizedSlots,
      availableSlots: getAvailableSlotsForDate(store, doctorId, body.date)
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/smart-appointments/recommendations') {
    const symptom = String(url.searchParams.get('symptom') || '').trim().toLowerCase();
    const preferredTime = String(url.searchParams.get('preferredTime') || '').trim();
    const date = String(url.searchParams.get('date') || toIsoDateString()).trim();
    const favoriteSet = new Set(store.favorites[user.id] || []);

    const recommendations = store.doctors
      .map((doctor) => {
        const availableSlots = getAvailableSlotsForDate(store, doctor.id, date);
        const suggestedSlot = pickBestSlot(availableSlots, preferredTime);
        const symptomMatch = symptom
          ? doctor.symptoms.some((entry) => entry.toLowerCase().includes(symptom)) ||
            doctor.category.toLowerCase().includes(symptom) ||
            doctor.specialty.toLowerCase().includes(symptom)
          : false;

        let score = doctor.rating;
        if (favoriteSet.has(doctor.id)) {
          score += 1.2;
        }
        if (symptomMatch) {
          score += 2.5;
        }
        if (doctor.chatAvailable) {
          score += 0.3;
        }

        return {
          doctor: {
            ...doctor,
            favorite: favoriteSet.has(doctor.id)
          },
          date,
          score: Number(score.toFixed(2)),
          suggestedSlot,
          availableSlotCount: availableSlots.length
        };
      })
      .filter((entry) => entry.availableSlotCount > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);

    return sendJson(res, 200, { recommendations });
  }

  if (req.method === 'POST' && url.pathname === '/api/appointments/smart-book') {
    const body = await parseJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid payload.' });
    }

    const symptom = String(body.symptom || '').trim().toLowerCase();
    const preferredTime = String(body.preferredTime || '').trim();
    const date = String(body.date || toIsoDateString()).trim();
    const reason = String(body.reason || (symptom ? `Smart booking for ${symptom}` : 'Smart booking consultation'));
    const favoriteSet = new Set(store.favorites[user.id] || []);

    const rankedDoctors = store.doctors
      .map((doctor) => {
        const symptomMatch = symptom
          ? doctor.symptoms.some((entry) => entry.toLowerCase().includes(symptom)) ||
            doctor.category.toLowerCase().includes(symptom) ||
            doctor.specialty.toLowerCase().includes(symptom)
          : false;

        let score = doctor.rating;
        if (favoriteSet.has(doctor.id)) {
          score += 1.2;
        }
        if (symptomMatch) {
          score += 2.5;
        }
        return { doctor, score };
      })
      .sort((left, right) => right.score - left.score);

    let selectedDoctor = null;
    let selectedSlot = null;
    for (const entry of rankedDoctors) {
      const availableSlots = getAvailableSlotsForDate(store, entry.doctor.id, date);
      const sortedByPreference = preferredTime
        ? [...availableSlots].sort(
            (left, right) =>
              Math.abs(parseTimeToMinutes(left) - parseTimeToMinutes(preferredTime)) -
              Math.abs(parseTimeToMinutes(right) - parseTimeToMinutes(preferredTime))
          )
        : availableSlots;

      const freeSlot = sortedByPreference.find((slot) => !hasUserConflict(store, user.id, date, slot));
      if (freeSlot) {
        selectedDoctor = entry.doctor;
        selectedSlot = freeSlot;
        break;
      }
    }

    if (!selectedDoctor || !selectedSlot) {
      return sendJson(res, 409, { error: 'No smart slot available for the selected preferences.' });
    }

    const appointment = {
      id: parseId('a'),
      userId: user.id,
      doctorId: selectedDoctor.id,
      date,
      time: selectedSlot,
      status: 'scheduled',
      reason
    };

    store.appointments.push(appointment);
    await writeStore(store);
    return sendJson(res, 201, {
      appointment: attachDoctorData(appointment, store),
      smart: {
        matchedSymptom: symptom || null,
        selectedSlot
      }
    });
  }

  if (
    req.method === 'GET' &&
    url.pathname.startsWith('/api/doctors/') &&
    url.pathname.split('/').length === 4
  ) {
    const doctorId = url.pathname.split('/')[3];
    const doctor = findDoctor(store, doctorId);
    if (!doctor) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const favorite = (store.favorites[user.id] || []).includes(doctor.id);
    return sendJson(res, 200, { doctor: { ...doctor, favorite } });
  }

  if (req.method === 'GET' && url.pathname === '/api/favorites') {
    const ids = store.favorites[user.id] || [];
    const doctors = ids.map((id) => findDoctor(store, id)).filter(Boolean);
    return sendJson(res, 200, { doctors });
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/favorites/')) {
    const doctorId = url.pathname.split('/')[3];
    if (!findDoctor(store, doctorId)) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const current = new Set(store.favorites[user.id] || []);
    if (current.has(doctorId)) {
      current.delete(doctorId);
    } else {
      current.add(doctorId);
    }

    store.favorites[user.id] = [...current];
    await writeStore(store);

    return sendJson(res, 200, {
      favoriteDoctorIds: store.favorites[user.id],
      changedDoctorId: doctorId,
      isFavorite: current.has(doctorId)
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/appointments') {
    const status = (url.searchParams.get('status') || '').toLowerCase();
    const appointments = store.appointments
      .filter((entry) => entry.userId === user.id)
      .filter((entry) => !status || entry.status === status)
      .map((entry) => attachDoctorData(entry, store));

    return sendJson(res, 200, { appointments });
  }

  if (req.method === 'POST' && url.pathname === '/api/appointments') {
    const body = await parseJsonBody(req);
    if (!body || !body.doctorId || !body.date || !body.time) {
      return sendJson(res, 400, { error: 'doctorId, date and time are required.' });
    }

    const doctor = findDoctor(store, body.doctorId);
    if (!doctor) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const availableSlots = getAvailableSlotsForDate(store, doctor.id, body.date);
    if (!availableSlots.includes(body.time)) {
      return sendJson(res, 409, {
        error: 'Selected time is not available. Please choose an open slot from doctor schedule.'
      });
    }

    if (hasUserConflict(store, user.id, body.date, body.time)) {
      return sendJson(res, 409, {
        error: 'You already have a scheduled appointment at this time.'
      });
    }

    const appointment = {
      id: parseId('a'),
      userId: user.id,
      doctorId: body.doctorId,
      date: body.date,
      time: body.time,
      status: 'scheduled',
      reason: body.reason || 'General consultation'
    };

    store.appointments.push(appointment);
    await writeStore(store);
    return sendJson(res, 201, { appointment: attachDoctorData(appointment, store) });
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/appointments/')) {
    const appointmentId = url.pathname.split('/')[3];
    const body = await parseJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid payload.' });
    }

    const appointment = store.appointments.find(
      (entry) => entry.id === appointmentId && entry.userId === user.id
    );

    if (!appointment) {
      return sendJson(res, 404, { error: 'Appointment not found.' });
    }

    const nextStatus =
      body.status && ['scheduled', 'completed', 'cancelled'].includes(body.status)
        ? body.status
        : appointment.status;
    const nextDate = body.date || appointment.date;
    const nextTime = body.time || appointment.time;

    if (nextStatus === 'scheduled') {
      const availableSlots = getAvailableSlotsForDate(store, appointment.doctorId, nextDate, {
        ignoreAppointmentId: appointment.id
      });
      if (!availableSlots.includes(nextTime)) {
        return sendJson(res, 409, {
          error: 'Reschedule failed because this doctor slot is no longer available.'
        });
      }

      if (hasUserConflict(store, user.id, nextDate, nextTime, appointment.id)) {
        return sendJson(res, 409, {
          error: 'You already have another scheduled appointment at this time.'
        });
      }
    }

    if (body.status && ['scheduled', 'completed', 'cancelled'].includes(body.status)) {
      appointment.status = body.status;
    }

    if (body.date) {
      appointment.date = body.date;
    }

    if (body.time) {
      appointment.time = body.time;
    }

    if (body.reason) {
      appointment.reason = body.reason;
    }

    await writeStore(store);
    return sendJson(res, 200, { appointment: attachDoctorData(appointment, store) });
  }

  if (req.method === 'GET' && url.pathname === '/api/chats') {
    return sendJson(res, 200, { chats: buildChatList(store, user.id) });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/chats/') && url.pathname.endsWith('/messages')) {
    const parts = url.pathname.split('/');
    const doctorId = parts[3];
    if (!findDoctor(store, doctorId)) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    return sendJson(res, 200, {
      doctor: findDoctor(store, doctorId),
      messages: store.chats[doctorId] || []
    });
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/chats/') && url.pathname.endsWith('/messages')) {
    const doctorId = url.pathname.split('/')[3];
    const doctor = findDoctor(store, doctorId);
    if (!doctor) {
      return sendJson(res, 404, { error: 'Doctor not found.' });
    }

    const body = await parseJsonBody(req);
    if (!body || !body.text || !String(body.text).trim()) {
      return sendJson(res, 400, { error: 'Message text is required.' });
    }

    if (!store.chats[doctorId]) {
      store.chats[doctorId] = [];
    }

    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const userMessage = {
      id: parseId('m'),
      sender: 'user',
      text: String(body.text).trim(),
      time
    };

    store.chats[doctorId].push(userMessage);
    store.chats[doctorId].push({
      id: parseId('m'),
      sender: 'doctor',
      text: 'Thanks for sharing. Please book a slot if symptoms continue.',
      time
    });

    await writeStore(store);
    return sendJson(res, 201, {
      messages: store.chats[doctorId]
    });
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

async function serveStatic(req, res, url) {
  let pathname = url.pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, 'Forbidden');
  }

  try {
    const content = await fs.readFile(safePath);
    const ext = path.extname(safePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': content.length
    });
    res.end(content);
  } catch (_err) {
    if (pathname !== '/index.html') {
      try {
        const fallback = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': fallback.length
        });
        return res.end(fallback);
      } catch (_fallbackErr) {
        return sendText(res, 404, 'Not found');
      }
    }

    return sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (err) {
      sendJson(res, 500, {
        error: 'Unexpected server error.',
        details: err.message
      });
    }
    return;
  }

  try {
    await serveStatic(req, res, url);
  } catch (err) {
    sendText(res, 500, `Static server error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Doctor appointment app running at http://localhost:${PORT}`);
});
