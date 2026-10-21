const defaults = [
  ['김치찌개','🥘'],['돈까스','🍛'],['비빔밥','🥗'],['쌀국수','🍜'],
  ['햄버거','🍔'],['초밥','🍣'],['짜장면','🥢'],['샌드위치','🥪']
];
const key = 'dolryeo-lunch-v1';
const fresh = () => ({menus:defaults.map(([name,emoji])=>({name,emoji,active:true})),history:[],excludeLast:false});
let state=fresh();
try {
  const saved=JSON.parse(localStorage.getItem(key));
  if(saved && Array.isArray(saved.menus) && saved.menus.length<=20 && saved.menus.every(m=>typeof m.name==='string' && m.name.length<=18 && typeof m.emoji==='string' && typeof m.active==='boolean') && Array.isArray(saved.history)) {
    state={menus:saved.menus,history:saved.history.filter(h=>typeof h.name==='string' && Number.isFinite(h.time)).slice(0,6),excludeLast:!!saved.excludeLast};
  }
} catch {}
const $=id=>document.getElementById(id);
const canvas=$('wheel'),ctx=canvas.getContext('2d');
const colors=['#e9bc66','#e7e9d2','#f48760','#c2d2ab','#f3d99d','#92b89f','#f3b59d','#d8dfc3'];
let angle=0,spinning=false;
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{$('wheel-note').textContent='브라우저 저장 공간을 사용할 수 없어 이번 기록은 저장되지 않아요.';}}
function candidates(){return state.menus.filter(m=>m.active && !(state.excludeLast && state.history[0]?.name===m.name));}
function draw(list=candidates()){
  const n=list.length;
  ctx.clearRect(0,0,700,700);ctx.save();ctx.translate(350,350);ctx.rotate(angle);
  if(!n){ctx.fillStyle='#e2e6d8';ctx.beginPath();ctx.arc(0,0,350,0,Math.PI*2);ctx.fill();}
  list.forEach((m,i)=>{
    const a=i*Math.PI*2/n-Math.PI/2,b=(i+1)*Math.PI*2/n-Math.PI/2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,350,a,b);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();ctx.strokeStyle='#fffdf780';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.rotate((a+b)/2);ctx.translate(225,0);ctx.rotate(Math.PI/2);ctx.textAlign='center';ctx.fillStyle='#233b31';ctx.font='42px sans-serif';ctx.fillText(m.emoji,0,-14);ctx.font='bold 23px sans-serif';const short=m.name.length>8?m.name.slice(0,7)+'…':m.name;ctx.fillText(short,0,25);ctx.restore();
  });ctx.restore();
  canvas.setAttribute('aria-label',n?'추첨 후보: '+list.map(m=>m.name).join(', '):'선택된 메뉴가 없습니다');
}
function render(){
  $('menus').replaceChildren();
  state.menus.forEach((m)=>{
    const button=document.createElement('button');button.className='menu-chip'+(m.active?' active':'');button.type='button';button.disabled=spinning;button.setAttribute('aria-pressed',String(m.active));
    const emoji=document.createElement('span');emoji.textContent=m.emoji;const name=document.createElement('span');name.className='name';name.textContent=m.name;const check=document.createElement('span');check.className='check';check.textContent=m.active?'✓':'+';button.append(emoji,name,check);
    button.onclick=()=>{m.active=!m.active;save();render();};$('menus').append(button);
  });
  const n=candidates().length;$('count').textContent=String(n).padStart(2,'0');$('spin').disabled=spinning||n===0;
  $('exclude-last').checked=state.excludeLast;
  ['exclude-last','reset','menu-input','clear-history'].forEach(id=>$(id).disabled=spinning);
  $('add-form').querySelector('button').disabled=spinning;
  $('history').replaceChildren();
  state.history.forEach(h=>{const card=document.createElement('div');card.className='history-card';const title=document.createElement('b');title.textContent=h.name;const time=document.createElement('small');time.textContent=new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(h.time);card.append(title,time);$('history').append(card);});
  if(!state.history.length){const p=document.createElement('p');p.className='empty';p.textContent='아직 비어 있어요. 오늘의 첫 점심을 뽑아보세요!';$('history').append(p);}
  if(!n)$('wheel-note').textContent='후보가 없어요. 메뉴를 선택하거나 쉬어가기를 꺼주세요.';
  else if(!spinning)$('wheel-note').textContent='버튼을 누르면 맛있는 운명이 시작돼요.';
  draw();
}
// Rejection sampling avoids modulo bias when selecting an index.
function randomIndex(n){const a=new Uint32Array(1),limit=4294967296-(4294967296%n);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
$('spin').onclick=()=>{
  if(spinning)return;const list=candidates();if(!list.length)return;
  const winner=randomIndex(list.length),slice=2*Math.PI/list.length;
  const target=(2*Math.PI-(winner+.5)*slice)%(2*Math.PI);
  const start=angle,normalized=((start%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  const end=start+Math.PI*2*5+(target-normalized+Math.PI*2)%(Math.PI*2);
  spinning=true;$('result').textContent='';render();$('wheel-note').textContent='오늘의 맛있는 운명을 고르는 중…';
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:4200;
  let began;
  function frame(now){began??=now;const t=duration?Math.min(1,(now-began)/duration):1;angle=start+(end-start)*(1-Math.pow(1-t,4));draw();if(t<1){requestAnimationFrame(frame);return;}
    angle=target;state.history.unshift({name:list[winner].name,time:Date.now()});state.history=state.history.slice(0,6);spinning=false;
    // Keep the finished wheel intact until the next interaction, so the pointer matches the result.
    render();draw(list);
    $('count').textContent=String(candidates().length).padStart(2,'0');$('spin').disabled=candidates().length===0;
    save();afterLunchSpin(list[winner].name);$('result').textContent=`${list[winner].emoji} 오늘 점심은 ${list[winner].name}! 맛있게 먹어요.`;
  }requestAnimationFrame(frame);
};
$('add-form').onsubmit=e=>{e.preventDefault();if(spinning)return;const name=$('menu-input').value.trim();if(!name)return;if(state.menus.some(m=>m.name===name)){$('input-message').textContent='이미 후보에 있는 메뉴예요.';return;}if(state.menus.length>=20){$('input-message').textContent='메뉴는 최대 20개까지 담을 수 있어요.';return;}state.menus.push({name,emoji:'🍽️',active:true});$('menu-input').value='';$('input-message').textContent='메뉴를 담았어요!';save();render();};
$('exclude-last').onchange=e=>{state.excludeLast=e.target.checked;save();render();};
$('reset').onclick=()=>{state.menus=fresh().menus;$('input-message').textContent='기본 메뉴로 돌아왔어요.';save();render();};
$('clear-history').onclick=()=>{state.history=[];$('result').textContent='';save();render();};
render();


/* Real nearby food places: OpenStreetMap Overpass + optional external map search. */
const placeEls={status:$('place-status'),results:$('place-results'),label:$('place-location-label')};
let placeLocation=null,placeMenu='',placeRequest=0;
const foodWords={
'김치찌개':['김치찌개','한식','korean','kimchi','찌개'],
'돈까스':['돈까스','돈카츠','돈가스','일식','japanese','tonkatsu','katsu'],
'비빔밥':['비빔밥','한식','korean','bibimbap'],
'쌀국수':['쌀국수','베트남','vietnamese','pho'],
'햄버거':['햄버거','버거','burger','american','fast_food'],
'초밥':['초밥','스시','sushi','japanese'],
'짜장면':['짜장면','중식','중국집','chinese','jjajang'],
'샌드위치':['샌드위치','sandwich','deli','cafe']
};
function placeTerms(menu){return [...new Set([menu,...(foodWords[menu]||[])].map(s=>s.toLowerCase()))];}
function osmLocation(item){return item.center||item;}
function placeDistance(lat1,lon1,lat2,lon2){const r=Math.PI/180,a=Math.sin((lat2-lat1)*r/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin((lon2-lon1)*r/2)**2;return Math.round(12742000*Math.asin(Math.sqrt(a)));}
function setPlaceStatus(msg){placeEls.status.textContent=msg;}
function linkOut(anchor,base,query){anchor.href=base+encodeURIComponent(query);}
function updatePlaceLinks(){
 const q=[placeLocation?.label||'',placeMenu||'점심 식당'].filter(Boolean).join(' ');
 linkOut($('kakao-find'),'https://map.kakao.com/?q=',q);
 linkOut($('naver-find'),'https://map.naver.com/p/search/',q);
}
function placeCard(element,distance){
 const t=element.tags||{},p=osmLocation(element),name=t['name:ko']||t.name||'이름 미등록 식당';
 const card=document.createElement('article');card.className='place-card';
 const h=document.createElement('h3');h.textContent=name;card.append(h);
 const info=document.createElement('p');info.textContent=[distance+'m',t.cuisine?.replaceAll(';',', '),t['addr:street']||t['addr:full']||''].filter(Boolean).join(' · ');card.append(info);
 if(t.opening_hours){const hours=document.createElement('p');hours.textContent='등록 영업시간: '+t.opening_hours;card.append(hours);}
 const map=document.createElement('a');map.target='_blank';map.rel='noopener noreferrer';map.href='https://www.openstreetmap.org/?mlat='+p.lat+'&mlon='+p.lon+'#map=18/'+p.lat+'/'+p.lon;map.textContent='지도 보기 ↗';card.append(map);
 const kakao=document.createElement('a');kakao.target='_blank';kakao.rel='noopener noreferrer';linkOut(kakao,'https://map.kakao.com/?q=',name+' '+(placeLocation?.label||''));kakao.textContent='카카오맵 확인 ↗';card.append(kakao);
 return card;
}
async function lookupPlaces(){
 if(!placeLocation||!placeMenu)return;
 const current=++placeRequest;const rad=Number($('place-radius').value);
 placeEls.results.replaceChildren();setPlaceStatus('주변 식당을 검색하는 중이에요…');
 const {lat,lon}=placeLocation;
 const query='[out:json][timeout:20];(nwr["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:'+rad+','+lat+','+lon+'););out center 150;';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query}),signal:controller.signal});
  if(!response.ok)throw Error('식당 데이터 서버 응답 오류');
  const data=await response.json();if(current!==placeRequest)return;
  const terms=placeTerms(placeMenu);
  const candidates=(data.elements||[]).filter(e=>e.tags && osmLocation(e).lat!=null && (e.tags.name||e.tags['name:ko']));
  const ranked=candidates.map(e=>{
   const t=e.tags,detail=[t.name,t['name:ko'],t.cuisine,t.description,t['name:en']].filter(Boolean).join(' ').toLowerCase();
   const exact=detail.includes(placeMenu.toLowerCase());
   const matched=terms.some(term=>detail.includes(term));
   const distance=placeDistance(lat,lon,osmLocation(e).lat,osmLocation(e).lon);
   return {e,distance,rank:exact?2:matched?1:0};
  }).filter(x=>x.rank>0).sort((a,b)=>b.rank-a.rank||a.distance-b.distance);
  if(!ranked.length){setPlaceStatus('이 지역에서 "'+placeMenu+'" 관련 식당을 찾지 못했어요. 지도 검색 버튼으로 더 찾아보세요.');return;}
  ranked.slice(0,12).forEach(({e,distance})=>placeEls.results.append(placeCard(e,distance)));
  setPlaceStatus('"'+placeMenu+'" 관련 식당 '+ranked.length+'곳을 찾았어요. 상위 12곳을 보여줘요. (실시간 영업 여부는 확인되지 않음)');
 }catch(err){if(current!==placeRequest)return;setPlaceStatus('무료 식당 검색 서버에 연결하지 못했어요. 아래 카카오맵·네이버지도 검색 링크를 이용해 주세요.');}
 finally{clearTimeout(timeout);}
}
function setChosenPlace(label,lat,lon){placeLocation={label,lat,lon};placeEls.label.textContent='기준 위치: '+label;updatePlaceLinks();if(placeMenu)lookupPlaces();else setPlaceStatus('위치가 설정됐어요. 룰렛을 돌려 메뉴를 뽑아보세요.');}
$('locate-me').addEventListener('click',()=>{
 if(!navigator.geolocation){setPlaceStatus('이 브라우저에서는 위치 확인을 지원하지 않아요. 지역을 직접 입력해 주세요.');return;}
 const btn=$('locate-me');btn.disabled=true;setPlaceStatus('위치 사용 권한을 확인하고 있어요…');
 navigator.geolocation.getCurrentPosition(pos=>{btn.disabled=false;setChosenPlace('현재 위치',pos.coords.latitude,pos.coords.longitude);},()=>{btn.disabled=false;setPlaceStatus('위치를 확인하지 못했어요. HTTPS 접속·위치 권한을 확인하거나 지역을 직접 입력해 주세요.');},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
$('location-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const field=$('location-input'),name=field.value.trim();if(!name)return;
 const button=ev.currentTarget.querySelector('button');button.disabled=true;setPlaceStatus('입력한 지역을 찾는 중이에요…');
 try{
  const u=new URL('https://nominatim.openstreetmap.org/search');u.searchParams.set('q',name);u.searchParams.set('format','json');u.searchParams.set('limit','1');u.searchParams.set('accept-language','ko');
  const r=await fetch(u,{headers:{'Accept':'application/json'}});if(!r.ok)throw Error('지역 검색 오류');
  const data=await r.json();if(!data.length){setPlaceStatus('지역을 찾지 못했어요. 주소나 역 이름을 조금 더 정확하게 입력해 주세요.');return;}
  setChosenPlace(name,Number(data[0].lat),Number(data[0].lon));
 }catch{setPlaceStatus('지역 검색이 원활하지 않아요. 잠시 후 다시 시도하거나 내 위치 버튼을 이용해 주세요.');}
 finally{button.disabled=false;}
});
$('place-radius').addEventListener('change',lookupPlaces);
function afterLunchSpin(menu){placeMenu=menu;updatePlaceLinks();if(placeLocation)lookupPlaces();else setPlaceStatus('"'+menu+'" 당첨! 내 위치 또는 지역을 설정하면 실제 식당을 찾아드려요.');}
updatePlaceLinks();
