// ─── Logo ────────────────────────────────────────────────────────────────────
const LOGO_BASE64 = "data:image/png;base64,PLACEHOLDER_LOGO_BASE64";
function hasValidLogo(){ return typeof LOGO_BASE64==='string'&&LOGO_BASE64.startsWith('data:image')&&!LOGO_BASE64.includes('PLACEHOLDER'); }
function safeAddLogo(doc,x,y,w,h){ if(!hasValidLogo())return; try{doc.addImage(LOGO_BASE64,'PNG',x,y,w,h);}catch(err){console.warn('Logo error',err);} }

// ─── jsPDF loader ────────────────────────────────────────────────────────────
const JSPDF_SOURCES=['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'];
let _jsPDFLoading=null;
function _loadScriptFromSources(sources,index=0){
  return new Promise((resolve,reject)=>{
    if(index>=sources.length){reject(new Error('Falha ao carregar jsPDF.'));return;}
    const s=document.createElement('script');s.src=sources[index];
    s.onload=()=>window.jspdf&&window.jspdf.jsPDF?resolve(window.jspdf.jsPDF):_loadScriptFromSources(sources,index+1).then(resolve,reject);
    s.onerror=()=>{console.warn('Falha:',sources[index]);_loadScriptFromSources(sources,index+1).then(resolve,reject);};
    document.head.appendChild(s);
  });
}
function loadJsPDF(){
  if(window.jspdf&&window.jspdf.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
  if(_jsPDFLoading)return _jsPDFLoading;
  _jsPDFLoading=_loadScriptFromSources(JSPDF_SOURCES).catch(err=>{_jsPDFLoading=null;throw err;});
  return _jsPDFLoading;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const TAB_ORDER=['visao','viagem','registros','motoristas','ocorrencias','relatorio','qr'];
let activeTab='visao',alertMsg=null;

function showTab(tab){
  activeTab=tab;
  document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',TAB_ORDER[i]===tab));
  const c=document.getElementById('main-content');
  const renders={visao:renderVisaoGeral,viagem:renderViagem,registros:renderRegistros,motoristas:renderMotoristas,ocorrencias:renderOcorrencias,relatorio:renderRelatorio,qr:renderQR};
  renders[tab]&&renders[tab](c);
}

function showAlert(msg,type='success'){
  alertMsg={msg,type};showTab(activeTab);
  setTimeout(()=>{alertMsg=null;const el=document.querySelector('.alert');if(el&&el.parentNode)el.parentNode.removeChild(el);},2800);
}
function alertHTML(){
  if(!alertMsg)return '';
  return '<div class="alert alert-'+alertMsg.type+'"><i class="ti ti-'+(alertMsg.type==='success'?'check':'alert-circle')+'"></i>'+alertMsg.msg+'</div>';
}

let _saving=false;
function setBusy(btn,busy,busyLabel){
  if(!btn)return;
  if(busy){btn._oldHTML=btn.innerHTML;btn.disabled=true;btn.innerHTML=busyLabel||'Salvando...';}
  else{btn.disabled=false;if(btn._oldHTML)btn.innerHTML=btn._oldHTML;}
}

// ─── VISÃO GERAL ─────────────────────────────────────────────────────────────
function renderVisaoGeral(c){
  const drivers=DB.drivers(),trips=DB.trips(),incidents=DB.incidents();
  const today=new Date().toISOString().split('T')[0];
  const currentMonth=new Date().toISOString().slice(0,7);
  const activeDrivers=drivers.filter(d=>d.status==='ativo').length;
  const openTrips=trips.filter(t=>!t.endTime).length;
  const tripsToday=trips.filter(t=>t.startTime&&t.startTime.startsWith(today)).length;
  const monthTrips=trips.filter(t=>t.startTime&&t.startTime.startsWith(currentMonth));
  const monthKm=calcKm(monthTrips);
  const monthIncidents=incidents.filter(i=>i.date&&i.date.startsWith(currentMonth)).length;

  const tripEvents=trips.map(t=>({
    kind:t.endTime?'trip-closed':'trip-open',
    date:t.endTime||t.startTime,
    title:t.vehicle+' \u00b7 '+(t.endTime?'retorno registrado':'sa\u00edda registrada'),
    meta:t.driverName+' \u00b7 '+fmtDate(t.startTime)+(t.destination?' \u00b7 '+t.destination:''),
    badge:t.endTime?'Conclu\u00edda':'Em aberto'
  }));
  const incidentEvents=incidents.map(i=>({
    kind:'incident',date:i.date,
    title:i.vehicle+' \u00b7 ocorr\u00eancia registrada',
    meta:i.driverName+' \u00b7 '+fmtDate(i.date),
    badge:i.type==='multa'?'Multa':i.type==='acidente'?'Acidente':'Ocorr\u00eancia'
  }));
  const feed=[...tripEvents,...incidentEvents].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);

  function iconFor(ev){
    if(ev.kind==='trip-open') return '<div class="activity-icon ic-blue"><i class="ti ti-map-pin"></i></div>';
    if(ev.kind==='trip-closed') return '<div class="activity-icon ic-green"><i class="ti ti-check"></i></div>';
    return '<div class="activity-icon ic-coral"><i class="ti ti-alert-triangle"></i></div>';
  }
  function badgeStyleFor(ev){
    if(ev.kind==='trip-open') return 'background:#E6F1FB;color:#185FA5';
    if(ev.kind==='trip-closed') return 'background:#EAF3DE;color:#3B6D11';
    return 'background:#FAECE7;color:#993C1D';
  }

  c.innerHTML=alertHTML()+
    '<p class="overview-title">Vis\u00e3o geral</p>'+
    '<div class="stat-grid-ov">'+
      '<div class="stat-card-ov"><div class="stat-icon ic-blue"><i class="ti ti-users"></i></div><p class="stat-num-ov">'+activeDrivers+'</p><p class="stat-label-ov">Motoristas ativos</p></div>'+
      '<div class="stat-card-ov"><div class="stat-icon ic-amber"><i class="ti ti-clock"></i></div><p class="stat-num-ov">'+openTrips+'</p><p class="stat-label-ov">Viagens em aberto</p></div>'+
      '<div class="stat-card-ov"><div class="stat-icon ic-green"><i class="ti ti-route"></i></div><p class="stat-num-ov">'+tripsToday+'</p><p class="stat-label-ov">Viagens hoje</p></div>'+
      '<div class="stat-card-ov"><div class="stat-icon ic-blue"><i class="ti ti-gauge"></i></div><p class="stat-num-ov">'+monthKm+'</p><p class="stat-label-ov">Km rodados no m\u00eas</p></div>'+
      '<div class="stat-card-ov"><div class="stat-icon ic-coral"><i class="ti ti-alert-triangle"></i></div><p class="stat-num-ov">'+monthIncidents+'</p><p class="stat-label-ov">Ocorr\u00eancias no m\u00eas</p></div>'+
    '</div>'+
    '<div class="activity-card">'+
      '<p class="activity-title">Atividades recentes</p>'+
      (feed.length===0?'<div class="empty"><i class="ti ti-map-off"></i>Nenhuma atividade registrada ainda</div>':
        feed.map(ev=>'<div class="activity-row">'+iconFor(ev)+'<div class="activity-info"><p class="activity-name">'+ev.title+'</p><p class="activity-meta">'+ev.meta+'</p></div><span class="activity-badge" style="'+badgeStyleFor(ev)+'">'+ev.badge+'</span></div>').join(''))+
    '</div>';
}

// ─── Photo preview ────────────────────────────────────────────────────────────
const PHOTO_MAX_DIM=1280,PHOTO_QUALITY=0.6;
function previewPhoto(input,previewId){
  const file=input.files[0];if(!file)return;
  const img=document.getElementById(previewId);
  const reader=new FileReader();
  reader.onload=e=>{
    const t=new Image();
    t.onload=()=>{try{img.src=compressImage(t);img.style.display='block';}catch(err){img.src=e.target.result;img.style.display='block';}};
    t.onerror=()=>{img.src=e.target.result;img.style.display='block';};
    t.src=e.target.result;
  };
  reader.onerror=()=>alert('N\u00e3o foi poss\u00edvel ler a foto. Tente novamente.');
  reader.readAsDataURL(file);
}
function compressImage(img){
  let{width,height}=img;
  if(width>PHOTO_MAX_DIM||height>PHOTO_MAX_DIM){if(width>height){height=Math.round(height*(PHOTO_MAX_DIM/width));width=PHOTO_MAX_DIM;}else{width=Math.round(width*(PHOTO_MAX_DIM/height));height=PHOTO_MAX_DIM;}}
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  canvas.getContext('2d').drawImage(img,0,0,width,height);
  return canvas.toDataURL('image/jpeg',PHOTO_QUALITY);
}
function closeModal(){document.getElementById('modal-container').innerHTML='';}

// ─── NOVA VIAGEM ──────────────────────────────────────────────────────────────
function renderViagem(c){
  const drivers=DB.drivers().filter(d=>d.status==='ativo');
  const openTrips=DB.trips().filter(t=>!t.endTime);
  c.innerHTML=alertHTML()+
    (openTrips.length?'<div class="card"><div class="card-title"><i class="ti ti-clock"></i> Viagem em aberto</div>'+
      openTrips.map(t=>'<div class="trip-row"><div class="trip-header"><div><div class="trip-name">'+t.driverName+'</div><div class="trip-meta"><span><i class="ti ti-car"></i>'+t.vehicle+'</span><span><i class="ti ti-hash"></i>OS: '+(t.os||'-')+'</span><span><i class="ti ti-map-pin"></i>'+(t.destination||'-')+'</span><span><i class="ti ti-clock"></i>'+fmt(t.startTime)+'</span></div></div><span class="tag tag-open">Em aberto</span></div><div class="actions"><button class="btn btn-success btn-sm" onclick="openArrival('+t.id+')"><i class="ti ti-flag"></i> Registrar chegada</button></div></div>').join('')+
      '</div>':'')+
    '<div class="card"><div class="card-title"><i class="ti ti-map-pin"></i> Registrar sa\u00edda</div>'+
    '<div class="field"><label>Motorista</label><select id="v-driver"><option value="">Selecione o motorista...</option>'+
      drivers.map(d=>'<option value="'+d.id+'">'+d.name+'</option>').join('')+
    '</select></div>'+
    '<div class="row"><div class="field"><label>Ve\u00edculo</label><select id="v-vehicle"><option value="FIORINO">FIORINO</option><option value="STRADA">STRADA</option></select></div>'+
    '<div class="field"><label>N\u00ba OS (Printwayy)</label><input type="text" id="v-os" placeholder="Ex: OS-2024-001"></div></div>'+
    '<div class="row"><div class="field"><label>Data de sa\u00edda</label><input type="date" id="v-date" value="'+new Date().toISOString().split('T')[0]+'"></div>'+
    '<div class="field"><label>Hor\u00e1rio de sa\u00edda</label><input type="time" id="v-time" value="'+new Date().toTimeString().slice(0,5)+'"></div></div>'+
    '<div class="field"><label>Destino</label><input type="text" id="v-dest" placeholder="Cidade / empresa de destino"></div>'+
    '<div class="field"><label>KM de sa\u00edda</label><input type="number" id="v-km-start" placeholder="Ex: 45230"></div>'+
    '<div class="field"><label>Foto do painel (KM de sa\u00edda)</label>'+
    '<div class="photo-area" onclick="document.getElementById(\'v-photo-start\').click()"><i class="ti ti-camera" style="font-size:26px;display:block;margin-bottom:6px"></i>Toque para tirar foto do painel<input type="file" id="v-photo-start" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,\'prev-start\')"></div>'+
    '<img id="prev-start" class="photo-preview" style="display:none"></div>'+
    '<div class="field"><label>Observa\u00e7\u00f5es</label><textarea id="v-obs" placeholder="Estado do ve\u00edculo, observa\u00e7\u00f5es iniciais..."></textarea></div>'+
    '<button class="btn btn-primary" style="width:100%" onclick="startTrip(this)"><i class="ti ti-map-pin"></i> Registrar sa\u00edda</button></div>';
}

async function startTrip(btn){
  if(_saving)return;
  const driverId=document.getElementById('v-driver').value;
  if(!driverId){alert('Selecione o motorista!');return;}
  const driver=DB.drivers().find(d=>d.id==driverId);
  const date=document.getElementById('v-date').value,time=document.getElementById('v-time').value;
  const photo=document.getElementById('prev-start');
  const trip={id:genId(),driverId:parseInt(driverId),driverName:driver.name,vehicle:document.getElementById('v-vehicle').value,os:document.getElementById('v-os').value,destination:document.getElementById('v-dest').value,startTime:new Date(date+'T'+time).toISOString(),endTime:null,kmStart:document.getElementById('v-km-start').value,kmEnd:null,photoStart:photo&&photo.style.display!=='none'?photo.src:null,photoEnd:null,obsStart:document.getElementById('v-obs').value,obsEnd:'',status:'open'};
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{const trips=DB.trips();trips.push(trip);DB.save('trips',trips);if(USE_SUPABASE){ok=await DB.saveOne('trips',trip);}}
  catch(err){console.error('Erro ao registrar sa\u00edda:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  if(ok){showAlert('Sa\u00edda registrada com sucesso!');}else{showAlert('Salvo no aparelho, mas falhou no servidor.','error');}
}

function openArrival(tripId){
  const trip=DB.trips().find(t=>t.id===tripId);if(!trip)return;
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Registrar chegada<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div style="font-size:13px;color:#666;margin-bottom:14px;padding:8px 12px;background:#f5f5f0;border-radius:8px"><strong>'+trip.driverName+'</strong> \u2014 '+trip.vehicle+' \u2014 saiu \u00e0s '+fmtTime(trip.startTime)+'</div><div class="row"><div class="field"><label>Data de chegada</label><input type="date" id="arr-date" value="'+new Date().toISOString().split('T')[0]+'"></div><div class="field"><label>Hor\u00e1rio de chegada</label><input type="time" id="arr-time" value="'+new Date().toTimeString().slice(0,5)+'"></div></div><div class="field"><label>KM de chegada</label><input type="number" id="arr-km" placeholder="Ex: 45510"></div><div class="field"><label>Foto do painel (KM de chegada)</label><div class="photo-area" onclick="document.getElementById(\'arr-photo\').click()"><i class="ti ti-camera" style="font-size:24px;display:block;margin-bottom:5px"></i>Foto do painel na chegada<input type="file" id="arr-photo" accept="image/*" capture="environment" style="display:none" onchange="previewPhoto(this,\'arr-prev\')"></div><img id="arr-prev" class="photo-preview" style="display:none"></div><div class="field"><label>Observa\u00e7\u00f5es de chegada</label><textarea id="arr-obs" placeholder="Estado do ve\u00edculo, ocorr\u00eancias..."></textarea></div><div style="display:flex;gap:8px;margin-top:4px"><button class="btn btn-primary" style="flex:1" onclick="closeTrip('+tripId+', this)"><i class="ti ti-check"></i> Confirmar chegada</button><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button></div></div></div>';
}

async function closeTrip(tripId,btn){
  if(_saving)return;
  const trips=DB.trips(),trip=trips.find(t=>t.id===tripId);if(!trip)return;
  const date=document.getElementById('arr-date').value,time=document.getElementById('arr-time').value;
  const photo=document.getElementById('arr-prev');
  trip.endTime=new Date(date+'T'+time).toISOString();trip.kmEnd=document.getElementById('arr-km').value;trip.photoEnd=photo&&photo.style.display!=='none'?photo.src:null;trip.obsEnd=document.getElementById('arr-obs').value;trip.status='closed';
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{DB.save('trips',trips);if(USE_SUPABASE){ok=await DB.saveOne('trips',trip);}}
  catch(err){console.error('Erro ao registrar chegada:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  closeModal();showAlert(ok?'Chegada registrada com sucesso!':'Salvo no aparelho, mas falhou no servidor.',ok?'success':'error');
}

function editTrip(tripId){
  const trip=DB.trips().find(t=>t.id===tripId);if(!trip)return;
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Editar viagem<button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="row"><div class="field"><label>Data de sa\u00edda</label><input type="date" id="e-date" value="'+trip.startTime.split('T')[0]+'"></div><div class="field"><label>Hora de sa\u00edda</label><input type="time" id="e-time" value="'+trip.startTime.split('T')[1].slice(0,5)+'"></div></div><div class="field"><label>Destino</label><input type="text" id="e-dest" value="'+(trip.destination||'')+'"></div><div class="field"><label>N\u00ba OS</label><input type="text" id="e-os" value="'+(trip.os||'')+'"></div><div class="field"><label>KM de sa\u00edda</label><input type="number" id="e-km" value="'+(trip.kmStart||'')+'"></div><div class="field"><label>Observa\u00e7\u00e3o</label><textarea id="e-obs">'+(trip.obsStart||'')+'</textarea></div><div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="saveEdit('+tripId+', this)"><i class="ti ti-check"></i> Salvar</button><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button></div></div></div>';
}

async function saveEdit(tripId,btn){
  if(_saving)return;
  const trips=DB.trips(),trip=trips.find(t=>t.id===tripId);
  const d=document.getElementById('e-date').value,t=document.getElementById('e-time').value;
  trip.startTime=new Date(d+'T'+t).toISOString();trip.destination=document.getElementById('e-dest').value;trip.os=document.getElementById('e-os').value;trip.kmStart=document.getElementById('e-km').value;trip.obsStart=document.getElementById('e-obs').value;
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{DB.save('trips',trips);if(USE_SUPABASE){ok=await DB.saveOne('trips',trip);}}
  catch(err){console.error('Erro ao editar viagem:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  closeModal();showAlert(ok?'Viagem atualizada!':'Salvo no aparelho, mas falhou no servidor.',ok?'success':'error');
}

// ─── REGISTROS ───────────────────────────────────────────────────────────────
let filterDate='',filterDriver='';
function filterRegistros(){filterDate=document.getElementById('filter-date')?.value||'';filterDriver=document.getElementById('filter-driver-val')?.value||'';renderRegistros(document.getElementById('main-content'));}
function clearFilter(){filterDate='';filterDriver='';renderRegistros(document.getElementById('main-content'));}

function renderRegistros(c){
  let trips=[...DB.trips()].sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  if(filterDate)trips=trips.filter(t=>t.startTime.startsWith(filterDate));
  if(filterDriver)trips=trips.filter(t=>t.driverId==filterDriver);
  const km=trips.reduce((s,t)=>{if(t.kmStart&&t.kmEnd)return s+(parseInt(t.kmEnd)-parseInt(t.kmStart));return s;},0);
  c.innerHTML=alertHTML()+
    '<div class="card"><div class="card-title"><i class="ti ti-search"></i> Buscar registros</div>'+
    '<div class="row"><div class="field"><label>Data</label><input type="date" id="filter-date" value="'+filterDate+'" onchange="filterRegistros()"></div>'+
    '<div class="field"><label>Motorista</label><select id="filter-driver-val" onchange="filterRegistros()"><option value="">Todos</option>'+
      DB.drivers().map(d=>'<option value="'+d.id+'" '+(filterDriver==d.id?'selected':'')+'>'+d.name+'</option>').join('')+
    '</select></div></div>'+
    (filterDate||filterDriver?'<button class="btn btn-secondary btn-sm" onclick="clearFilter()"><i class="ti ti-x"></i> Limpar filtro</button>':'')+
    '</div>'+
    '<div class="stat-grid"><div class="stat"><div class="stat-num">'+trips.length+'</div><div class="stat-label">Viagens</div></div><div class="stat"><div class="stat-num">'+trips.filter(t=>t.status==='open').length+'</div><div class="stat-label">Em aberto</div></div><div class="stat"><div class="stat-num">'+km+'</div><div class="stat-label">KM total</div></div></div>'+
    (trips.length===0?'<div class="empty"><i class="ti ti-map-off"></i>Nenhum registro encontrado</div>':'')+
    trips.map(t=>'<div class="trip-row"><div class="trip-header"><div><div class="trip-name">'+t.driverName+'</div><div class="trip-meta"><span><i class="ti ti-calendar"></i>'+fmtDate(t.startTime)+'</span><span><i class="ti ti-car"></i>'+t.vehicle+'</span><span><i class="ti ti-hash"></i>OS: '+(t.os||'-')+'</span><span><i class="ti ti-map-pin"></i>'+(t.destination||'-')+'</span>'+(t.kmStart?'<span><i class="ti ti-road"></i>'+t.kmStart+' \u2192 '+(t.kmEnd||'?')+' km</span>':'')+'</div><div class="trip-meta" style="margin-top:4px"><span><i class="ti ti-clock"></i>Sa\u00edda: '+fmt(t.startTime)+'</span>'+(t.endTime?'<span><i class="ti ti-flag"></i>Chegada: '+fmt(t.endTime)+'</span>':'')+'</div>'+(t.obsStart?'<div style="font-size:12px;color:#666;margin-top:5px;padding:5px 8px;background:#f8f8f5;border-radius:6px">'+t.obsStart+'</div>':'')+'</div><span class="tag '+(t.status==='open'?'tag-open':'tag-closed')+'">'+(t.status==='open'?'Em aberto':'Conclu\u00edda')+'</span></div><div class="actions">'+(t.status==='open'?'<button class="btn btn-success btn-sm" onclick="openArrival('+t.id+')"><i class="ti ti-flag"></i> Chegada</button>':'')+(t.photoStart||t.photoEnd?'<button class="btn btn-secondary btn-sm" onclick="viewPhotos('+t.id+')"><i class="ti ti-photo"></i> Fotos</button>':'')+'<button class="btn btn-secondary btn-sm" onclick="editTrip('+t.id+')"><i class="ti ti-edit"></i></button></div></div>').join('');
}

async function deleteTrip(id){
  if(!confirm('Excluir este registro permanentemente?'))return;
  const trips=DB.trips().filter(t=>t.id!==id);DB.save('trips',trips);
  if(USE_SUPABASE){await DB.removeOne('trips',id);}
  renderRegistros(document.getElementById('main-content'));
}

function viewPhotos(tripId){
  const t=DB.trips().find(x=>x.id===tripId);if(!t)return;
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Fotos da viagem <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div>'+(t.photoStart?'<div style="margin-bottom:14px"><div style="font-size:12px;color:#666;margin-bottom:4px;font-weight:600">KM de sa\u00edda</div><img src="'+t.photoStart+'" style="width:100%;border-radius:8px"></div>':'')+(t.photoEnd?'<div><div style="font-size:12px;color:#666;margin-bottom:4px;font-weight:600">KM de chegada</div><img src="'+t.photoEnd+'" style="width:100%;border-radius:8px"></div>':'<p style="font-size:13px;color:#888">Sem foto de chegada.</p>')+'</div></div>';
}

// ─── MOTORISTAS ──────────────────────────────────────────────────────────────
function renderMotoristas(c){
  const drivers=DB.drivers(),trips=DB.trips();
  c.innerHTML=alertHTML()+
    '<div class="section-header"><span class="section-title">Motoristas cadastrados</span><button class="btn btn-primary btn-sm" onclick="openAddDriver()"><i class="ti ti-plus"></i> Novo</button></div>'+
    drivers.map(d=>{
      const dtrips=trips.filter(t=>t.driverId===d.id),km=calcKm(dtrips);
      return '<div class="driver-card"><div class="avatar">'+initials(d.name)+'</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">'+d.name+'</div><div style="font-size:12px;color:#666;margin-top:2px">CNH: '+(d.cnh||'-')+' \u2022 '+(d.phone||'sem telefone')+'</div><div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap"><span class="badge"><i class="ti ti-map-pin"></i> '+dtrips.length+' viagens</span><span class="badge"><i class="ti ti-road"></i> '+km+' km</span><span class="badge" style="background:'+(d.status==='ativo'?'#EAF3DE':'#FCEBEB')+';color:'+(d.status==='ativo'?'#3B6D11':'#A32D2D')+'">'+d.status+'</span></div></div><div style="display:flex;gap:4px;flex-shrink:0"><button class="btn btn-secondary btn-sm" onclick="editDriver('+d.id+')" title="Editar"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-sm" onclick="toggleDriver('+d.id+')" title="'+(d.status==='ativo'?'Desativar':'Ativar')+'">'+(d.status==='ativo'?'<i class="ti ti-user-off"></i>':'<i class="ti ti-user-check"></i>')+'</button></div></div>';
    }).join('');
}

function openAddDriver(){
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Novo motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="field"><label>Nome completo *</label><input type="text" id="nd-name" placeholder="Nome do motorista"></div><div class="row"><div class="field"><label>CNH</label><input type="text" id="nd-cnh" placeholder="N\u00famero da CNH"></div><div class="field"><label>Telefone</label><input type="tel" id="nd-phone" placeholder="(31) 9 xxxxxx"></div></div><div class="field"><label>E-mail</label><input type="email" id="nd-email" placeholder="email@exemplo.com"></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addDriver(this)"><i class="ti ti-plus"></i> Cadastrar</button></div></div>';
}

async function addDriver(btn){
  if(_saving)return;
  const name=document.getElementById('nd-name').value.trim();if(!name){alert('Informe o nome do motorista!');return;}
  const driver={id:genId(),name,cnh:document.getElementById('nd-cnh').value,phone:document.getElementById('nd-phone').value,email:document.getElementById('nd-email').value,status:'ativo'};
  const drivers=DB.drivers();drivers.push(driver);
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{DB.save('drivers',drivers);if(USE_SUPABASE){ok=await DB.saveOne('drivers',driver);}}
  catch(err){console.error('Erro ao cadastrar motorista:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  closeModal();showAlert(ok?'Motorista cadastrado!':'Salvo no aparelho, mas falhou no servidor.',ok?'success':'error');
}

function editDriver(id){
  const d=DB.drivers().find(x=>x.id===id);if(!d)return;
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Editar motorista <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="field"><label>Nome completo</label><input type="text" id="ed-name" value="'+d.name+'"></div><div class="row"><div class="field"><label>CNH</label><input type="text" id="ed-cnh" value="'+(d.cnh||'')+'"></div><div class="field"><label>Telefone</label><input type="tel" id="ed-phone" value="'+(d.phone||'')+'"></div></div><div class="field"><label>E-mail</label><input type="email" id="ed-email" value="'+(d.email||'')+'"></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveDriver('+id+', this)"><i class="ti ti-check"></i> Salvar</button></div></div>';
}

async function saveDriver(id,btn){
  if(_saving)return;
  const drivers=DB.drivers(),d=drivers.find(x=>x.id===id);
  d.name=document.getElementById('ed-name').value;d.cnh=document.getElementById('ed-cnh').value;d.phone=document.getElementById('ed-phone').value;d.email=document.getElementById('ed-email').value;
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{DB.save('drivers',drivers);if(USE_SUPABASE){ok=await DB.saveOne('drivers',d);}}
  catch(err){console.error('Erro ao salvar motorista:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  closeModal();showAlert(ok?'Dados atualizados!':'Salvo no aparelho, mas falhou no servidor.',ok?'success':'error');
}

async function toggleDriver(id){
  const drivers=DB.drivers(),d=drivers.find(x=>x.id===id);
  d.status=d.status==='ativo'?'inativo':'ativo';DB.save('drivers',drivers);
  if(USE_SUPABASE){await DB.saveOne('drivers',d);}
  renderMotoristas(document.getElementById('main-content'));
}

// ─── OCORRÊNCIAS ─────────────────────────────────────────────────────────────
function renderOcorrencias(c){
  const incidents=DB.incidents().sort((a,b)=>new Date(b.date)-new Date(a.date));
  c.innerHTML=alertHTML()+
    '<div class="section-header"><span class="section-title">Ocorr\u00eancias registradas</span><button class="btn btn-primary btn-sm" onclick="openAddIncident()"><i class="ti ti-plus"></i> Nova</button></div>'+
    (incidents.length===0?'<div class="empty"><i class="ti ti-shield-check"></i>Nenhuma ocorr\u00eancia registrada</div>':'')+
    incidents.map(inc=>'<div class="incident-row '+(inc.type==='outro'?'info':'')+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font-weight:600;font-size:14px;color:'+(inc.type==='outro'?'#CC5500':'#791F1F')+'">'+(inc.type==='multa'?'Multa':inc.type==='acidente'?'Acidente':'Ocorr\u00eancia')+' \u2014 '+inc.driverName+'</div><div style="font-size:12px;color:#666;margin-top:2px">'+fmtDate(inc.date)+' \u2022 '+inc.vehicle+' \u2022 OS: '+(inc.os||'-')+'</div><div style="font-size:13px;margin-top:6px">'+inc.description+'</div>'+(inc.value?'<div style="font-size:12px;margin-top:4px;font-weight:600">Valor: R$ '+parseFloat(inc.value).toFixed(2)+'</div>':'')+'</div><button class="btn btn-danger btn-sm" onclick="printIncident('+inc.id+')"><i class="ti ti-printer"></i></button><button class="btn btn-danger btn-sm" onclick="deleteIncident('+inc.id+')" style="flex-shrink:0"><i class="ti ti-trash"></i></button></div></div>').join('');
}

function openAddIncident(){
  document.getElementById('modal-container').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">Nova ocorr\u00eancia <button class="close-btn" onclick="closeModal()"><i class="ti ti-x"></i></button></div><div class="row"><div class="field"><label>Tipo</label><select id="inc-type"><option value="multa">Multa</option><option value="acidente">Acidente</option><option value="outro">Outro</option></select></div><div class="field"><label>Data</label><input type="date" id="inc-date" value="'+new Date().toISOString().split('T')[0]+'"></div></div><div class="row"><div class="field"><label>Motorista</label><select id="inc-driver"><option value="">Selecione...</option>'+DB.drivers().map(d=>'<option value="'+d.id+'">'+d.name+'</option>').join('')+'</select></div><div class="field"><label>Ve\u00edculo</label><select id="inc-vehicle"><option>FIORINO</option><option>STRADA</option></select></div></div><div class="row"><div class="field"><label>N\u00ba OS vinculada</label><input type="text" id="inc-os" placeholder="Opcional"></div><div class="field"><label>Valor (R$)</label><input type="number" id="inc-value" placeholder="0,00" step="0.01"></div></div><div class="field"><label>Descri\u00e7\u00e3o *</label><textarea id="inc-desc" placeholder="Descreva a ocorr\u00eancia em detalhes..."></textarea></div><button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="addIncident(this)"><i class="ti ti-plus"></i> Registrar ocorr\u00eancia</button></div></div>';
}

async function addIncident(btn){
  if(_saving)return;
  const dId=document.getElementById('inc-driver').value,desc=document.getElementById('inc-desc').value.trim();
  if(!desc){alert('Descreva a ocorr\u00eancia!');return;}
  const driver=DB.drivers().find(d=>d.id==dId);
  const incident={id:genId(),type:document.getElementById('inc-type').value,date:document.getElementById('inc-date').value,driverId:dId?parseInt(dId):null,driverName:driver?driver.name:'N\u00e3o informado',vehicle:document.getElementById('inc-vehicle').value,os:document.getElementById('inc-os').value,value:document.getElementById('inc-value').value,description:desc};
  const incidents=DB.incidents();incidents.push(incident);
  _saving=true;setBusy(btn,true,'<i class="ti ti-loader"></i> Salvando...');
  let ok=true;
  try{DB.save('incidents',incidents);if(USE_SUPABASE){ok=await DB.saveOne('incidents',incident);}}
  catch(err){console.error('Erro ao registrar ocorr\u00eancia:',err);ok=false;}
  finally{_saving=false;setBusy(btn,false);}
  closeModal();showAlert(ok?'Ocorr\u00eancia registrada!':'Salvo no aparelho, mas falhou no servidor.',ok?'success':'error');
}

async function deleteIncident(id){
  if(!confirm('Excluir esta ocorr\u00eancia?'))return;
  DB.save('incidents',DB.incidents().filter(i=>i.id!==id));
  if(USE_SUPABASE){await DB.removeOne('incidents',id);}
  renderOcorrencias(document.getElementById('main-content'));
}

async function printIncident(id){
  const inc=DB.incidents().find(i=>i.id===id);if(!inc)return;
  const btn=document.querySelector('[onclick="printIncident('+id+')"]');
  setBusy(btn,true,'<i class="ti ti-loader"></i>');
  try{
    const jsPDF=await loadJsPDF(),doc=new jsPDF({unit:'mm',format:'a4'});
    const W=doc.internal.pageSize.getWidth();let y=0;
    doc.setFillColor(255,107,0);doc.rect(0,0,W,32,'F');safeAddLogo(doc,12,5,22,22);
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Print Minas',40,15);
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Registro de Ocorr\u00eancia \u2014 Gest\u00e3o de Frota',40,22);
    y=44;doc.setTextColor(20,20,20);
    const typeLabel=inc.type==='multa'?'Multa':inc.type==='acidente'?'Acidente':'Ocorr\u00eancia';
    doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(typeLabel+' \u2014 '+inc.driverName,14,y);y+=9;
    doc.setDrawColor(230,230,225);doc.line(14,y,W-14,y);y+=8;
    doc.setFont('helvetica','normal');doc.setFontSize(10.5);
    const rows=[['Motorista',inc.driverName],['Ve\u00edculo',inc.vehicle],['Data',fmtDate(inc.date)],['N\u00ba OS',inc.os||'-']];
    if(inc.value)rows.push(['Valor','R$ '+parseFloat(inc.value).toFixed(2)]);
    rows.forEach(([l,v])=>{doc.setFont('helvetica','bold');doc.text(l+':',14,y);doc.setFont('helvetica','normal');doc.text(String(v),50,y);y+=7;});
    y+=4;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Descri\u00e7\u00e3o:',14,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(10.5);
    const dl=doc.splitTextToSize(inc.description||'-',W-28);doc.text(dl,14,y);y+=dl.length*5.5+20;
    if(y>250){doc.addPage();y=20;}
    doc.setDrawColor(180,180,180);doc.setLineDashPattern([1.5,1.5],0);doc.roundedRect(14,y,W-28,30,2,2);doc.setLineDashPattern([],0);
    doc.setFontSize(9);doc.setTextColor(100,100,100);
    const decl=doc.splitTextToSize('Declaro que as informa\u00e7\u00f5es acima s\u00e3o ver\u00eddicas, responsabilizando-me pelo conte\u00fado deste registro.',W-36);
    doc.text(decl,18,y+7);
    const sigY=y+24;doc.setDrawColor(50,50,50);doc.line(20,sigY,110,sigY);doc.line(124,sigY,W-20,sigY);
    doc.setFontSize(8.5);doc.setTextColor(80,80,80);doc.text('Assinatura \u2014 '+inc.driverName,20,sigY+5);doc.text('Data',124,sigY+5);
    doc.save('ocorrencia-'+inc.driverName.replace(/\s+/g,'_')+'-'+inc.date+'.pdf');
  }catch(e){console.error('Erro ao gerar PDF',e);alert('N\u00e3o foi poss\u00edvel gerar o PDF.\n\nDetalhe: '+(e&&e.message?e.message:e));}
  finally{setBusy(btn,false);}
}

// ─── RELATÓRIO ───────────────────────────────────────────────────────────────
let relDriver='',relMonth=new Date().toISOString().slice(0,7);

function renderRelatorio(c){
  c.innerHTML=alertHTML()+
    '<div class="card"><div class="card-title"><i class="ti ti-file-text"></i> Relat\u00f3rio mensal para assinatura</div>'+
    '<div class="row"><div class="field"><label>Motorista</label><select id="rel-driver" onchange="relDriver=this.value;renderRelatorio(document.getElementById(\'main-content\'))"><option value="">Todos os motoristas</option>'+
      DB.drivers().map(d=>'<option value="'+d.id+'" '+(relDriver==d.id?'selected':'')+'>'+d.name+'</option>').join('')+
    '</select></div><div class="field"><label>M\u00eas / Ano</label><input type="month" id="rel-month" value="'+relMonth+'" onchange="relMonth=this.value;renderRelatorio(document.getElementById(\'main-content\'))"></div></div></div>'+
    buildReport();
}

function buildReport(){
  const targetDrivers=relDriver?DB.drivers().filter(d=>d.id==relDriver):DB.drivers();
  return targetDrivers.map(driver=>{
    const trips=DB.trips().filter(t=>t.driverId===driver.id&&t.startTime.startsWith(relMonth));
    const incidents=DB.incidents().filter(i=>i.driverId===driver.id&&i.date.startsWith(relMonth));
    const km=calcKm(trips);
    if(!trips.length&&!incidents.length)return '<div class="report-section" style="opacity:.55"><div style="display:flex;align-items:center;gap:10px"><div class="avatar">'+initials(driver.name)+'</div><div><div style="font-weight:600">'+driver.name+'</div><div style="font-size:12px;color:#888">Sem registros em '+relMonth+'</div></div></div></div>';
    return '<div class="report-section"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:10px"><div class="avatar">'+initials(driver.name)+'</div><div><div style="font-weight:600;font-size:15px">'+driver.name+'</div><div style="font-size:12px;color:#666">CNH: '+(driver.cnh||'-')+' \u2022 '+relMonth+'</div></div></div><button class="btn btn-secondary btn-sm" onclick="printDriver('+driver.id+')"><i class="ti ti-printer"></i> Imprimir / Assinar</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px"><div class="stat"><div class="stat-num">'+trips.length+'</div><div class="stat-label">Viagens</div></div><div class="stat"><div class="stat-num">'+km+'</div><div class="stat-label">KM percorridos</div></div><div class="stat"><div class="stat-num">'+incidents.length+'</div><div class="stat-label">Ocorr\u00eancias</div></div></div>'+(trips.length?'<div style="overflow-x:auto"><table class="report-table"><thead><tr><th>Data</th><th>OS</th><th>Ve\u00edculo</th><th>Destino</th><th>Sa\u00edda</th><th>Chegada</th><th>KM</th></tr></thead><tbody>'+trips.map(t=>'<tr><td>'+fmtDate(t.startTime)+'</td><td>'+(t.os||'-')+'</td><td>'+t.vehicle+'</td><td>'+(t.destination||'-')+'</td><td>'+fmtTime(t.startTime)+'</td><td>'+(t.endTime?fmtTime(t.endTime):'-')+'</td><td>'+(t.kmStart&&t.kmEnd?(parseInt(t.kmEnd)-parseInt(t.kmStart))+'km':'-')+'</td></tr>').join('')+'</tbody></table></div>':'')+(incidents.length?'<div style="margin-top:12px"><div style="font-size:12px;font-weight:600;color:#A32D2D;margin-bottom:6px"><i class="ti ti-alert-triangle"></i> Ocorr\u00eancias no per\u00edodo</div>'+incidents.map(i=>'<div style="font-size:12px;padding:6px 10px;background:#FCEBEB;border-radius:6px;margin-bottom:4px">'+fmtDate(i.date)+' \u2014 '+i.type+': '+i.description+(i.value?' (R$ '+parseFloat(i.value).toFixed(2)+')':'')+'</div>').join('')+'</div>':'')+'<div style="margin-top:20px;padding:14px;border:1.5px dashed rgba(0,0,0,0.15);border-radius:8px"><p style="font-size:12px;color:#666;margin-bottom:24px">Declaro que as informa\u00e7\u00f5es acima s\u00e3o ver\u00eddicas e que utilizei os ve\u00edculos conforme descrito, responsabilizando-me por qualquer uso indevido.</p><div style="display:flex;gap:24px"><div style="flex:2;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;text-align:center">Assinatura \u2014 '+driver.name+'</div><div style="flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;text-align:center">Data</div></div></div></div>';
  }).join('');
}

async function printDriver(driverId){
  const driver=DB.drivers().find(d=>d.id==driverId);if(!driver)return;
  const trips=DB.trips().filter(t=>t.driverId==driverId&&t.startTime.startsWith(relMonth));
  const incidents=DB.incidents().filter(i=>i.driverId==driverId&&i.date.startsWith(relMonth));
  const km=calcKm(trips);
  const btn=document.querySelector('[onclick="printDriver('+driverId+')"]');
  setBusy(btn,true,'<i class="ti ti-loader"></i> Gerando...');
  try{
    const jsPDF=await loadJsPDF(),doc=new jsPDF({unit:'mm',format:'a4'});
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),margin=14;let y=0;
    function drawHeader(){doc.setFillColor(255,107,0);doc.rect(0,0,W,32,'F');safeAddLogo(doc,margin-2,5,22,22);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Print Minas',40,15);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Relat\u00f3rio Mensal de Uso de Ve\u00edculo',40,22);}
    function ensureSpace(needed){if(y+needed>H-16){doc.addPage();drawHeader();y=44;}}
    drawHeader();y=44;doc.setTextColor(20,20,20);
    doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(driver.name,margin,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(90,90,90);doc.text('CNH: '+(driver.cnh||'-')+'  \u2022  Per\u00edodo: '+relMonth,margin,y);y+=10;
    const cardW=(W-margin*2-12)/3;
    [[String(trips.length),'Viagens'],[km+' km','KM percorridos'],[String(incidents.length),'Ocorr\u00eancias']].forEach((s,i)=>{
      const x=margin+i*(cardW+6);doc.setFillColor(245,245,240);doc.roundedRect(x,y,cardW,18,2,2,'F');doc.setTextColor(255,107,0);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(s[0],x+cardW/2,y+9,{align:'center'});doc.setTextColor(130,130,130);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(s[1],x+cardW/2,y+14.5,{align:'center'});
    });
    y+=28;doc.setTextColor(20,20,20);
    if(trips.length){
      const cols=[{h:'Data',w:18},{h:'OS',w:24},{h:'Ve\u00edculo',w:20},{h:'Destino',w:46},{h:'Sa\u00edda',w:16},{h:'Chegada',w:18},{h:'KM',w:18}];
      function drawTH(){doc.setFillColor(240,240,238);doc.rect(margin,y,W-margin*2,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(60,60,60);let x=margin+2;cols.forEach(col=>{doc.text(col.h,x,y+5);x+=col.w;});y+=9;}
      drawTH();doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(30,30,30);
      trips.forEach(t=>{
        if(y+8>H-16){doc.addPage();drawHeader();y=44;drawTH();}
        const vals=[fmtDate(t.startTime),t.os||'-',t.vehicle,t.destination||'-',fmtTime(t.startTime),t.endTime?fmtTime(t.endTime):'-',(t.kmStart&&t.kmEnd)?(parseInt(t.kmEnd)-parseInt(t.kmStart))+'km':'-'];
        let x=margin+2;vals.forEach((v,i)=>{doc.text((doc.splitTextToSize(String(v),cols[i].w-2)[0]||''),x,y+4);x+=cols[i].w;});
        doc.setDrawColor(238,238,235);doc.line(margin,y+6.5,W-margin,y+6.5);y+=7.5;
      });y+=6;
    }else{doc.setFont('helvetica','italic');doc.setFontSize(10);doc.setTextColor(140,140,140);doc.text('Nenhuma viagem registrada no per\u00edodo.',margin,y);y+=10;}
    if(incidents.length){
      ensureSpace(14);doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(163,45,45);doc.text('Ocorr\u00eancias no per\u00edodo',margin,y);y+=7;doc.setFont('helvetica','normal');doc.setFontSize(9);
      incidents.forEach(i=>{const line=fmtDate(i.date)+' \u2014 '+i.type+': '+i.description+(i.value?' (R$ '+parseFloat(i.value).toFixed(2)+')':'');const lines=doc.splitTextToSize(line,W-margin*2-6);ensureSpace(lines.length*5+4);doc.setFillColor(252,235,235);doc.roundedRect(margin,y,W-margin*2,lines.length*5+3,1.5,1.5,'F');doc.setTextColor(110,30,30);doc.text(lines,margin+3,y+4.5);y+=lines.length*5+6;});y+=4;
    }
    ensureSpace(36);doc.setDrawColor(180,180,180);doc.setLineDashPattern([1.5,1.5],0);doc.roundedRect(margin,y,W-margin*2,32,2,2);doc.setLineDashPattern([],0);
    doc.setFontSize(9);doc.setTextColor(100,100,100);
    const dl=doc.splitTextToSize('Declaro que as informa\u00e7\u00f5es acima s\u00e3o ver\u00eddicas e que utilizei os ve\u00edculos da empresa conforme descrito, responsabilizando-me por qualquer uso indevido registrado neste documento.',W-margin*2-8);
    doc.text(dl,margin+4,y+7);
    const sigY=y+26,sigSplit=margin+(W-margin*2)*0.65;
    doc.setDrawColor(50,50,50);doc.line(margin+6,sigY,sigSplit-6,sigY);doc.line(sigSplit+6,sigY,W-margin-6,sigY);
    doc.setFontSize(8.5);doc.setTextColor(80,80,80);doc.text('Assinatura \u2014 '+driver.name,margin+6,sigY+5);doc.text('Data',sigSplit+6,sigY+5);
    doc.save('relatorio-'+driver.name.replace(/\s+/g,'_')+'-'+relMonth+'.pdf');
  }catch(e){console.error('Erro ao gerar PDF',e);alert('N\u00e3o foi poss\u00edvel gerar o PDF.\n\nDetalhe: '+(e&&e.message?e.message:e));}
  finally{setBusy(btn,false);}
}

// ─── QR CODE ─────────────────────────────────────────────────────────────────
function renderQR(c){
  const url=window.location.href.split('?')[0].split('#')[0];
  c.innerHTML=alertHTML()+
    '<div class="card"><div class="card-title"><i class="ti ti-qrcode"></i> QR Code para os ve\u00edculos</div>'+
    '<p style="font-size:13px;color:#666;margin-bottom:18px">Imprima e cole dentro do carro. O t\u00e9cnico escaneia com a c\u00e2mera do celular e j\u00e1 cai diretamente no formul\u00e1rio de sa\u00edda.</p>'+
    '<div class="qr-box"><div id="qr-render" style="display:flex;justify-content:center;margin-bottom:14px"></div>'+
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px">Print Minas \u2014 Gest\u00e3o de Frota</div>'+
    '<div style="font-size:11px;color:#888;margin-bottom:16px;word-break:break-all">'+url+'</div>'+
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
    '<button class="btn btn-primary btn-sm" onclick="downloadQR()"><i class="ti ti-download"></i> Baixar QR Code</button>'+
    '<button class="btn btn-secondary btn-sm" onclick="printQR()"><i class="ti ti-printer"></i> Imprimir etiqueta</button></div></div>'+
    '<div style="margin-top:14px;padding:12px 14px;background:#EEEDFE;border-radius:8px;font-size:13px;color:#CC5500">'+
    '<strong><i class="ti ti-info-circle"></i> Como usar:</strong><br>1. Clique em "Baixar QR Code" ou "Imprimir etiqueta"<br>2. Cole o QR Code dentro do carro<br>3. O t\u00e9cnico aponta a c\u00e2mera e escaneia<br>4. O sistema abre no formul\u00e1rio de sa\u00edda</div></div>';
  const genQR=()=>{try{if(typeof QRCode!=='undefined'){QRCode.toCanvas(document.createElement('canvas'),url,{width:200,margin:2,color:{dark:'#1a1a1a',light:'#ffffff'}},function(err,canvas){if(!err)document.getElementById('qr-render').appendChild(canvas);});}}catch(e){console.warn('QR gen error',e);}};
  if('requestIdleCallback' in window)requestIdleCallback(genQR,{timeout:1000});else setTimeout(genQR,300);
}

function downloadQR(){
  const canvas=document.querySelector('#qr-render canvas');if(!canvas){alert('QR Code ainda carregando...');return;}
  const a=document.createElement('a');a.download='qrcode-printminas.png';a.href=canvas.toDataURL('image/png');a.click();
}

function printQR(){
  const canvas=document.querySelector('#qr-render canvas'),url=window.location.href.split('?')[0].split('#')[0];
  const imgSrc=canvas?canvas.toDataURL():'';
  const w=window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Code Print Minas</title><style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{border:2px solid #FF6B00;border-radius:12px;padding:24px;text-align:center;max-width:280px}.logo{font-size:22px;font-weight:700;color:#FF6B00;margin-bottom:4px}.sub{font-size:12px;color:#666;margin-bottom:16px}img{width:200px;height:200px}.hint{font-size:11px;color:#888;margin-top:12px}@media print{body{display:block}.box{margin:20px auto;page-break-inside:avoid}}</style></head><body><div class="box"><div class="logo">Print Minas</div><div class="sub">Gest\u00e3o de Frota \u2014 Escaneie para registrar uso</div>'+(imgSrc?'<img src="'+imgSrc+'" alt="QR Code">':'<p>QR Code: '+url+'</p>')+'<div class="hint">Aponte a c\u00e2mera do celular para o QR Code</div></div><script>window.onload=()=>window.print()<\/script></body></html>');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initApp(){
  try{await DB.load();}
  catch(error){console.warn('Falha ao carregar Supabase, usando dados locais.',error);showAlert('Falha ao carregar Supabase. Usando dados locais.','error');}
  finally{showTab('visao');}
}
initApp();
