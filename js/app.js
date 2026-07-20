// ─── Logo ────────────────────────────────────────────────────────────────────
/* Print Minas - Gestão de Frota | Desenvolvido por Kaio Eduardo de Oliveira Barbosa */
const LOGO_BASE64 = "data:image/png;base64,PLACEHOLDER_LOGO_BASE64";
function hasValidLogo() { return typeof LOGO_BASE64 === 'string' && LOGO_BASE64.startsWith('data:image') && !LOGO_BASE64.includes('PLACEHOLDER'); }
function safeAddLogo(doc, x, y, w, h) { if (!hasValidLogo()) return; try { doc.addImage(LOGO_BASE64, 'PNG', x, y, w, h); } catch (err) { console.warn('Logo error', err); } }

// ─── jsPDF loader ────────────────────────────────────────────────────────────
const JSPDF_SOURCES = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'];
let _jsPDFLoading = null;
function _loadScriptFromSources(sources, index = 0) {
  return new Promise((resolve, reject) => {
    if (index >= sources.length) { reject(new Error('Falha ao carregar jsPDF.')); return; }
    const s = document.createElement('script'); s.src = sources[index];
    s.onload = () => window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : _loadScriptFromSources(sources, index + 1).then(resolve, reject);
    s.onerror = () => { console.warn('Falha:', sources[index]); _loadScriptFromSources(sources, index + 1).then(resolve, reject); };
    document.head.appendChild(s);
  });
}
function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (_jsPDFLoading) return _jsPDFLoading;
  _jsPDFLoading = _loadScriptFromSources(JSPDF_SOURCES).catch(err => { _jsPDFLoading = null; throw err; });
  return _jsPDFLoading;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const TAB_ORDER = ['visao', 'viagem', 'registros', 'motoristas', 'ocorrencias', 'relatorio'];
let activeTab = 'visao', alertMsg = null;
const ADMIN_EMAIL = String(_cfg?.ADMIN_EMAIL || 'suporte@printminas.com.br').trim().toLowerCase();
let adminSession = null;
function isAdmin() { return !!adminSession; }
function updateAdminAccess() { document.body.classList.toggle('admin-mode', isAdmin()); const button = document.getElementById('admin-access'); if (!button) return; button.classList.toggle('is-admin', isAdmin()); button.innerHTML = (isAdmin() ? '<i class="ti ti-shield-check"></i><span>Modo administrador</span>' : '<i class="ti ti-lock"></i><span>Área administrativa</span>') + '<span class="brand-pop" aria-hidden="true"><img src="assets/logo-printminas.png" alt=""></span>'; }
async function loadAdminSession() { if (!supabaseClient) return; const { data } = await supabaseClient.auth.getSession(); const email = data.session?.user?.email?.toLowerCase(); adminSession = email === ADMIN_EMAIL ? data.session : null; if (data.session && !adminSession) await supabaseClient.auth.signOut(); updateAdminAccess(); }
function adminOnly() { if (isAdmin()) return true; showAlert('Acesso restrito ao administrador.', 'error'); return false; }
function openAdminAccess() {
  if (isAdmin()) { document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal admin-modal"><div class="modal-title">Área administrativa<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="admin-badge"><i class="ti ti-shield-check"></i></div><h3>Você está no modo administrador</h3><p>' + escapeHTML(ADMIN_EMAIL) + '</p><button class="btn btn-secondary" style="width:100%" onclick="adminSignOut()"><i class="ti ti-logout"></i> Sair do modo administrador</button></div></div>'; return; }
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal admin-modal"><div class="modal-title">Acesso administrativo<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="admin-badge"><i class="ti ti-lock"></i></div><h3>Entrar para editar</h3><p>Somente o administrador pode alterar ou excluir registros.</p><div class="field"><label>E-mail</label><input type="email" id="admin-email" value="' + escapeHTML(ADMIN_EMAIL) + '" autocomplete="username"></div><div class="field"><label>Senha</label><input type="password" id="admin-password" autocomplete="current-password" placeholder="Digite sua senha"></div><button class="btn btn-primary" style="width:100%" onclick="adminSignIn(this)"><i class="ti ti-login"></i> Entrar como administrador</button></div></div>';
}
async function adminSignIn(button) { if (!supabaseClient) { showAlert('Login indisponível: Supabase não configurado.', 'error'); return; } const email = document.getElementById('admin-email').value.trim().toLowerCase(), password = document.getElementById('admin-password').value; if (email !== ADMIN_EMAIL) { showAlert('Este e-mail não possui acesso administrativo.', 'error'); return; } setBusy(button, true, 'Entrando...'); const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); setBusy(button, false); if (error || !data.session) { showAlert('Não foi possível entrar. Confira e-mail e senha.', 'error'); return; } adminSession = data.session; closeModal(); updateAdminAccess(); showAlert('Modo administrador ativado.'); }
async function adminSignOut() { if (supabaseClient) await supabaseClient.auth.signOut(); adminSession = null; closeModal(); updateAdminAccess(); showAlert('Modo administrador encerrado.'); }
let installPrompt = null;
function setupPWA() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(error => console.warn('PWA service worker:', error));
  const installButton = document.getElementById('install-app');
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; if (installButton) installButton.hidden = false; });
  installButton?.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; });
  window.addEventListener('online', async () => { const result = await DB.syncPending(); if (result.synced) showAlert(result.synced + ' registro(s) sincronizado(s).'); await refreshFromServer(); });
  window.addEventListener('focus', () => refreshFromServer());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshFromServer(); });
  setInterval(() => { const editing = document.activeElement?.matches('input,textarea,select'); if (document.visibilityState === 'visible' && !editing) refreshFromServer(); }, 30000);
}
let remoteRefreshPromise = null;
async function refreshFromServer() {
  if (!USE_SUPABASE || !navigator.onLine) return false;
  if (remoteRefreshPromise) return remoteRefreshPromise;
  remoteRefreshPromise = (async () => {
    const pending = await DB.syncPending();
    if (pending.pending) return false;
    await DB.syncFromRemote();
    showTab(activeTab);
    return true;
  })().catch(error => { console.warn('Falha ao atualizar dados do servidor:', error); return false; }).finally(() => { remoteRefreshPromise = null; });
  return remoteRefreshPromise;
}
function applyTheme(theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark');
  localStorage.setItem('pm_theme', theme);
  const button = document.getElementById('theme-toggle');
  if (button) { button.innerHTML = theme === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon-stars"></i>'; button.title = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'; }
}
function setupTheme() { applyTheme(localStorage.getItem('pm_theme') || 'light'); }
function toggleTheme() { applyTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark'); }

// Todo texto informado pelo usuário passa por esta função antes de entrar no HTML.
// Isso evita que nomes, observações e descrições sejam interpretados como código.
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function vehicleLabel(vehicle) { return escapeHTML(vehicle || 'Veículo não informado'); }
function openVehicleTrip(vehicle) { return DB.trips().find(trip => trip.vehicle === vehicle && !trip.endTime); }
function vehicleBlock(vehicle) { return DB.incidents().find(incident => incident.vehicle === vehicle && incident.blocksVehicle && incident.status !== 'resolved'); }
function lastVehicleKm(vehicle) {
  const lastTrip = DB.trips().filter(trip => trip.vehicle === vehicle).sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime))[0];
  if (!lastTrip) return null;
  return lastTrip.kmEnd || lastTrip.kmStart || null;
}
function vehicleAvailabilityMessage(vehicle) {
  const trip = openVehicleTrip(vehicle);
  if (trip) return `${vehicle} já está em uso por ${trip.driverName}. Registre a chegada antes de abrir outra viagem.`;
  const incident = vehicleBlock(vehicle);
  if (incident) return `${vehicle} está bloqueado pelo chamado aberto de ${fmtDate(incident.date)}. Resolva o chamado antes de liberar o veículo.`;
  return '';
}
function normalizePlate(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normalizeRenavam(value) { return String(value || '').replace(/\D/g, ''); }
function validPlate(value) { return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(normalizePlate(value)); }
function validRenavam(value) { const renavam = normalizeRenavam(value); return renavam.length >= 9 && renavam.length <= 11; }
function fineQueryValues() { return { plate: normalizePlate(document.getElementById('fine-plate')?.value), renavam: normalizeRenavam(document.getElementById('fine-renavam')?.value) }; }
function validateFineQuery() {
  const { plate, renavam } = fineQueryValues();
  if (!validPlate(plate)) { showAlert('Informe uma placa válida, por exemplo ABC1D23.', 'error'); return null; }
  if (!validRenavam(renavam)) { showAlert('Informe um RENAVAM com 9 a 11 dígitos.', 'error'); return null; }
  return { plate, renavam };
}
function consultOfficialFines() {
  window.open('https://servicos.dnit.gov.br/multas/consulta-multas', '_blank', 'noopener,noreferrer');
  showAlert('Portal do DNIT aberto. Faça login gov.br e informe placa e RENAVAM diretamente nele.', 'success');
}
function openManualFine() {
  openAddIncident();
  document.getElementById('inc-type').value = 'multa';
  document.getElementById('inc-desc').focus();
}

function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach((b, i) => b.classList.toggle('active', TAB_ORDER[i] === tab));
  const c = document.getElementById('main-content');
  const renders = { visao: renderVisaoGeral, viagem: renderViagem, registros: renderRegistros, motoristas: renderMotoristas, ocorrencias: renderOcorrencias, relatorio: renderRelatorio };
  renders[tab] && renders[tab](c);
  enhanceSelects(c);
}

function enhanceSelects(root = document) {
  if (window.matchMedia('(max-width: 640px)').matches) return;
  root.querySelectorAll('select:not([data-custom-select])').forEach(select => {
    select.dataset.customSelect = 'true';
    const wrap = document.createElement('div'), trigger = document.createElement('button'), menu = document.createElement('div');
    wrap.className = 'custom-select'; trigger.type = 'button'; trigger.className = 'custom-select-trigger'; menu.className = 'custom-select-menu';
    select.parentNode.insertBefore(wrap, select); wrap.appendChild(select); wrap.appendChild(trigger); wrap.appendChild(menu);
    const sync = () => { const option = select.options[select.selectedIndex]; trigger.innerHTML = '<span>' + escapeHTML(option?.text || 'Selecione') + '</span><i class="ti ti-chevron-down"></i>'; menu.querySelectorAll('button').forEach(button => button.classList.toggle('selected', button.dataset.value === select.value)); };
    Array.from(select.options).forEach(option => { const item = document.createElement('button'); item.type = 'button'; item.dataset.value = option.value; item.textContent = option.text; item.disabled = option.disabled; item.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); sync(); wrap.classList.remove('open'); }); menu.appendChild(item); });
    trigger.addEventListener('click', () => { document.querySelectorAll('.custom-select.open').forEach(item => { if (item !== wrap) item.classList.remove('open'); }); wrap.classList.toggle('open'); });
    select.addEventListener('change', sync); sync();
  });
}
document.addEventListener('click', event => { if (!event.target.closest('.custom-select')) document.querySelectorAll('.custom-select.open').forEach(item => item.classList.remove('open')); });

