const KEY='d23_broadcast_state_v1';
const defaults={
  accent:'#e31b23',
  bug:{visible:true,league:'DIVISION 23 UNITED',race:'RACE CONTROL'},
  message:{visible:false,label:'RACE CONTROL',title:'Willkommen im Stream',text:'Division 23 United'},
  driver:{visible:false,position:'P1',name:'Ashes_-2-_Glory',detail:'Division 23 eSport'},
  ticker:{visible:false,tag:'D23 NEWS',text:'Willkommen bei Division 23 United.'}
};
const $=id=>document.getElementById(id);
let timer;
function state(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(defaults)}}
function save(s){
  localStorage.setItem(KEY,JSON.stringify(s));
  window.dispatchEvent(new Event('d23-broadcast-update'));
  $('connectionState').textContent='GESENDET';
  setTimeout(()=>$('connectionState').textContent='BEREIT',700);
}
function hideAll(s){
  s.message={...s.message,visible:false};
  s.driver={...s.driver,visible:false};
  s.ticker={...s.ticker,visible:false};
}
function act(name){
  const s=state();
  if(name==='updateBug'){
    s.accent=$('accentInput').value;
    s.bug={visible:true,league:$('leagueInput').value.trim(),race:$('raceInput').value.trim()};
  }
  if(name==='toggleBug')s.bug={...s.bug,visible:!s.bug.visible};
  if(name==='showMessage'){
    s.message={visible:true,label:$('messageLabelInput').value,title:$('messageTitleInput').value.trim(),text:$('messageTextInput').value.trim()};
    s.driver={...s.driver,visible:false};
    clearTimeout(timer);
    const ms=Number($('durationInput').value);
    if(ms)timer=setTimeout(()=>{const x=state();x.message.visible=false;save(x)},ms);
  }
  if(name==='hideMessage')s.message={...s.message,visible:false};
  if(name==='showDriver'){
    s.driver={visible:true,position:$('driverPositionInput').value.trim(),name:$('driverNameInput').value.trim(),detail:$('driverDetailInput').value.trim()};
    s.message={...s.message,visible:false};
  }
  if(name==='hideDriver')s.driver={...s.driver,visible:false};
  if(name==='showTicker')s.ticker={visible:true,tag:$('tickerTagInput').value.trim(),text:$('tickerTextInput').value.trim()};
  if(name==='hideTicker')s.ticker={...s.ticker,visible:false};
  if(name==='hideAll')hideAll(s);
  save(s);
}
function preset(type){
  const map={
    fastest:['FASTEST LAP','Neue schnellste Runde','Fahrer und Rundenzeit eintragen'],
    investigation:['RACE CONTROL','Vorfall wird untersucht','Weitere Informationen folgen'],
    result:['RESULT','Offizielles Rennergebnis','Ergebnis folgt in Kürze'],
    next:['NEXT RACE','Das nächste Rennen','Termin und Strecke eintragen']
  };
  const [label,title,text]=map[type];
  $('messageLabelInput').value=label;
  $('messageTitleInput').value=title;
  $('messageTextInput').value=text;
  act('showMessage');
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-action]');
  const p=e.target.closest('[data-preset]');
  if(a)act(a.dataset.action);
  if(p)preset(p.dataset.preset);
});
