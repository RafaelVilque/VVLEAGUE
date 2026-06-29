// ============================================================
// STATIC DATA (non-DB sections)
// ============================================================
const UPCOMING_EVENTS = [
  { name: 'VVL Season 3 Grand Championship', region: 'ALL REGIONS', date: '2026-08-01T20:00:00' },
  { name: 'NA Regional Qualifier',           region: 'NA',          date: '2026-07-05T18:00:00' },
  { name: 'EU Open Cup',                     region: 'EU',          date: '2026-07-12T19:00:00' },
  { name: 'ASIA Invitational',               region: 'ASIA',        date: '2026-07-20T14:00:00' },
];

const DEFAULT_BRACKETS = {
  NA:   { qf:[{t1:'VVS',s1:3,t2:'TRX',s2:0,done:true},{t1:'NXS',s1:2,t2:'ABY',s2:3,done:true},{t1:'ZRO',s1:3,t2:'RVN',s2:1,done:true},{t1:'FRZ',s1:1,t2:'VLT',s2:3,done:true}], sf:[{t1:'VVS',s1:null,t2:'ABY',s2:null,done:false},{t1:'ZRO',s1:null,t2:'VLT',s2:null,done:false}], f:[{t1:'TBD',s1:null,t2:'TBD',s2:null,done:false}], champion:null },
  EU:   { qf:[{t1:'FRZ',s1:3,t2:'EMP',s2:1,done:true},{t1:'VLT',s1:2,t2:'NOV',s2:3,done:true}], sf:[{t1:'FRZ',s1:null,t2:'NOV',s2:null,done:false}], f:[{t1:'TBD',s1:null,t2:'TBD',s2:null,done:false}], champion:null },
  ASIA: { qf:[{t1:'SKY',s1:3,t2:'ZEN',s2:0,done:true},{t1:'ONI',s1:1,t2:'KRN',s2:3,done:true}], sf:[{t1:'SKY',s1:null,t2:'KRN',s2:null,done:false}], f:[{t1:'TBD',s1:null,t2:'TBD',s2:null,done:false}], champion:null },
  OCE:  { qf:[{t1:'WVE',s1:3,t2:'CRL',s2:1,done:true}], sf:[{t1:'WVE',s1:null,t2:'DNG',s2:null,done:false}], f:[{t1:'TBD',s1:null,t2:'TBD',s2:null,done:false}], champion:null },
  SA:   { qf:[{t1:'JGR',s1:3,t2:'CAP',s2:0,done:true},{t1:'AND',s1:2,t2:'SOL',s2:3,done:true}], sf:[{t1:'JGR',s1:null,t2:'SOL',s2:null,done:false}], f:[{t1:'TBD',s1:null,t2:'TBD',s2:null,done:false}], champion:null },
};

const SCHEDULE = [
  {date:'2026-06-25',time:'18:00',match:'VVS vs ABY',          region:'NA',  round:'Semifinal',   status:'upcoming'},
  {date:'2026-06-25',time:'20:00',match:'ZRO vs VLT',          region:'NA',  round:'Semifinal',   status:'upcoming'},
  {date:'2026-06-26',time:'17:00',match:'FRZ vs NOV',          region:'EU',  round:'Semifinal',   status:'upcoming'},
  {date:'2026-06-27',time:'14:00',match:'SKY vs KRN',          region:'ASIA',round:'Semifinal',   status:'upcoming'},
  {date:'2026-06-27',time:'10:00',match:'WVE vs DNG',          region:'OCE', round:'Semifinal',   status:'upcoming'},
  {date:'2026-06-28',time:'19:00',match:'JGR vs SOL',          region:'SA',  round:'Semifinal',   status:'upcoming'},
  {date:'2026-07-05',time:'20:00',match:'NA Finals',           region:'NA',  round:'Final',       status:'upcoming'},
  {date:'2026-07-06',time:'19:00',match:'EU Finals',           region:'EU',  round:'Final',       status:'upcoming'},
  {date:'2026-07-07',time:'14:00',match:'ASIA Finals',         region:'ASIA',round:'Final',       status:'upcoming'},
  {date:'2026-07-07',time:'10:00',match:'OCE Finals',          region:'OCE', round:'Final',       status:'upcoming'},
  {date:'2026-07-08',time:'19:00',match:'SA Finals',           region:'SA',  round:'Final',       status:'upcoming'},
  {date:'2026-08-01',time:'20:00',match:'VVL S3 Championship', region:'ALL', round:'Grand Final', status:'upcoming'},
];

// ============================================================
// STATE
// ============================================================
let BRACKETS       = JSON.parse(JSON.stringify(DEFAULT_BRACKETS));
let orgFilter      = 'all';
let statsSort      = 'wins';
let scheduleRegion = 'ALL';
let currentBracket = 'NA';
let currentGuildR  = 'NA';
let currentTeamR   = 'NA';
let cdEventIndex   = 0;
let cdInterval     = null;

// Admin
let isAdmin    = false;
let adminToken = sessionStorage.getItem('vvl_token') || null;

// Logs state
let warRegion    = 'ALL';
let seasonFilter = 'ALL';
let wagerStatus  = 'ALL';
let awardsSeasonSel = null;

// Dynamic data from API
let orgsData      = [];
let leaderboardData = [];
let guildsData    = {};
let teamsData     = {};

// Pending delete / edit
let _deleteCtx = null;
let _editCtx   = null;

// ============================================================
// API HELPERS
// ============================================================
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (adminToken) opts.headers['Authorization'] = 'Bearer ' + adminToken;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  return res.json();
}
const apiGet    = (path)       => api('GET',    path);
const apiPost   = (path, body) => api('POST',   path, body);
const apiPut    = (path, body) => api('PUT',    path, body);
const apiDelete = (path)       => api('DELETE', path);

// ============================================================
// MAIN NAV
// ============================================================
function switchMain(tab) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'logs')    loadWarLogs();
  if (tab === 'awards')  loadAwards();
}