function showAlert(msg, type = 'success') {
  alertMsg = { msg, type }; showTab(activeTab);
  setTimeout(() => { alertMsg = null; const el = document.querySelector('.alert'); if (el && el.parentNode) el.parentNode.removeChild(el); }, 2800);
}
function alertHTML() {
  if (!alertMsg) return '';
  return '<div class="alert alert-' + alertMsg.type + '"><i class="ti ti-' + (alertMsg.type === 'success' ? 'check' : 'alert-circle') + '"></i>' + escapeHTML(alertMsg.msg) + '</div>';
}
function pageHero(icon, eyebrow, title, description, badge = '') {
  return '<div class="report-hero page-hero"><div><p class="report-eyebrow"><i class="ti ' + icon + '"></i> ' + escapeHTML(eyebrow) + '</p><h2>' + escapeHTML(title) + '</h2><p>' + escapeHTML(description) + '</p></div>' + (badge ? '<span class="report-period">' + escapeHTML(badge) + '</span>' : '') + '</div>';
}

let _saving = false;
function setBusy(btn, busy, busyLabel) {
  if (!btn) return;
  if (busy) { btn._oldHTML = btn.innerHTML; btn.disabled = true; btn.innerHTML = busyLabel || 'Salvando...'; }
  else { btn.disabled = false; if (btn._oldHTML) btn.innerHTML = btn._oldHTML; }
}

// ─── VISÃO GERAL ─────────────────────────────────────────────────────────────
function renderVisaoGeral(c) {
  const drivers = DB.drivers(), trips = DB.trips(), incidents = DB.incidents();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeDrivers = drivers.filter(d => d.status === 'ativo').length;
  const openTrips = trips.filter(t => !t.endTime).length;
  const tripsToday = trips.filter(t => t.startTime && t.startTime.startsWith(today)).length;
  const monthTrips = trips.filter(t => t.startTime && t.startTime.startsWith(currentMonth));
  const monthKm = calcKm(monthTrips);
  const monthIncidents = incidents.filter(i => i.date && i.date.startsWith(currentMonth)).length;
  const openBlocks = incidents.filter(i => i.blocksVehicle && i.status !== 'resolved').length;

  const tripEvents = trips.map(t => ({
    kind: t.endTime ? 'trip-closed' : 'trip-open',
    date: t.endTime || t.startTime,
    title: vehicleLabel(t.vehicle) + ' \u00b7 ' + (t.endTime ? 'retorno registrado' : 'sa\u00edda registrada'),
    meta: escapeHTML(t.driverName) + ' \u00b7 ' + fmtDate(t.startTime) + (t.destination ? ' \u00b7 ' + escapeHTML(t.destination) : ''),
    badge: t.endTime ? 'Conclu\u00edda' : 'Em aberto'
  }));
  const incidentEvents = incidents.map(i => ({
    kind: 'incident', date: i.date,
    title: vehicleLabel(i.vehicle) + ' \u00b7 ocorr\u00eancia registrada',
    meta: escapeHTML(i.driverName) + ' \u00b7 ' + fmtDate(i.date),
    badge: i.type === 'multa' ? 'Multa' : i.type === 'acidente' ? 'Acidente' : i.type === 'chamado' ? 'Chamado' : 'Ocorr\u00eancia'
  }));
  const feed = [...tripEvents, ...incidentEvents].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  function iconFor(ev) {
    if (ev.kind === 'trip-open') return '<div class="activity-icon ic-blue"><i class="ti ti-map-pin"></i></div>';
    if (ev.kind === 'trip-closed') return '<div class="activity-icon ic-green"><i class="ti ti-check"></i></div>';
    return '<div class="activity-icon ic-coral"><i class="ti ti-alert-triangle"></i></div>';
  }
  function badgeStyleFor(ev) {
    if (ev.kind === 'trip-open') return 'background:#E6F1FB;color:#185FA5';
    if (ev.kind === 'trip-closed') return 'background:#EAF3DE;color:#3B6D11';
    return 'background:#FAECE7;color:#993C1D';
  }

  const ongoingRoutes = trips.filter(t => !t.endTime).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  c.innerHTML = alertHTML() + '<section class="overview-panel">' + pageHero('ti-layout-dashboard', 'Painel operacional', 'Visão geral', 'Acompanhe a frota, rotas e atividades recentes.', 'Hoje') +
    '<div class="stat-grid-ov">' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'motoristas\')" title="Ver motoristas"><div class="stat-icon ic-blue"><i class="ti ti-users"></i></div><p class="stat-num-ov">' + activeDrivers + '</p><p class="stat-label-ov">Motoristas ativos</p></button>' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'viagem\')" title="Ver viagens em aberto"><div class="stat-icon ic-amber"><i class="ti ti-clock"></i></div><p class="stat-num-ov">' + openTrips + '</p><p class="stat-label-ov">Viagens em aberto</p></button>' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'registros\')" title="Ver registros"><div class="stat-icon ic-green"><i class="ti ti-route"></i></div><p class="stat-num-ov">' + tripsToday + '</p><p class="stat-label-ov">Viagens hoje</p></button>' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'registros\')" title="Ver quilometragem"><div class="stat-icon ic-blue"><i class="ti ti-gauge"></i></div><p class="stat-num-ov">' + monthKm + '</p><p class="stat-label-ov">Km rodados no m\u00eas</p></button>' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'ocorrencias\')" title="Ver ocorrências"><div class="stat-icon ic-coral"><i class="ti ti-alert-triangle"></i></div><p class="stat-num-ov">' + monthIncidents + '</p><p class="stat-label-ov">Ocorr\u00eancias no m\u00eas</p></button>' +
    '<button class="stat-card-ov stat-action" onclick="showTab(\'ocorrencias\')" title="Ver chamados que bloqueiam veículos"><div class="stat-icon ic-coral"><i class="ti ti-lock"></i></div><p class="stat-num-ov">' + openBlocks + '</p><p class="stat-label-ov">Ve\u00edculos bloqueados</p></button>' +
    '</div></section>' +
    (ongoingRoutes.length ? '<div class="activity-card ongoing-routes-card"><div class="activity-title"><span><i class="ti ti-progress-check"></i> Rotas em andamento</span><button class="btn btn-secondary btn-sm" onclick="showTab(\'viagem\')">Ver rotas</button></div>' + ongoingRoutes.map(t => '<button class="ongoing-route" onclick="showTab(\'viagem\')"><span class="ongoing-route-icon"><i class="ti ti-route-2"></i></span><span class="ongoing-route-info"><strong>' + escapeHTML(t.driverName) + '</strong><small>' + escapeHTML(vehicleLabel(t.vehicle)) + (t.client ? ' · ' + escapeHTML(t.client) : t.destination ? ' · ' + escapeHTML(t.destination) : '') + '</small></span><span class="ongoing-route-time">há ' + formatElapsedTime(t.startTime) + '</span><i class="ti ti-chevron-right"></i></button>').join('') + '</div>' : '') +
    '<div class="activity-card">' +
    '<p class="activity-title">Atividades recentes</p>' +
    (feed.length === 0 ? '<div class="empty"><i class="ti ti-map-off"></i>Nenhuma atividade registrada ainda</div>' :
      feed.map(ev => '<div class="activity-row">' + iconFor(ev) + '<div class="activity-info"><p class="activity-name">' + ev.title + '</p><p class="activity-meta">' + ev.meta + '</p></div><span class="activity-badge" style="' + badgeStyleFor(ev) + '">' + ev.badge + '</span></div>').join('')) +
    '</div>';
}

// ─── Photo preview ────────────────────────────────────────────────────────────
const PHOTO_MAX_DIM = 1280, PHOTO_QUALITY = 0.6;
function previewPhoto(input, previewId) {
  const file = input.files[0]; if (!file) return;
  const img = document.getElementById(previewId);
  const reader = new FileReader();
  reader.onload = e => {
    const t = new Image();
    t.onload = () => { try { img.src = compressImage(t); img.style.display = 'block'; } catch (err) { img.src = e.target.result; img.style.display = 'block'; } };
    t.onerror = () => { img.src = e.target.result; img.style.display = 'block'; };
    t.src = e.target.result;
  };
  reader.onerror = () => alert('N\u00e3o foi poss\u00edvel ler a foto. Tente novamente.');
  reader.readAsDataURL(file);
}
function compressImage(img) {
  let { width, height } = img;
  if (width > PHOTO_MAX_DIM || height > PHOTO_MAX_DIM) { if (width > height) { height = Math.round(height * (PHOTO_MAX_DIM / width)); width = PHOTO_MAX_DIM; } else { width = Math.round(width * (PHOTO_MAX_DIM / height)); height = PHOTO_MAX_DIM; } }
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
}
function closeModal() { document.getElementById('modal-container').innerHTML = ''; }

