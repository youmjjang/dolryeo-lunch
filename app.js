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
    save();$('result').textContent=`${list[winner].emoji} 오늘 점심은 ${list[winner].name}! 맛있게 먹어요.`;
  }requestAnimationFrame(frame);
};
$('add-form').onsubmit=e=>{e.preventDefault();if(spinning)return;const name=$('menu-input').value.trim();if(!name)return;if(state.menus.some(m=>m.name===name)){$('input-message').textContent='이미 후보에 있는 메뉴예요.';return;}if(state.menus.length>=20){$('input-message').textContent='메뉴는 최대 20개까지 담을 수 있어요.';return;}state.menus.push({name,emoji:'🍽️',active:true});$('menu-input').value='';$('input-message').textContent='메뉴를 담았어요!';save();render();};
$('exclude-last').onchange=e=>{state.excludeLast=e.target.checked;save();render();};
$('reset').onclick=()=>{state.menus=fresh().menus;$('input-message').textContent='기본 메뉴로 돌아왔어요.';save();render();};
$('clear-history').onclick=()=>{state.history=[];$('result').textContent='';save();render();};
render();