function switchSection(btn, sectionId) {
  const page = btn.closest('.page');
  page.querySelectorAll('.sec-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  page.querySelectorAll('.home-section').forEach(s => s.classList.remove('active'));
  page.querySelector('#' + sectionId).classList.add('active');
}

// ============================================================
// COUNTDOWN
// ============================================================
function initCountdown() {
  renderCountdownEvent(0);
  buildDots();
  tickCountdown();
  if (cdInterval) clearInterval(cdInterval);
  cdInterval = setInterval(tickCountdown, 1000);
}

function buildDots() {
  document.getElementById('upcomingDots').innerHTML = UPCOMING_EVENTS.map((_, i) =>
    `<div class="udot ${i===0?'active':''}" onclick="setCountdownEvent(${i})"></div>`
  ).join('');
}

function setCountdownEvent(i) {
  cdEventIndex = i;
  document.querySelectorAll('.udot').forEach((d, idx) => d.classList.toggle('active', idx === i));
  renderCountdownEvent(i);
}

function renderCountdownEvent(i) {
  const ev = UPCOMING_EVENTS[i];
  document.getElementById('countdownEventName').textContent   = ev.name.toUpperCase();
  document.getElementById('countdownEventRegion').textContent = '— ' + ev.region + ' —';
}

function tickCountdown() {
  const diff = new Date(UPCOMING_EVENTS[cdEventIndex].date) - new Date();
  if (diff <= 0) { ['cdDays','cdHours','cdMins','cdSecs'].forEach(id => document.getElementById(id).textContent = '00'); return; }
  document.getElementById('cdDays').textContent  = String(Math.floor(diff/86400000)).padStart(2,'0');
  document.getElementById('cdHours').textContent = String(Math.floor(diff%86400000/3600000)).padStart(2,'0');
  document.getElementById('cdMins').textContent  = String(Math.floor(diff%3600000/60000)).padStart(2,'0');
  document.getElementById('cdSecs').textContent  = String(Math.floor(diff%60000/1000)).padStart(2,'0');
}

// ============================================================
// ORGS — load & derive guilds/teams
// ============================================================
async function loadOrgs() {
  orgsData = await apiGet('/orgs');
  guildsData = buildGuildsFromOrgs(orgsData);
  teamsData  = buildTeamsFromOrgs(orgsData);
  renderOrgList();
  renderStats();
  renderGuilds();
  renderTeams();
}

function buildGuildsFromOrgs(orgs) {
  const regions = { NA:[], EU:[], ASIA:[], OCE:[], SA:[] };
  orgs.filter(o => o.status === 'active').forEach(o => {
    if (!regions[o.region]) return;
    const points = (o.wins || 0) * 100 + (o.wonEvents || 0) * 200;
    regions[o.region].push({ tag:o.tag, name:o.name, icon:o.icon||o.tag.slice(0,2), wins:o.wins||0, members:o.members.length, points, rank:0 });
  });
  Object.keys(regions).forEach(r => {
    regions[r].sort((a,b) => b.points - a.points);
    regions[r].forEach((g,i) => g.rank = i+1);
  });
  return regions;
}

function buildTeamsFromOrgs(orgs) {
  const regions = { NA:[], EU:[], ASIA:[], OCE:[], SA:[] };
  orgs.forEach(o => {
    if (!regions[o.region]) return;
    regions[o.region].push({ tag:o.tag, name:o.name, icon:o.icon||o.tag.slice(0,2), region:o.region, players:o.members.length, record:`${o.wins||0}-${o.losses||0}`, rank:'#?' });
  });
  Object.keys(regions).forEach(r => {
    regions[r].sort((a,b) => {
      const [wa,la] = a.record.split('-').map(Number);
      const [wb,lb] = b.record.split('-').map(Number);
      return (wb - lb) - (wa - la);
    });
    regions[r].forEach((t,i) => t.rank = `#${i+1}`);
  });
  return regions;
}

// ============================================================
// ORG SEARCH
// ============================================================
function setOrgFilter(btn, f) {
  orgFilter = f;
  document.querySelectorAll('#secOrgs .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOrgList();
}

function renderOrgList() {
  const q = (document.getElementById('orgSearchInput').value || '').toLowerCase().trim();
  const list = document.getElementById('orgList'), empty = document.getElementById('orgEmpty');
  const filtered = orgsData.filter(o => {
    const mf = orgFilter === 'all' || o.status === orgFilter;
    const mq = !q || o.name.toLowerCase().includes(q) || o.tag.toLowerCase().includes(q);
    return mf && mq;
  });
  if (!filtered.length) { list.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  list.innerHTML = filtered.map(o => {
    const editBtns = isAdmin
      ? `<button class="tbl-btn" onclick="event.stopPropagation();openOrgForm(${JSON.stringify(o).replace(/"/g,'&quot;')})">✎</button><button class="tbl-btn del" onclick="event.stopPropagation();confirmDelete('org',${o.id})">✕</button>`
      : '';
    return `
      <div class="org-card" onclick="openOrgModal(${o.id})">
        <div class="org-avatar">${o.tag.slice(0,2)}</div>
        <div class="org-info">
          <div class="org-name">${o.name}</div>
          <div class="org-meta">[${o.tag}] · ${o.members.length} members · ${o.region} · Since ${o.founded}</div>
        </div>
        <span class="org-badge ${o.status==='active'?'badge-active':'badge-inactive'}">${o.status==='active'?'ACTIVE':'INACTIVE'}</span>
        ${editBtns}
        <span class="org-chevron">›</span>
      </div>`;
  }).join('');
}

// ============================================================
// ORG MODAL
// ============================================================
function openOrgModal(id) {
  const o = orgsData.find(x => x.id === id); if (!o) return;
  const wr = o.wins+o.losses > 0 ? ((o.wins/(o.wins+o.losses))*100).toFixed(0)+'%' : '—';
  const wagerStr = o.wager ? '$'+Number(o.wager).toLocaleString() : '—';
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-org-header">
      <div class="modal-org-avatar">${o.tag.slice(0,2)}</div>
      <div><div class="modal-org-name">${o.name}</div><div class="modal-org-tag">[${o.tag}] · ${o.region} · ${o.status==='active'?'● ACTIVE':'○ INACTIVE'} · Since ${o.founded}</div></div>
    </div>
    <div class="modal-stats-grid">
      <div class="modal-stat"><div class="modal-stat-label">Wins</div><div class="modal-stat-value stat-green">${o.wins}</div></div>
      <div class="modal-stat"><div class="modal-stat-label">Losses</div><div class="modal-stat-value stat-red">${o.losses}</div></div>
      <div class="modal-stat"><div class="modal-stat-label">Winrate</div><div class="modal-stat-value">${wr}</div></div>
      <div class="modal-stat"><div class="modal-stat-label">Events Won</div><div class="modal-stat-value" style="color:var(--yellow)">${o.wonEvents}</div></div>
      <div class="modal-stat"><div class="modal-stat-label">Members</div><div class="modal-stat-value">${o.members.length}</div></div>
      <div class="modal-stat"><div class="modal-stat-label">Wager</div><div class="modal-stat-value wager-cell">${wagerStr}</div></div>
    </div>
    <div class="modal-stat" style="margin-bottom:.8rem;"><div class="modal-stat-label">MVP Player</div><div class="modal-stat-value" style="color:var(--yellow);">⭐ ${o.mvp||'—'}</div></div>
    <div class="modal-section-title">ROSTER</div>
    <div>${o.members.map(m=>`<div class="modal-member-row"><span>${m.name}</span><span class="member-role">${m.role.toUpperCase()}</span></div>`).join('')}</div>`;
  document.getElementById('orgModal').classList.add('open');
}
function closeOrgModal() { document.getElementById('orgModal').classList.remove('open'); }
function maybeCloseModal(e) { if (e.target===document.getElementById('orgModal')) closeOrgModal(); }

// ============================================================
// SEASON STATS
// ============================================================
function sortStats(btn, key) {
  statsSort = key;
  document.querySelectorAll('.sort-row .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStats();
}

function renderStats() {
  const sortMap = {
    wins:    (a,b) => (b.wins-b.losses)-(a.wins-a.losses),
    events:  (a,b) => b.wonEvents-a.wonEvents,
    members: (a,b) => b.members.length-a.members.length,
    wager:   (a,b) => (parseFloat(b.wager)||0)-(parseFloat(a.wager)||0),
  };
  const sorted = [...orgsData].sort(sortMap[statsSort]||sortMap.wins);
  document.getElementById('statsBody').innerHTML = sorted.map((o,i) => {
    const r=i+1, rc=r<=3?`rank-${r}`:'', rm=r<=3?['①','②','③'][r-1]:r;
    const wagerStr = o.wager ? '$'+Number(o.wager).toLocaleString() : '—';
    return `<tr class="${rc}"><td class="rank-cell">${rm}</td><td class="org-name-cell">${o.name}</td><td><span class="stat-wins">${o.wins}W</span>&nbsp;<span style="opacity:.4">/</span>&nbsp;<span class="stat-losses">${o.losses}L</span></td><td style="color:var(--yellow)">${o.wonEvents}</td><td>${o.members.length}</td><td class="mvp-cell">${o.mvp||'—'}</td><td class="wager-cell">${wagerStr}</td></tr>`;
  }).join('');
}

// ============================================================
// GUILDS + TEAMS
// ============================================================
function switchRegionGuild(btn, r) {
  currentGuildR = r;
  document.querySelectorAll('#guildRegionTabs .rtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderGuilds();
}
function renderGuilds() {
  document.getElementById('guildGrid').innerHTML = (guildsData[currentGuildR]||[]).map(g => `
    <div class="guild-card">
      <div class="guild-rank">RANK #${g.rank}</div>
      <div class="guild-icon">${g.icon}</div>
      <div class="guild-name">${g.name}</div>
      <div class="guild-tag">[${g.tag}]</div>
      <div class="guild-stats">
        <div class="guild-stat"><span>${g.wins}</span><label>WINS</label></div>
        <div class="guild-stat"><span>${g.members}</span><label>MEMBERS</label></div>
        <div class="guild-stat"><span>${g.points.toLocaleString()}</span><label>POINTS</label></div>
      </div>
    </div>`).join('');
}

function switchRegionTeam(btn, r) {
  currentTeamR = r;
  document.querySelectorAll('#teamRegionTabs .rtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderTeams();
}
function renderTeams() {
  document.getElementById('teamGrid').innerHTML = (teamsData[currentTeamR]||[]).map(t => `
    <div class="team-card">
      <div class="team-card-header">
        <div class="team-icon">${t.icon}</div>
        <div><div class="team-name">${t.name}</div><div class="team-region">[${t.tag}] · ${t.region}</div></div>
      </div>
      <div class="team-row"><span>Rank</span><span>${t.rank}</span></div>
      <div class="team-row"><span>Record</span><span>${t.record}</span></div>
      <div class="team-row"><span>Players</span><span>${t.players}</span></div>
    </div>`).join('');
}

// ============================================================
// BRACKETS
// ============================================================
async function loadBracketsFromAPI() {
  try {
    const data = await apiGet('/brackets');
    if (data && typeof data === 'object' && !data.error) {
      Object.keys(data).forEach(r => { if (BRACKETS[r]) BRACKETS[r] = data[r]; });
    }
  } catch(e) {}
  renderBracket();
}

function switchBracket(btn, region) {
  currentBracket = region;
  document.querySelectorAll('#secBrackets .rtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBracket();
}

function renderBracket() {
  const br = BRACKETS[currentBracket]; if (!br) return;
  function matchHtml(m, rk, idx) {
    if (!m) return '';
    const t1w = m.done && m.s1!==null && m.s1>m.s2;
    const t2w = m.done && m.s2!==null && m.s2>m.s1;
    const t1c = m.t1==='TBD'?'tbd':(m.done?(t1w?'winner':'loser'):'');
    const t2c = m.t2==='TBD'?'tbd':(m.done?(t2w?'winner':'loser'):'');
    const aa  = isAdmin ? `onclick="openMatchEdit('${currentBracket}','${rk}',${idx})" title="Edit"` : '';
    return `<div class="bracket-match ${isAdmin?'admin-editable':''}" ${aa}>
      <div class="bracket-team ${t1c}"><span class="bt-name">${m.t1}</span><span class="bt-score">${m.done&&m.s1!==null?m.s1:'—'}</span></div>
      <div class="bracket-team ${t2c}"><span class="bt-name">${m.t2}</span><span class="bt-score">${m.done&&m.s2!==null?m.s2:'—'}</span></div>
      ${isAdmin?'<div class="admin-edit-hint">✎ EDIT</div>':''}
    </div>`;
  }
  const rounds = [{key:'qf',label:'QUARTERFINALS'},{key:'sf',label:'SEMIFINALS'},{key:'f',label:'FINALS'}].filter(r=>br[r.key]&&br[r.key].length);
  const champBtn = isAdmin ? `<button class="admin-champion-btn" onclick="openChampionEdit('${currentBracket}')">✎ SET</button>` : '';
  document.getElementById('bracketView').innerHTML = `
    <div class="bracket">
      ${rounds.map(r=>`<div class="bracket-round"><div class="round-label">${r.label}</div><div class="round-matches">${br[r.key].map((m,i)=>matchHtml(m,r.key,i)).join('')}</div></div>`).join('')}
      <div class="bracket-round"><div class="round-label">CHAMPION</div><div class="round-matches"><div class="champion-box"><div class="champion-label">🏆 Winner</div><div class="champion-name">${br.champion||'TBD'}</div>${champBtn}</div></div></div>
    </div>`;
}

// ============================================================
// SCHEDULE
// ============================================================
function filterSchedule(btn, region) {
  scheduleRegion = region;
  document.querySelectorAll('#secSchedule .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderSchedule();
}
function renderSchedule() {
  const data = scheduleRegion==='ALL' ? SCHEDULE : SCHEDULE.filter(s=>s.region===scheduleRegion||s.region==='ALL');
  document.getElementById('scheduleBody').innerHTML = data.map(s => {
    const sc = s.status==='live'?'status-live':s.status==='done'?'status-done':'status-upcoming';
    const sl = s.status==='live'?'🔴 LIVE':s.status==='done'?'DONE':'UPCOMING';
    return `<tr><td>${s.date}</td><td>${s.time}</td><td style="color:var(--blue);font-weight:600;">${s.match}</td><td><span class="org-badge badge-active" style="font-size:.65rem;">${s.region}</span></td><td style="color:var(--text);opacity:.7">${s.round}</td><td class="${sc}">${sl}</td></tr>`;
  }).join('');
}

// ============================================================
// LEADERBOARD
// ============================================================
async function loadLeaderboard() {
  leaderboardData = await apiGet('/players');
  renderLeaderboard();
}

function getEloTier(elo) {
  if (elo>=2500) return {label:'DIAMOND', cls:'tier-diamond'};
  if (elo>=2000) return {label:'PLATINUM',cls:'tier-platinum'};
  if (elo>=1500) return {label:'GOLD',    cls:'tier-gold'};
  if (elo>=1000) return {label:'SILVER',  cls:'tier-silver'};
  return               {label:'BRONZE',  cls:'tier-bronze'};
}

function renderLeaderboard() {
  const q = (document.getElementById('lbSearch').value||'').toLowerCase().trim();
  const data = leaderboardData.filter(p=>!q||p.name.toLowerCase().includes(q)||p.org.toLowerCase().includes(q));
  const actTh = document.getElementById('lbActTh');
  if (actTh) actTh.style.display = isAdmin ? '' : 'none';
  document.getElementById('lbBody').innerHTML = data.map((p,i) => {
    const rc=i<3?`lb-rank-${i+1}`:'', rd=i<3?['①','②','③'][i]:i+1, t=getEloTier(p.elo);
    const adminBtns = isAdmin
      ? `<td><button class="tbl-btn" onclick="openPlayerForm(${JSON.stringify(p).replace(/"/g,'&quot;')})">✎</button><button class="tbl-btn del" onclick="confirmDelete('player',${p.id})">✕</button></td>`
      : '';
    return `<tr class="${rc}"><td class="lb-rank">${rd}</td><td style="font-weight:600">${p.name}</td><td style="color:rgba(160,200,255,.5);font-size:.85rem;">[${p.org}]</td><td class="lb-elo">${p.elo}</td><td><span class="tier-badge ${t.cls}">${t.label}</span></td><td style="font-size:.85rem;"><span class="stat-wins">${p.wins}W</span>&nbsp;<span style="opacity:.4">/</span>&nbsp;<span class="stat-losses">${p.losses}L</span></td>${adminBtns}</tr>`;
  }).join('');
}