// ─── NOVA VIAGEM ──────────────────────────────────────────────────────────────
function renderViagem(c) {
  const drivers = DB.drivers().filter(d => d.status === 'ativo');
  const openTrips = DB.trips().filter(t => !t.endTime);
  c.innerHTML = alertHTML() + pageHero('ti-route', 'Operação externa', 'Nova rota', 'Registre a saída para um novo atendimento.', 'Rotas') +
    (openTrips.length ? '<div class="card"><div class="card-title"><i class="ti ti-progress-check"></i> Atendimento em andamento</div>' +
      openTrips.map(t => '<div class="trip-row clickable-card" role="button" tabindex="0" onclick="confirmFinishRoute(' + t.id + ')"><div class="trip-header"><div><div class="trip-name">' + escapeHTML(t.driverName) + '</div><div class="trip-meta"><span><i class="ti ti-car"></i>' + vehicleLabel(t.vehicle) + '</span><span><i class="ti ti-hash"></i>OS: ' + escapeHTML(t.os || '-') + '</span><span><i class="ti ti-building"></i>' + escapeHTML(t.destination || '-') + '</span><span><i class="ti ti-clock"></i>' + fmt(t.startTime) + '</span></div></div><span class="tag tag-open">Em atendimento</span></div><p class="card-tap-hint"><i class="ti ti-hand-click"></i> Toque para finalizar esta rota</p></div>').join('') +
      '</div>' : '') +
    '<div class="card"><div class="card-title"><i class="ti ti-route"></i> Nova rota</div>' +
    '<div class="field"><label>Motorista</label><select id="v-driver"><option value="">Selecione o motorista...</option>' +
    drivers.map(d => '<option value="' + d.id + '">' + escapeHTML(d.name) + '</option>').join('') +
    '</select></div>' +
    '<div class="row"><div class="field"><label>Ve\u00edculo</label><select id="v-vehicle" onchange="updateVehicleAvailability()"><option value="FIORINO">FIORINO</option><option value="STRADA">STRADA</option></select><p id="vehicle-availability" class="vehicle-status"></p></div>' +
    '<div class="field"><label>OS / chamado</label><input type="text" id="v-os" placeholder="Ex: OS-2024-001"></div></div>' +
    '<div class="row"><div class="field"><label>Data de sa\u00edda</label><input type="date" id="v-date" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
    '<div class="field"><label>Hor\u00e1rio de sa\u00edda</label><input type="time" id="v-time" value="' + new Date().toTimeString().slice(0, 5) + '"></div></div>' +
    '<div class="row"><div class="field"><label>Cliente</label><input type="text" id="v-client" placeholder="Nome do cliente"></div><div class="field"><label>Local do atendimento</label><input type="text" id="v-dest" placeholder="Endereço, cidade ou unidade"></div></div>' +
    '<div class="field"><label>KM de sa\u00edda</label><input type="number" id="v-km-start" min="0" placeholder="Ex: 45230"><p id="vehicle-last-km" class="vehicle-status"></p></div>' +
    '<div class="field"><label>Foto do painel (KM de sa\u00edda)</label>' +
    '<div class="photo-area" onclick="document.getElementById(\'v-photo-start\').click()"><i class="ti ti-camera" style="font-size:26px;display:block;margin-bottom:6px"></i>Toque para tirar foto do painel<input type="file" id="v-photo-start" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,\'prev-start\')"></div>' +
    '<img id="prev-start" class="photo-preview" style="display:none"></div>' +
    '<div class="field"><label>Detalhes do atendimento</label><textarea id="v-obs" placeholder="Serviço previsto, equipamentos envolvidos ou observações iniciais..."></textarea></div>' +
    '<button class="btn btn-primary btn-operation-start" id="start-trip-button" style="width:100%" onclick="startTrip(this)"><i class="ti ti-player-play"></i> Iniciar deslocamento para o atendimento</button></div>';
  renderAttendanceTimer(c, openTrips);
  updateVehicleAvailability();
}

let attendanceTimerInterval = null;
function formatElapsedTime(startTime) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), mins = minutes % 60;
  return (days ? days + 'd ' : '') + (hours ? hours + 'h ' : '') + mins + 'min';
}
function renderAttendanceTimer(container, trips) {
  if (attendanceTimerInterval) { clearInterval(attendanceTimerInterval); attendanceTimerInterval = null; }
  if (!trips.length) return;
  const title = [...container.querySelectorAll('.card-title')].find(item => item.textContent.toLowerCase().includes('atendimento em andamento'));
  if (!title) return;
  const oldest = [...trips].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
  title.insertAdjacentHTML('afterend', '<div class="attendance-timer"><span class="attendance-timer-dot"></span><span>Em atendimento há</span><strong id="attendance-elapsed"></strong>' + (trips.length > 1 ? '<small>' + trips.length + ' rotas abertas</small>' : '') + '</div>');
  const update = () => { const target = document.getElementById('attendance-elapsed'); if (target) target.textContent = formatElapsedTime(oldest.startTime); else clearInterval(attendanceTimerInterval); };
  update(); attendanceTimerInterval = setInterval(update, 60000);
}

function updateVehicleAvailability() {
  const vehicle = document.getElementById('v-vehicle')?.value;
  const status = document.getElementById('vehicle-availability');
  const button = document.getElementById('start-trip-button');
  if (!vehicle || !status || !button) return;
  const message = vehicleAvailabilityMessage(vehicle);
  status.textContent = message || vehicle + ' disponível para uma nova viagem.';
  status.className = 'vehicle-status ' + (message ? 'vehicle-status-blocked' : 'vehicle-status-ok');
  button.disabled = Boolean(message);
  const kmInput = document.getElementById('v-km-start');
  const kmHint = document.getElementById('vehicle-last-km');
  const lastKm = lastVehicleKm(vehicle);
  if (kmInput) { kmInput.value = lastKm || ''; }
  if (kmHint) { kmHint.textContent = lastKm ? 'Último KM registrado para ' + vehicle + ': ' + lastKm + '. Você pode corrigir se necessário.' : 'Ainda não há KM registrado para ' + vehicle + '.'; kmHint.className = 'vehicle-status vehicle-status-ok'; }
}

