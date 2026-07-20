/* Print Minas - Gestão de Frota | Desenvolvido por Kaio Eduardo de Oliveira Barbosa */
const _cfg = (typeof window !== 'undefined' && window.__CONFIG__) ? window.__CONFIG__ : {};
const SUPABASE_URL = _cfg.SUPABASE_URL || 'https://bkqpdfzyovrqfprvswqk.supabase.co';
const SUPABASE_ANON_KEY = _cfg.SUPABASE_ANON_KEY || 'sb_publishable_F0lwWPJOUKCvf1Hl5_wJRg_STlD9eC7';
const USE_SUPABASE = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
const supabaseClient = USE_SUPABASE ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
// Diagnostic logs to help debug deployment / env issues
try{
  console.info('DB: USE_SUPABASE=', USE_SUPABASE, 'supabaseClientInitialized=', !!supabaseClient);
  console.info('DB: SUPABASE_URL present=', !!SUPABASE_URL, 'SUPABASE_ANON_KEY present=', !!SUPABASE_ANON_KEY);
}catch(e){/* ignore if console unavailable */}

const LOCAL_KEYS = {
  trips: 'pm_trips',
  drivers: 'pm_drivers',
  vehicles: 'pm_vehicles',
  incidents: 'pm_incidents',
  outbox: 'pm_sync_outbox'
};

const TABLE_OF = { trips: 'trips', drivers: 'drivers', vehicles: 'vehicles', incidents: 'incidents' };

const DEFAULT_DRIVERS = [
  {id:1, name:'Ricardo José Pedrosa', cnh:'ABC1234', phone:'31900001111', email:'', status:'ativo'},
  {id:2, name:'Zoldan Rasek da Silva Dias', cnh:'DEF5678', phone:'31900002222', email:'', status:'ativo'},
  {id:3, name:'Kaio Eduardo de Oliveira Barbosa', cnh:'GHI9012', phone:'31900003333', email:'', status:'ativo'}
];
const DEFAULT_VEHICLES = [
  {id: 1, name: 'FIORINO', plate: '', renavam: '', status: 'ativo'},
  {id: 2, name: 'STRADA', plate: '', renavam: '', status: 'ativo'}
];

let cacheTrips = [];
let cacheDrivers = [];
let cacheVehicles = [];
let cacheIncidents = [];

function saveLocal(key, data){
  try{
    localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(data));
  } catch(e){
    // CORREÇÃO: localStorage pode estourar a cota (ex: muitas fotos
    // acumuladas em base64). Antes, isso lançava um erro não tratado
    // que podia interromper o fluxo de salvamento no meio. Agora só
    // avisamos no console e seguimos — o dado mais importante (Supabase)
    // continua sendo tentado normalmente pelas funções que chamam save().
    console.warn(`Falha ao salvar "${key}" no localStorage (provavelmente cota excedida):`, e);
  }
}

function loadLocal(key){
  try{
    return JSON.parse(localStorage.getItem(LOCAL_KEYS[key]) || '[]');
  } catch(e){
    console.warn(`Falha ao ler "${key}" do localStorage:`, e);
    return [];
  }
}

async function fetchTable(table){
  const { data, error } = await supabaseClient.from(table).select('*');
  if(error) throw error;
  // map snake_case from DB to camelCase used in app
  return (data || []).map(rec => toCamel(rec));
}

function toCamel(obj){
  if(!obj || typeof obj !== 'object') return obj;
  const map = {
    driver_id: 'driverId', driver_name: 'driverName', start_time: 'startTime', end_time: 'endTime',
    km_start: 'kmStart', km_end: 'kmEnd', photo_start: 'photoStart', photo_end: 'photoEnd',
    obs_start: 'obsStart', obs_end: 'obsEnd', created_at: 'createdAt'
  };
  const out = {};
  for(const k in obj){
    const nk = map[k] || k.replace(/_([a-z])/g, (_,c)=>c.toUpperCase());
    out[nk] = obj[k];
  }
  return out;
}

function toSnake(obj){
  if(!obj || typeof obj !== 'object') return obj;
  const map = {
    driverId: 'driver_id', driverName: 'driver_name', startTime: 'start_time', endTime: 'end_time',
    kmStart: 'km_start', kmEnd: 'km_end', photoStart: 'photo_start', photoEnd: 'photo_end',
    obsStart: 'obs_start', obsEnd: 'obs_end', createdAt: 'created_at'
  };
  const out = {};
  for(const k in obj){
    const nk = map[k] || k.replace(/[A-Z]/g, m=>'_'+m.toLowerCase());
    let value = obj[k];
    if((nk === 'km_start' || nk === 'km_end' || nk === 'value') && value === ''){
      value = null;
    }
    out[nk] = value;
  }
  return out;
}

