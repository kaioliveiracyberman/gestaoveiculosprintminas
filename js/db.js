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
  incidents: 'pm_incidents'
};

const TABLE_OF = { trips: 'trips', drivers: 'drivers', incidents: 'incidents' };

const DEFAULT_DRIVERS = [
  {id:1, name:'Ricardo José Pedrosa', cnh:'ABC1234', phone:'31900001111', email:'', status:'ativo'},
  {id:2, name:'Zoldan Rasek da Silva Dias', cnh:'DEF5678', phone:'31900002222', email:'', status:'ativo'},
  {id:3, name:'Kaio Eduardo de Oliveira Barbosa', cnh:'GHI9012', phone:'31900003333', email:'', status:'ativo'}
];

let cacheTrips = [];
let cacheDrivers = [];
let cacheIncidents = [];

function saveLocal(key, data){
  localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(data));
}

function loadLocal(key){
  return JSON.parse(localStorage.getItem(LOCAL_KEYS[key]) || '[]');
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
      const localData = loadLocal(key);
      if(Array.isArray(localData) && localData.length) return localData;
      if(key === 'drivers' && data.length === 0) return DEFAULT_DRIVERS;
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
  if(key === 'trips') cacheTrips = data;
  if(key === 'incidents') cacheIncidents = data;
}

// ─── Salvar UM registro (insert/update) ──────────────────────────────────────
// Esta é a função-chave: grava apenas o item alterado, com upsert.
// Retorna true se gravou no Supabase, false caso contrário.
async function upsertOne(key, item){
  const table = TABLE_OF[key];
  if(!USE_SUPABASE) return false;
  try{
    const snake = toSnake(item);
    const { error } = await supabaseClient.from(table).upsert(snake, { onConflict: 'id' });
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
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
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

const DB = {
  trips: () => cacheTrips,
  drivers: () => cacheDrivers,
  incidents: () => cacheIncidents,

  // Salva a lista inteira no cache + localStorage (instantâneo),
  // mas NÃO regrava a tabela remota inteira. Para o remoto use saveOne/removeOne.
  save(key, data){
    setCache(key, data);
    saveLocal(key, data);
  },

  // Grava UM registro no remoto e aguarda concluir.
  async saveOne(key, item){
    return await upsertOne(key, item);
  },

  // Remove UM registro do remoto e aguarda concluir.
  async removeOne(key, id){
    return await deleteOne(key, id);
  },

  async load(){
    let drivers = await loadTable('drivers', 'drivers');
    let seededDrivers = false;
    if(!Array.isArray(drivers) || drivers.length === 0){
      drivers = DEFAULT_DRIVERS;
      seededDrivers = true;
    }
    cacheDrivers = drivers;

    cacheTrips = await loadTable('trips', 'trips');
    cacheIncidents = await loadTable('incidents', 'incidents');

    saveLocal('drivers', cacheDrivers);
    saveLocal('trips', cacheTrips);
    saveLocal('incidents', cacheIncidents);

    if(USE_SUPABASE && seededDrivers){
      // semeia os motoristas padrão remotamente, um a um
      for(const d of cacheDrivers){ await upsertOne('drivers', d); }
    }
  }
};

// ─── Sincronização remota (opcional) ─────────────────────────────────────────
DB.syncFromRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  cacheDrivers = (await fetchTable('drivers')) || [];
  cacheTrips = (await fetchTable('trips')) || [];
  cacheIncidents = (await fetchTable('incidents')) || [];
  saveLocal('drivers', cacheDrivers);
  saveLocal('trips', cacheTrips);
  saveLocal('incidents', cacheIncidents);
  console.info('DB: syncFromRemote completed');
};

// ─── Utility Functions ─────────────────────────────────────────────────────
function genId(){ return Date.now() + Math.floor(Math.random()*1000); }
function fmt(dt){ if(!dt) return '-'; const d=new Date(dt); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(dt){ if(!dt) return '-'; return new Date(dt).toLocaleDateString('pt-BR'); }
function fmtTime(dt){ if(!dt) return '-'; return new Date(dt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }
function calcKm(trips){ return trips.reduce((s,t)=>{ if(t.kmStart&&t.kmEnd) return s+(parseInt(t.kmEnd)-parseInt(t.kmStart)); return s; },0); }