async function startTrip(btn) {
  if (_saving) return;
  const driverId = document.getElementById('v-driver').value;
  if (!driverId) { alert('Selecione o motorista!'); return; }
  const driver = DB.drivers().find(d => d.id == driverId);
  const vehicle = document.getElementById('v-vehicle').value;
  const availability = vehicleAvailabilityMessage(vehicle);
  if (availability) { showAlert(availability, 'error'); updateVehicleAvailability(); return; }
  const date = document.getElementById('v-date').value, time = document.getElementById('v-time').value;
  const photo = document.getElementById('prev-start');
  const trip = { id: genId(), driverId: parseInt(driverId), driverName: driver.name, vehicle, os: document.getElementById('v-os').value.trim(), client: document.getElementById('v-client').value.trim(), destination: document.getElementById('v-dest').value.trim(), startTime: new Date(date + 'T' + time).toISOString(), endTime: null, kmStart: document.getElementById('v-km-start').value, kmEnd: null, photoStart: photo && photo.style.display !== 'none' ? photo.src : null, photoEnd: null, obsStart: document.getElementById('v-obs').value.trim(), obsEnd: '', status: 'open' };
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { const trips = DB.trips(); trips.push(trip); DB.save('trips', trips); if (USE_SUPABASE) { ok = await DB.saveOne('trips', trip); } }
  catch (err) { console.error('Erro ao registrar sa\u00edda:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  if (ok) { await refreshFromServer(); showAlert('Rota iniciada com sucesso!'); }
  else { const detail = window.__LAST_SUPABASE_ERROR__?.message || 'Verifique a conexão e a atualização da tabela no Supabase.'; showAlert('A rota foi salva neste aparelho, mas não no Supabase: ' + detail, 'error'); }
}

function openArrival(tripId) {
  const trip = DB.trips().find(t => t.id === tripId); if (!trip) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Finalizar atendimento<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="operation-meta"><strong>' + escapeHTML(trip.driverName) + '</strong> · ' + escapeHTML(vehicleLabel(trip.vehicle)) + '<div class="trip-meta"><span><i class="ti ti-hash"></i>OS: ' + escapeHTML(trip.os || 'Não informada') + '</span><span><i class="ti ti-user"></i>Cliente: ' + escapeHTML(trip.client || 'Não informado') + '</span><span><i class="ti ti-building"></i>Local: ' + escapeHTML(trip.destination || 'Não informado') + '</span><span><i class="ti ti-clock"></i>Saída: ' + fmtTime(trip.startTime) + '</span></div></div><div class="row"><div class="field"><label>Data de retorno</label><input type="date" id="arr-date" value="' + new Date().toISOString().split('T')[0] + '"></div><div class="field"><label>Horário de retorno</label><input type="time" id="arr-time" value="' + new Date().toTimeString().slice(0, 5) + '"></div></div><div class="field"><label>KM no retorno</label><input type="number" id="arr-km" placeholder="Ex: 45510"></div><div class="field"><label>Foto do painel no retorno</label><div class="photo-area" onclick="document.getElementById(\'arr-photo\').click()"><i class="ti ti-camera" style="font-size:24px;display:block;margin-bottom:5px"></i>Toque para fotografar o painel<input type="file" id="arr-photo" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,\'arr-prev\')"></div><img id="arr-prev" class="photo-preview" style="display:none"></div><div class="field"><label>Resumo do atendimento realizado</label><textarea id="arr-obs" placeholder="Serviço realizado, impressoras atendidas e qualquer ocorrência..."></textarea></div><div style="display:flex;gap:8px;margin-top:4px"><button class="btn btn-primary btn-operation-start" style="flex:1" onclick="closeTrip(' + tripId + ', this)"><i class="ti ti-circle-check"></i> Concluir atendimento e registrar retorno</button><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button></div></div></div>';
}

function confirmFinishRoute(tripId) {
  const trip = DB.trips().find(t => t.id === tripId); if (!trip) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal confirm-modal"><div class="modal-title">Finalizar rota<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="confirm-icon"><i class="ti ti-route-2"></i></div><h3>Deseja finalizar esta rota?</h3><p>' + escapeHTML(trip.client || trip.destination || 'Atendimento em andamento') + '</p><p class="confirm-helper">Você ainda preencherá a data, horário, KM, foto do painel e resumo do atendimento antes de concluir.</p><div class="confirm-actions"><button class="btn btn-primary" onclick="openArrival(' + tripId + ')"><i class="ti ti-arrow-right"></i> Sim, preencher retorno</button><button class="btn btn-secondary" onclick="closeModal()">Não, voltar</button></div></div></div>';
}

async function closeTrip(tripId, btn) {
  if (_saving) return;
  const trips = DB.trips(), trip = trips.find(t => t.id === tripId); if (!trip) return;
  const date = document.getElementById('arr-date').value, time = document.getElementById('arr-time').value;
  const photo = document.getElementById('arr-prev');
  trip.endTime = new Date(date + 'T' + time).toISOString(); trip.kmEnd = document.getElementById('arr-km').value; trip.photoEnd = photo && photo.style.display !== 'none' ? photo.src : null; trip.obsEnd = document.getElementById('arr-obs').value; trip.status = 'closed';
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { DB.save('trips', trips); if (USE_SUPABASE) { ok = await DB.saveOne('trips', trip); } }
  catch (err) { console.error('Erro ao registrar chegada:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  closeModal();
  if (ok) { await refreshFromServer(); showAlert('Rota finalizada com sucesso!'); }
  else { const detail = window.__LAST_SUPABASE_ERROR__?.message || 'Verifique a conexão e a atualização da tabela no Supabase.'; showAlert('O retorno foi salvo neste aparelho, mas não no Supabase: ' + detail, 'error'); }
}

function inputDateTime(value) {
  if (!value) return { date: '', time: '' };
  const d = new Date(value), pad = n => String(n).padStart(2, '0');
  return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
}
function editTrip(tripId) {
  if (!adminOnly()) return;
  const trip = DB.trips().find(t => t.id === tripId); if (!trip) return;
  const start = inputDateTime(trip.startTime), end = inputDateTime(trip.endTime);
  const driverOptions = DB.drivers().map(driver => '<option value="' + driver.id + '" ' + (driver.id === trip.driverId ? 'selected' : '') + '>' + escapeHTML(driver.name) + '</option>').join('');
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal modal-wide"><div class="modal-title">Editar registro<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><p class="fine-note">Toda alteração exige um motivo e ficará registrada no histórico.</p><div class="row"><div class="field"><label>Motorista</label><select id="e-driver">' + driverOptions + '</select></div><div class="field"><label>Veículo</label><select id="e-vehicle"><option value="FIORINO" ' + (trip.vehicle === 'FIORINO' ? 'selected' : '') + '>FIORINO</option><option value="STRADA" ' + (trip.vehicle === 'STRADA' ? 'selected' : '') + '>STRADA</option></select></div></div><div class="row"><div class="field"><label>Data de saída</label><input type="date" id="e-date" value="' + start.date + '"></div><div class="field"><label>Hora de saída</label><input type="time" id="e-time" value="' + start.time + '"></div></div><div class="row"><div class="field"><label>Data de chegada</label><input type="date" id="e-end-date" value="' + end.date + '"></div><div class="field"><label>Hora de chegada</label><input type="time" id="e-end-time" value="' + end.time + '"></div></div><div class="row"><div class="field"><label>KM de saída</label><input type="number" id="e-km" min="0" value="' + escapeHTML(trip.kmStart || '') + '"></div><div class="field"><label>KM de chegada</label><input type="number" id="e-end-km" min="0" value="' + escapeHTML(trip.kmEnd || '') + '"></div></div><div class="row"><div class="field"><label>Cliente</label><input type="text" id="e-client" value="' + escapeHTML(trip.client || '') + '"></div><div class="field"><label>Local do atendimento</label><input type="text" id="e-dest" value="' + escapeHTML(trip.destination || '') + '"></div></div><div class="field"><label>Nº OS</label><input type="text" id="e-os" value="' + escapeHTML(trip.os || '') + '"></div><div class="field"><label>Observações de saída</label><textarea id="e-obs">' + escapeHTML(trip.obsStart || '') + '</textarea></div><div class="field"><label>Observações de chegada</label><textarea id="e-end-obs">' + escapeHTML(trip.obsEnd || '') + '</textarea></div><div class="field"><label>Motivo da alteração *</label><textarea id="e-reason" maxlength="500" placeholder="Explique o que foi corrigido e por quê."></textarea></div><div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="saveEdit(' + tripId + ', this)"><i class="ti ti-check"></i> Salvar alteração</button><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button></div></div></div>';
}

function changedTripFields(before, after) {
  const labels = { driverId: 'motorista', vehicle: 'veículo', startTime: 'data/hora de saída', endTime: 'data/hora de chegada', kmStart: 'KM de saída', kmEnd: 'KM de chegada', client: 'cliente', destination: 'local do atendimento', os: 'número da OS', obsStart: 'observações de saída', obsEnd: 'observações de chegada' };
  return Object.keys(labels).filter(key => String(before[key] ?? '') !== String(after[key] ?? '')).map(key => labels[key]);
}
async function saveEdit(tripId, btn) {
  if (!adminOnly()) return;
  if (_saving) return;
  const trips = DB.trips(), trip = trips.find(t => t.id === tripId); if (!trip) return;
  const reason = document.getElementById('e-reason').value.trim();
  if (!reason) { showAlert('Informe o motivo da alteração antes de salvar.', 'error'); return; }
  const driver = DB.drivers().find(item => item.id == document.getElementById('e-driver').value);
  const startDate = document.getElementById('e-date').value, startTime = document.getElementById('e-time').value, endDate = document.getElementById('e-end-date').value, endTime = document.getElementById('e-end-time').value;
  if (!driver || !startDate || !startTime) { showAlert('Preencha motorista, data e hora de saída.', 'error'); return; }
  if (Boolean(endDate) !== Boolean(endTime)) { showAlert('Preencha data e hora de chegada juntas, ou deixe ambas vazias.', 'error'); return; }
  const updated = { ...trip, driverId: driver.id, driverName: driver.name, vehicle: document.getElementById('e-vehicle').value, startTime: new Date(startDate + 'T' + startTime).toISOString(), endTime: endDate ? new Date(endDate + 'T' + endTime).toISOString() : null, kmStart: document.getElementById('e-km').value, kmEnd: document.getElementById('e-end-km').value, client: document.getElementById('e-client').value.trim(), destination: document.getElementById('e-dest').value.trim(), os: document.getElementById('e-os').value.trim(), obsStart: document.getElementById('e-obs').value.trim(), obsEnd: document.getElementById('e-end-obs').value.trim(), status: endDate ? 'closed' : 'open' };
  if (updated.endTime && new Date(updated.endTime) < new Date(updated.startTime)) { showAlert('A chegada não pode ocorrer antes da saída.', 'error'); return; }
  if (updated.kmStart && updated.kmEnd && Number(updated.kmEnd) < Number(updated.kmStart)) { showAlert('O KM de chegada não pode ser menor que o KM de saída.', 'error'); return; }
  const fields = changedTripFields(trip, updated);
  if (!fields.length) { showAlert('Nenhum campo foi alterado.', 'error'); return; }
  updated.changeLog = [...(Array.isArray(trip.changeLog) ? trip.changeLog : []), { at: new Date().toISOString(), reason, fields }];
  Object.assign(trip, updated);
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { DB.save('trips', trips); if (USE_SUPABASE) { ok = await DB.saveOne('trips', trip); } }
  catch (err) { console.error('Erro ao editar viagem:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  closeModal(); showAlert(ok ? 'Alteração registrada no histórico.' : 'Salvo no aparelho, mas falhou no servidor.', ok ? 'success' : 'error');
}

// ─── REGISTROS ───────────────────────────────────────────────────────────────
let filterDate = '', filterDriver = '';
function filterRegistros() { filterDate = document.getElementById('filter-date')?.value || ''; filterDriver = document.getElementById('filter-driver-val')?.value || ''; renderRegistros(document.getElementById('main-content')); }
function clearFilter() { filterDate = ''; filterDriver = ''; renderRegistros(document.getElementById('main-content')); }

function renderRegistros(c) {
  let trips = [...DB.trips()].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  if (filterDate) trips = trips.filter(t => t.startTime.startsWith(filterDate));
  if (filterDriver) trips = trips.filter(t => t.driverId == filterDriver);
  const km = trips.reduce((s, t) => { if (t.kmStart && t.kmEnd) return s + (parseInt(t.kmEnd) - parseInt(t.kmStart)); return s; }, 0);
  c.innerHTML = alertHTML() + pageHero('ti-list', 'Histórico operacional', 'Registros', 'Consulte as rotas realizadas e em andamento.', trips.length + ' rotas') +
    '<div class="card"><div class="card-title"><i class="ti ti-search"></i> Buscar registros</div>' +
    '<div class="row"><div class="field"><label>Data</label><input type="date" id="filter-date" value="' + filterDate + '" onchange="filterRegistros()"></div>' +
    '<div class="field"><label>Motorista</label><select id="filter-driver-val" onchange="filterRegistros()"><option value="">Todos</option>' +
    DB.drivers().map(d => '<option value="' + d.id + '" ' + (filterDriver == d.id ? 'selected' : '') + '>' + escapeHTML(d.name) + '</option>').join('') +
    '</select></div></div>' +
    (filterDate || filterDriver ? '<button class="btn btn-secondary btn-sm" onclick="clearFilter()"><i class="ti ti-x"></i> Limpar filtro</button>' : '') +
    '</div>' +
    '<div class="stat-grid"><div class="stat"><div class="stat-num">' + trips.length + '</div><div class="stat-label">Viagens</div></div><div class="stat"><div class="stat-num">' + trips.filter(t => t.status === 'open').length + '</div><div class="stat-label">Em aberto</div></div><div class="stat"><div class="stat-num">' + km + '</div><div class="stat-label">KM total</div></div></div>' +
    (trips.length === 0 ? '<div class="empty"><i class="ti ti-map-off"></i>Nenhum registro encontrado</div>' : '') +
    trips.map(t => '<div class="trip-row clickable-card" role="button" tabindex="0" onclick="viewTrip(' + t.id + ')"><div class="trip-header"><div><div class="trip-name">' + escapeHTML(t.driverName) + '</div><div class="trip-meta"><span><i class="ti ti-calendar"></i>' + fmtDate(t.startTime) + '</span><span><i class="ti ti-car"></i>' + vehicleLabel(t.vehicle) + '</span><span><i class="ti ti-hash"></i>OS: ' + escapeHTML(t.os || '-') + '</span><span><i class="ti ti-user"></i>' + escapeHTML(t.client || 'Cliente não informado') + '</span><span><i class="ti ti-map-pin"></i>' + escapeHTML(t.destination || '-') + '</span>' + (t.kmStart ? '<span><i class="ti ti-road"></i>' + t.kmStart + ' → ' + (t.kmEnd || '?') + ' km</span>' : '') + '</div><div class="trip-meta" style="margin-top:4px"><span><i class="ti ti-clock"></i>Saída: ' + fmt(t.startTime) + '</span>' + (t.endTime ? '<span><i class="ti ti-flag"></i>Chegada: ' + fmt(t.endTime) + '</span>' : '') + '</div></div><span class="tag ' + (t.status === 'open' ? 'tag-open' : 'tag-closed') + '">' + (t.status === 'open' ? 'Em atendimento' : 'Concluída') + '</span></div><p class="card-tap-hint"><i class="ti ti-hand-click"></i> Toque para ver os detalhes</p></div>').join('');
}

function viewTrip(tripId) {
  const t = DB.trips().find(item => item.id === tripId); if (!t) return;
  const actions = (t.status === 'open' ? '<button class="btn btn-primary" onclick="confirmFinishRoute(' + t.id + ')"><i class="ti ti-circle-check"></i> Finalizar rota</button>' : '') + (isAdmin() ? '<button class="btn btn-secondary" onclick="editTrip(' + t.id + ')"><i class="ti ti-edit"></i> Editar registro</button><button class="btn btn-danger" onclick="deleteTrip(' + t.id + ')"><i class="ti ti-trash"></i> Excluir registro</button>' : '') + (t.photoStart || t.photoEnd ? '<button class="btn btn-secondary" onclick="viewPhotos(' + t.id + ')"><i class="ti ti-photo"></i> Ver fotos</button>' : '') + (t.changeLog?.length ? '<button class="btn btn-secondary" onclick="viewTripHistory(' + t.id + ')"><i class="ti ti-history"></i> Histórico</button>' : '');
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Detalhes da rota<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="operation-meta"><strong>' + escapeHTML(t.client || 'Cliente não informado') + '</strong><div class="trip-meta"><span><i class="ti ti-hash"></i>OS: ' + escapeHTML(t.os || 'Não informada') + '</span><span><i class="ti ti-map-pin"></i>Local: ' + escapeHTML(t.destination || 'Não informado') + '</span><span><i class="ti ti-car"></i>' + escapeHTML(vehicleLabel(t.vehicle)) + '</span><span><i class="ti ti-road"></i>' + escapeHTML(t.kmStart || '-') + ' → ' + escapeHTML(t.kmEnd || '-') + ' km</span></div></div><div class="confirm-actions">' + actions + '</div></div></div>';
}

function viewTripHistory(tripId) {
  const trip = DB.trips().find(item => item.id === tripId), changes = trip?.changeLog || []; if (!trip || !changes.length) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Histórico de alterações<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>' + changes.slice().reverse().map(change => '<div class="audit-entry"><div><strong>' + fmt(change.at) + '</strong><br><span>Campos: ' + escapeHTML((change.fields || []).join(', ')) + '</span></div><p>' + escapeHTML(change.reason) + '</p></div>').join('') + '</div></div>';
}

async function deleteTrip(id) {
  if (!adminOnly()) return;
  if (!confirm('Excluir este registro permanentemente?')) return;
  const trips = DB.trips().filter(t => t.id !== id); DB.save('trips', trips);
  if (USE_SUPABASE) { await DB.removeOne('trips', id); }
  renderRegistros(document.getElementById('main-content'));
}

function viewPhotos(tripId) {
  const t = DB.trips().find(x => x.id === tripId); if (!t) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal modal-wide photo-modal"><div class="modal-title"><span><i class="ti ti-photo"></i> Fotos da rota</span><button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><p class="photo-modal-subtitle">' + escapeHTML(t.client || t.destination || 'Registro da rota') + ' · ' + fmtDate(t.startTime) + '</p><div class="photo-gallery">' + (t.photoStart ? '<figure class="photo-card"><figcaption><span><i class="ti ti-login"></i> Saída</span><strong>KM ' + escapeHTML(t.kmStart || '—') + '</strong></figcaption><img src="' + t.photoStart + '" alt="Painel na saída" onclick="openPhotoPreview(this.src,\'Painel na saída\')"><p>Toque na foto para ampliar</p></figure>' : '<div class="photo-card photo-missing"><i class="ti ti-camera-off"></i><span>Foto de saída não registrada</span></div>') + (t.photoEnd ? '<figure class="photo-card"><figcaption><span><i class="ti ti-logout"></i> Retorno</span><strong>KM ' + escapeHTML(t.kmEnd || '—') + '</strong></figcaption><img src="' + t.photoEnd + '" alt="Painel no retorno" onclick="openPhotoPreview(this.src,\'Painel no retorno\')"><p>Toque na foto para ampliar</p></figure>' : '<div class="photo-card photo-missing"><i class="ti ti-camera-off"></i><span>Foto de retorno não registrada</span></div>') + '</div></div></div>';
}

function openPhotoPreview(src, label) {
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg photo-lightbox" onclick="if(event.target===this)closeModal()"><button class="close-btn photo-close" onclick="closeModal()"><i class="ti ti-x"></i></button><img src="' + src + '" alt="' + escapeHTML(label) + '"><span>' + escapeHTML(label) + '</span></div>';
}

// ─── MOTORISTAS ──────────────────────────────────────────────────────────────
function renderMotoristas(c) {
  const drivers = DB.drivers(), trips = DB.trips();
  const activeDrivers=drivers.filter(driver=>driver.status==='ativo').length;
  c.innerHTML = alertHTML() + '<section class="driver-hero"><div><p class="report-eyebrow"><i class="ti ti-users"></i> Equipe externa</p><h2>Motoristas</h2><p>Consulte dados, histórico e disponibilidade dos profissionais.</p></div><div class="driver-hero-actions"><span class="report-period">' + activeDrivers + ' ativos</span>' + (isAdmin()?'<button class="btn btn-primary" onclick="openAddDriver()"><i class="ti ti-plus"></i> Novo motorista</button>':'') + '</div></section>' +
    '<div class="driver-overview"><div><span>Total cadastrado</span><strong>'+drivers.length+'</strong></div><div><span>Em atividade</span><strong>'+activeDrivers+'</strong></div><p>Toque em um motorista para consultar os dados e as rotas registradas.</p></div><div class="driver-list">' + drivers.map(d => {
      const dtrips = trips.filter(t => t.driverId === d.id), km = calcKm(dtrips);
      return '<article class="driver-card driver-card-modern clickable-card" role="button" tabindex="0" onclick="viewDriver(' + d.id + ')"><div class="avatar">' + initials(d.name) + '</div><div class="driver-card-info"><strong>' + escapeHTML(d.name) + '</strong><span>CNH: ' + escapeHTML(d.cnh || 'não informada') + ' · ' + escapeHTML(d.phone || 'sem telefone') + '</span><div class="driver-card-metrics"><span class="badge"><i class="ti ti-route"></i> ' + dtrips.length + ' rotas</span><span class="badge"><i class="ti ti-road"></i> ' + km + ' km</span><span class="driver-status ' + (d.status === 'ativo' ? 'is-active' : 'is-inactive') + '">' + escapeHTML(d.status) + '</span></div></div><i class="ti ti-chevron-right driver-chevron"></i></article>';
    }).join('')+'</div>';
}

function viewDriver(id) {
  const d = DB.drivers().find(item => item.id === id); if (!d) return;
  const dtrips = DB.trips().filter(item => item.driverId === d.id), km = calcKm(dtrips);
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Motorista<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="driver-profile"><div class="avatar">' + initials(d.name) + '</div><div><strong>' + escapeHTML(d.name) + '</strong><p>CNH: ' + escapeHTML(d.cnh || 'Não informada') + '<br>Telefone: ' + escapeHTML(d.phone || 'Não informado') + '<br>E-mail: ' + escapeHTML(d.email || 'Não informado') + '</p></div></div><div class="report-metrics"><div><strong>' + dtrips.length + '</strong><span>Rotas</span></div><div><strong>' + km + ' km</strong><span>Percorridos</span></div></div>' + (isAdmin()?'<div class="confirm-actions"><button class="btn btn-primary" onclick="editDriver(' + d.id + ')"><i class="ti ti-edit"></i> Editar motorista</button><button class="btn btn-secondary" onclick="toggleDriver(' + d.id + ');closeModal()"><i class="ti ' + (d.status === 'ativo' ? 'ti-user-off' : 'ti-user-check') + '"></i> ' + (d.status === 'ativo' ? 'Desativar' : 'Ativar') + '</button></div>':'') + '</div></div>';
}

function openAddDriver() {
  if (!adminOnly()) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Novo motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="field"><label>Nome completo *</label><input type="text" id="nd-name" placeholder="Nome do motorista"></div><div class="row"><div class="field"><label>CNH</label><input type="text" id="nd-cnh" placeholder="N\u00famero da CNH"></div><div class="field"><label>Telefone</label><input type="tel" id="nd-phone" placeholder="(31) 9 xxxxxx"></div></div><div class="field"><label>E-mail</label><input type="email" id="nd-email" placeholder="email@exemplo.com"></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addDriver(this)"><i class="ti ti-plus"></i> Cadastrar</button></div></div>';
}

async function addDriver(btn) {
  if (_saving) return;
  const name = document.getElementById('nd-name').value.trim(); if (!name) { alert('Informe o nome do motorista!'); return; }
  const driver = { id: genId(), name, cnh: document.getElementById('nd-cnh').value, phone: document.getElementById('nd-phone').value, email: document.getElementById('nd-email').value, status: 'ativo' };
  const drivers = DB.drivers(); drivers.push(driver);
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { DB.save('drivers', drivers); if (USE_SUPABASE) { ok = await DB.saveOne('drivers', driver); } }
  catch (err) { console.error('Erro ao cadastrar motorista:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  closeModal(); showAlert(ok ? 'Motorista cadastrado!' : 'Salvo no aparelho, mas falhou no servidor.', ok ? 'success' : 'error');
}

function editDriver(id) {
  if (!adminOnly()) return;
  const d = DB.drivers().find(x => x.id === id); if (!d) return;
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Editar motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="field"><label>Nome completo</label><input type="text" id="ed-name" value="' + d.name + '"></div><div class="row"><div class="field"><label>CNH</label><input type="text" id="ed-cnh" value="' + (d.cnh || '') + '"></div><div class="field"><label>Telefone</label><input type="tel" id="ed-phone" value="' + (d.phone || '') + '"></div></div><div class="field"><label>E-mail</label><input type="email" id="ed-email" value="' + (d.email || '') + '"></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveDriver(' + id + ', this)"><i class="ti ti-check"></i> Salvar</button></div></div>';
}

async function saveDriver(id, btn) {
  if (!adminOnly()) return;
  if (_saving) return;
  const drivers = DB.drivers(), d = drivers.find(x => x.id === id);
  d.name = document.getElementById('ed-name').value; d.cnh = document.getElementById('ed-cnh').value; d.phone = document.getElementById('ed-phone').value; d.email = document.getElementById('ed-email').value;
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { DB.save('drivers', drivers); if (USE_SUPABASE) { ok = await DB.saveOne('drivers', d); } }
  catch (err) { console.error('Erro ao salvar motorista:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  closeModal(); showAlert(ok ? 'Dados atualizados!' : 'Salvo no aparelho, mas falhou no servidor.', ok ? 'success' : 'error');
}

async function toggleDriver(id) {
  if (!adminOnly()) return;
  const drivers = DB.drivers(), d = drivers.find(x => x.id === id);
  d.status = d.status === 'ativo' ? 'inativo' : 'ativo'; DB.save('drivers', drivers);
  if (USE_SUPABASE) { await DB.saveOne('drivers', d); }
  renderMotoristas(document.getElementById('main-content'));
}

// ─── OCORRÊNCIAS ─────────────────────────────────────────────────────────────
function renderOcorrencias(c) {
  const incidents = DB.incidents().sort((a, b) => new Date(b.date) - new Date(a.date));
  const fines = incidents.filter(inc => inc.type === 'multa');
  c.innerHTML = alertHTML() + '<section class="occurrence-hero"><div><p class="report-eyebrow"><i class="ti ti-alert-triangle"></i> Acompanhamento</p><h2>Ocorrências</h2><p>Registre e acompanhe multas, chamados, acidentes e bloqueios da frota.</p></div><div class="occurrence-hero-actions"><span class="report-period">' + incidents.length + ' registros</span><button class="btn btn-primary" onclick="openAddIncident()"><i class="ti ti-plus"></i> Registrar ocorrência</button></div></section>' +
    '<div class="fine-overview"><div class="fine-overview-icon"><i class="ti ti-receipt-2"></i></div><div><span>Multas registradas</span><strong>' + fines.length + '</strong></div><p>Use o portal oficial para consultar e registre aqui somente o que for relevante para a frota.</p></div>' +
    '<div class="card fine-consult-card"><div class="card-title"><i class="ti ti-search"></i> Consulta oficial de multas — DNIT</div><p class="fine-note"><i class="ti ti-shield-lock"></i> A consulta exige login na conta gov.br. Para evitar o preenchimento duplicado, placa e RENAVAM são informados diretamente no portal oficial.</p><div class="actions"><button class="btn btn-primary" onclick="consultOfficialFines()"><i class="ti ti-external-link"></i> Abrir consulta do DNIT</button><button class="btn btn-secondary" onclick="openManualFine()"><i class="ti ti-plus"></i> Registrar multa manualmente</button></div></div>' +
    (incidents.length === 0 ? '<div class="empty"><i class="ti ti-shield-check"></i>Nenhuma ocorr\u00eancia registrada</div>' : '') +
    incidents.map(inc => { const isBlocked = inc.blocksVehicle && inc.status !== 'resolved'; const type = inc.type === 'multa' ? 'Multa' : inc.type === 'acidente' ? 'Acidente' : inc.type === 'chamado' ? 'Chamado' : 'Ocorrência'; return '<div class="incident-row clickable-card ' + (inc.type === 'outro' ? 'info' : '') + '" data-incident-id="' + inc.id + '" role="button" tabindex="0"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font-weight:600;font-size:14px;color:' + (inc.type === 'outro' ? '#CC5500' : '#791F1F') + '">' + type + ' — ' + escapeHTML(inc.driverName) + '</div><div style="font-size:12px;color:#666;margin-top:2px">' + fmtDate(inc.date) + ' • ' + vehicleLabel(inc.vehicle) + ' • OS: ' + escapeHTML(inc.os || '-') + (inc.plate ? ' • Placa: ' + escapeHTML(inc.plate) : '') + '</div><div style="font-size:13px;margin-top:6px">' + escapeHTML(inc.description) + '</div>' + (inc.value ? '<div style="font-size:12px;margin-top:4px;font-weight:600">Valor: R$ ' + Number(inc.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' : '') + (isBlocked ? '<span class="tag tag-open" style="margin-top:8px"><i class="ti ti-lock"></i> Veículo bloqueado</span>' : '') + '</div><div class="actions incident-actions">' + (isBlocked ? '<button class="btn btn-success btn-sm" onclick="resolveIncident(' + inc.id + ')"><i class="ti ti-lock-open"></i> Resolver</button>' : '') + '<button class="btn btn-danger btn-sm" onclick="printIncident(' + inc.id + ')"><i class="ti ti-printer"></i></button><button class="btn btn-danger btn-sm" onclick="deleteIncident(' + inc.id + ')"><i class="ti ti-trash"></i></button></div></div></div>'; }).join('');
  c.querySelectorAll('[data-incident-id]').forEach(row => {
    const openDetails = event => { if(event.target.closest('button')) return; viewIncident(Number(row.dataset.incidentId)); };
    row.addEventListener('click', openDetails);
    row.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); openDetails(event); } });
  });
}

function viewIncident(id){
  const incident=DB.incidents().find(item=>item.id===id);if(!incident)return;
  const type=incident.type==='multa'?'Multa':incident.type==='chamado'?'Chamado / manutenção':incident.type==='acidente'?'Acidente':'Ocorrência';
  const blocked=incident.blocksVehicle&&incident.status!=='resolved';
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal incident-detail-modal"><div class="modal-title">Detalhes da ocorrência<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="incident-detail-head"><span class="incident-detail-icon"><i class="ti ti-alert-triangle"></i></span><div><p>'+escapeHTML(type)+'</p><strong>'+escapeHTML(incident.driverName||'Motorista não informado')+'</strong></div>'+(blocked?'<span class="tag tag-open"><i class="ti ti-lock"></i> Bloqueado</span>':'')+'</div><div class="incident-detail-grid"><div><span>Data</span><strong>'+fmtDate(incident.date)+'</strong></div><div><span>Veículo</span><strong>'+escapeHTML(vehicleLabel(incident.vehicle))+'</strong></div><div><span>OS vinculada</span><strong>'+escapeHTML(incident.os||'Não informada')+'</strong></div>'+(incident.value?'<div><span>Valor</span><strong>R$ '+Number(incident.value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</strong></div>':'')+'</div><div class="incident-detail-description"><span>Descrição</span><p>'+escapeHTML(incident.description||'Sem descrição.')+'</p></div><div class="actions"><button class="btn btn-secondary" onclick="printIncident('+incident.id+')"><i class="ti ti-printer"></i> Imprimir</button>'+(isAdmin()&&blocked?'<button class="btn btn-success" onclick="closeModal();resolveIncident('+incident.id+')"><i class="ti ti-lock-open"></i> Liberar veículo</button>':'')+(isAdmin()?'<button class="btn btn-danger" onclick="closeModal();deleteIncident('+incident.id+')"><i class="ti ti-trash"></i> Excluir</button>':'')+'</div></div></div>';
}

function openAddIncident() {
  document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Nova ocorrência <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="row"><div class="field"><label>Tipo</label><select id="inc-type" onchange="toggleVehicleBlockHint()"><option value="multa">Multa</option><option value="chamado">Chamado / manutenção</option><option value="acidente">Acidente</option><option value="outro">Outro</option></select></div><div class="field"><label>Data</label><input type="date" id="inc-date" value="' + new Date().toISOString().split('T')[0] + '"></div></div><div class="row"><div class="field"><label>Motorista</label><select id="inc-driver"><option value="">Selecione...</option>' + DB.drivers().map(d => '<option value="' + d.id + '">' + escapeHTML(d.name) + '</option>').join('') + '</select></div><div class="field"><label>Veículo</label><select id="inc-vehicle"><option>FIORINO</option><option>STRADA</option></select></div></div><div class="row"><div class="field"><label>Nº OS vinculada</label><input type="text" id="inc-os" placeholder="Opcional"></div><div class="field"><label>Valor (R$)</label><input type="number" id="inc-value" placeholder="0,00" step="0.01" min="0"></div></div><label class="block-option"><input type="checkbox" id="inc-blocks-vehicle"> Bloquear este veículo para novas viagens até o chamado ser resolvido</label><p id="incident-block-hint" class="fine-note"></p><div class="field"><label>Descrição *</label><textarea id="inc-desc" maxlength="2000" placeholder="Descreva a ocorrência em detalhes..."></textarea></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addIncident(this)"><i class="ti ti-plus"></i> Registrar ocorrência</button></div></div>';
  toggleVehicleBlockHint();
}

function toggleVehicleBlockHint() {
  const isCall = document.getElementById('inc-type')?.value === 'chamado';
  const checkbox = document.getElementById('inc-blocks-vehicle');
  const hint = document.getElementById('incident-block-hint');
  if (!checkbox || !hint) return;
  if (isCall) checkbox.checked = true;
  hint.textContent = isCall ? 'Chamados bloqueiam o veículo por padrão; resolva o chamado para liberá-lo.' : 'Use o bloqueio quando o veículo não puder sair até a resolução da ocorrência.';
}

async function addIncident(btn) {
  if (_saving) return;
  const dId = document.getElementById('inc-driver').value, desc = document.getElementById('inc-desc').value.trim();
  if (!desc) { alert('Descreva a ocorr\u00eancia!'); return; }
  const driver = DB.drivers().find(d => d.id == dId);
  const blocksVehicle = document.getElementById('inc-blocks-vehicle').checked;
  const incident = { id: genId(), type: document.getElementById('inc-type').value, date: document.getElementById('inc-date').value, driverId: dId ? parseInt(dId) : null, driverName: driver ? driver.name : 'Não informado', vehicle: document.getElementById('inc-vehicle').value, os: document.getElementById('inc-os').value.trim(), value: document.getElementById('inc-value').value, description: desc, plate: normalizePlate(document.getElementById('inc-plate')?.value), renavam: normalizeRenavam(document.getElementById('inc-renavam')?.value), blocksVehicle, status: blocksVehicle ? 'open' : 'resolved', resolvedAt: null };
  const incidents = DB.incidents(); incidents.push(incident);
  _saving = true; setBusy(btn, true, '<i class="ti ti-loader"></i> Salvando...');
  let ok = true;
  try { DB.save('incidents', incidents); if (USE_SUPABASE) { ok = await DB.saveOne('incidents', incident); } }
  catch (err) { console.error('Erro ao registrar ocorr\u00eancia:', err); ok = false; }
  finally { _saving = false; setBusy(btn, false); }
  closeModal(); showAlert(ok ? 'Ocorr\u00eancia registrada!' : 'Salvo no aparelho, mas falhou no servidor.', ok ? 'success' : 'error');
}

async function deleteIncident(id) {
  if (!adminOnly()) return;
  if (!confirm('Excluir esta ocorr\u00eancia?')) return;
  DB.save('incidents', DB.incidents().filter(i => i.id !== id));
  if (USE_SUPABASE) { await DB.removeOne('incidents', id); }
  renderOcorrencias(document.getElementById('main-content'));
}

async function resolveIncident(id) {
  if (!adminOnly()) return;
  const incident = DB.incidents().find(item => item.id === id); if (!incident) return;
  if (!confirm('Resolver este chamado e liberar o veículo para novas viagens?')) return;
  incident.status = 'resolved'; incident.resolvedAt = new Date().toISOString();
  DB.save('incidents', DB.incidents());
  if (USE_SUPABASE) await DB.saveOne('incidents', incident);
  showAlert(incident.vehicle + ' liberado para novas viagens.');
}

async function printIncident(id) {
  const inc = DB.incidents().find(i => i.id === id); if (!inc) return;
  const btn = document.querySelector('[onclick="printIncident(' + id + ')"]');
  setBusy(btn, true, '<i class="ti ti-loader"></i>');
  try {
    const jsPDF = await loadJsPDF(), doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(); let y = 0;
    doc.setFillColor(255, 107, 0); doc.rect(0, 0, W, 32, 'F'); safeAddLogo(doc, 12, 5, 22, 22);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Print Minas', 40, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Registro de Ocorr\u00eancia \u2014 Gest\u00e3o de Frota', 40, 22);
    y = 44; doc.setTextColor(20, 20, 20);
    const typeLabel = inc.type === 'multa' ? 'Multa' : inc.type === 'acidente' ? 'Acidente' : 'Ocorr\u00eancia';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(typeLabel + ' \u2014 ' + inc.driverName, 14, y); y += 9;
    doc.setDrawColor(230, 230, 225); doc.line(14, y, W - 14, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    const rows = [['Motorista', inc.driverName], ['Ve\u00edculo', inc.vehicle], ['Data', fmtDate(inc.date)], ['N\u00ba OS', inc.os || '-']];
    if (inc.value) rows.push(['Valor', 'R$ ' + parseFloat(inc.value).toFixed(2)]);
    rows.forEach(([l, v]) => { doc.setFont('helvetica', 'bold'); doc.text(l + ':', 14, y); doc.setFont('helvetica', 'normal'); doc.text(String(v), 50, y); y += 7; });
    y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Descri\u00e7\u00e3o:', 14, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    const dl = doc.splitTextToSize(inc.description || '-', W - 28); doc.text(dl, 14, y); y += dl.length * 5.5 + 20;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setDrawColor(180, 180, 180); doc.setLineDashPattern([1.5, 1.5], 0); doc.roundedRect(14, y, W - 28, 30, 2, 2); doc.setLineDashPattern([], 0);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    const decl = doc.splitTextToSize('Declaro que as informa\u00e7\u00f5es acima s\u00e3o ver\u00eddicas, responsabilizando-me pelo conte\u00fado deste registro.', W - 36);
    doc.text(decl, 18, y + 7);
    const sigY = y + 24; doc.setDrawColor(50, 50, 50); doc.line(20, sigY, 110, sigY); doc.line(124, sigY, W - 20, sigY);
    doc.setFontSize(8.5); doc.setTextColor(80, 80, 80); doc.text('Assinatura \u2014 ' + inc.driverName, 20, sigY + 5); doc.text('Data', 124, sigY + 5);
    doc.save('ocorrencia-' + inc.driverName.replace(/\s+/g, '_') + '-' + inc.date + '.pdf');
  } catch (e) { console.error('Erro ao gerar PDF', e); alert('N\u00e3o foi poss\u00edvel gerar o PDF.\n\nDetalhe: ' + (e && e.message ? e.message : e)); }
  finally { setBusy(btn, false); }
}

// ─── RELATÓRIO ───────────────────────────────────────────────────────────────
let relDriver = '', relMonth = new Date().toISOString().slice(0, 7);
function reportMonthLabel(month = relMonth) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, number] = month.split('-').map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function reportData() {
  const drivers = relDriver ? DB.drivers().filter(driver => driver.id == relDriver) : DB.drivers();
  return drivers.map(driver => ({ driver, trips: DB.trips().filter(trip => trip.driverId === driver.id && trip.startTime?.startsWith(relMonth)), incidents: DB.incidents().filter(incident => incident.driverId === driver.id && incident.date?.startsWith(relMonth)) }));
}
function reportSummary(data) {
  const trips = data.flatMap(item => item.trips), incidents = data.flatMap(item => item.incidents);
  return { trips: trips.length, open: trips.filter(trip => trip.status === 'open').length, km: calcKm(trips), incidents: incidents.length, fines: incidents.filter(incident => incident.type === 'multa').reduce((total, incident) => total + (Number(incident.value) || 0), 0) };
}

function renderRelatorio(c) {
  const data = reportData(), summary = reportSummary(data);
  c.innerHTML = alertHTML() +
    '<div class="report-hero"><div><p class="report-eyebrow"><i class="ti ti-file-text"></i> Relatórios mensais</p><h2>Resumo de utilização da frota</h2><p>Consulte as viagens, ocorrências e documentos prontos para assinatura.</p></div><span class="report-period">' + escapeHTML(reportMonthLabel()) + '</span></div>' +
    '<div class="card report-filter"><div class="card-title"><i class="ti ti-adjustments-horizontal"></i> Filtros do relatório</div>' +
    '<div class="row"><div class="field"><label>Motorista</label><select id="rel-driver" onchange="relDriver=this.value;renderRelatorio(document.getElementById(\'main-content\'))"><option value="">Todos os motoristas</option>' +
    DB.drivers().map(d => '<option value="' + d.id + '" ' + (relDriver == d.id ? 'selected' : '') + '>' + escapeHTML(d.name) + '</option>').join('') +
    '</select></div><div class="field"><label>M\u00eas / Ano</label><input type="month" id="rel-month" value="' + relMonth + '" onchange="relMonth=this.value;renderRelatorio(document.getElementById(\'main-content\'))"></div></div></div>' +
    '<div class="report-summary-grid"><div class="report-summary"><span>Viagens</span><strong>' + summary.trips + '</strong></div><div class="report-summary"><span>Em aberto</span><strong>' + summary.open + '</strong></div><div class="report-summary"><span>KM percorridos</span><strong>' + summary.km + '</strong></div><div class="report-summary"><span>Multas</span><strong>R$ ' + summary.fines.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</strong></div></div>' +
    buildReport(data);
}

function buildReport(data = reportData()) {
  return buildModernReport(data);
  /* Layout anterior mantido abaixo apenas como referência durante a transição. */
  const active = data.filter(item => item.trips.length || item.incidents.length);
  if (!active.length) return '<div class="report-empty"><i class="ti ti-calendar-off"></i><strong>Nenhum dado encontrado</strong><span>Não há viagens ou ocorrências em ' + escapeHTML(reportMonthLabel()) + '.</span></div>';
  return active.map(({ driver, trips, incidents }) => {
    const km = calcKm(trips);
    const completed = trips.filter(trip => trip.status === 'closed').length;
    return '<article class="report-section"><header class="report-driver-head"><div class="report-driver"><div class="avatar">' + initials(driver.name) + '</div><div><h3>' + escapeHTML(driver.name) + '</h3><p>CNH: ' + escapeHTML(driver.cnh || 'Não informada') + ' · ' + escapeHTML(reportMonthLabel()) + '</p></div></div><button class="btn btn-secondary btn-sm" onclick="printDriver(' + driver.id + ')"><i class="ti ti-printer"></i> Gerar PDF para assinatura</button></header><div class="report-metrics"><div><strong>' + trips.length + '</strong><span>Viagens</span></div><div><strong>' + completed + '</strong><span>Concluídas</span></div><div><strong>' + km + ' km</strong><span>KM percorridos</span></div><div><strong>' + incidents.length + '</strong><span>Ocorrências</span></div></div>' + (trips.some(trip => trip.status === 'open') ? '<div class="report-warning"><i class="ti ti-clock-exclamation"></i> Há ' + trips.filter(trip => trip.status === 'open').length + ' viagem(ns) em aberto neste período.</div>' : '') + (trips.length ? '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Data</th><th>OS</th><th>Veículo</th><th>Destino</th><th>Saída</th><th>Chegada</th><th>KM</th><th>Status</th></tr></thead><tbody>' + trips.map(trip => '<tr><td>' + fmtDate(trip.startTime) + '</td><td>' + escapeHTML(trip.os || '-') + '</td><td>' + vehicleLabel(trip.vehicle) + '</td><td>' + escapeHTML(trip.destination || '-') + '</td><td>' + fmtTime(trip.startTime) + '</td><td>' + (trip.endTime ? fmtTime(trip.endTime) : '—') + '</td><td>' + (trip.kmStart && trip.kmEnd ? (parseInt(trip.kmEnd) - parseInt(trip.kmStart)) + ' km' : '—') + '</td><td><span class="tag ' + (trip.status === 'open' ? 'tag-open' : 'tag-closed') + '">' + (trip.status === 'open' ? 'Em aberto' : 'Concluída') + '</span></td></tr>').join('') + '</tbody></table></div>' : '<div class="report-no-trips">Nenhuma viagem registrada no período.</div>') + (incidents.length ? '<section class="report-incidents"><h4><i class="ti ti-alert-triangle"></i> Ocorrências do período</h4>' + incidents.map(incident => '<div><span>' + fmtDate(incident.date) + ' · ' + escapeHTML(incident.type) + '</span><p>' + escapeHTML(incident.description) + (incident.value ? ' · R$ ' + Number(incident.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '') + '</p></div>').join('') + '</section>' : '') + '<footer class="report-signature"><p>Declaro que as informações deste relatório são verdadeiras e que utilizei os veículos conforme os registros acima.</p><div><span>Assinatura — ' + escapeHTML(driver.name) + '</span><span>Data</span></div></footer></article>';
  }).join('');
}

function buildModernReport(data) {
  const active = data.filter(item => item.trips.length || item.incidents.length);
  if (!active.length) return '<div class="report-empty"><i class="ti ti-calendar-off"></i><strong>Nenhuma rota neste período</strong><span>Escolha outro mês ou motorista para consultar os dados.</span></div>';
  return '<section class="report-stream">' + active.map(({ driver, trips, incidents }) => {
    const completed = trips.filter(trip => trip.status === 'closed').length;
    const recent = [...trips].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return '<article class="report-section report-modern-card"><header class="report-driver-head"><div class="report-driver"><div class="avatar">' + initials(driver.name) + '</div><div><p class="report-kicker">Motorista</p><h3>' + escapeHTML(driver.name) + '</h3><p>' + escapeHTML(reportMonthLabel()) + '</p></div></div><button class="btn btn-secondary btn-sm" onclick="printDriver(' + driver.id + ')"><i class="ti ti-file-download"></i> PDF</button></header><div class="report-metrics report-modern-metrics"><div><strong>' + trips.length + '</strong><span>Rotas</span></div><div><strong>' + completed + '</strong><span>Concluídas</span></div><div><strong>' + calcKm(trips) + ' km</strong><span>Percorridos</span></div></div>' + (trips.some(trip => trip.status === 'open') ? '<div class="report-warning"><i class="ti ti-clock-exclamation"></i> ' + trips.filter(trip => trip.status === 'open').length + ' rota(s) ainda em atendimento.</div>' : '') + (recent.length ? '<details class="report-routes"><summary><span><i class="ti ti-route"></i> Rotas do período</span><span>' + recent.length + ' <i class="ti ti-chevron-down"></i></span></summary><div class="report-route-list">' + recent.map(trip => '<div class="report-route-item"><div class="route-date">' + fmtDate(trip.startTime) + '</div><div class="route-main"><strong>' + escapeHTML(trip.client || trip.destination || 'Rota sem cliente informado') + '</strong><span>OS ' + escapeHTML(trip.os || 'não informada') + ' · ' + escapeHTML(vehicleLabel(trip.vehicle)) + '</span></div><div class="route-end"><span>' + ((trip.kmStart && trip.kmEnd) ? (Number(trip.kmEnd) - Number(trip.kmStart)) + ' km' : '—') + '</span><span class="tag ' + (trip.status === 'open' ? 'tag-open' : 'tag-closed') + '">' + (trip.status === 'open' ? 'Em rota' : 'Concluída') + '</span></div></div>').join('') + '</div></details>' : '') + (incidents.length ? '<details class="report-routes report-issues"><summary><span><i class="ti ti-alert-triangle"></i> Ocorrências</span><span>' + incidents.length + ' <i class="ti ti-chevron-down"></i></span></summary><div class="report-route-list">' + incidents.map(incident => '<div class="report-route-item"><div class="route-date">' + fmtDate(incident.date) + '</div><div class="route-main"><strong>' + escapeHTML(incident.type) + '</strong><span>' + escapeHTML(incident.description) + '</span></div><div class="route-end">' + (incident.value ? '<span>R$ ' + Number(incident.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</span>' : '') + '</div></div>').join('') + '</div></details>' : '') + '</article>';
  }).join('') + '</section>';
}

async function printDriver(driverId) {
  const driver = DB.drivers().find(d => d.id == driverId); if (!driver) return;
  const trips = DB.trips().filter(t => t.driverId == driverId && t.startTime.startsWith(relMonth));
  const incidents = DB.incidents().filter(i => i.driverId == driverId && i.date.startsWith(relMonth));
  const km = calcKm(trips);
  const completed = trips.filter(t => t.status === 'closed').length;
  const fineTotal = incidents.filter(i => i.type === 'multa').reduce((total, i) => total + (Number(i.value) || 0), 0);
  const btn = document.querySelector('[onclick="printDriver(' + driverId + ')"]');
  setBusy(btn, true, '<i class="ti ti-loader"></i> Gerando...');
  try {
    const jsPDF = await loadJsPDF(), doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), margin = 14; let y = 0;
    function drawHeader() { doc.setFillColor(24, 24, 27); doc.rect(0, 0, W, 34, 'F'); doc.setFillColor(242, 100, 25); doc.rect(0, 31, W, 3, 'F'); safeAddLogo(doc, margin - 2, 6, 21, 21); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Print Minas', 40, 16); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(220, 220, 225); doc.text('Relatório mensal de rotas', 40, 22); doc.setFontSize(8); doc.text(reportMonthLabel(), W - margin, 16, { align: 'right' }); }
    function ensureSpace(needed) { if (y + needed > H - 16) { doc.addPage(); drawHeader(); y = 44; } }
    drawHeader(); y = 44; doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(driver.name, margin, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90); doc.text('CNH: ' + (driver.cnh || '-') + '  \u2022  Per\u00edodo: ' + reportMonthLabel(), margin, y); y += 10;
    const cardW = (W - margin * 2 - 18) / 4;
    [[String(trips.length), 'Viagens'], [String(completed), 'Conclu\u00eddas'], [km + ' km', 'KM percorridos'], ['R$ ' + fineTotal.toFixed(2).replace('.', ','), 'Multas']].forEach((s, i) => {
      const x = margin + i * (cardW + 6); doc.setFillColor(i === 0 ? 253 : 246, i === 0 ? 239 : 246, i === 0 ? 230 : 244); doc.roundedRect(x, y, cardW, 18, 3, 3, 'F'); doc.setTextColor(i === 0 ? 210 : 35, i === 0 ? 78 : 35, i === 0 ? 10 : 35); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(s[0], x + cardW / 2, y + 9, { align: 'center' }); doc.setTextColor(125, 125, 130); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(s[1], x + cardW / 2, y + 14.5, { align: 'center' });
    });
    y += 28; doc.setTextColor(20, 20, 20);
    if (trips.length) {
      const cols = [{ h: 'Data', w: 18 }, { h: 'OS', w: 24 }, { h: 'Ve\u00edculo', w: 20 }, { h: 'Destino', w: 46 }, { h: 'Sa\u00edda', w: 16 }, { h: 'Chegada', w: 18 }, { h: 'KM', w: 18 }];
      function drawTH() { doc.setFillColor(240, 240, 238); doc.rect(margin, y, W - margin * 2, 7, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60); let x = margin + 2; cols.forEach(col => { doc.text(col.h, x, y + 5); x += col.w; }); y += 9; }
      drawTH(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
      trips.forEach(t => {
        if (y + 8 > H - 16) { doc.addPage(); drawHeader(); y = 44; drawTH(); }
        const vals = [fmtDate(t.startTime), t.os || '-', t.vehicle, t.destination || '-', fmtTime(t.startTime), t.endTime ? fmtTime(t.endTime) : '-', (t.kmStart && t.kmEnd) ? (parseInt(t.kmEnd) - parseInt(t.kmStart)) + 'km' : '-'];
        let x = margin + 2; vals.forEach((v, i) => { doc.text((doc.splitTextToSize(String(v), cols[i].w - 2)[0] || ''), x, y + 4); x += cols[i].w; });
        doc.setDrawColor(238, 238, 235); doc.line(margin, y + 6.5, W - margin, y + 6.5); y += 7.5;
      }); y += 6;
    } else { doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(140, 140, 140); doc.text('Nenhuma viagem registrada no per\u00edodo.', margin, y); y += 10; }
    if (incidents.length) {
      ensureSpace(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(163, 45, 45); doc.text('Ocorr\u00eancias no per\u00edodo', margin, y); y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      incidents.forEach(i => { const line = fmtDate(i.date) + ' \u2014 ' + i.type + ': ' + i.description + (i.value ? ' (R$ ' + parseFloat(i.value).toFixed(2) + ')' : ''); const lines = doc.splitTextToSize(line, W - margin * 2 - 6); ensureSpace(lines.length * 5 + 4); doc.setFillColor(252, 235, 235); doc.roundedRect(margin, y, W - margin * 2, lines.length * 5 + 3, 1.5, 1.5, 'F'); doc.setTextColor(110, 30, 30); doc.text(lines, margin + 3, y + 4.5); y += lines.length * 5 + 6; }); y += 4;
    }
    ensureSpace(36); doc.setDrawColor(180, 180, 180); doc.setLineDashPattern([1.5, 1.5], 0); doc.roundedRect(margin, y, W - margin * 2, 32, 2, 2); doc.setLineDashPattern([], 0);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    const dl = doc.splitTextToSize('Declaro que as informa\u00e7\u00f5es acima s\u00e3o ver\u00eddicas e que utilizei os ve\u00edculos da empresa conforme descrito, responsabilizando-me por qualquer uso indevido registrado neste documento.', W - margin * 2 - 8);
    doc.text(dl, margin + 4, y + 7);
    const sigY = y + 26, sigSplit = margin + (W - margin * 2) * 0.65;
    doc.setDrawColor(50, 50, 50); doc.line(margin + 6, sigY, sigSplit - 6, sigY); doc.line(sigSplit + 6, sigY, W - margin - 6, sigY);
    doc.setFontSize(8.5); doc.setTextColor(80, 80, 80); doc.text('Assinatura \u2014 ' + driver.name, margin + 6, sigY + 5); doc.text('Data', sigSplit + 6, sigY + 5);
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) { doc.setPage(page); doc.setDrawColor(225, 225, 220); doc.line(margin, H - 11, W - margin, H - 11); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(125, 125, 125); doc.text('Print Minas \u2022 Relat\u00f3rio mensal \u2022 ' + reportMonthLabel(), margin, H - 6); doc.text('P\u00e1gina ' + page + ' de ' + pageCount, W - margin, H - 6, { align: 'right' }); }
    doc.save('relatorio-' + driver.name.replace(/\s+/g, '_') + '-' + relMonth + '.pdf');
  } catch (e) { console.error('Erro ao gerar PDF', e); alert('N\u00e3o foi poss\u00edvel gerar o PDF.\n\nDetalhe: ' + (e && e.message ? e.message : e)); }
  finally { setBusy(btn, false); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initApp() {
  setupTheme();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) { if (node.matches?.('select')) enhanceSelects(node.parentElement); else enhanceSelects(node); } }))).observe(document.body, { childList: true, subtree: true });
  setupPWA();
  // Não bloqueia a tela enquanto o Supabase responde. A atualização ocorre
  // assim que a carga remota terminar ou atingir o limite de espera.
  DB.hydrateLocal();
  showTab('visao');
  try { await DB.load(); await loadAdminSession(); const sync = await DB.syncPending(); if (sync.synced) console.info('Sincronização offline concluída:', sync.synced); }
  catch (error) { console.warn('Falha ao carregar Supabase, usando dados locais.', error); showAlert('Falha ao carregar Supabase. Usando dados locais.', 'error'); }
  finally { showTab('visao'); }
}
initApp();
