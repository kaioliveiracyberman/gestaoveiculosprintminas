// ─── Navigation ────────────────────────────────────────────────────────────
let activeTab = 'viagem';
let alertMsg = null;

function showTab(tab){
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach((b,i) => {
    b.classList.toggle('active', ['viagem','registros','motoristas','ocorrencias','relatorio','qr'][i] === tab);
  });
  const c = document.getElementById('main-content');
  const renders = {viagem:renderViagem, registros:renderRegistros, motoristas:renderMotoristas, ocorrencias:renderOcorrencias, relatorio:renderRelatorio, qr:renderQR};
  renders[tab] && renders[tab](c);
}

function showAlert(msg, type='success'){
  alertMsg = {msg, type};
  setTimeout(()=>{ alertMsg=null; showTab(activeTab); }, 2800);
  showTab(activeTab);
}

function alertHTML(){
  if(!alertMsg) return '';
  return `<div class="alert alert-${alertMsg.type}"><i class="ti ti-${alertMsg.type==='success'?'check':'alert-circle'}"></i>${alertMsg.msg}</div>`;
}

// ─── Photo preview ─────────────────────────────────────────────────────────
function previewPhoto(input, previewId){
  const file = input.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = e => {
    const img = document.getElementById(previewId);
    img.src = e.target.result;
    img.style.display = 'block';
  };
  r.readAsDataURL(file);
}

function closeModal(){ document.getElementById('modal-container').innerHTML = ''; }