async function loadTable(key, table){
  if(USE_SUPABASE){
    try {
      const data = await fetchTable(table);
      if(Array.isArray(data) && data.length) return data;
      if(key === 'drivers' && data.length === 0) return DEFAULT_DRIVERS;
      if(key === 'vehicles' && data.length === 0) return DEFAULT_VEHICLES;
      // Uma resposta remota vazia ainda é uma resposta válida. Usar dados
      // locais nesse caso fazia rotas antigas reaparecerem como abertas.
      if(Array.isArray(data)) return data;
      return data;
    } catch (error) {
      console.warn(`Supabase load failed for ${table}:`, error);
      return loadLocal(key);
    }
  }
  return loadLocal(key);
}

function setCache(key, data){
  if(key === 'drivers') cacheDrivers = data;
  if(key === 'vehicles') cacheVehicles = data;
  if(key === 'trips') cacheTrips = data;
  if(key === 'incidents') cacheIncidents = data;
}

// ─── CORREÇÃO: timeout para nunca ficar travado esperando o servidor ───────
// Antes, se a rede caísse ou demorasse demais (comum no celular, com fotos
// grandes), o await no upsert/delete nunca resolvia nem rejeitava, e o
// botão "Salvando..." ficava pendurado para sempre. Agora, depois de
// UPSERT_TIMEOUT_MS, a função desiste e retorna false/erro.
const UPSERT_TIMEOUT_MS = 20000;
const LOAD_TIMEOUT_MS = 8000;