// ============================================================
// ADMIN AUTH
// ============================================================
function toggleAdminPanel() {
  if (isAdmin) return;
  document.getElementById('adminLoginModal').classList.add('open');
  setTimeout(() => document.getElementById('adminUser').focus(), 80);
}

function closeAdminLogin() {
  document.getElementById('adminLoginModal').classList.remove('open');
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
  document.getElementById('loginError').style.display = 'none';
}
function maybeCloseAdminModal(e) { if (e.target===document.getElementById('adminLoginModal')) closeAdminLogin(); }

async function attemptLogin() {
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value;
  const errEl = document.getElementById('loginError');
  try {
    const res = await apiPost('/auth/login', { username: u, password: p });
    if (res.token) {
      adminToken = res.token;
      sessionStorage.setItem('vvl_token', adminToken);
      isAdmin = true;
      closeAdminLogin();
      setAdminUI(true);
      renderBracket();
    } else {
      errEl.style.display = '';
      document.getElementById('adminPass').value = '';
      setTimeout(() => errEl.style.display='none', 3000);
    }
  } catch(e) { errEl.style.display = ''; setTimeout(() => errEl.style.display='none', 3000); }
}

function adminLogout() {
  isAdmin = false;
  adminToken = null;
  sessionStorage.removeItem('vvl_token');
  setAdminUI(false);
  renderBracket();
  refreshAdminButtons();
}

