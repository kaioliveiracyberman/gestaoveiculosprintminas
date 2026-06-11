// ─── Database (localStorage) ───────────────────────────────────────────────
const DB = {
  trips:     () => JSON.parse(localStorage.getItem('pm_trips')    || '[]'),
  drivers:   () => JSON.parse(localStorage.getItem('pm_drivers')  || JSON.stringify([
    {id:1, name:'Ricardo José Pedrosa',               cnh:'ABC1234', phone:'31900001111', email:'', status:'ativo'},
    {id:2, name:'Zoldan Rasek da Silva Dias',          cnh:'DEF5678', phone:'31900002222', email:'', status:'ativo'},
    {id:3, name:'Kaio Eduardo de Oliveira Barbosa',    cnh:'GHI9012', phone:'31900003333', email:'', status:'ativo'}
  ])),
  incidents: () => JSON.parse(localStorage.getItem('pm_incidents')|| '[]'),
  save(key, data){ localStorage.setItem('pm_'+key, JSON.stringify(data)); }
};

// ─── Utility Functions ─────────────────────────────────────────────────────
function genId(){ return Date.now() + Math.floor(Math.random()*1000); }
function fmt(dt){ if(!dt) return '-'; const d=new Date(dt); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(dt){ if(!dt) return '-'; return new Date(dt).toLocaleDateString('pt-BR'); }
function fmtTime(dt){ if(!dt) return '-'; return new Date(dt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }
function calcKm(trips){ return trips.reduce((s,t)=>{ if(t.kmStart&&t.kmEnd) return s+(parseInt(t.kmEnd)-parseInt(t.kmStart)); return s; },0); }
