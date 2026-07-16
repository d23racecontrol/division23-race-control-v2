const KEY='d23_broadcast_state_v1';
const defaults={
  accent:'#e31b23',
  bug:{visible:true,league:'DIVISION 23 UNITED',race:'RACE CONTROL'},
  message:{visible:false,label:'RACE CONTROL',title:'Willkommen im Stream',text:'Division 23 United'},
  driver:{visible:false,position:'P1',name:'Ashes_-2-_Glory',detail:'Division 23 eSport'},
  ticker:{visible:false,tag:'D23 NEWS',text:'Willkommen bei Division 23 United.'}
};
const $=id=>document.getElementById(id);
function load(){
  try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}
  catch{return structuredClone(defaults)}
}
function apply(){
  const s=load();
  document.documentElement.style.setProperty('--accent',s.accent||defaults.accent);
  $('bug').classList.toggle('hidden',!s.bug?.visible);
  $('leagueName').textContent=s.bug?.league||defaults.bug.league;
  $('raceInfo').textContent=s.bug?.race||defaults.bug.race;
  $('lowerThird').classList.toggle('hidden',!s.message?.visible);
  $('messageLabel').textContent=s.message?.label||'RACE CONTROL';
  $('messageTitle').textContent=s.message?.title||'';
  $('messageText').textContent=s.message?.text||'';
  $('driverCard').classList.toggle('hidden',!s.driver?.visible);
  $('driverPosition').textContent=s.driver?.position||'';
  $('driverName').textContent=s.driver?.name||'';
  $('driverDetail').textContent=s.driver?.detail||'';
  $('ticker').classList.toggle('hidden',!s.ticker?.visible);
  $('tickerTag').textContent=s.ticker?.tag||'D23 NEWS';
  $('tickerText').textContent=s.ticker?.text||'';
}
window.addEventListener('storage',apply);
window.addEventListener('d23-broadcast-update',apply);
setInterval(apply,500);
apply();