function setAdminUI(on) {
  document.getElementById('adminLockBtn').textContent  = on ? '🔓' : '🔒';
  document.getElementById('adminLockBtn').title        = on ? 'Admin Active' : 'Admin Login';
  document.getElementById('adminBadge').style.display  = on ? '' : 'none';
  document.getElementById('adminLogoutBtn').style.display = on ? '' : 'none';
  refreshAdminButtons();
  if (on) { renderOrgList(); renderLeaderboard(); }
}

function refreshAdminButtons() {
  ['addWarLogBtn','addSeasonLogBtn','addWagerBtn','addAwardBtn','editHomeRulesBtn','editLogsRulesBtn','addOrgBtn','addPlayerBtn'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = isAdmin ? '' : 'none';
  });
  ['warActTh','seasonActTh','wagerActTh','lbActTh'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = isAdmin ? '' : 'none';
  });
}

async function verifyStoredToken() {
  if (!adminToken) return;
  try {
    const res = await apiGet('/auth/verify');
    if (res.valid) { isAdmin = true; setAdminUI(true); }
    else { adminToken = null; sessionStorage.removeItem('vvl_token'); }
  } catch(e) { adminToken = null; sessionStorage.removeItem('vvl_token'); }
}

// ============================================================
// BRACKET EDIT (admin)
// ============================================================
function openMatchEdit(region, roundKey, idx) {
  if (!isAdmin) return;
  _editCtx = { region, roundKey, idx, type:'match' };
  const m = BRACKETS[region][roundKey][idx];
  document.getElementById('matchEditContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1.2rem;">
      <div class="admin-modal-icon">✎</div>
      <div class="admin-modal-title">EDIT MATCH</div>
      <div class="admin-modal-sub">${region} — ${roundKey.toUpperCase()} #${idx+1}</div>
    </div>
    <div class="admin-edit-grid">
      <div class="admin-field"><label class="admin-label">TEAM 1</label><input id="eT1" class="admin-input" value="${m.t1}"></div>
      <div class="admin-field"><label class="admin-label">SCORE 1</label><input id="eS1" type="number" min="0" class="admin-input" value="${m.s1??''}"></div>
      <div class="admin-field"><label class="admin-label">TEAM 2</label><input id="eT2" class="admin-input" value="${m.t2}"></div>
      <div class="admin-field"><label class="admin-label">SCORE 2</label><input id="eS2" type="number" min="0" class="admin-input" value="${m.s2??''}"></div>
    </div>
    <div class="admin-checkbox-row"><input type="checkbox" id="eDone" ${m.done?'checked':''}><label for="eDone">Mark as completed</label></div>
    <div class="admin-modal-actions"><button class="admin-submit-btn" onclick="saveMatchEdit()">SAVE</button><button class="admin-cancel-btn" onclick="closeMatchEdit()">CANCEL</button></div>`;
  document.getElementById('matchEditModal').classList.add('open');
}

async function saveMatchEdit() {
  const { region, roundKey, idx } = _editCtx;
  const s1v = document.getElementById('eS1').value, s2v = document.getElementById('eS2').value;
  const m = { t1:document.getElementById('eT1').value.trim()||'TBD', t2:document.getElementById('eT2').value.trim()||'TBD', s1:s1v!==''?parseInt(s1v):null, s2:s2v!==''?parseInt(s2v):null, done:document.getElementById('eDone').checked };
  BRACKETS[region][roundKey][idx] = m;
  await apiPut('/brackets/'+region, BRACKETS[region]);
  closeMatchEdit(); renderBracket();
}

function closeMatchEdit() { document.getElementById('matchEditModal').classList.remove('open'); _editCtx=null; }
function maybeCloseMatchModal(e) { if (e.target===document.getElementById('matchEditModal')) closeMatchEdit(); }

function openChampionEdit(region) {
  if (!isAdmin) return;
  _editCtx = { region, type:'champion' };
  document.getElementById('matchEditContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1.2rem;">
      <div class="admin-modal-icon">🏆</div>
      <div class="admin-modal-title">SET CHAMPION</div>
      <div class="admin-modal-sub">${region} Region</div>
    </div>
    <div class="admin-field" style="margin-bottom:1rem;"><label class="admin-label">CHAMPION NAME</label><input id="eChamp" class="admin-input" value="${BRACKETS[region].champion||''}" placeholder="Team name or leave blank"></div>
    <div class="admin-modal-actions"><button class="admin-submit-btn" onclick="saveChampion('${region}')">SAVE</button><button class="admin-cancel-btn" onclick="closeMatchEdit()">CANCEL</button></div>`;
  document.getElementById('matchEditModal').classList.add('open');
}

async function saveChampion(region) {
  BRACKETS[region].champion = document.getElementById('eChamp').value.trim()||null;
  await apiPut('/brackets/'+region, BRACKETS[region]);
  closeMatchEdit(); renderBracket();
}

// ============================================================
// WAR LOGS
// ============================================================
function setWarFilter(btn, _key, val) {
  warRegion = val;
  document.querySelectorAll('#secWarLogs .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadWarLogs();
}

async function loadWarLogs() {
  const loadEl = document.getElementById('warLogsLoading'), emptyEl = document.getElementById('warLogsEmpty'), body = document.getElementById('warLogsBody');
  loadEl.style.display=''; emptyEl.style.display='none'; body.innerHTML='';
  const params = warRegion!=='ALL' ? '?region='+warRegion : '';
  const data = await apiGet('/logs/war'+params);
  loadEl.style.display='none';
  if (!data.length) { emptyEl.style.display=''; return; }
  body.innerHTML = data.map(r => {
    const actBtns = isAdmin ? `<td><button class="tbl-btn" onclick="openLogForm('war',${JSON.stringify(r).replace(/"/g,'&quot;')})">✎</button><button class="tbl-btn del" onclick="confirmDelete('war',${r.id})">✕</button></td>` : '';
    const eloHtml = (r.elo_org1 == null && r.elo_org2 == null) ? '—' :
      `<span class="${r.elo_org1>0?'stat-wins':r.elo_org1<0?'stat-losses':''}">${r.elo_org1!=null?(r.elo_org1>0?'+':'')+r.elo_org1:'—'}</span>&nbsp;/&nbsp;<span class="${r.elo_org2>0?'stat-wins':r.elo_org2<0?'stat-losses':''}">${r.elo_org2!=null?(r.elo_org2>0?'+':'')+r.elo_org2:'—'}</span>`;
    return `<tr>
      <td>${r.date}</td>
      <td style="color:var(--blue);font-weight:600;">${r.org1} vs ${r.org2}</td>
      <td><span class="stat-wins">${r.score1}</span>&nbsp;—&nbsp;<span class="stat-losses">${r.score2}</span></td>
      <td style="color:var(--yellow);font-weight:600;">${r.winner||'—'}</td>
      <td class="wager-cell">${r.wager?(isNaN(r.wager)?r.wager:'$'+Number(r.wager).toLocaleString()):'—'}</td>
      <td style="font-size:.85rem;white-space:nowrap;">${eloHtml}</td>
      <td><span class="org-badge badge-active" style="font-size:.62rem;">${r.region}</span></td>
      <td style="color:rgba(160,200,255,.5)">${r.season}</td>
      <td style="color:var(--text);opacity:.65;font-size:.82rem;">${r.notes||'—'}</td>
      ${actBtns}
    </tr>`;
  }).join('');
  refreshAdminButtons();
}

// ============================================================
// SEASON LOGS
// ============================================================
function buildSeasonFilterBtns(seasons) {
  const wrap = document.getElementById('seasonLogSeasonBtns');
  const allSeasons = ['ALL', ...seasons];
  wrap.innerHTML = allSeasons.map((s,i) =>
    `<button class="filter-btn ${i===0?'active':''}" onclick="setSeasonLogFilter(this,'${s}')">${s}</button>`
  ).join('');
}

function setSeasonLogFilter(btn, s) {
  seasonFilter = s;
  document.querySelectorAll('#secSeasonLogs .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadSeasonLogs();
}

async function loadSeasonLogs() {
  const loadEl=document.getElementById('seasonLogsLoading'), emptyEl=document.getElementById('seasonLogsEmpty'), body=document.getElementById('seasonLogsBody');
  loadEl.style.display=''; emptyEl.style.display='none'; body.innerHTML='';
  const params = seasonFilter!=='ALL' ? '?season='+encodeURIComponent(seasonFilter) : '';
  const data = await apiGet('/logs/season'+params);
  const seasons = [...new Set(data.map(r=>r.season))].sort().reverse();
  buildSeasonFilterBtns(seasons);
  loadEl.style.display='none';
  if (!data.length) { emptyEl.style.display=''; return; }
  body.innerHTML = data.map(r => {
    const actBtns = isAdmin ? `<td><button class="tbl-btn" onclick="openLogForm('season',${JSON.stringify(r).replace(/"/g,'&quot;')})">✎</button><button class="tbl-btn del" onclick="confirmDelete('season',${r.id})">✕</button></td>` : '';
    return `<tr>
      <td>${r.date}</td>
      <td style="color:rgba(160,200,255,.6);font-size:.85rem;">${r.event_name||'—'}</td>
      <td style="color:var(--blue);font-weight:600;">${r.org1} vs ${r.org2}</td>
      <td><span class="stat-wins">${r.score1}</span>&nbsp;—&nbsp;<span class="stat-losses">${r.score2}</span></td>
      <td style="color:var(--yellow);font-weight:600;">${r.winner||'—'}</td>
      <td><span class="org-badge badge-active" style="font-size:.62rem;">${r.region}</span></td>
      <td style="color:rgba(160,200,255,.5)">${r.season}</td>
      <td style="color:var(--text);opacity:.65;font-size:.82rem;">${r.notes||'—'}</td>
      ${actBtns}
    </tr>`;
  }).join('');
  refreshAdminButtons();
}

// ============================================================
// WAGER RECORDS
// ============================================================
function setWagerFilter(btn, s) {
  wagerStatus = s;
  document.querySelectorAll('#secWagerRecords .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadWagerRecords();
}

async function loadWagerRecords() {
  const loadEl=document.getElementById('wagerLoading'), emptyEl=document.getElementById('wagerEmpty'), body=document.getElementById('wagerBody');
  loadEl.style.display=''; emptyEl.style.display='none'; body.innerHTML='';
  const params = wagerStatus!=='ALL' ? '?status='+wagerStatus : '';
  const data = await apiGet('/logs/wager'+params);
  loadEl.style.display='none';
  if (!data.length) { emptyEl.style.display=''; return; }
  body.innerHTML = data.map(r => {
    const stCls = r.status==='settled'?'pill-settled':r.status==='cancelled'?'pill-cancelled':'pill-pending';
    const paidCls = r.paid ? 'pill-paid' : 'pill-unpaid';
    const actBtns = isAdmin ? `<td><button class="tbl-btn" onclick="openLogForm('wager',${JSON.stringify(r).replace(/"/g,'&quot;')})">✎</button><button class="tbl-btn del" onclick="confirmDelete('wager',${r.id})">✕</button></td>` : '';
    return `<tr>
      <td>${r.date}</td>
      <td style="color:var(--blue);font-weight:600;">${r.challenger}</td>
      <td style="color:var(--blue);font-weight:600;">${r.challenged}</td>
      <td class="wager-cell">${r.amount?(isNaN(r.amount)?r.amount:'$'+Number(r.amount).toLocaleString()):'—'}</td>
      <td style="color:var(--yellow);font-weight:600;">${r.winner||'—'}</td>
      <td><span class="status-pill ${stCls}">${r.status.toUpperCase()}</span></td>
      <td><span class="status-pill ${paidCls}">${r.paid?'PAID':'UNPAID'}</span></td>
      <td style="color:rgba(160,200,255,.5)">${r.season}</td>
      <td style="color:var(--text);opacity:.65;font-size:.82rem;">${r.notes||'—'}</td>
      ${actBtns}
    </tr>`;
  }).join('');
  refreshAdminButtons();
}

// ============================================================
// LOG FORM (Admin — War / Season / Wager)
// ============================================================
function openLogForm(type, existing) {
  const e = existing || {};
  const isEdit = !!e.id;
  const title = { war:'WAR LOG', season:'SEASON LOG', wager:'WAGER RECORD' }[type];
  let formHtml = '';

  if (type === 'war') {
    const orgSel = (id, val) => `<select id="${id}" class="admin-select">${orgsData.map(o=>`<option value="${o.tag}" ${val===o.tag?'selected':''}>${o.tag} — ${o.name}</option>`).join('')}</select>`;
    const winSel = (val) => `<select id="lf_winner" class="admin-select"><option value="">— NENHUM —</option>${orgsData.map(o=>`<option value="${o.tag}" ${val===o.tag?'selected':''}>${o.tag} — ${o.name}</option>`).join('')}</select>`;
    formHtml = `
      <div class="admin-form-grid-3">
        <div class="admin-field"><label class="admin-label">ORG 1</label>${orgSel('lf_org1', e.org1||'')}</div>
        <div class="admin-field"><label class="admin-label">S1</label><input id="lf_s1" type="number" min="0" class="admin-input" value="${e.score1??''}"></div>
        <div class="admin-field"><label class="admin-label">S2</label><input id="lf_s2" type="number" min="0" class="admin-input" value="${e.score2??''}"></div>
        <div class="admin-field"><label class="admin-label">ORG 2</label>${orgSel('lf_org2', e.org2||'')}</div>
      </div>
      <div class="admin-form-grid-2">
        <div class="admin-field"><label class="admin-label">DATE</label><input id="lf_date" type="date" class="admin-input" value="${e.date||''}"></div>
        <div class="admin-field"><label class="admin-label">WINNER</label>${winSel(e.winner||'')}</div>
        <div class="admin-field"><label class="admin-label">WAGER</label><input id="lf_wager" class="admin-input" value="${e.wager||''}" placeholder="ex: $500, itens, custom..."></div>
        <div class="admin-field"><label class="admin-label">REGION</label><select id="lf_region" class="admin-select"><option ${e.region==='NA'?'selected':''}>NA</option><option ${e.region==='EU'?'selected':''}>EU</option><option ${e.region==='ASIA'?'selected':''}>ASIA</option><option ${e.region==='OCE'?'selected':''}>OCE</option><option ${e.region==='SA'?'selected':''}>SA</option></select></div>
        <div class="admin-field"><label class="admin-label">ELO ORG 1 (ex: +25 ou -20)</label><input id="lf_elo1" type="number" class="admin-input" value="${e.elo_org1??''}" placeholder="opcional"></div>
        <div class="admin-field"><label class="admin-label">ELO ORG 2 (ex: +25 ou -20)</label><input id="lf_elo2" type="number" class="admin-input" value="${e.elo_org2??''}" placeholder="opcional"></div>
        <div class="admin-field"><label class="admin-label">SEASON</label><input id="lf_season" class="admin-input" value="${e.season||'S3'}" placeholder="S1, S2, S3..."></div>
        <div class="admin-field"><label class="admin-label">NOTES</label><input id="lf_notes" class="admin-input" value="${e.notes||''}"></div>
      </div>`;
  } else if (type === 'season') {
    const orgSel = (id, val) => `<select id="${id}" class="admin-select">${orgsData.map(o=>`<option value="${o.tag}" ${val===o.tag?'selected':''}>${o.tag} — ${o.name}</option>`).join('')}</select>`;
    const winSel = (val) => `<select id="lf_winner" class="admin-select"><option value="">— NENHUM —</option>${orgsData.map(o=>`<option value="${o.tag}" ${val===o.tag?'selected':''}>${o.tag} — ${o.name}</option>`).join('')}</select>`;
    formHtml = `
      <div class="admin-form-grid-3">
        <div class="admin-field"><label class="admin-label">ORG 1</label>${orgSel('lf_org1', e.org1||'')}</div>
        <div class="admin-field"><label class="admin-label">S1</label><input id="lf_s1" type="number" min="0" class="admin-input" value="${e.score1??''}"></div>
        <div class="admin-field"><label class="admin-label">S2</label><input id="lf_s2" type="number" min="0" class="admin-input" value="${e.score2??''}"></div>
        <div class="admin-field"><label class="admin-label">ORG 2</label>${orgSel('lf_org2', e.org2||'')}</div>
      </div>
      <div class="admin-form-grid-2">
        <div class="admin-field"><label class="admin-label">DATE</label><input id="lf_date" type="date" class="admin-input" value="${e.date||''}"></div>
        <div class="admin-field"><label class="admin-label">EVENT NAME</label><input id="lf_event" class="admin-input" value="${e.event_name||''}"></div>
        <div class="admin-field"><label class="admin-label">WINNER</label>${winSel(e.winner||'')}</div>
        <div class="admin-field"><label class="admin-label">REGION</label><select id="lf_region" class="admin-select"><option ${e.region==='NA'?'selected':''}>NA</option><option ${e.region==='EU'?'selected':''}>EU</option><option ${e.region==='ASIA'?'selected':''}>ASIA</option><option ${e.region==='OCE'?'selected':''}>OCE</option><option ${e.region==='SA'?'selected':''}>SA</option></select></div>
        <div class="admin-field"><label class="admin-label">SEASON</label><input id="lf_season" class="admin-input" value="${e.season||'S3'}"></div>
        <div class="admin-field"><label class="admin-label">NOTES</label><input id="lf_notes" class="admin-input" value="${e.notes||''}"></div>
      </div>`;
  } else {
    formHtml = `
      <div class="admin-form-grid-2">
        <div class="admin-field"><label class="admin-label">DATE</label><input id="lf_date" type="date" class="admin-input" value="${e.date||''}"></div>
        <div class="admin-field"><label class="admin-label">SEASON</label><input id="lf_season" class="admin-input" value="${e.season||'S3'}"></div>
        <div class="admin-field"><label class="admin-label">CHALLENGER</label><input id="lf_challenger" class="admin-input" value="${e.challenger||''}"></div>
        <div class="admin-field"><label class="admin-label">CHALLENGED</label><input id="lf_challenged" class="admin-input" value="${e.challenged||''}"></div>
        <div class="admin-field"><label class="admin-label">AMOUNT</label><input id="lf_amount" class="admin-input" value="${e.amount||''}" placeholder="ex: $500, itens, custom..."></div>
        <div class="admin-field"><label class="admin-label">WINNER</label><input id="lf_winner" class="admin-input" value="${e.winner||''}" placeholder="Challenger or Challenged"></div>
        <div class="admin-field"><label class="admin-label">STATUS</label><select id="lf_status" class="admin-select"><option value="pending" ${e.status==='pending'||!e.status?'selected':''}>PENDING</option><option value="settled" ${e.status==='settled'?'selected':''}>SETTLED</option><option value="cancelled" ${e.status==='cancelled'?'selected':''}>CANCELLED</option></select></div>
        <div class="admin-field"><label class="admin-label">NOTES</label><input id="lf_notes" class="admin-input" value="${e.notes||''}"></div>
      </div>
      <div class="admin-checkbox-row"><input type="checkbox" id="lf_paid" ${e.paid?'checked':''}><label for="lf_paid">Payment settled / Paid</label></div>`;
  }

  document.getElementById('logFormContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1rem;">
      <div class="admin-modal-icon">${isEdit?'✎':'+'}</div>
      <div class="admin-modal-title">${isEdit?'EDIT':'ADD'} ${title}</div>
    </div>
    ${formHtml}
    <div class="admin-modal-actions">
      <button class="admin-submit-btn" onclick="saveLogForm('${type}',${e.id||'null'})">SAVE</button>
      <button class="admin-cancel-btn" onclick="closeLogForm()">CANCEL</button>
    </div>`;
  document.getElementById('logFormModal').classList.add('open');
}

async function saveLogForm(type, id) {
  let body = {};
  if (type === 'war') {
    const elo1raw = g('lf_elo1'), elo2raw = g('lf_elo2');
    body = { date:g('lf_date'), org1:g('lf_org1'), org2:g('lf_org2'), score1:parseInt(g('lf_s1'))||0, score2:parseInt(g('lf_s2'))||0, winner:g('lf_winner'), wager:g('lf_wager'), region:g('lf_region'), season:g('lf_season'), notes:g('lf_notes'), elo_org1:elo1raw!==''?parseInt(elo1raw):null, elo_org2:elo2raw!==''?parseInt(elo2raw):null };
  } else if (type === 'season') {
    body = { season:g('lf_season'), date:g('lf_date'), event_name:g('lf_event')||'', org1:g('lf_org1'), org2:g('lf_org2'), score1:parseInt(g('lf_s1'))||0, score2:parseInt(g('lf_s2'))||0, winner:g('lf_winner'), region:g('lf_region'), notes:g('lf_notes') };
  } else {
    body = { date:g('lf_date'), challenger:g('lf_challenger'), challenged:g('lf_challenged'), amount:g('lf_amount'), winner:g('lf_winner'), status:g('lf_status'), paid:document.getElementById('lf_paid').checked, season:g('lf_season'), notes:g('lf_notes') };
  }
  const path = '/logs/'+type;
  id ? await apiPut(path+'/'+id, body) : await apiPost(path, body);
  closeLogForm();
  if (type==='war')    { loadWarLogs(); loadOrgs(); }
  if (type==='season') { loadSeasonLogs(); loadOrgs(); }
  if (type==='wager')  loadWagerRecords();
}

function g(id) { const el=document.getElementById(id); return el?(el.value||''):''; }
function closeLogForm()  { document.getElementById('logFormModal').classList.remove('open'); }
function maybeCloseLogModal(e) { if (e.target===document.getElementById('logFormModal')) closeLogForm(); }

// ============================================================
// ORG FORM (Admin)
// ============================================================
function openOrgForm(existing) {
  const e = existing || {}, isEdit = !!e.id;
  const membersHtml = isEdit && e.members ? `
    <div style="margin-top:.8rem;margin-bottom:.3rem;font-size:.75rem;color:var(--yellow);letter-spacing:.1em;">ROSTER</div>
    <div id="membersList" style="margin-bottom:.4rem;">
      ${(e.members||[]).map(m=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <span style="font-size:.85rem;">${m.name} <span class="member-role">${m.role}</span></span>
          <button class="tbl-btn del" onclick="deleteMember(${m.id},${e.id})">✕</button>
        </div>`).join('')}
    </div>
    <div class="admin-form-grid-2" style="margin-bottom:.4rem;">
      <div class="admin-field"><input id="of_mem_name" class="admin-input" placeholder="Nome do player"></div>
      <div class="admin-field"><select id="of_mem_role" class="admin-select"><option>Player</option><option>Leader</option><option>Sub</option><option>Coach</option></select></div>
    </div>
    <button class="admin-cancel-btn" style="margin-bottom:.8rem;width:100%;" onclick="addMember(${e.id})">+ ADD MEMBER</button>` : '';

  document.getElementById('logFormContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1rem;">
      <div class="admin-modal-icon">${isEdit?'✎':'+'}</div>
      <div class="admin-modal-title">${isEdit?'EDIT':'ADD'} ORG</div>
    </div>
    <div class="admin-form-grid-2">
      <div class="admin-field"><label class="admin-label">TAG (ex: VVS)</label><input id="of_tag" class="admin-input" value="${e.tag||''}" maxlength="5" ${isEdit?'readonly style="opacity:.5"':''}></div>
      <div class="admin-field"><label class="admin-label">NAME</label><input id="of_name" class="admin-input" value="${e.name||''}"></div>
      <div class="admin-field"><label class="admin-label">STATUS</label><select id="of_status" class="admin-select"><option value="active" ${e.status!=='inactive'?'selected':''}>ACTIVE</option><option value="inactive" ${e.status==='inactive'?'selected':''}>INACTIVE</option></select></div>
      <div class="admin-field"><label class="admin-label">REGION</label><select id="of_region" class="admin-select"><option ${!e.region||e.region==='NA'?'selected':''}>NA</option><option ${e.region==='EU'?'selected':''}>EU</option><option ${e.region==='ASIA'?'selected':''}>ASIA</option><option ${e.region==='OCE'?'selected':''}>OCE</option><option ${e.region==='SA'?'selected':''}>SA</option></select></div>
      <div class="admin-field"><label class="admin-label">FOUNDED</label><input id="of_founded" class="admin-input" value="${e.founded||'S1'}" placeholder="Season 1, S2..."></div>
      <div class="admin-field"><label class="admin-label">ICON (emoji)</label><input id="of_icon" class="admin-input" value="${e.icon||''}" placeholder="⚡ 🔥 🐉..."></div>
      <div class="admin-field" style="grid-column:span 2;"><label class="admin-label">MVP</label><input id="of_mvp" class="admin-input" value="${e.mvp||''}" placeholder="Nome do player"></div>
    </div>
    ${membersHtml}
    <div class="admin-modal-actions">
      <button class="admin-submit-btn" onclick="saveOrgForm(${e.id||'null'})">SAVE</button>
      <button class="admin-cancel-btn" onclick="closeLogForm()">CANCEL</button>
    </div>`;
  document.getElementById('logFormModal').classList.add('open');
}

async function saveOrgForm(id) {
  const body = { tag:g('of_tag'), name:g('of_name'), status:g('of_status'), region:g('of_region'), founded:g('of_founded'), icon:g('of_icon'), mvp:g('of_mvp') };
  if (!body.tag || !body.name) return;
  id ? await apiPut('/orgs/'+id, body) : await apiPost('/orgs', body);
  closeLogForm();
  await loadOrgs();
}

async function addMember(orgId) {
  const name = g('of_mem_name').trim();
  if (!name) return;
  await apiPost('/orgs/'+orgId+'/members', { name, role: g('of_mem_role') });
  await loadOrgs();
  const fresh = orgsData.find(o => o.id === orgId);
  if (fresh) openOrgForm(fresh);
}

async function deleteMember(memberId, orgId) {
  await apiDelete('/org-members/'+memberId);
  await loadOrgs();
  const fresh = orgsData.find(o => o.id === orgId);
  if (fresh) openOrgForm(fresh);
}

// ============================================================
// PLAYER FORM (Admin)
// ============================================================
function openPlayerForm(existing) {
  const e = existing || {}, isEdit = !!e.id;
  document.getElementById('logFormContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1rem;">
      <div class="admin-modal-icon">${isEdit?'✎':'+'}</div>
      <div class="admin-modal-title">${isEdit?'EDIT':'ADD'} PLAYER</div>
    </div>
    <div class="admin-form-grid-2">
      <div class="admin-field"><label class="admin-label">NAME</label><input id="pf_name" class="admin-input" value="${e.name||''}"></div>
      <div class="admin-field"><label class="admin-label">ORG TAG</label><input id="pf_org" class="admin-input" value="${e.org||''}" placeholder="VVS, NXS..."></div>
      <div class="admin-field"><label class="admin-label">ELO</label><input id="pf_elo" type="number" class="admin-input" value="${e.elo||1000}"></div>
      <div class="admin-field"><label class="admin-label">WINS</label><input id="pf_wins" type="number" min="0" class="admin-input" value="${e.wins||0}"></div>
      <div class="admin-field" style="grid-column:span 2;"><label class="admin-label">LOSSES</label><input id="pf_losses" type="number" min="0" class="admin-input" value="${e.losses||0}"></div>
    </div>
    <div class="admin-modal-actions">
      <button class="admin-submit-btn" onclick="savePlayerForm(${e.id||'null'})">SAVE</button>
      <button class="admin-cancel-btn" onclick="closeLogForm()">CANCEL</button>
    </div>`;
  document.getElementById('logFormModal').classList.add('open');
}

async function savePlayerForm(id) {
  const body = { name:g('pf_name'), org:g('pf_org'), elo:parseInt(g('pf_elo'))||1000, wins:parseInt(g('pf_wins'))||0, losses:parseInt(g('pf_losses'))||0 };
  if (!body.name) return;
  id ? await apiPut('/players/'+id, body) : await apiPost('/players', body);
  closeLogForm();
  await loadLeaderboard();
}

// ============================================================
// AWARDS
// ============================================================
async function loadAwards() {
  const loadEl=document.getElementById('awardsLoading'), emptyEl=document.getElementById('awardsEmpty'), grid=document.getElementById('awardsGrid');
  loadEl.style.display=''; emptyEl.style.display='none'; grid.innerHTML='';
  const [seasons, data] = await Promise.all([apiGet('/awards/seasons'), apiGet('/awards'+(awardsSeasonSel?'?season='+encodeURIComponent(awardsSeasonSel):''))]);
  buildAwardsSeasonTabs(Array.isArray(seasons)?seasons:[]);
  loadEl.style.display='none';
  if (!data.length) { emptyEl.style.display=''; refreshAdminButtons(); return; }
  grid.innerHTML = data.map(a => {
    const photoEl = a.photo_url
      ? `<img class="award-photo" src="${a.photo_url}" alt="${a.recipient_name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="award-photo-placeholder" style="display:none;">👤</div>`
      : `<div class="award-photo-placeholder">👤</div>`;
    const adminBtns = isAdmin ? `<div class="award-admin-btns"><button class="tbl-btn" onclick="openAwardForm(${JSON.stringify(a).replace(/"/g,'&quot;')})">✎ EDIT</button><button class="tbl-btn del" onclick="confirmDelete('award',${a.id})">✕</button></div>` : '';
    return `
      <div class="award-card">
        <div class="award-card-top">${photoEl}<div class="award-season-tag">${a.season}</div></div>
        <div class="award-card-body">
          <div class="award-title-badge">${a.award_title}</div>
          <div class="award-name">${a.recipient_name}</div>
          <div class="award-org">${a.recipient_org?'['+a.recipient_org+']':''}</div>
          ${a.award_description?`<div class="award-desc">${a.award_description}</div>`:''}
          ${adminBtns}
        </div>
      </div>`;
  }).join('');
  refreshAdminButtons();
}

function buildAwardsSeasonTabs(seasons) {
  const wrap = document.getElementById('awardsSeasonTabs');
  const all = ['ALL', ...seasons];
  wrap.innerHTML = all.map((s,i) =>
    `<button class="rtab ${(!awardsSeasonSel&&i===0)||(awardsSeasonSel===s)?'active':''}" onclick="setAwardsSeason(this,'${s==='ALL'?'':s}')">${s}</button>`
  ).join('');
}

function setAwardsSeason(btn, s) {
  awardsSeasonSel = s || null;
  document.querySelectorAll('#awardsSeasonTabs .rtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadAwards();
}

// ============================================================
// AWARD FORM (Admin)
// ============================================================
function openAwardForm(existing) {
  const e = existing || {}, isEdit = !!e.id;
  const AWARD_PRESETS = ['Champion','MVP','Top Fragger','Best Support','Most Improved','Best Org','Fair Play'];
  document.getElementById('awardFormContent').innerHTML = `
    <div class="admin-modal-header" style="margin-bottom:1rem;">
      <div class="admin-modal-icon">${isEdit?'✎':'🏆'}</div>
      <div class="admin-modal-title">${isEdit?'EDIT':'ADD'} AWARD</div>
    </div>
    <div class="admin-form-grid-2">
      <div class="admin-field"><label class="admin-label">SEASON</label><input id="af_season" class="admin-input" value="${e.season||'S3'}" placeholder="S1, S2, S3..."></div>
      <div class="admin-field"><label class="admin-label">AWARD TITLE</label>
        <select id="af_title_sel" class="admin-select" onchange="if(this.value==='custom'){document.getElementById('af_title').style.display='';document.getElementById('af_title').focus();}else{document.getElementById('af_title').style.display='none';document.getElementById('af_title').value=this.value;}">
          ${AWARD_PRESETS.map(t=>`<option value="${t}" ${e.award_title===t?'selected':''}>${t}</option>`).join('')}
          <option value="custom" ${!AWARD_PRESETS.includes(e.award_title)?'selected':''}>Custom...</option>
        </select>
        <input id="af_title" class="admin-input" style="margin-top:.4rem;${AWARD_PRESETS.includes(e.award_title)||!e.award_title?'display:none;':''}" value="${!AWARD_PRESETS.includes(e.award_title)?e.award_title||'':''}" placeholder="Custom title">
      </div>
      <div class="admin-field"><label class="admin-label">RECIPIENT NAME</label><input id="af_name" class="admin-input" value="${e.recipient_name||''}"></div>
      <div class="admin-field"><label class="admin-label">ORG TAG</label><input id="af_org" class="admin-input" value="${e.recipient_org||''}" placeholder="VVS, NXS..."></div>
    </div>
    <div class="admin-field" style="margin-bottom:.7rem;"><label class="admin-label">DESCRIPTION</label><textarea id="af_desc" class="admin-textarea" placeholder="What they won / why...">${e.award_description||''}</textarea></div>
    <div class="admin-field" style="margin-bottom:1rem;"><label class="admin-label">PHOTO URL</label><input id="af_photo" class="admin-input" value="${e.photo_url||''}" placeholder="https://cdn.discordapp.com/..."></div>
    <div class="admin-modal-actions"><button class="admin-submit-btn" onclick="saveAwardForm(${e.id||'null'})">SAVE</button><button class="admin-cancel-btn" onclick="closeAwardForm()">CANCEL</button></div>`;
  if (!AWARD_PRESETS.includes(e.award_title) && e.award_title) {
    document.getElementById('af_title_sel').value = 'custom';
    document.getElementById('af_title').style.display = '';
    document.getElementById('af_title').value = e.award_title;
  }
  document.getElementById('awardFormModal').classList.add('open');
}

async function saveAwardForm(id) {
  const selVal = document.getElementById('af_title_sel').value;
  const title  = selVal === 'custom' ? g('af_title') : selVal;
  const body = { season:g('af_season'), recipient_name:g('af_name'), recipient_org:g('af_org'), award_title:title, award_description:g('af_desc'), photo_url:g('af_photo') };
  id ? await apiPut('/awards/'+id, body) : await apiPost('/awards', body);
  closeAwardForm(); loadAwards();
}

function closeAwardForm()  { document.getElementById('awardFormModal').classList.remove('open'); }
function maybeCloseAwardModal(e) { if (e.target===document.getElementById('awardFormModal')) closeAwardForm(); }

// ============================================================
// RULES
// ============================================================
let _rulesPage = null;

async function loadRules(page) {
  const contentEl = document.getElementById(page === 'home' ? 'homeRulesContent' : 'logsRulesContent');
  const editBtn   = document.getElementById(page === 'home' ? 'editHomeRulesBtn' : 'editLogsRulesBtn');
  if (!contentEl) return;
  contentEl.innerHTML = '<div class="loading-state">LOADING...</div>';
  const data = await apiGet('/rules/' + page);
  if (data.content && data.content.trim()) {
    contentEl.className = 'rules-display';
    contentEl.textContent = data.content;
  } else {
    contentEl.className = 'rules-display empty';
    contentEl.textContent = isAdmin ? 'Nenhuma regra cadastrada. Clique em EDIT RULES para adicionar.' : 'NENHUMA REGRA CADASTRADA.';
  }
  if (editBtn) editBtn.style.display = isAdmin ? '' : 'none';
}

function openRulesEditor(page) {
  _rulesPage = page;
  const contentEl = document.getElementById(page === 'home' ? 'homeRulesContent' : 'logsRulesContent');
  const current = (contentEl && !contentEl.classList.contains('empty')) ? contentEl.textContent : '';
  document.getElementById('rulesModalTitle').textContent = page === 'home' ? 'EDIT LEAGUE RULES' : 'EDIT LOG RULES';
  document.getElementById('rulesTextarea').value = current;
  document.getElementById('rulesEditorModal').classList.add('open');
  setTimeout(() => document.getElementById('rulesTextarea').focus(), 80);
}

async function saveRules() {
  const content = document.getElementById('rulesTextarea').value;
  await apiPut('/rules/' + _rulesPage, { content });
  closeRulesEditor();
  loadRules(_rulesPage);
}

function closeRulesEditor() {
  document.getElementById('rulesEditorModal').classList.remove('open');
  _rulesPage = null;
}
function maybeCloseRulesModal(e) { if (e.target === document.getElementById('rulesEditorModal')) closeRulesEditor(); }

// ============================================================
// CONFIRM DELETE
// ============================================================
function confirmDelete(type, id) {
  _deleteCtx = { type, id };
  document.getElementById('confirmMsg').textContent = `Delete this ${type} entry permanently? This cannot be undone.`;
  document.getElementById('confirmModal').classList.add('open');
}

async function confirmDeleteYes() {
  if (!_deleteCtx) return;
  const { type, id } = _deleteCtx;
  const pathMap = { war:'/logs/war/', season:'/logs/season/', wager:'/logs/wager/', award:'/awards/', org:'/orgs/', player:'/players/' };
  await apiDelete(pathMap[type]+id);
  closeConfirmModal();
  if (type==='war')    { loadWarLogs(); loadOrgs(); }
  if (type==='season') { loadSeasonLogs(); loadOrgs(); }
  if (type==='wager')  loadWagerRecords();
  if (type==='award')  loadAwards();
  if (type==='org')    loadOrgs();
  if (type==='player') loadLeaderboard();
}

function closeConfirmModal() { document.getElementById('confirmModal').classList.remove('open'); _deleteCtx=null; }

// ============================================================
// INIT
// ============================================================
(async function init() {
  initCountdown();
  renderSchedule();

  await verifyStoredToken();
  await Promise.all([loadOrgs(), loadLeaderboard(), loadBracketsFromAPI()]);
})();