// ─── NOVA VIAGEM ───────────────────────────────────────────────────────────
function renderViagem(c){
  const drivers  = DB.drivers().filter(d=>d.status==='ativo');
  const openTrips = DB.trips().filter(t=>!t.endTime);

  c.innerHTML = `
  ${alertHTML()}
  ${openTrips.length ? `
  <div class="card">
    <div class="card-title"><i class="ti ti-clock"></i> Viagem em aberto</div>
    ${openTrips.map(t=>`
    <div class="trip-row">
      <div class="trip-header">
        <div>
          <div class="trip-name">${t.driverName}</div>
          <div class="trip-meta">
            <span><i class="ti ti-car"></i>${t.vehicle}</span>
            <span><i class="ti ti-hash"></i>OS: ${t.os||'-'}</span>
            <span><i class="ti ti-map-pin"></i>${t.destination||'-'}</span>
            <span><i class="ti ti-clock"></i>${fmt(t.startTime)}</span>
          </div>
        </div>
        <span class="tag tag-open">Em aberto</span>
      </div>
      <div class="actions">
        <button class="btn btn-success btn-sm" onclick="openArrival(${t.id})"><i class="ti ti-flag"></i> Registrar chegada</button>
        <button class="btn btn-secondary btn-sm" onclick="editTrip(${t.id})"><i class="ti ti-edit"></i> Editar</button>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <div class="card">
    <div class="card-title"><i class="ti ti-map-pin"></i> Registrar saída</div>

    <div class="field">
      <label>Motorista</label>
      <select id="v-driver">
        <option value="">Selecione o motorista...</option>
        ${drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
      </select>
    </div>

    <div class="row">
      <div class="field">
        <label>Veículo</label>
        <select id="v-vehicle"><option value="FIORINO">FIORINO</option><option value="STRADA">STRADA</option></select>
      </div>
      <div class="field">
        <label>Nº OS (Printwayy)</label>
        <input type="text" id="v-os" placeholder="Ex: OS-2024-001">
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label>Data de saída</label>
        <input type="date" id="v-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="field">
        <label>Horário de saída</label>
        <input type="time" id="v-time" value="${new Date().toTimeString().slice(0,5)}">
      </div>
    </div>

    <div class="field">
      <label>Destino</label>
      <input type="text" id="v-dest" placeholder="Cidade / empresa de destino">
    </div>

    <div class="field">
      <label>KM de saída</label>
      <input type="number" id="v-km-start" placeholder="Ex: 45230">
    </div>

    <div class="field">
      <label>Foto do painel (KM de saída)</label>
      <div class="photo-area" onclick="document.getElementById('v-photo-start').click()">
        <i class="ti ti-camera" style="font-size:26px;display:block;margin-bottom:6px"></i>
        Toque para tirar foto do painel
        <input type="file" id="v-photo-start" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,'prev-start')">
      </div>
      <img id="prev-start" class="photo-preview" style="display:none">
    </div>

    <div class="field">
      <label>Observações</label>
      <textarea id="v-obs" placeholder="Estado do veículo, observações iniciais..."></textarea>
    </div>

    <button class="btn btn-primary" style="width:100%" onclick="startTrip()">
      <i class="ti ti-map-pin"></i> Registrar saída
    </button>
  </div>`;
}

function startTrip(){
  const driverId = document.getElementById('v-driver').value;
  if(!driverId){ alert('Selecione o motorista!'); return; }
  const driver = DB.drivers().find(d=>d.id==driverId);
  const date   = document.getElementById('v-date').value;
  const time   = document.getElementById('v-time').value;
  const photo  = document.getElementById('prev-start');

  const trip = {
    id:         genId(),
    driverId:   parseInt(driverId),
    driverName: driver.name,
    vehicle:    document.getElementById('v-vehicle').value,
    os:         document.getElementById('v-os').value,
    destination:document.getElementById('v-dest').value,
    startTime:  new Date(date+'T'+time).toISOString(),
    endTime:    null,
    kmStart:    document.getElementById('v-km-start').value,
    kmEnd:      null,
    photoStart: photo && photo.style.display!=='none' ? photo.src : null,
    photoEnd:   null,
    obsStart:   document.getElementById('v-obs').value,
    obsEnd:     '',
    status:     'open'
  };

  const trips = DB.trips();
  trips.push(trip);
  DB.save('trips', trips);
  showAlert('Saída registrada com sucesso!');
}

// ─── REGISTRAR CHEGADA ─────────────────────────────────────────────────────
function openArrival(tripId){
  const trip = DB.trips().find(t=>t.id===tripId);
  if(!trip) return;
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">
        Registrar chegada
        <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:14px;padding:8px 12px;background:#f5f5f0;border-radius:8px">
        <strong>${trip.driverName}</strong> — ${trip.vehicle} — saiu às ${fmtTime(trip.startTime)}
      </div>

      <div class="row">
        <div class="field"><label>Data de chegada</label><input type="date" id="arr-date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="field"><label>Horário de chegada</label><input type="time" id="arr-time" value="${new Date().toTimeString().slice(0,5)}"></div>
      </div>

      <div class="field">
        <label>KM de chegada</label>
        <input type="number" id="arr-km" placeholder="Ex: 45510">
      </div>

      <div class="field">
        <label>Foto do painel (KM de chegada)</label>
        <div class="photo-area" onclick="document.getElementById('arr-photo').click()">
          <i class="ti ti-camera" style="font-size:24px;display:block;margin-bottom:5px"></i>
          Foto do painel na chegada
          <input type="file" id="arr-photo" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,'arr-prev')">
        </div>
        <img id="arr-prev" class="photo-preview" style="display:none">
      </div>

      <div class="field">
        <label>Observações de chegada</label>
        <textarea id="arr-obs" placeholder="Estado do veículo, ocorrências..."></textarea>
      </div>

      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-primary" style="flex:1" onclick="closeTrip(${tripId})"><i class="ti ti-check"></i> Confirmar chegada</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function closeTrip(tripId){
  const trips = DB.trips();
  const trip  = trips.find(t=>t.id===tripId);
  if(!trip) return;
  const date   = document.getElementById('arr-date').value;
  const time   = document.getElementById('arr-time').value;
  const photo  = document.getElementById('arr-prev');
  trip.endTime  = new Date(date+'T'+time).toISOString();
  trip.kmEnd    = document.getElementById('arr-km').value;
  trip.photoEnd = photo && photo.style.display!=='none' ? photo.src : null;
  trip.obsEnd   = document.getElementById('arr-obs').value;
  trip.status   = 'closed';
  DB.save('trips', trips);
  closeModal();
  showAlert('Chegada registrada com sucesso!');
}

// ─── EDITAR VIAGEM ─────────────────────────────────────────────────────────
function editTrip(tripId){
  const trip = DB.trips().find(t=>t.id===tripId);
  if(!trip) return;
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">Editar viagem<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
      <div class="row">
        <div class="field"><label>Data de saída</label><input type="date" id="e-date" value="${trip.startTime.split('T')[0]}"></div>
        <div class="field"><label>Hora de saída</label><input type="time" id="e-time" value="${trip.startTime.split('T')[1].slice(0,5)}"></div>
      </div>
      <div class="field"><label>Destino</label><input type="text" id="e-dest" value="${trip.destination||''}"></div>
      <div class="field"><label>Nº OS</label><input type="text" id="e-os" value="${trip.os||''}"></div>
      <div class="field"><label>KM de saída</label><input type="number" id="e-km" value="${trip.kmStart||''}"></div>
      <div class="field"><label>Observação</label><textarea id="e-obs">${trip.obsStart||''}</textarea></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="saveEdit(${tripId})"><i class="ti ti-check"></i> Salvar</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function saveEdit(tripId){
  const trips = DB.trips();
  const trip  = trips.find(t=>t.id===tripId);
  const d = document.getElementById('e-date').value;
  const t = document.getElementById('e-time').value;
  trip.startTime   = new Date(d+'T'+t).toISOString();
  trip.destination = document.getElementById('e-dest').value;
  trip.os          = document.getElementById('e-os').value;
  trip.kmStart     = document.getElementById('e-km').value;
  trip.obsStart    = document.getElementById('e-obs').value;
  DB.save('trips', trips);
  closeModal();
  showAlert('Viagem atualizada!');
}

// ─── REGISTROS ─────────────────────────────────────────────────────────────
let filterDate   = '';
let filterDriver = '';

function filterRegistros(){
  filterDate   = document.getElementById('filter-date')?.value   || '';
  filterDriver = document.getElementById('filter-driver-val')?.value || '';
  renderRegistros(document.getElementById('main-content'));
}
function clearFilter(){ filterDate=''; filterDriver=''; renderRegistros(document.getElementById('main-content')); }

function renderRegistros(c){
  let trips = [...DB.trips()].sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  if(filterDate)   trips = trips.filter(t => t.startTime.startsWith(filterDate));
  if(filterDriver) trips = trips.filter(t => t.driverId == filterDriver);
  const km = trips.reduce((s,t)=>{ if(t.kmStart&&t.kmEnd) return s+(parseInt(t.kmEnd)-parseInt(t.kmStart)); return s; },0);

  c.innerHTML = `
  ${alertHTML()}
  <div class="card">
    <div class="card-title"><i class="ti ti-search"></i> Buscar registros</div>
    <div class="row">
      <div class="field">
        <label>Data</label>
        <input type="date" id="filter-date" value="${filterDate}" onchange="filterRegistros()">
      </div>
      <div class="field">
        <label>Motorista</label>
        <select id="filter-driver-val" onchange="filterRegistros()">
          <option value="">Todos</option>
          ${DB.drivers().map(d=>`<option value="${d.id}" ${filterDriver==d.id?'selected':''}>${d.name}</option>`).join('')}
        </select>
      </div>
    </div>
    ${filterDate||filterDriver ? `<button class="btn btn-secondary btn-sm" onclick="clearFilter()"><i class="ti ti-x"></i> Limpar filtro</button>` : ''}
  </div>

  <div class="stat-grid">
    <div class="stat"><div class="stat-num">${trips.length}</div><div class="stat-label">Viagens</div></div>
    <div class="stat"><div class="stat-num">${trips.filter(t=>t.status==='open').length}</div><div class="stat-label">Em aberto</div></div>
    <div class="stat"><div class="stat-num">${km}</div><div class="stat-label">KM total</div></div>
  </div>

  ${trips.length===0 ? `<div class="empty"><i class="ti ti-map-off"></i>Nenhum registro encontrado</div>` : ''}
  ${trips.map(t=>`
  <div class="trip-row">
    <div class="trip-header">
      <div>
        <div class="trip-name">${t.driverName}</div>
        <div class="trip-meta">
          <span><i class="ti ti-calendar"></i>${fmtDate(t.startTime)}</span>
          <span><i class="ti ti-car"></i>${t.vehicle}</span>
          <span><i class="ti ti-hash"></i>OS: ${t.os||'-'}</span>
          <span><i class="ti ti-map-pin"></i>${t.destination||'-'}</span>
          ${t.kmStart ? `<span><i class="ti ti-road"></i>${t.kmStart} → ${t.kmEnd||'?'} km</span>` : ''}
        </div>
        <div class="trip-meta" style="margin-top:4px">
          <span><i class="ti ti-clock"></i>Saída: ${fmt(t.startTime)}</span>
          ${t.endTime ? `<span><i class="ti ti-flag"></i>Chegada: ${fmt(t.endTime)}</span>` : ''}
        </div>
        ${t.obsStart ? `<div style="font-size:12px;color:#666;margin-top:5px;padding:5px 8px;background:#f8f8f5;border-radius:6px">${t.obsStart}</div>` : ''}
      </div>
      <span class="tag ${t.status==='open'?'tag-open':'tag-closed'}">${t.status==='open'?'Em aberto':'Concluída'}</span>
    </div>
    <div class="actions">
      ${t.status==='open' ? `<button class="btn btn-success btn-sm" onclick="openArrival(${t.id})"><i class="ti ti-flag"></i> Chegada</button>` : ''}
      ${t.photoStart||t.photoEnd ? `<button class="btn btn-secondary btn-sm" onclick="viewPhotos(${t.id})"><i class="ti ti-photo"></i> Fotos</button>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="editTrip(${t.id})"><i class="ti ti-edit"></i></button>
      <button class="btn btn-danger btn-sm" onclick="deleteTrip(${t.id})"><i class="ti ti-trash"></i></button>
    </div>
  </div>`).join('')}`;
}

function deleteTrip(id){
  if(!confirm('Excluir este registro permanentemente?')) return;
  const trips = DB.trips().filter(t=>t.id!==id);
  DB.save('trips', trips);
  renderRegistros(document.getElementById('main-content'));
}

function viewPhotos(tripId){
  const t = DB.trips().find(x=>x.id===tripId);
  if(!t) return;
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">Fotos da viagem <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
      ${t.photoStart ? `<div style="margin-bottom:14px"><div style="font-size:12px;color:#666;margin-bottom:4px;font-weight:600">KM de saída</div><img src="${t.photoStart}" style="width:100%;border-radius:8px"></div>` : ''}
      ${t.photoEnd   ? `<div><div style="font-size:12px;color:#666;margin-bottom:4px;font-weight:600">KM de chegada</div><img src="${t.photoEnd}" style="width:100%;border-radius:8px"></div>` : '<p style="font-size:13px;color:#888">Sem foto de chegada.</p>'}
    </div>
  </div>`;
}

// ─── MOTORISTAS ─────────────────────────────────────────────────────────────
function renderMotoristas(c){
  const drivers = DB.drivers();
  const trips   = DB.trips();
  c.innerHTML = `
  ${alertHTML()}
  <div class="section-header">
    <span class="section-title">Motoristas cadastrados</span>
    <button class="btn btn-primary btn-sm" onclick="openAddDriver()"><i class="ti ti-plus"></i> Novo</button>
  </div>
  ${drivers.map(d=>{
    const dtrips = trips.filter(t=>t.driverId===d.id);
    const km = calcKm(dtrips);
    return `
    <div class="driver-card">
      <div class="avatar">${initials(d.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${d.name}</div>
        <div style="font-size:12px;color:#666;margin-top:2px">CNH: ${d.cnh||'-'} • ${d.phone||'sem telefone'}</div>
        <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap">
          <span class="badge"><i class="ti ti-map-pin"></i> ${dtrips.length} viagens</span>
          <span class="badge"><i class="ti ti-road"></i> ${km} km</span>
          <span class="badge" style="background:${d.status==='ativo'?'#EAF3DE':'#FCEBEB'};color:${d.status==='ativo'?'#3B6D11':'#A32D2D'}">${d.status}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" onclick="editDriver(${d.id})" title="Editar"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="toggleDriver(${d.id})" title="${d.status==='ativo'?'Desativar':'Ativar'}">${d.status==='ativo'?'<i class="ti ti-user-off"></i>':'<i class="ti ti-user-check"></i>'}</button>
      </div>
    </div>`;
  }).join('')}`;
}

function openAddDriver(){
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">Novo motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
      <div class="field"><label>Nome completo *</label><input type="text" id="nd-name" placeholder="Nome do motorista"></div>
      <div class="row">
        <div class="field"><label>CNH</label><input type="text" id="nd-cnh" placeholder="Número da CNH"></div>
        <div class="field"><label>Telefone</label><input type="tel" id="nd-phone" placeholder="(31) 9 xxxxxx"></div>
      </div>
      <div class="field"><label>E-mail</label><input type="email" id="nd-email" placeholder="email@exemplo.com"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addDriver()"><i class="ti ti-plus"></i> Cadastrar</button>
    </div>
  </div>`;
}

function addDriver(){
  const name = document.getElementById('nd-name').value.trim();
  if(!name){ alert('Informe o nome do motorista!'); return; }
  const drivers = DB.drivers();
  drivers.push({ id:genId(), name, cnh:document.getElementById('nd-cnh').value, phone:document.getElementById('nd-phone').value, email:document.getElementById('nd-email').value, status:'ativo' });
  DB.save('drivers', drivers);
  closeModal();
  showAlert('Motorista cadastrado!');
}

function editDriver(id){
  const d = DB.drivers().find(x=>x.id===id);
  if(!d) return;
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">Editar motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
      <div class="field"><label>Nome completo</label><input type="text" id="ed-name" value="${d.name}"></div>
      <div class="row">
        <div class="field"><label>CNH</label><input type="text" id="ed-cnh" value="${d.cnh||''}"></div>
        <div class="field"><label>Telefone</label><input type="tel" id="ed-phone" value="${d.phone||''}"></div>
      </div>
      <div class="field"><label>E-mail</label><input type="email" id="ed-email" value="${d.email||''}"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveDriver(${id})"><i class="ti ti-check"></i> Salvar</button>
    </div>
  </div>`;
}

function saveDriver(id){
  const drivers = DB.drivers();
  const d = drivers.find(x=>x.id===id);
  d.name  = document.getElementById('ed-name').value;
  d.cnh   = document.getElementById('ed-cnh').value;
  d.phone = document.getElementById('ed-phone').value;
  d.email = document.getElementById('ed-email').value;
  DB.save('drivers', drivers);
  closeModal();
  showAlert('Dados atualizados!');
}

function toggleDriver(id){
  const drivers = DB.drivers();
  const d = drivers.find(x=>x.id===id);
  d.status = d.status==='ativo' ? 'inativo' : 'ativo';
  DB.save('drivers', drivers);
  renderMotoristas(document.getElementById('main-content'));
}

// ─── OCORRÊNCIAS ────────────────────────────────────────────────────────────
function renderOcorrencias(c){
  const incidents = DB.incidents().sort((a,b)=>new Date(b.date)-new Date(a.date));
  c.innerHTML = `
  ${alertHTML()}
  <div class="section-header">
    <span class="section-title">Ocorrências registradas</span>
    <button class="btn btn-primary btn-sm" onclick="openAddIncident()"><i class="ti ti-plus"></i> Nova</button>
  </div>
  ${incidents.length===0 ? `<div class="empty"><i class="ti ti-shield-check"></i>Nenhuma ocorrência registrada</div>` : ''}
  ${incidents.map(inc=>`
  <div class="incident-row ${inc.type==='outro'?'info':''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div>
        <div style="font-weight:600;font-size:14px;color:${inc.type==='outro'?'#CC5500':'#791F1F'}">
          ${inc.type==='multa'?'🚦 Multa':inc.type==='acidente'?'🚗 Acidente':'📋 Ocorrência'} — ${inc.driverName}
        </div>
        <div style="font-size:12px;color:#666;margin-top:2px">${fmtDate(inc.date)} • ${inc.vehicle} • OS: ${inc.os||'-'}</div>
        <div style="font-size:13px;margin-top:6px">${inc.description}</div>
        ${inc.value ? `<div style="font-size:12px;margin-top:4px;font-weight:600">Valor: R$ ${parseFloat(inc.value).toFixed(2)}</div>` : ''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="printIncident(${inc.id})"><i class="ti ti-printer"></i></button><button class="btn btn-danger btn-sm" onclick="deleteIncident(${inc.id})" style="flex-shrink:0"><i class="ti ti-trash"></i></button>
    </div>
  </div>`).join('')}`;
}

function openAddIncident(){
  document.getElementById('modal-container').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-title">Nova ocorrência <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
      <div class="row">
        <div class="field"><label>Tipo</label>
          <select id="inc-type"><option value="multa">Multa</option><option value="acidente">Acidente</option><option value="outro">Outro</option></select>
        </div>
        <div class="field"><label>Data</label><input type="date" id="inc-date" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Motorista</label>
          <select id="inc-driver">
            <option value="">Selecione...</option>
            ${DB.drivers().map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Veículo</label>
          <select id="inc-vehicle"><option>FIORINO</option><option>STRADA</option></select>
        </div>
      </div>
      <div class="row">
        <div class="field"><label>Nº OS vinculada</label><input type="text" id="inc-os" placeholder="Opcional"></div>
        <div class="field"><label>Valor (R$)</label><input type="number" id="inc-value" placeholder="0,00" step="0.01"></div>
      </div>
      <div class="field"><label>Descrição *</label><textarea id="inc-desc" placeholder="Descreva a ocorrência em detalhes..."></textarea></div>
      <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addIncident()"><i class="ti ti-plus"></i> Registrar ocorrência</button>
    </div>
  </div>`;
}

function addIncident(){
  const dId  = document.getElementById('inc-driver').value;
  const desc = document.getElementById('inc-desc').value.trim();
  if(!desc){ alert('Descreva a ocorrência!'); return; }
  const driver  = DB.drivers().find(d=>d.id==dId);
  const incidents = DB.incidents();
  incidents.push({
    id:          genId(),
    type:        document.getElementById('inc-type').value,
    date:        document.getElementById('inc-date').value,
    driverId:    dId ? parseInt(dId) : null,
    driverName:  driver ? driver.name : 'Não informado',
    vehicle:     document.getElementById('inc-vehicle').value,
    os:          document.getElementById('inc-os').value,
    value:       document.getElementById('inc-value').value,
    description: desc
  });
  DB.save('incidents', incidents);
  closeModal();
  showAlert('Ocorrência registrada!');
}

function deleteIncident(id){
  if(!confirm('Excluir esta ocorrência?')) return;
  DB.save('incidents', DB.incidents().filter(i=>i.id!==id));
  renderOcorrencias(document.getElementById('main-content'));
}

function printIncident(id){
 const inc=DB.incidents().find(i=>i.id===id); if(!inc)return;
 const w=window.open('','_blank');
 w.document.write(`<html><head><meta charset="UTF-8"><title>Ocorrência</title></head><body style="font-family:Arial;padding:30px">
 <h2>Registro de Ocorrência - Print Minas</h2>
 <p><b>Motorista:</b> ${inc.driverName}</p>
 <p><b>Veículo:</b> ${inc.vehicle}</p>
 <p><b>Data:</b> ${inc.date}</p>
 <p><b>Descrição:</b><br>${inc.description}</p>
 <div style="margin-top:80px;border-top:1px solid #000;width:300px">Assinatura do Motorista</div>
 <script>window.onload=()=>window.print()<\/script></body></html>`);
}

// ─── RELATÓRIO ──────────────────────────────────────────────────────────────
let relDriver = '';
let relMonth  = new Date().toISOString().slice(0,7);

function renderRelatorio(c){
  c.innerHTML = `
  ${alertHTML()}
  <div class="card">
    <div class="card-title"><i class="ti ti-file-text"></i> Relatório mensal para assinatura</div>
    <div class="row">
      <div class="field"><label>Motorista</label>
        <select id="rel-driver" onchange="relDriver=this.value;renderRelatorio(document.getElementById('main-content'))">
          <option value="">Todos os motoristas</option>
          ${DB.drivers().map(d=>`<option value="${d.id}" ${relDriver==d.id?'selected':''}>${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Mês / Ano</label>
        <input type="month" id="rel-month" value="${relMonth}" onchange="relMonth=this.value;renderRelatorio(document.getElementById('main-content'))">
      </div>
    </div>
  </div>
  ${buildReport()}`;
}

function buildReport(){
  const targetDrivers = relDriver ? DB.drivers().filter(d=>d.id==relDriver) : DB.drivers();
  return targetDrivers.map(driver=>{
    const trips     = DB.trips().filter(t=>t.driverId===driver.id && t.startTime.startsWith(relMonth));
    const incidents = DB.incidents().filter(i=>i.driverId===driver.id && i.date.startsWith(relMonth));
    const km = calcKm(trips);

    if(!trips.length && !incidents.length){
      return `<div class="report-section" style="opacity:.55">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">${initials(driver.name)}</div>
          <div><div style="font-weight:600">${driver.name}</div><div style="font-size:12px;color:#888">Sem registros em ${relMonth}</div></div>
        </div>
      </div>`;
    }

    return `
    <div class="report-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">${initials(driver.name)}</div>
          <div>
            <div style="font-weight:600;font-size:15px">${driver.name}</div>
            <div style="font-size:12px;color:#666">CNH: ${driver.cnh||'-'} • ${relMonth}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="printDriver(${driver.id})"><i class="ti ti-printer"></i> Imprimir / Assinar</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div class="stat"><div class="stat-num">${trips.length}</div><div class="stat-label">Viagens</div></div>
        <div class="stat"><div class="stat-num">${km}</div><div class="stat-label">KM percorridos</div></div>
        <div class="stat"><div class="stat-num">${incidents.length}</div><div class="stat-label">Ocorrências</div></div>
      </div>

      ${trips.length ? `
      <div style="overflow-x:auto">
        <table class="report-table">
          <thead><tr><th>Data</th><th>OS</th><th>Veículo</th><th>Destino</th><th>Saída</th><th>Chegada</th><th>KM</th></tr></thead>
          <tbody>
            ${trips.map(t=>`<tr>
              <td>${fmtDate(t.startTime)}</td>
              <td>${t.os||'-'}</td>
              <td>${t.vehicle}</td>
              <td>${t.destination||'-'}</td>
              <td>${fmtTime(t.startTime)}</td>
              <td>${t.endTime?fmtTime(t.endTime):'-'}</td>
              <td>${t.kmStart&&t.kmEnd ? (parseInt(t.kmEnd)-parseInt(t.kmStart))+'km' : '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${incidents.length ? `
      <div style="margin-top:12px">
        <div style="font-size:12px;font-weight:600;color:#A32D2D;margin-bottom:6px"><i class="ti ti-alert-triangle"></i> Ocorrências no período</div>
        ${incidents.map(i=>`<div style="font-size:12px;padding:6px 10px;background:#FCEBEB;border-radius:6px;margin-bottom:4px">${fmtDate(i.date)} — ${i.type}: ${i.description}${i.value?' (R$ '+parseFloat(i.value).toFixed(2)+')':''}</div>`).join('')}
      </div>` : ''}

      <div style="margin-top:20px;padding:14px;border:1.5px dashed rgba(0,0,0,0.15);border-radius:8px">
        <p style="font-size:12px;color:#666;margin-bottom:24px">Declaro que as informações acima são verídicas e que utilizei os veículos conforme descrito, responsabilizando-me por qualquer uso indevido.</p>
        <div style="display:flex;gap:24px">
          <div style="flex:2;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;text-align:center">Assinatura — ${driver.name}</div>
          <div style="flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;text-align:center">Data</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function printDriver(driverId){
  const driver    = DB.drivers().find(d=>d.id==driverId);
  const trips     = DB.trips().filter(t=>t.driverId==driverId && t.startTime.startsWith(relMonth));
  const incidents = DB.incidents().filter(i=>i.driverId==driverId && i.date.startsWith(relMonth));
  const km = calcKm(trips);

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Relatório ${driver.name} — ${relMonth}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:30px 35px;font-size:13px;color:#1a1a1a}
    h1{font-size:18px;font-weight:700;margin-bottom:4px}
    .sub{font-size:13px;color:#555;margin-bottom:20px}
    .stats{display:flex;gap:16px;margin:16px 0}
    .stat{background:#f5f5f0;padding:12px 18px;border-radius:6px;text-align:center;flex:1}
    .stat-n{font-size:20px;font-weight:700;color:#FF6B00}
    .stat-l{font-size:11px;color:#888;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin:14px 0}
    th{background:#f0f0ee;padding:7px 8px;text-align:left;font-size:12px;font-weight:700}
    td{padding:6px 8px;border-bottom:1px solid #eee;font-size:12px}
    .inc{background:#fff0f0;padding:6px 8px;border-radius:4px;margin-bottom:4px;font-size:12px}
    .sig{margin-top:40px;padding:18px;border:1.5px dashed #bbb;border-radius:6px}
    .sig p{font-size:12px;color:#555;margin-bottom:28px}
    .sig-lines{display:flex;gap:30px}
    .sig-line{flex:1;border-top:1px solid #333;padding-top:5px;font-size:11px;color:#555;text-align:center}
    .sig-line.short{flex:0.5}
    @media print{body{padding:15px 20px}.sig{page-break-inside:avoid}}
  </style></head><body>
  <h1>Print Minas — Relatório de Uso de Veículo</h1>
  <div class="sub"><strong>Motorista:</strong> ${driver.name} &nbsp;|&nbsp; <strong>CNH:</strong> ${driver.cnh||'-'} &nbsp;|&nbsp; <strong>Período:</strong> ${relMonth}</div>
  <div class="stats">
    <div class="stat"><div class="stat-n">${trips.length}</div><div class="stat-l">Viagens</div></div>
    <div class="stat"><div class="stat-n">${km} km</div><div class="stat-l">KM percorridos</div></div>
    <div class="stat"><div class="stat-n">${incidents.length}</div><div class="stat-l">Ocorrências</div></div>
  </div>
  ${trips.length ? `
  <table>
    <thead><tr><th>Data</th><th>OS</th><th>Veículo</th><th>Destino</th><th>Saída</th><th>Chegada</th><th>KM</th></tr></thead>
    <tbody>${trips.map(t=>`<tr>
      <td>${fmtDate(t.startTime)}</td><td>${t.os||'-'}</td><td>${t.vehicle}</td>
      <td>${t.destination||'-'}</td><td>${fmtTime(t.startTime)}</td>
      <td>${t.endTime?fmtTime(t.endTime):'-'}</td>
      <td>${t.kmStart&&t.kmEnd?(parseInt(t.kmEnd)-parseInt(t.kmStart))+'km':'-'}</td>
    </tr>`).join('')}</tbody>
  </table>` : '<p style="color:#888;font-size:13px;margin:10px 0">Nenhuma viagem registrada no período.</p>'}
  ${incidents.length ? `<p style="font-weight:700;color:#A32D2D;margin-top:10px;margin-bottom:4px">Ocorrências no período:</p>
  ${incidents.map(i=>`<div class="inc">${fmtDate(i.date)} — ${i.type}: ${i.description}${i.value?' (R$ '+parseFloat(i.value).toFixed(2)+')':''}</div>`).join('')}` : ''}
  <div class="sig">
    <p>Declaro que as informações acima são verídicas e que utilizei os veículos da empresa conforme descrito, responsabilizando-me por qualquer uso indevido registrado neste documento.</p>
    <div class="sig-lines">
      <div class="sig-line">Assinatura — ${driver.name}</div>
      <div class="sig-line short">Data</div>
    </div>
  </div>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
}

// ─── QR CODE ────────────────────────────────────────────────────────────────
function renderQR(c){
  const url = window.location.href.split('?')[0].split('#')[0];
  c.innerHTML = `
  ${alertHTML()}
  <div class="card">
    <div class="card-title"><i class="ti ti-qrcode"></i> QR Code para os veículos</div>
    <p style="font-size:13px;color:#666;margin-bottom:18px">Imprima e cole dentro do carro. O técnico escaneia com a câmera do celular e já cai diretamente no formulário de saída.</p>

    <div class="qr-box">
      <div id="qr-render" style="display:flex;justify-content:center;margin-bottom:14px"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">Print Minas — Gestão de Frota</div>
      <div style="font-size:11px;color:#888;margin-bottom:16px;word-break:break-all">${url}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="downloadQR()"><i class="ti ti-download"></i> Baixar QR Code</button>
        <button class="btn btn-secondary btn-sm" onclick="printQR()"><i class="ti ti-printer"></i> Imprimir etiqueta</button>
      </div>
    </div>

    <div style="margin-top:14px;padding:12px 14px;background:#EEEDFE;border-radius:8px;font-size:13px;color:#CC5500">
      <strong><i class="ti ti-info-circle"></i> Como usar:</strong><br>
      1. Clique em "Baixar QR Code" ou "Imprimir etiqueta"<br>
      2. Cole o QR Code dentro do carro (painel ou para-sol)<br>
      3. O técnico aponta a câmera do celular e escaneia<br>
      4. O sistema abre automaticamente no formulário de saída
    </div>
  </div>`;

  setTimeout(()=>{
    if(typeof QRCode !== 'undefined'){
      QRCode.toCanvas(document.createElement('canvas'), url, {width:200, margin:2, color:{dark:'#1a1a1a',light:'#ffffff'}}, function(err, canvas){
        if(!err) document.getElementById('qr-render').appendChild(canvas);
      });
    }
  }, 300);
}

function downloadQR(){
  const canvas = document.querySelector('#qr-render canvas');
  if(!canvas){ alert('QR Code ainda carregando, aguarde um momento...'); return; }
  const a = document.createElement('a');
  a.download = 'qrcode-printminas.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

function printQR(){
  const canvas = document.querySelector('#qr-render canvas');
  const url    = window.location.href.split('?')[0].split('#')[0];
  const imgSrc = canvas ? canvas.toDataURL() : '';
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Code Print Minas</title>
  <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{border:2px solid #FF6B00;border-radius:12px;padding:24px;text-align:center;max-width:280px}
  .logo{font-size:22px;font-weight:700;color:#FF6B00;margin-bottom:4px}
  .sub{font-size:12px;color:#666;margin-bottom:16px}
  img{width:200px;height:200px}
  .hint{font-size:11px;color:#888;margin-top:12px}
  @media print{body{display:block}.box{margin:20px auto;page-break-inside:avoid}}</style></head>
  <body><div class="box">
    <div class="logo">🚗 Print Minas</div>
    <div class="sub">Gestão de Frota — Escaneie para registrar uso</div>
    ${imgSrc ? `<img src="${imgSrc}" alt="QR Code">` : `<p>QR Code: ${url}</p>`}
    <div class="hint">Aponte a câmera do celular para o QR Code</div>
  </div>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
}

// ─── Init ───────────────────────────────────────────────────────────────────
showTab('viagem');
