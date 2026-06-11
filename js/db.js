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
async function replaceTable(table, items){
  // deprecated - kept for compatibility
  if(!USE_SUPABASE) return;
  try{
    await supabaseClient.from(table).delete().neq('id', 0);
    if(items.length){
      await supabaseClient.from(table).insert(items.map(toSnake));
    }
  } catch(e){
    console.warn(`Supabase replace failed for ${table}:`, e);
  }
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

async function saveTable(key, table, data){
  setCache(key, data);
  saveLocal(key, data);
  if(!USE_SUPABASE) return;
  try{ console.info(`DB: attempt remote save for table=${table} items=${(data||[]).length}`); }catch(e){}
  try{
    // Fetch remote ids
    const { data: remote, error: rerr } = await supabaseClient.from(table).select('id');
    if(rerr) throw rerr;
    const remoteIds = (remote||[]).map(r=>r.id);
    const localIds = (data||[]).map(d=>d.id);
    const toDelete = remoteIds.filter(id => !localIds.includes(id));
    if(toDelete.length){
      const { error: derr } = await supabaseClient.from(table).delete().in('id', toDelete);
      if(derr){ console.warn(`Supabase delete failed for ${table}:`, derr); window.__LAST_SUPABASE_ERROR__ = derr; }
    }
    // Upsert local data (convert to snake_case)
    const snakeItems = (data||[]).map(d=>toSnake(d));
    // chunk upserts in case of large lists
    const chunkSize = 200;
    for(let i=0;i<snakeItems.length;i+=chunkSize){
      const chunk = snakeItems.slice(i,i+chunkSize);
      const { error: uerr } = await supabaseClient.from(table).upsert(chunk, { onConflict: ['id'] });
      if(uerr){
        console.warn(`Supabase upsert failed for ${table}:`, uerr, 'chunk=', chunk);
        window.__LAST_SUPABASE_ERROR__ = uerr;
      }
    }
  } catch(e){
    console.warn(`Supabase saveTable error for ${table}:`, e);
    try{ window.__LAST_SUPABASE_ERROR__ = e; }catch(_){ }
  }
}

const DB = {
  trips: () => cacheTrips,
  drivers: () => cacheDrivers,
  incidents: () => cacheIncidents,
  async save(key, data){
    if(key === 'trips') await saveTable(key, 'trips', data);
    if(key === 'drivers') await saveTable(key, 'drivers', data);
    if(key === 'incidents') await saveTable(key, 'incidents', data);
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
      // ensure drivers seed exists remotely
      await saveTable('drivers','drivers', cacheDrivers);
    }
  }
};

// ─── Remote Sync Helpers ───────────────────────────────────────────────────
DB.fetchDriversRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const rows = await fetchTable('drivers');
  cacheDrivers = rows || [];
  saveLocal('drivers', cacheDrivers);
  console.info('DB: fetched drivers remote=', cacheDrivers.length);
  return cacheDrivers;
};

DB.fetchTripsRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const rows = await fetchTable('trips');
  cacheTrips = rows || [];
  saveLocal('trips', cacheTrips);
  console.info('DB: fetched trips remote=', cacheTrips.length);
  return cacheTrips;
};

DB.fetchIncidentsRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const rows = await fetchTable('incidents');
  cacheIncidents = rows || [];
  saveLocal('incidents', cacheIncidents);
  console.info('DB: fetched incidents remote=', cacheIncidents.length);
  return cacheIncidents;
};

DB.saveDriversRemote = async function(data){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const toSave = data || cacheDrivers;
  await saveTable('drivers','drivers', toSave);
  console.info('DB: saved drivers remote=', (toSave||[]).length);
};

DB.saveTripsRemote = async function(data){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const toSave = data || cacheTrips;
  await saveTable('trips','trips', toSave);
  console.info('DB: saved trips remote=', (toSave||[]).length);
};

DB.saveIncidentsRemote = async function(data){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  const toSave = data || cacheIncidents;
  await saveTable('incidents','incidents', toSave);
  console.info('DB: saved incidents remote=', (toSave||[]).length);
};

DB.syncAllToRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  await Promise.all([
    saveTable('drivers','drivers', cacheDrivers),
    saveTable('trips','trips', cacheTrips),
    saveTable('incidents','incidents', cacheIncidents)
  ]);
  console.info('DB: syncAllToRemote completed');
};

DB.syncFromRemote = async function(){
  if(!USE_SUPABASE) throw new Error('Supabase not configured');
  await Promise.all([
    DB.fetchDriversRemote(),
    DB.fetchTripsRemote(),
    DB.fetchIncidentsRemote()
  ]);
  console.info('DB: syncFromRemote completed');
};

// ─── Utility Functions ─────────────────────────────────────────────────────
function genId(){ return Date.now() + Math.floor(Math.random()*1000); }
function fmt(dt){ if(!dt) return '-'; const d=new Date(dt); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(dt){ if(!dt) return '-'; return new Date(dt).toLocaleDateString('pt-BR'); }
function fmtTime(dt){ if(!dt) return '-'; return new Date(dt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }
function calcKm(trips){ return trips.reduce((s,t)=>{ if(t.kmStart&&t.kmEnd) return s+(parseInt(t.kmEnd)-parseInt(t.kmStart)); return s; },0); }