function withTimeout(promise, ms){
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Tempo limite de ${ms}ms excedido ao falar com o servidor`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
}

// ─── Salvar UM registro (insert/update) ──────────────────────────────────────
// Esta é a função-chave: grava apenas o item alterado, com upsert.
// Retorna true se gravou no Supabase, false caso contrário.
async function upsertOne(key, item){
  const table = TABLE_OF[key];
  if(!USE_SUPABASE) return false;
  try{
    const snake = toSnake(item);
    const { error } = await withTimeout(
      supabaseClient.from(table).upsert(snake, { onConflict: 'id' }),
      UPSERT_TIMEOUT_MS
    );
    if(error){
      console.warn(`Supabase upsert failed for ${table}:`, error);
      window.__LAST_SUPABASE_ERROR__ = error;
      return false;
    }
    console.info(`DB: upserted 1 row into ${table} (id=${item.id})`);
    return true;
  } catch(e){
    console.warn(`Supabase upsertOne error for ${table}:`, e);
    try{ window.__LAST_SUPABASE_ERROR__ = e; }catch(_){ }
    return false;
  }
}

// ─── Deletar UM registro ──────────────────────────────────────────────────────
async function deleteOne(key, id){
  const table = TABLE_OF[key];
  if(!USE_SUPABASE) return false;
  try{
    const { error } = await withTimeout(
      supabaseClient.from(table).delete().eq('id', id),
      UPSERT_TIMEOUT_MS
    );
    if(error){
      console.warn(`Supabase delete failed for ${table}:`, error);
      window.__LAST_SUPABASE_ERROR__ = error;
      return false;
    }
    return true;
  } catch(e){
    console.warn(`Supabase deleteOne error for ${table}:`, e);
    return false;
  }
}

async function loadTableSafely(key, table){
  try{
    return await withTimeout(loadTable(key, table), LOAD_TIMEOUT_MS);
  }catch(error){
    console.warn(`Tempo limite ao carregar ${table}; usando dados deste aparelho.`, error);
    return loadLocal(key);
  }
}

function pendingOperations(){return loadLocal('outbox');}
function queueOperation(type,key,payload){
  const id=type==='remove'?payload:payload.id;
  const existing=pendingOperations().filter(item=>!(item.key===key&&item.id===id));
  existing.push({type,key,id,payload,at:new Date().toISOString()});
  saveLocal('outbox',existing);
}

const DB = {
  trips: () => cacheTrips,
  drivers: () => cacheDrivers,
  vehicles: () => cacheVehicles,
  incidents: () => cacheIncidents,

  // Mostra o último estado conhecido sem esperar a rede. Isso deixa o
  // aplicativo utilizável mesmo em áreas de sinal fraco.
  hydrateLocal(){
    cacheDrivers = loadLocal('drivers');
    cacheVehicles = loadLocal('vehicles');
    cacheTrips = loadLocal('trips');
    cacheIncidents = loadLocal('incidents');
    if(!cacheDrivers.length) cacheDrivers = [...DEFAULT_DRIVERS];
    if(!cacheVehicles.length) cacheVehicles = [...DEFAULT_VEHICLES];
  },

  // Salva a lista inteira no cache + localStorage (instantâneo),
  // mas NÃO regrava a tabela remota inteira. Para o remoto use saveOne/removeOne.
  save(key, data){
    setCache(key, data);
    saveLocal(key, data);
  },

  // Grava UM registro no remoto e aguarda concluir.
  async saveOne(key, item){
    if(!navigator.onLine){queueOperation('upsert',key,item);return false;}
    const ok=await upsertOne(key,item);
    if(!ok)queueOperation('upsert',key,item);
    return ok;
  },

  // Remove UM registro do remoto e aguarda concluir.
  async removeOne(key, id){
    if(!navigator.onLine){queueOperation('remove',key,id);return false;}
    const ok=await deleteOne(key,id);
    if(!ok)queueOperation('remove',key,id);
    return ok;
  },

  async load(){
    const [loadedDrivers, vehicles, trips, incidents] = await Promise.all([
      loadTableSafely('drivers', 'drivers'),
      loadTableSafely('vehicles', 'vehicles'),
      loadTableSafely('trips', 'trips'),
      loadTableSafely('incidents', 'incidents')
    ]);
    let drivers = loadedDrivers;
    let seededDrivers = false;
    if(!Array.isArray(drivers) || drivers.length === 0){
      drivers = DEFAULT_DRIVERS;
      seededDrivers = true;
    }
    cacheDrivers = drivers;
    cacheVehicles = Array.isArray(vehicles) && vehicles.length ? vehicles : DEFAULT_VEHICLES;

    cacheTrips = trips;
    cacheIncidents = incidents;

    saveLocal('drivers', cacheDrivers);
    saveLocal('vehicles', cacheVehicles);
    saveLocal('trips', cacheTrips);
    saveLocal('incidents', cacheIncidents);

    if(USE_SUPABASE && seededDrivers){
      // semeia os motoristas padrão remotamente, um a um
      for(const d of cacheDrivers){ await upsertOne('drivers', d); }
    }
    if(USE_SUPABASE && (!Array.isArray(vehicles) || vehicles.length === 0)){
      for(const vehicle of cacheVehicles){ await upsertOne('vehicles', vehicle); }
    }
  }
};

DB.pendingCount=()=>pendingOperations().length;
DB.syncPending=async function(){
  if(!USE_SUPABASE||!navigator.onLine)return {synced:0,pending:pendingOperations().length};
  const operations=pendingOperations(),remaining=[];let synced=0;
  for(const operation of operations){
    const ok=operation.type==='remove'?await deleteOne(operation.key,operation.id):await upsertOne(operation.key,operation.payload);
    if(ok)synced++;else remaining.push(operation);
  }
  saveLocal('outbox',remaining);
  return {synced,pending:remaining.length};
};

// ─── Sincronização remota (opcional) ─────────────────────────────────────────
DB.syncFromRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  cacheDrivers = (await fetchTable('drivers')) || [];
  try { cacheVehicles = (await fetchTable('vehicles')) || []; } catch (error) { console.warn('Tabela de veículos ainda não disponível.', error); cacheVehicles = loadLocal('vehicles'); }
  if(!cacheVehicles.length) cacheVehicles = [...DEFAULT_VEHICLES];
  cacheTrips = (await fetchTable('trips')) || [];
  cacheIncidents = (await fetchTable('incidents')) || [];
  saveLocal('drivers', cacheDrivers);
  saveLocal('vehicles', cacheVehicles);
  saveLocal('trips', cacheTrips);
  saveLocal('incidents', cacheIncidents);
  console.info('DB: syncFromRemote completed');
};

// ─── Utility Functions ─────────────────────────────────────────────────────
// CORREÇÃO: genId() original era Date.now() + random(0-999), que podia
// colidir se dois registros fossem criados no mesmo milissegundo (ex:
// clique duplo, ou duas abas). Como o upsert usa onConflict:'id', uma
// colisão faria um registro sobrescrever o outro silenciosamente.
// Agora um contador monotônico garante unicidade dentro da sessão.
let _idCounter = 0;
function genId(){
  _idCounter++;
  return Date.now() * 1000 + (_idCounter % 1000);
}
function fmt(dt){ if(!dt) return '-'; const d=new Date(dt); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(dt){ if(!dt) return '-'; return new Date(dt).toLocaleDateString('pt-BR'); }
function fmtTime(dt){ if(!dt) return '-'; return new Date(dt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }
function calcKm(trips){ return trips.reduce((s,t)=>{ if(t.kmStart&&t.kmEnd) return s+(parseInt(t.kmEnd)-parseInt(t.kmStart)); return s; },0); }
