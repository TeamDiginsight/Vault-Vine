/* =====================================================================
   Vault & Vine — app logic
   Data lives in Supabase; Row Level Security limits every query to the
   signed-in user's own rows. Nothing personal is stored in the browser
   except Supabase's own session token and UI preferences (theme, tab).
   ===================================================================== */
"use strict";

/* ---------------- Reference data ---------------- */
const OZ = 31.1034768; // grams per troy ounce
const UNITS = { g:{label:"Grams (g)",g:1}, kg:{label:"Kilograms (kg)",g:1000}, tola:{label:"Tola (11.66 g)",g:11.6638}, sov:{label:"Sovereign / Pavan (8 g)",g:8}, ozt:{label:"Troy ounce (31.1 g)",g:OZ} };
const METALS = {
  gold:     {label:"Gold",      sym:"XAU", c:"--gold",   purities:{"24K":1,"22K":0.916,"18K":0.75,"14K":0.585}, show:["24K","22K","18K"]},
  silver:   {label:"Silver",    sym:"XAG", c:"--silver", purities:{"999 fine":1,"925 sterling":0.925,"800":0.8},  show:["999 fine"]},
  platinum: {label:"Platinum",  sym:"XPT", c:"--plat",   purities:{"999":1,"950":0.95}, show:["999"]},
  palladium:{label:"Palladium", sym:"XPD", c:"--c7",     purities:{"999":1,"950":0.95}, show:["999"]}
};
const TYPES = {
  Stock:{label:"Stocks",c:"--c1",liq:"Liquid in days"},
  SIP:{label:"SIP / Funds / Retirement",c:"--c2",liq:"Locked / long-term"},
  SB:{label:"Savings & PF",c:"--c3",liq:"Cash now"},
  FD:{label:"Fixed deposits",c:"--c4",liq:"Liquid in weeks"},
  Gold:{label:"Gold",c:"--gold",liq:"Liquid in weeks",metal:"gold"},
  Silver:{label:"Silver",c:"--silver",liq:"Liquid in weeks",metal:"silver"},
  Metal:{label:"Other metals",c:"--plat",liq:"Liquid in weeks",metal:"platinum"},
  Equity:{label:"Property & land",c:"--c5",liq:"Illiquid"}
};
const isMetalType = t => !!TYPES[t]?.metal;
const LIQ = [["Cash now","--c3"],["Liquid in days","--c1"],["Liquid in weeks","--c4"],["Locked / long-term","--c2"],["Illiquid","--c5"]];
const RATE_KEYS = ["fx","gold","silver","platinum","palladium"];
const PRESETS = {
  fx: {
    erapi:      {label:"open.er-api.com — free, no key", url:"https://open.er-api.com/v6/latest/USD", path:"rates.INR", headerName:"", headerValue:""},
    frankfurter:{label:"frankfurter.app — free, no key", url:"https://api.frankfurter.app/latest?from=USD&to=INR", path:"rates.INR", headerName:"", headerValue:""},
    custom:     {label:"Custom"}
  },
  metal: {
    goldapicom: {label:"gold-api.com — free, no key (spot, USD/oz)", url:"https://api.gold-api.com/price/{SYM}", path:"price", unit:"ozt", ccy:"USD", quoted:"pure", headerName:"", headerValue:""},
    goldapiio:  {label:"GoldAPI.io — free key, INR per gram", url:"https://www.goldapi.io/api/{SYM}/INR", path:"price_gram_24k", unit:"g", ccy:"INR", quoted:"pure", headerName:"x-access-token", headerValue:""},
    goldapiio22:{label:"GoldAPI.io — 22K INR per gram (gold only)", url:"https://www.goldapi.io/api/XAU/INR", path:"price_gram_22k", unit:"g", ccy:"INR", quoted:"22K", headerName:"x-access-token", headerValue:""},
    custom:     {label:"Custom"}
  }
};
function defaultRates(){
  // starting values (7 Oct 2026) — replaced by live prices on first refresh
  const mk=usdOz=>({mode:"auto",preset:"goldapicom",url:"https://api.gold-api.com/price/{SYM}",path:"price",unit:"ozt",ccy:"USD",quoted:"pure",headerName:"",headerValue:"",premium:0,usd_g:usdOz/OZ,updated:null,status:""});
  return {
    fx:{mode:"auto",preset:"erapi",url:"https://open.er-api.com/v6/latest/USD",path:"rates.INR",headerName:"",headerValue:"",premium:0,value:96.38,updated:null,status:""},
    metals:{gold:mk(4117.70),silver:mk(60.13),platinum:mk(1600),palladium:mk(1200)}
  };
}

/* ---------------- Supabase ---------------- */
const CFG = window.VV_CONFIG || {};
let sb = null;
try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:"pkce" } }); }
catch(e){ console.error(e); }

/* ---------------- State ---------------- */
// In-memory copy of the signed-in user's data (never written to localStorage)
let S = null;
function emptyState(user){
  const r=defaultRates();
  return { user, profile:{display_name:"",display_currency:"USD",metal_currency:"INR",owners:["Self","Spouse","Joint","Kids","Family"]},
           items:[], stocks:[], snapshots:[], fx:r.fx.value, rates:{fx:r.fx, metals:r.metals} };
}
const R=()=>S.rates;
Object.defineProperty(window,"DISPLAY",{get:()=>S.profile.display_currency});

/* ---------------- Small helpers ---------------- */
const $=s=>document.querySelector(s);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=x=>isFinite(x)?(x*100).toFixed(1)+"%":"—";
const gfmt=g=>g>=1000?(g/1000).toLocaleString("en-US",{maximumFractionDigits:2})+" kg":g.toLocaleString("en-US",{maximumFractionDigits:2})+" g";
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),2600);}
let savingN=0; function saving(on){savingN+=on?1:-1;$("#saving").classList.toggle("show",savingN>0);}
const LOGO=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c0-5 1-9.5 6.5-13"/><path d="M12 15.5c-1.8-2.7-4.6-3.6-7.5-3.4.1 3.4 2.9 5.4 7.5 3.4z"/><path d="M15.2 10.6c.4-2.3 2-3.9 4.3-4.4"/></svg>`;
document.querySelectorAll("[data-logo]").forEach(e=>e.innerHTML=LOGO);

/* run a Supabase request; toast + throw on error */
async function q(builder, what="save"){
  saving(true);
  try{
    const {data,error}=await builder;
    if(error){ console.error(error); toast(`Couldn't ${what}: ${error.message}`); throw error; }
    return data;
  } finally { saving(false); }
}

/* ---------------- Valuation ---------------- */
const metalUsdPerGramPure=m=>{const r=R().metals[m];return r? r.usd_g*(1+(+r.premium||0)/100):0;};
const grams=i=>(+i.qty||0)*(UNITS[i.unit]?.g||1);
const fineGrams=i=>grams(i)*(METALS[i.metal]?.purities[i.purity]??1);
const hasWeight=i=>isMetalType(i.type)&&+i.qty>0;
const costUSD=i=>(i.amount||0)/(i.currency==="INR"?S.fx:1);
const valueUSD=i=>hasWeight(i)? fineGrams(i)*metalUsdPerGramPure(i.metal) : costUSD(i);
const conv=usd=>DISPLAY==="INR"?usd*S.fx:usd;
function fmt(v,ccy=DISPLAY,compact=false,dec){
  return new Intl.NumberFormat(ccy==="INR"?"en-IN":"en-US",{style:"currency",currency:ccy,maximumFractionDigits:dec??(compact?1:0),minimumFractionDigits:dec??0,notation:compact?"compact":"standard"}).format(v);
}
const money=(usd,compact)=>fmt(conv(usd),DISPLAY,compact);
const metalPrice=(m,purity,ccy)=>metalUsdPerGramPure(m)*(METALS[m].purities[purity]??1)*(ccy==="INR"?S.fx:1);
const assets=()=>S.items.filter(i=>i.kind==="asset");
const liabs=()=>S.items.filter(i=>i.kind==="liability");
function totals(){
  const a=assets().reduce((s,i)=>s+valueUSD(i),0), l=liabs().reduce((s,i)=>s+costUSD(i),0);
  const by=k=>assets().reduce((m,i)=>(m[i[k]]=(m[i[k]]||0)+valueUSD(i),m),{});
  return {a,l,nw:a-l,byType:by("type"),byCcy:by("currency"),byOwner:by("owner")};
}
function owners(){ const set=[...S.profile.owners]; S.items.forEach(i=>{if(i.owner&&!set.includes(i.owner))set.push(i.owner)}); return set; }
function timeAgo(iso){ if(!iso) return "not yet"; const d=(Date.now()-new Date(iso))/1000; if(d<90) return "just now"; if(d<3600) return Math.round(d/60)+" min ago"; if(d<86400) return Math.round(d/3600)+" h ago"; return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }

/* ---------------- Row mapping (DB ⇄ app) ---------------- */
const num=v=>v==null?null:+v;
const rowToItem=r=>({id:r.id,kind:r.kind,entity:r.name,type:r.type,owner:r.owner,currency:r.currency,amount:num(r.amount),metal:r.metal,qty:num(r.qty),unit:r.unit,purity:r.purity});
function itemToRow(i){
  const m=isMetalType(i.type);
  return {kind:i.kind,name:String(i.entity).slice(0,120),type:i.type,owner:(i.owner||"Family").slice(0,40),currency:i.currency==="INR"?"INR":"USD",
    amount:i.amount==null||i.amount===""?null:+i.amount,
    metal:m?(i.metal||TYPES[i.type].metal):null, qty:m&&i.qty!=null&&i.qty!==""?+i.qty:null, unit:m?(i.unit||"g"):null, purity:m?(i.purity||null):null};
}
function rowToRate(r){
  return {mode:r.mode,preset:r.preset||"custom",url:r.url||"",path:r.path||"",unit:r.unit||"ozt",ccy:r.ccy||"USD",quoted:r.quoted||"pure",
    headerName:r.header_name||"",headerValue:r.header_value||"",premium:+r.premium||0,status:r.status||"",updated:r.fetched_at,value:num(r.value)};
}
function rateToRow(key){
  const c=key==="fx"?R().fx:R().metals[key];
  return {user_id:S.user.id,key,mode:c.mode,preset:c.preset,url:c.url,path:c.path,unit:key==="fx"?null:c.unit,ccy:key==="fx"?null:c.ccy,quoted:key==="fx"?null:c.quoted,
    header_name:c.headerName||null,header_value:c.headerValue||null,premium:+c.premium||0,
    value:key==="fx"?S.fx:c.usd_g,status:c.status||null,fetched_at:c.updated||null};
}
const rowToSnap=r=>({id:r.id,date:r.snap_date,assets_usd:+r.assets_usd,liabilities_usd:+r.liabilities_usd,nw_usd:+r.net_worth_usd,fx:num(r.fx),gold22_inr_g:num(r.gold22_inr_g)});

/* ---------------- Load everything for the user ---------------- */
const isMissingTable=e=>e&&(e.code==="42P01"||e.code==="PGRST205"||/does not exist|Could not find the table/i.test(e.message||""));
async function loadUserData(user){
  S=emptyState(user);
  let stData={data:[],error:null};
  const [p,h,r,s]=await Promise.all([
    sb.from("profiles").select("*").eq("id",user.id).maybeSingle(),
    sb.from("holdings").select("*").order("created_at",{ascending:true}),
    sb.from("rate_settings").select("*"),
    sb.from("snapshots").select("*").order("snap_date",{ascending:true})
  ]);
  try{ stData=await sb.from("stocks").select("*").order("buy_date",{ascending:false}); }catch(e){}
  const err=[p,h,r,s].map(x=>x.error).find(Boolean);
  if(err){ if(isMissingTable(err)) return "setup"; throw err; }
  // profile (created by trigger on sign-up; create here as a fallback)
  if(p.data) Object.assign(S.profile,{display_name:p.data.display_name||"",display_currency:p.data.display_currency,metal_currency:p.data.metal_currency,owners:p.data.owners?.length?p.data.owners:S.profile.owners});
  else { S.profile.display_name=user.user_metadata?.full_name||user.email?.split("@")[0]||""; await q(sb.from("profiles").insert({id:user.id,display_name:S.profile.display_name}),"create profile").catch(()=>{}); }
  S.items=(h.data||[]).map(rowToItem);
  S.stocks=(stData.data||[]);
  S.snapshots=(s.data||[]).map(rowToSnap);
  const have=new Set();
  (r.data||[]).forEach(row=>{
    have.add(row.key); const c=rowToRate(row);
    if(row.key==="fx"){ R().fx=c; if(c.value>0) S.fx=c.value; }
    else if(R().metals[row.key]){ c.usd_g=c.value>0?c.value:R().metals[row.key].usd_g; R().metals[row.key]=c; }
  });
  const missing=RATE_KEYS.filter(k=>!have.has(k));
  if(missing.length) await q(sb.from("rate_settings").upsert(missing.map(rateToRow),{onConflict:"user_id,key"}),"save rate settings").catch(()=>{});
  return "ok";
}

/* ---------------- Live rate fetching ---------------- */
const getPath=(o,p)=>String(p||"").split(".").filter(Boolean).reduce((x,k)=>x==null?x:x[k],o);
async function fetchJSON(url,hn,hv){
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),10000);
  try{ const headers={}; if(hn&&hv) headers[hn]=hv;
    const r=await fetch(url,{headers,signal:ctl.signal}); if(!r.ok) throw new Error("HTTP "+r.status); return await r.json();
  } finally{ clearTimeout(t); }
}
function errMsg(e){ return e.name==="AbortError"?"Timed out — kept last price":/Failed to fetch|NetworkError|Load failed/i.test(e.message)?"Couldn't reach API (offline or blocked) — kept last price":e.message+" — kept last price"; }
async function refreshFx(){
  const c=R().fx; if(c.mode!=="auto") return;
  try{ const v=+getPath(await fetchJSON(c.url,c.headerName,c.headerValue),c.path);
    if(!(v>0)) throw new Error(`No number at "${c.path}"`);
    S.fx=+v.toFixed(4); c.updated=new Date().toISOString(); c.status="";
  }catch(e){ c.status=errMsg(e); }
}
async function refreshMetal(k){
  const c=R().metals[k]; if(c.mode!=="auto") return;
  try{ let v=+getPath(await fetchJSON(c.url.replace("{SYM}",METALS[k].sym),c.headerName,c.headerValue),c.path);
    if(!(v>0)) throw new Error(`No number at "${c.path}"`);
    v=v/(UNITS[c.unit]?.g||1); if(c.ccy==="INR") v=v/S.fx; if(c.quoted!=="pure") v=v/(METALS[k].purities[c.quoted]||1);
    c.usd_g=v; c.updated=new Date().toISOString(); c.status="";
  }catch(e){ c.status=errMsg(e); }
}
const saveRates=keys=>q(sb.from("rate_settings").upsert(keys.map(rateToRow),{onConflict:"user_id,key"}),"save rates");
let refreshing=false;
async function refreshAll(manual){
  if(refreshing) return; refreshing=true; render();
  await refreshFx(); await Promise.all(Object.keys(METALS).map(refreshMetal));
  refreshing=false; render();
  await saveRates(RATE_KEYS).catch(()=>{});
  const errs=[R().fx,...Object.values(R().metals)].filter(c=>c.mode==="auto"&&c.status).length;
  if(manual) toast(errs?`Updated with ${errs} source error${errs>1?"s":""}`:"Prices updated");
}

/* ---------------- Navigation ---------------- */
const VIEWS=[
 ["dashboard","Dashboard",'<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>'],
 ["holdings","Holdings",'<path d="M3 7h18M3 12h18M3 17h18"/>'],
 ["stocks","Stocks",'<path d="M3 7h18M3 12h18M3 17h18"/><path d="M12 3v18"/>'],
 ["liabilities","Loans & Cards",'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'],
 ["history","History",'<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>'],
 ["settings","Settings",'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>']
];
let current="dashboard";
const navHTML=()=>VIEWS.map(([id,l,p])=>`<button class="nav${id===current?" active":""}" data-view="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>${l}</button>`).join("");
function go(v){
  current=v; lsSet("vv.view",v);
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id==="v-"+v));
  $("#navSide").innerHTML=navHTML(); $("#navMobile").innerHTML=navHTML();
  $("#pageTitle").textContent=VIEWS.find(x=>x[0]===v)[1];
  window.scrollTo(0,0); render();
}

/* ---------------- Charts ---------------- */
const charts={};
function mk(id,cfg){ if(charts[id]) charts[id].destroy(); charts[id]=new Chart(document.getElementById(id),cfg); }
function baseOpts(){ Chart.defaults.font.family="Inter, system-ui, sans-serif"; Chart.defaults.color=css("--muted"); Chart.defaults.borderColor=css("--border"); }
const tip=()=>({backgroundColor:css("--text"),titleColor:css("--bg"),bodyColor:css("--bg"),padding:10,cornerRadius:8,displayColors:false});
function donut(id,lgId,entries,total){
  mk(id,{type:"doughnut",data:{labels:entries.map(e=>e.label),datasets:[{data:entries.map(e=>conv(e.v)),backgroundColor:entries.map(e=>e.color),borderColor:css("--surface"),borderWidth:3,hoverOffset:6}]},
    options:{cutout:"68%",maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tip(),callbacks:{label:c=>`${fmt(c.raw)} · ${pct(c.raw/conv(total))}`}}}}});
  $("#"+lgId).innerHTML=entries.map(e=>`<div class="row"><span class="sw" style="background:${e.color}"></span><span class="nm">${esc(e.label)}</span><span class="num">${money(e.v,true)}</span><span class="pc num">${pct(e.v/total)}</span></div>`).join("");
}

/* ---------------- Renderers ---------------- */
function renderTicker(){
  $("#ticker").innerHTML=`<span>USD <b class="num">₹${S.fx.toFixed(2)}</b></span><span class="sep"></span>
    <span>Gold 22K <b class="num">${fmt(metalPrice("gold","22K","INR"),"INR",false,0)}/g</b></span><span class="sep"></span>
    <span>24K <b class="num">${fmt(metalPrice("gold","24K","INR"),"INR",false,0)}/g</b></span>
    <button class="iconbtn${refreshing?" spin":""}" data-act="refresh" title="Refresh live prices"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button>`;
}

function renderDashboard(){
  const empty=S.items.length===0;
  $("#emptyState").classList.toggle("hidden",!empty); $("#dashBody").classList.toggle("hidden",empty);
  $("#pageSub").textContent=empty?"Let's fill your vault":`${assets().length} holdings · ${liabs().length} loans & cards · rates ${timeAgo(R().metals.gold.updated)}`;
  if(empty) return;
  baseOpts();
  const t=totals(), a=t.a||1;
  const liquid=(t.byType.SB||0)+(t.byType.FD||0), market=(t.byType.Stock||0)+(t.byType.SIP||0);
  const metalsV=(t.byType.Gold||0)+(t.byType.Silver||0)+(t.byType.Metal||0);
  const metalItems=assets().filter(i=>isMetalType(i.type));
  const mCost=metalItems.filter(hasWeight).reduce((s,i)=>s+costUSD(i),0), mVal=metalItems.filter(hasWeight).reduce((s,i)=>s+valueUSD(i),0);
  const last=S.snapshots[S.snapshots.length-1], delta=last?t.nw-last.nw_usd:null;
  $("#kpis").innerHTML=`
    <div class="card kpi hero"><div class="label">Net worth</div><div class="value num">${money(t.nw)}</div><div class="hint">${delta===null?"Take a snapshot to start tracking change":`${delta>=0?"▲":"▼"} ${money(Math.abs(delta))} since ${last.date}`}</div></div>
    <div class="card kpi"><div class="label">Total assets</div><div class="value num">${money(t.a)}</div><div class="hint">${DISPLAY==="USD"?fmt(t.a*S.fx,"INR",true):fmt(t.a,"USD",true)} in ${DISPLAY==="USD"?"INR":"USD"}</div></div>
    <div class="card kpi"><div class="label">Liabilities</div><div class="value num neg">${money(t.l)}</div><div class="hint">${pct(t.l/a)} of assets</div></div>
    <div class="card kpi"><div class="label">Market investments</div><div class="value num">${money(market)}</div><div class="hint">Stocks + SIP/funds · ${pct(market/a)}</div></div>
    <div class="card kpi"><div class="label">Precious metals</div><div class="value num">${money(metalsV)}</div><div class="hint">${mCost?`<span class="${mVal>=mCost?"pos":"neg"}">${mVal>=mCost?"▲":"▼"} ${pct(Math.abs(mVal/mCost-1))}</span> vs cost · `:""}${pct(metalsV/a)} of assets</div></div>
    <div class="card kpi"><div class="label">Cash &amp; deposits</div><div class="value num">${money(liquid)}</div><div class="hint">Savings, PF &amp; FDs · ${pct(liquid/a)}</div></div>`;

  const pts=[...S.snapshots.map(s=>({x:s.date,nw:s.nw_usd,a:s.assets_usd})),{x:"Now",nw:t.nw,a:t.a}];
  const noTrend=S.snapshots.length===0;
  $("#trendEmpty").style.display=noTrend?"grid":"none"; $("#chTrend").style.visibility=noTrend?"hidden":"visible";
  mk("chTrend",{type:"line",data:{labels:pts.map(p=>p.x),datasets:[
      {label:"Net worth",data:pts.map(p=>conv(p.nw)),borderColor:css("--accent"),backgroundColor:css("--accent")+"22",fill:true,tension:.35,pointRadius:4,pointBackgroundColor:css("--accent"),borderWidth:2.5},
      {label:"Assets",data:pts.map(p=>conv(p.a)),borderColor:css("--gold"),borderDash:[5,4],pointRadius:3,tension:.35,borderWidth:2,fill:false}]},
    options:{maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"top",align:"end",labels:{boxWidth:10,boxHeight:10,usePointStyle:true}},tooltip:{...tip(),displayColors:true,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)}`}}},
      scales:{y:{ticks:{maxTicksLimit:5,callback:v=>fmt(v,DISPLAY,true)},grid:{color:css("--border")}},x:{grid:{display:false}}}}});

  mk("chAL",{type:"bar",data:{labels:["Assets","Liabilities","Net worth"],datasets:[{data:[t.a,t.l,t.nw].map(conv),backgroundColor:[css("--c2"),css("--c6"),css("--accent")],borderRadius:8,maxBarThickness:56}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tip(),callbacks:{label:c=>fmt(c.raw)}}},scales:{y:{ticks:{callback:v=>fmt(v,DISPLAY,true)},grid:{color:css("--border")}},x:{grid:{display:false}}}}});
  $("#dtaSub").textContent=`Debt-to-asset ratio ${pct(t.l/a)} — ${t.l/a<.2?"healthy":t.l/a<.4?"moderate":"high"}`;

  donut("chType","lgType",Object.keys(TYPES).filter(k=>t.byType[k]).map(k=>({label:TYPES[k].label,v:t.byType[k],color:css(TYPES[k].c)})).sort((x,y)=>y.v-x.v),a);
  donut("chGeo","lgGeo",[{label:"US (USD)",v:t.byCcy.USD||0,color:css("--c1")},{label:"India (INR)",v:t.byCcy.INR||0,color:css("--c4")}].filter(e=>e.v),a);

  const top=[...assets()].sort((x,y)=>valueUSD(y)-valueUSD(x)).slice(0,10);
  $("#topSub").textContent=`These ${top.length} make up ${pct(top.reduce((s,i)=>s+valueUSD(i),0)/a)} of your assets`;
  mk("chTop",{type:"bar",data:{labels:top.map(i=>i.entity),datasets:[{data:top.map(i=>conv(valueUSD(i))),backgroundColor:top.map(i=>css(TYPES[i.type]?.c||"--c7")),borderRadius:6,barThickness:18}]},
    options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tip(),callbacks:{label:c=>`${fmt(c.raw)} · ${TYPES[top[c.dataIndex].type]?.label}`}}},
      scales:{x:{ticks:{callback:v=>fmt(v,DISPLAY,true)},grid:{color:css("--border")}},y:{grid:{display:false},ticks:{callback:function(v){const l=this.getLabelForValue(v);return l.length>24?l.slice(0,23)+"…":l}}}}}});

  const os=owners().filter(o=>t.byOwner[o]);
  mk("chOwner",{type:"bar",data:{labels:os,datasets:Object.keys(TYPES).filter(k=>t.byType[k]).map(k=>({label:TYPES[k].label,data:os.map(o=>conv(assets().filter(i=>i.owner===o&&i.type===k).reduce((s,i)=>s+valueUSD(i),0))),backgroundColor:css(TYPES[k].c),borderRadius:4,maxBarThickness:46}))},
    options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:10,boxHeight:10,font:{size:11}}},tooltip:{...tip(),displayColors:true,callbacks:{label:c=>c.raw?`${c.dataset.label}: ${fmt(c.raw)}`:null}}},
      scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>fmt(v,DISPLAY,true)},grid:{color:css("--border")}}}}});

  const need=metalItems.filter(i=>!hasWeight(i)), mc=S.profile.metal_currency;
  $("#metalSub").textContent=`Gold 22K ${fmt(metalPrice("gold","22K",mc),mc,false,mc==="USD"?2:0)}/g · updated ${timeAgo(R().metals.gold.updated)}`;
  const byMetal={}; metalItems.forEach(i=>{const b=(byMetal[i.metal]=byMetal[i.metal]||{g:0,fine:0,val:0,costW:0,n:0,nw:0});b.n++;b.val+=valueUSD(i);if(hasWeight(i)){b.nw++;b.g+=grams(i);b.fine+=fineGrams(i);b.costW+=costUSD(i);}});
  $("#metalPanel").innerHTML=(Object.keys(byMetal).length?Object.entries(byMetal).map(([m,b])=>{const gain=b.costW?(b.val-b.costW)/b.costW:null;
    return `<div class="metal-row"><div><span class="tag"><span class="dot" style="background:${css(METALS[m]?.c||"--c7")}"></span>${esc(METALS[m]?.label||m)}</span>
      <span class="sub" style="margin-left:6px">${b.nw?`${gfmt(b.g)} · ${gfmt(b.fine)} fine`:"weight not entered"}</span></div>
      <div class="num" style="text-align:right"><b>${money(b.val)}</b></div>
      <div class="sub">${b.n} holding${b.n>1?"s":""}${b.nw<b.n?` · <span class="warn">${b.n-b.nw} valued at cost</span>`:""}</div>
      <div class="sub num" style="text-align:right">${gain==null?"—":`<span class="${gain>=0?"pos":"neg"}">${gain>=0?"+":""}${pct(gain)}</span> vs cost`}</div></div>`;}).join("")
    :`<div class="sub">No Gold, Silver or Metal holdings yet.</div>`)+
    (need.length?`<div class="notice" style="margin:10px 0 0"><span>⚖️</span><span><b>${need.length} metal holding${need.length>1?"s":""} need a weight</b> (${need.map(i=>esc(i.entity)).join(", ")}). Add grams on the Holdings page to value them at today's price.</span></div>`:"");

  const liq={}; assets().forEach(i=>{const k=TYPES[i.type]?.liq||"Illiquid";liq[k]=(liq[k]||0)+valueUSD(i)});
  $("#liqBar").innerHTML=LIQ.filter(([k])=>liq[k]).map(([k,c])=>`<span title="${k}" style="width:${liq[k]/a*100}%;background:${css(c)}"></span>`).join("");
  $("#lgLiq").innerHTML=LIQ.filter(([k])=>liq[k]).map(([k,c])=>`<div class="row"><span class="sw" style="background:${css(c)}"></span><span class="nm">${k}</span><b class="num">${money(liq[k],true)}</b><span class="pc num">${pct(liq[k]/a)}</span></div>`).join("");
}

let hSort={k:"value",dir:-1}, lSort={k:"value",dir:-1};
const sortRows=(rows,s,vf)=>rows.sort((x,y)=>{const a=s.k==="value"?vf(x):String(x[s.k]).toLowerCase(), b=s.k==="value"?vf(y):String(y[s.k]).toLowerCase();return (a>b?1:a<b?-1:0)*s.dir;});
const th=(cols,s)=>`<thead><tr>${cols.map(([k,l,r])=>`<th data-sort="${k}" class="${r?"r":""}">${l}${s.k===k?(s.dir>0?" ↑":" ↓"):""}</th>`).join("")}<th></th></tr></thead>`;
const typeTag=t=>`<span class="tag"><span class="dot" style="background:${css(TYPES[t]?.c||"--c6")}"></span>${esc(TYPES[t]?.label||"Loan / card")}</span>`;
const editBtn=id=>`<button class="iconbtn" data-edit="${id}" title="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>`;
function metaLine(i){
  if(!isMetalType(i.type)) return "";
  if(!hasWeight(i)) return `<span class="meta warn">Add weight to value at market price</span>`;
  const mc=S.profile.metal_currency;
  return `<span class="meta">${(+i.qty).toLocaleString()} ${i.unit==="g"?"g":esc(UNITS[i.unit]?.label.split(" (")[0].toLowerCase())} · ${esc(i.purity)} ${esc(METALS[i.metal]?.label.toLowerCase())} @ ${fmt(metalPrice(i.metal,i.purity,mc),mc,false,mc==="USD"?2:0)}/g</span>`;
}
function renderHoldings(){
  const t=totals(), a=t.a||1;
  $("#pageSub").textContent=`${assets().length} holdings worth ${money(t.a)}`;
  $("#hOwner").innerHTML=`<option value="">All owners</option>`+owners().map(o=>`<option${$("#hOwner").value===o?" selected":""}>${esc(o)}</option>`).join("");
  const need=assets().filter(i=>isMetalType(i.type)&&!hasWeight(i));
  $("#holdNotice").style.display=need.length?"flex":"none";
  $("#holdNotice").innerHTML=`<span>⚖️</span><span><b>${need.length} metal holding${need.length>1?"s":""} without weight</b> are shown at purchase cost. Click the pencil and enter quantity, unit and purity — the value then follows live prices.</span>`;
  const qy=$("#hSearch").value.toLowerCase(), ft=$("#hType").value, fc=$("#hCcy").value, fo=$("#hOwner").value;
  const rows=sortRows(assets().filter(i=>(!qy||i.entity.toLowerCase().includes(qy))&&(!ft||i.type===ft)&&(!fc||i.currency===fc)&&(!fo||i.owner===fo)),hSort,valueUSD);
  const sum=rows.reduce((s,i)=>s+valueUSD(i),0);
  $("#hTable").innerHTML=th([["entity","Holding"],["type","Type"],["owner","Owner"],["amount","Invested (native)",1],["value",`Value (${DISPLAY})`,1],["gain","Gain",1],["share","% of assets",1]],hSort)+
   `<tbody>${rows.map(i=>{const g=hasWeight(i)&&i.amount?valueUSD(i)-costUSD(i):null;return `<tr><td><b>${esc(i.entity)}</b>${metaLine(i)}</td><td>${typeTag(i.type)}</td><td>${esc(i.owner)}</td>
     <td class="r num">${i.amount==null?"—":fmt(i.amount,i.currency)}</td><td class="r num">${money(valueUSD(i))}</td>
     <td class="r num">${g==null?'<span class="sub">—</span>':`<span class="${g>=0?"pos":"neg"}">${g>=0?"+":"−"}${money(Math.abs(g))}</span>`}</td>
     <td class="r num">${pct(valueUSD(i)/a)}</td><td>${editBtn(i.id)}</td></tr>`}).join("")||`<tr><td colspan="8" class="sub" style="padding:24px 12px">No holdings yet — click <b>+ Add holding</b>.</td></tr>`}</tbody>
   <tfoot><tr><td colspan="4">${rows.length} shown</td><td class="r num">${money(sum)}</td><td></td><td class="r num">${pct(sum/a)}</td><td></td></tr></tfoot>`;
}
function renderLiabs(){
  const t=totals(), all=liabs(), missing=all.filter(i=>i.amount==null);
  $("#pageSub").textContent=`${all.length} loans & cards · ${money(t.l)} owed`;
  $("#liabNotice").style.display=all.length?"flex":"none";
  $("#liabNotice").innerHTML=missing.length?`<span>⚠️</span><span><b>${missing.length} have no balance yet</b> (${missing.map(i=>esc(i.entity)).join(", ")}). Click the pencil to add the balance owed — enter 0 if it's paid off.</span>`:`<span>✅</span><span>All balances entered.</span>`;
  const mort=all.filter(i=>/mortgage|loan/i.test(i.entity)).reduce((s,i)=>s+costUSD(i),0);
  $("#liabKpis").innerHTML=`
    <div class="card kpi"><div class="label">Total owed</div><div class="value num neg">${money(t.l)}</div></div>
    <div class="card kpi"><div class="label">Mortgages &amp; loans</div><div class="value num">${money(mort)}</div><div class="hint">${pct(mort/(t.l||1))} of debt</div></div>
    <div class="card kpi"><div class="label">Cards &amp; other</div><div class="value num">${money(t.l-mort)}</div></div>
    <div class="card kpi"><div class="label">Debt-to-asset</div><div class="value num">${pct(t.l/(t.a||1))}</div><div class="hint">${t.l/(t.a||1)<.2?"Healthy":t.l/(t.a||1)<.4?"Moderate":"High"}</div></div>`;
  const qy=$("#lSearch").value.toLowerCase();
  const rows=sortRows(all.filter(i=>!qy||i.entity.toLowerCase().includes(qy)),lSort,costUSD);
  $("#lTable").innerHTML=th([["entity","Loan / card"],["owner","Owner"],["currency","Ccy"],["value",`Balance owed (${DISPLAY})`,1]],lSort)+
   `<tbody>${rows.map(i=>`<tr><td><b>${esc(i.entity)}</b></td><td>${esc(i.owner)}</td><td>${i.currency}</td><td class="r num">${i.amount==null?'<span class="empty">Not entered</span>':money(costUSD(i))}</td><td>${editBtn(i.id)}</td></tr>`).join("")||`<tr><td colspan="5" class="sub" style="padding:24px 12px">No loans or cards yet.</td></tr>`}</tbody>`;
}
async function renderStocks(){
  const qy=$("#sSearch").value.toLowerCase(), fc=$("#sCcy").value;
  const rows=(S.stocks||[]).filter(s=>(!qy||s.ticker.toUpperCase().includes(qy.toUpperCase())||s.stock_name?.toLowerCase().includes(qy))&&(!fc||s.currency===fc));
  let html=`<thead><tr><th>Ticker</th><th>Bought</th><th class="r">Price</th><th class="r">Current</th><th class="r">Qty</th><th class="r">Cost</th><th class="r">Value</th><th class="r">Gain/Loss</th><th class="r">%</th><th></th></tr></thead><tbody>`;

  if(rows.length===0){ html+=`<tr><td colspan="10" class="sub" style="padding:24px 12px">No stocks yet — click <b>+ Add stock</b>.</td></tr>`; }
  else {
    for(const s of rows) {
      const cost=s.buy_price*s.quantity;
      const priceData=await getStockPrice(s.ticker);
      const current=priceData?.price||null;
      const value=current?current*s.quantity:null;
      const gain=value?value-cost:null;
      const gainPct=gain&&cost?gain/cost*100:null;

      const markup=`<tr data-stock="${s.id}"><td><b>${esc(s.ticker)}</b>${s.stock_name?`<div class="sub">${esc(s.stock_name)}</div>`:""}</td>
        <td>${esc(s.buy_date)}</td><td class="r num">${fmt(s.buy_price,s.currency,false,4)}</td>
        <td class="r num">${current?fmt(current,s.currency,false,4):"—"}</td><td class="r num">${(+s.quantity).toFixed(3)}</td>
        <td class="r num">${fmt(cost,s.currency)}</td><td class="r num">${value?fmt(value,s.currency):"—"}</td>
        <td class="r num">${gain===null?'—':`<span class="${gain>=0?"pos":"neg"}">${gain>=0?"+":"−"}${fmt(Math.abs(gain),s.currency)}</span>`}</td>
        <td class="r num">${gainPct===null?'—':`<span class="${gainPct>=0?"pos":"neg"}">${gainPct>=0?"+":""}${gainPct.toFixed(2)}%</span>`}</td>
        <td><button class="iconbtn" data-stock-detail="${s.id}" title="View chart"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M3 18l4-4 4 4 6-6 4 4"/></svg></button><button class="iconbtn" data-edit-stock="${s.id}" title="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button></td></tr>`;
      html+=markup;
    }
  }
  html+=`</tbody>`;
  $("#sTable").innerHTML=html;
  $("#pageSub").textContent=`${rows.length} stock${rows.length===1?"":"s"}`;
}

function renderHistory(){
  $("#pageSub").textContent=`${S.snapshots.length} snapshot${S.snapshots.length===1?"":"s"} saved`;
  if(!S.snapshots.length){$("#hsTable").innerHTML=`<tbody><tr><td class="sub" style="padding:24px 12px">No snapshots yet. Take your first one now — then again each month after updating balances.</td></tr></tbody>`;return;}
  const rows=[...S.snapshots].reverse();
  $("#hsTable").innerHTML=`<thead><tr><th>Date</th><th class="r">Assets</th><th class="r">Liabilities</th><th class="r">Net worth</th><th class="r">Change</th><th class="r">FX</th><th class="r">Gold 22K/g</th><th></th></tr></thead><tbody>${rows.map((s,idx)=>{
    const prev=rows[idx+1], d=prev?s.nw_usd-prev.nw_usd:null;
    return `<tr><td>${esc(s.date)}</td><td class="r num">${money(s.assets_usd)}</td><td class="r num">${money(s.liabilities_usd)}</td><td class="r num"><b>${money(s.nw_usd)}</b></td>
    <td class="r num ${d==null?"":d>=0?"pos":"neg"}">${d==null?"—":(d>=0?"+":"−")+money(Math.abs(d))}</td><td class="r num">${s.fx?"₹"+(+s.fx).toFixed(2):"—"}</td>
    <td class="r num">${s.gold22_inr_g?fmt(s.gold22_inr_g,"INR"):"—"}</td><td><button class="iconbtn" data-delsnap="${s.id}" title="Delete">✕</button></td></tr>`}).join("")}</tbody>`;
}

/* ----- Settings ----- */
const sel=(name,opts,val)=>`<select class="inp" data-cfg="${name}">${Object.entries(opts).map(([k,v])=>`<option value="${k}"${k===val?" selected":""}>${esc(v)}</option>`).join("")}</select>`;
const txt=(name,val,ph="",type="text")=>`<input class="inp" data-cfg="${name}" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off">`;
function statusLine(c){
  if(c.mode!=="auto") return `<div class="status">Manual price</div>`;
  if(refreshing) return `<div class="status">Updating…</div>`;
  return `<div class="status${c.status?" err":""}">${c.status?esc(c.status):"✓ Live · "+timeAgo(c.updated)}</div>`;
}
const modeSeg=(key,mode)=>`<span class="seg sm"><button data-mode="${key}|auto" class="${mode==="auto"?"on":""}">Auto</button><button data-mode="${key}|manual" class="${mode==="manual"?"on":""}">Manual</button></span>`;
function apiFields(key,c,isMetal){
  const group=PRESETS[isMetal?"metal":"fx"];
  const pre=Object.fromEntries(Object.entries(group).filter(([k])=>!(k==="goldapiio22"&&key!=="metal:gold")).map(([k,v])=>[k,v.label]));
  const mk=key.split(":")[1];
  return `<details class="api"${c.status?" open":""}><summary>API source — ${esc(group[c.preset]?.label||"Custom")}</summary>
    <div class="api-grid" data-key="${key}">
      <div class="wide"><label>Preset</label>${sel("preset",pre,c.preset)}</div>
      <div class="wide"><label>URL ${isMetal?`(<code>{SYM}</code> → ${METALS[mk].sym})`:""}</label>${txt("url",c.url,"https://…")}</div>
      <div><label>JSON path to the price</label>${txt("path",c.path,"e.g. rates.INR or price")}</div>
      ${isMetal?`<div><label>Price is per</label>${sel("unit",{ozt:"Troy ounce",g:"Gram",kg:"Kilogram",tola:"Tola"},c.unit)}</div>
      <div><label>Price currency</label>${sel("ccy",{USD:"USD",INR:"INR"},c.ccy)}</div>
      <div><label>Price is quoted for</label>${sel("quoted",{pure:"Pure / 24K / 999",...(mk==="gold"?{"22K":"22K","18K":"18K"}:{})},c.quoted)}</div>`:""}
      <div><label>Header name (API key)</label>${txt("headerName",c.headerName,"optional, e.g. x-access-token")}</div>
      <div><label>Header value</label>${txt("headerValue",c.headerValue,"your API key","password")}</div>
      <div class="wide sub" style="font-size:12px">${isMetal&&c.preset==="goldapicom"?"Free spot price, no sign-up. Indian jeweller rates are usually higher (import duty + GST) — use the premium % to match them.":isMetal&&String(c.preset).startsWith("goldapiio")?"Sign up free at goldapi.io for a key and paste it above. Returns per-gram rates in INR including 22K.":isMetal?"Any JSON API works: set the URL, the path to the number, and what that number represents.":"Returns how many INR one US dollar buys."} Saved to your private account (only you can read it).</div>
      <div class="wide"><button class="btn sm" data-act="test" data-key="${key}">Test &amp; fetch now</button></div>
    </div></details>`;
}
function renderSettings(){
  $("#pageSub").textContent="Market rates, household, backup";
  const mc=S.profile.metal_currency, dec=mc==="USD"?2:0, fx=R().fx, pc=S.profile.display_currency||"USD";
  document.querySelectorAll("#metalCcySeg button").forEach(b=>b.classList.toggle("on",b.dataset.mc===mc));
  document.querySelectorAll("#primaryCcySeg button").forEach(b=>b.classList.toggle("on",b.dataset.pc===pc));
  $("#refreshBtn").classList.toggle("spin",refreshing);
  let html=`<div class="rate-row">
      <div class="rate-name"><span class="chip" style="background:${css("--c1")}"></span>USD → INR</div>
      <div class="rate-prices"><div><label>1 USD = ₹</label><input class="inp money" data-price="fx" type="number" step="0.01" value="${S.fx}"></div>
        <div><label>1 INR = $</label><div class="num" style="padding:8px 0">${(1/S.fx).toFixed(5)}</div></div></div>
      <div class="rate-side">${modeSeg("fx",fx.mode)}${statusLine(fx)}</div>${apiFields("fx",fx,false)}</div>`;
  for(const [k,m] of Object.entries(METALS)){
    const c=R().metals[k];
    html+=`<div class="rate-row">
      <div class="rate-name"><span class="chip" style="background:${css(m.c)}"></span>${m.label}</div>
      <div class="rate-prices">
        ${m.show.map(p=>`<div><label>${p} per gram (${mc==="INR"?"₹":"$"})</label><input class="inp money" data-price="metal:${k}|${p}" type="number" step="any" value="${metalPrice(k,p,mc).toFixed(dec)}"></div>`).join("")}
        ${k==="silver"?`<div><label>999 per kg (${mc==="INR"?"₹":"$"})</label><div class="num" style="padding:8px 0">${fmt(metalPrice(k,"999 fine",mc)*1000,mc)}</div></div>`:""}
        <div><label>Per troy oz, spot (USD)</label><div class="num" style="padding:8px 0">${fmt(c.usd_g*OZ,"USD",false,2)}</div></div>
        <div><label>Local premium %</label><input class="inp money" data-premium="${k}" type="number" step="0.1" value="${+c.premium||0}" title="Added on top of spot, e.g. India import duty + GST"></div>
      </div>
      <div class="rate-side">${modeSeg("metal:"+k,c.mode)}${statusLine(c)}</div>${apiFields("metal:"+k,c,true)}</div>`;
  }
  $("#ratesBox").innerHTML=html;
  if(document.activeElement!==$("#profName")) $("#profName").value=S.profile.display_name||"";
  $("#ownerChips").innerHTML=S.profile.owners.map(o=>`<span class="chip-x">${esc(o)}<button data-delowner="${esc(o)}" title="Remove">✕</button></span>`).join("");
}
function renderUser(){
  const u=S.user, name=S.profile.display_name||u.user_metadata?.full_name||u.email;
  $("#userName").textContent=name; $("#userEmail").textContent=u.email||"";
  const pic=u.user_metadata?.avatar_url;
  $("#avatar").innerHTML=pic?`<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">`:esc((name||"?").trim()[0]?.toUpperCase()||"?");
}
function render(){
  if(!S) return;
  document.querySelectorAll("#ccySeg button").forEach(b=>b.classList.toggle("on",b.dataset.c===DISPLAY));
  renderTicker(); renderUser();
  ({dashboard:renderDashboard,holdings:renderHoldings,stocks:renderStocks,liabilities:renderLiabs,history:renderHistory,settings:renderSettings})[current]();
}

/* ---------------- Settings events ---------------- */
const cfgOf=key=>key==="fx"?R().fx:R().metals[key.split(":")[1]];
const rateKeyOf=key=>key==="fx"?"fx":key.split(":")[1];
$("#ratesBox").addEventListener("change",async e=>{
  const el=e.target;
  if(el.dataset.price){
    const v=parseFloat(el.value); if(!(v>0)) return render();
    let key="fx";
    if(el.dataset.price==="fx"){ S.fx=v; R().fx.mode="manual"; R().fx.updated=new Date().toISOString(); R().fx.status=""; }
    else{ const [k2,purity]=el.dataset.price.split("|"); key=k2.split(":")[1]; const c=R().metals[key];
      c.usd_g=v/(S.profile.metal_currency==="INR"?S.fx:1)/(METALS[key].purities[purity]||1)/(1+(+c.premium||0)/100);
      c.mode="manual"; c.updated=new Date().toISOString(); c.status=""; }
    render(); await saveRates([key]).then(()=>toast("Saved — switched to manual price")).catch(()=>{}); return;
  }
  if(el.dataset.premium){ R().metals[el.dataset.premium].premium=parseFloat(el.value)||0; render(); await saveRates([el.dataset.premium]).catch(()=>{}); return; }
  if(el.dataset.cfg){
    const key=el.closest("[data-key]").dataset.key, c=cfgOf(key), f=el.dataset.cfg;
    if(f==="preset"){ const p=PRESETS[key==="fx"?"fx":"metal"][el.value]; c.preset=el.value; if(el.value!=="custom"){ const {label,...rest}=p; Object.assign(c,rest); } }
    else { c[f]=el.value; c.preset="custom"; }
    render(); await saveRates([rateKeyOf(key)]).catch(()=>{});
  }
});
$("#profName").addEventListener("change",async e=>{
  S.profile.display_name=e.target.value.trim().slice(0,80); render();
  await q(sb.from("profiles").update({display_name:S.profile.display_name}).eq("id",S.user.id),"save name").then(()=>toast("Saved")).catch(()=>{});
});
document.addEventListener("click",e=>{
  if(e.target.closest("#primaryCcySeg button")){ const pc=e.target.dataset.pc; if(pc) saveProfilePref({display_currency:pc}).then(()=>toast("Currency updated")); }
  if(e.target.closest("#metalCcySeg button")){ const mc=e.target.dataset.mc; if(mc) saveProfilePref({metal_currency:mc}).then(()=>toast("Metal currency updated")); }
});
async function saveOwners(list){ S.profile.owners=list; render(); await q(sb.from("profiles").update({owners:list}).eq("id",S.user.id),"save household").catch(()=>{}); }
$("#ownerForm").addEventListener("submit",e=>{ e.preventDefault(); const v=$("#ownerInput").value.trim().slice(0,40); if(!v||S.profile.owners.includes(v)) return; $("#ownerInput").value=""; saveOwners([...S.profile.owners,v]); });
async function saveProfilePref(patch){ Object.assign(S.profile,patch); render(); await q(sb.from("profiles").update(patch).eq("id",S.user.id),"save preference").catch(()=>{}); }

/* ---------------- Filters ---------------- */
$("#hType").innerHTML=`<option value="">All types</option>`+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
["#hSearch","#hType","#hCcy","#hOwner","#lSearch","#sSearch","#sCcy"].forEach(s=>$(s)?.addEventListener("input",render));

/* ---------------- Add / edit dialog ---------------- */
const dlg=$("#dlg"), form=$("#dlgForm"); let editing=null, editKind="asset";
form.type.innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
form.unit.innerHTML=Object.entries(UNITS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
function syncMetalFields(keepPurity){
  const t=form.type.value, show=editKind==="asset"&&isMetalType(t);
  $("#metalBox").style.display=show?"":"none";
  $("#amtLabel").textContent=editKind==="liability"?"Balance owed":show?"Purchase cost (optional — for gain/loss)":"Invested / current value";
  if(!show) return;
  const ms=t==="Metal"?["platinum","palladium"]:[TYPES[t].metal];
  $("#fMetal").style.display=t==="Metal"?"":"none";
  const curM=ms.includes(form.metal.value)?form.metal.value:ms[0];
  form.metal.innerHTML=ms.map(m=>`<option value="${m}">${METALS[m].label}</option>`).join(""); form.metal.value=curM;
  const ps=Object.keys(METALS[curM].purities), curP=keepPurity&&ps.includes(form.purity.value)?form.purity.value:(curM==="gold"?"22K":ps[0]);
  form.purity.innerHTML=ps.map(p=>`<option>${p}</option>`).join(""); form.purity.value=curP;
  updatePreview();
}
function updatePreview(){
  if($("#metalBox").style.display==="none") return;
  const tmp={type:form.type.value,metal:form.metal.value,qty:+form.qty.value,unit:form.unit.value,purity:form.purity.value};
  const p=metalPrice(tmp.metal,tmp.purity,"INR"), pu=metalPrice(tmp.metal,tmp.purity,"USD");
  $("#metalPreview").innerHTML=tmp.qty>0
    ?`${gfmt(grams(tmp))} × ${fmt(p,"INR")}/g → <b>${fmt(valueUSD(tmp)*S.fx,"INR")}</b> · <b>${fmt(valueUSD(tmp),"USD")}</b>`
    :`Today's ${esc(tmp.purity)} ${METALS[tmp.metal].label.toLowerCase()} price: <b>${fmt(p,"INR")}/g</b> · ${fmt(pu,"USD",false,2)}/g`;
}
form.type.addEventListener("change",()=>syncMetalFields(false));
form.metal.addEventListener("change",()=>syncMetalFields(false));
["qty","unit","purity"].forEach(n=>form[n].addEventListener("input",updatePreview));
function openDlg(kind,item){
  editKind=kind; editing=item||null;
  $("#dlgTitle").textContent=(item?"Edit ":"Add ")+(kind==="asset"?"holding":"loan / card");
  $("#fType").style.display=kind==="asset"?"":"none";
  const os=owners(); if(item?.owner&&!os.includes(item.owner)) os.push(item.owner);
  form.owner.innerHTML=os.map(o=>`<option>${esc(o)}</option>`).join("");
  form.entity.value=item?.entity||""; form.type.value=item?.type||"Stock"; form.currency.value=item?.currency||"USD";
  form.amount.value=item?.amount??""; form.owner.value=item?.owner||os[0]||"Family";
  form.qty.value=item?.qty??""; form.unit.value=item?.unit||"g";
  form.metal.innerHTML=`<option value="${esc(item?.metal||"")}"></option>`; form.metal.value=item?.metal||"";
  form.purity.innerHTML=`<option>${esc(item?.purity||"")}</option>`;
  syncMetalFields(true);
  $("#dlgDelete").style.display=item?"":"none";
  dlg.showModal(); form.entity.focus();
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const type=editKind==="asset"?form.type.value:"CR";
  const it={kind:editKind,entity:form.entity.value.trim(),type,owner:form.owner.value,currency:form.currency.value,
    amount:form.amount.value===""?null:parseFloat(form.amount.value),metal:form.metal.value,qty:form.qty.value===""?null:parseFloat(form.qty.value),unit:form.unit.value,purity:form.purity.value};
  if(!it.entity) return;
  $("#dlgSave").disabled=true;
  try{
    const row=itemToRow(it);
    const saved=editing? await q(sb.from("holdings").update(row).eq("id",editing.id).select().single())
                       : await q(sb.from("holdings").insert(row).select().single());
    const item=rowToItem(saved);
    if(editing) S.items[S.items.findIndex(i=>i.id===editing.id)]=item; else S.items.push(item);
    dlg.close(); render(); toast("Saved");
  }catch(err){} finally{ $("#dlgSave").disabled=false; }
});
$("#dlgCancel").onclick=()=>dlg.close();
$("#dlgDelete").onclick=async()=>{
  if(!editing||!confirm(`Delete "${editing.entity}"?`)) return;
  try{ await q(sb.from("holdings").delete().eq("id",editing.id),"delete"); S.items=S.items.filter(i=>i.id!==editing.id); dlg.close(); render(); toast("Deleted"); }catch(e){}
};

/* ---------------- Import / export ---------------- */
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function exportJSON(){
  const rates={fx:{...R().fx,headerValue:""},metals:Object.fromEntries(Object.entries(R().metals).map(([k,c])=>[k,{...c,headerValue:""}]))};
  download(`vault-vine-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({app:"vault-vine",version:2,fx:S.fx,display:DISPLAY,owners:S.profile.owners,items:S.items,snapshots:S.snapshots,rates},null,2),"application/json");
}
async function importJSON(file){
  let d; try{ d=JSON.parse(await file.text()); if(!Array.isArray(d.items)) throw 0; }catch(e){ return toast("That file isn't a valid backup"); }
  const rows=d.items.filter(i=>(i.entity||i.name)&&(i.kind==="asset"||i.kind==="liability")).map(i=>{
    let type=i.type; if(i.kind==="asset"&&type==="Equity"&&/gold/i.test(i.entity||i.name)) type="Gold"; // prototype v1 stored gold as Equity
    if(!TYPES[type]&&type!=="CR") type=i.kind==="liability"?"CR":"Equity";
    const it={...i,entity:i.entity||i.name,type};
    if(isMetalType(type)){ it.metal=it.metal||TYPES[type].metal; it.unit=it.unit||"g"; it.purity=it.purity||(it.metal==="gold"?(/jwel|jewel/i.test(it.entity)?"22K":"24K"):Object.keys(METALS[it.metal].purities)[0]); }
    return itemToRow(it);
  });
  let replace=false;
  if(S.items.length) replace=confirm(`Your vault already has ${S.items.length} holdings.\n\nOK = replace them with the ${rows.length} in this backup\nCancel = add the backup's holdings alongside them`);
  else if(!confirm(`Import ${rows.length} holdings and ${(d.snapshots||[]).length} snapshots into your vault?`)) return;
  $("#loader").classList.remove("hidden");
  try{
    if(replace) await q(sb.from("holdings").delete().eq("user_id",S.user.id),"clear holdings");
    for(let i=0;i<rows.length;i+=200) await q(sb.from("holdings").insert(rows.slice(i,i+200)),"import holdings");
    const snaps=(d.snapshots||[]).filter(s=>s.date).map(s=>({user_id:S.user.id,snap_date:s.date,assets_usd:+s.assets_usd||0,liabilities_usd:+s.liabilities_usd||0,net_worth_usd:+(s.nw_usd??s.net_worth_usd)||0,fx:s.fx||null,gold22_inr_g:s.gold22_inr_g||null}));
    if(snaps.length) await q(sb.from("snapshots").upsert(snaps,{onConflict:"user_id,snap_date"}),"import snapshots");
    if(d.rates?.metals){
      for(const k of Object.keys(METALS)) if(d.rates.metals[k]) R().metals[k]={...R().metals[k],...d.rates.metals[k],headerValue:R().metals[k].headerValue};
      if(d.rates.fx) R().fx={...R().fx,...d.rates.fx,headerValue:R().fx.headerValue};
      if(+d.fx>0) S.fx=+d.fx;
      await saveRates(RATE_KEYS);
    }
    const newOwners=[...new Set([...S.profile.owners,...(d.owners||[]),...rows.map(r=>r.owner)])].slice(0,30);
    await q(sb.from("profiles").update({owners:newOwners}).eq("id",S.user.id),"save household");
    await loadUserData(S.user); toast(`Imported ${rows.length} holdings`);
  }catch(e){ console.error(e); }
  finally{ $("#loader").classList.add("hidden"); render(); }
}
document.addEventListener("change",e=>{ if(e.target.matches("[data-import]")&&e.target.files[0]){ importJSON(e.target.files[0]); e.target.value=""; }});

/* ---------------- Global click handling ---------------- */
document.addEventListener("click",async e=>{
  if(!S&&!e.target.closest('[data-act="signout"]')) return;
  if(e.target.closest("#ticker")&&!e.target.closest("[data-act]")) return go("settings");
  const b=e.target.closest("[data-view],[data-act],[data-edit],[data-sort],[data-delsnap],[data-delowner],[data-mode],[data-mc],#ccySeg button,#themeBtn");
  if(!b) return;
  if(b.dataset.view) return go(b.dataset.view);
  if(b.dataset.edit){ const it=S.items.find(i=>i.id===b.dataset.edit); return it&&openDlg(it.kind,it); }
  if(b.dataset.sort){ const s=b.closest("#lTable")?lSort:hSort; let k=b.dataset.sort; if(k==="share"||k==="gain")k="value"; if(s.k===k)s.dir*=-1; else{s.k=k;s.dir=k==="value"?-1:1;} return render(); }
  if(b.dataset.delsnap){ if(!confirm("Delete this snapshot?")) return; try{ await q(sb.from("snapshots").delete().eq("id",b.dataset.delsnap),"delete snapshot"); S.snapshots=S.snapshots.filter(s=>s.id!==b.dataset.delsnap); render(); }catch(e){} return; }
  if(b.dataset.delowner){ return saveOwners(S.profile.owners.filter(o=>o!==b.dataset.delowner)); }
  if(b.dataset.mode){ const [key,mode]=b.dataset.mode.split("|"), c=cfgOf(key); c.mode=mode; if(mode==="auto"){ key==="fx"?await refreshFx():await refreshMetal(rateKeyOf(key)); } render(); await saveRates([rateKeyOf(key)]).catch(()=>{}); return; }
  if(b.dataset.mc) return saveProfilePref({metal_currency:b.dataset.mc});
  if(b.dataset.c) return saveProfilePref({display_currency:b.dataset.c});
  if(b.id==="themeBtn"){ const r=document.documentElement; const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme=dark?"light":"dark"; lsSet("vv.theme",r.dataset.theme); return render(); }
  const act=b.dataset.act;
  if(act==="signout"){ await sb.auth.signOut(); return; }
  if(act==="refresh") return refreshAll(true);
  if(act==="test"){ const key=b.dataset.key, c=cfgOf(key), prev=c.mode; c.mode="auto"; b.textContent="Fetching…";
    key==="fx"?await refreshFx():await refreshMetal(rateKeyOf(key)); if(c.status&&prev==="manual") c.mode=prev;
    render(); await saveRates([rateKeyOf(key)]).catch(()=>{}); toast(c.status?"Failed: "+c.status:"Fetched ✓ — now on Auto"); return; }
  if(act==="add-asset") return openDlg("asset");
  if(act==="add-liab") return openDlg("liability");
  if(act==="add-stock") return openStockDlg();
  if(act==="snapshot"){ const t=totals(), d=new Date().toISOString().slice(0,10);
    try{ const row=await q(sb.from("snapshots").upsert({user_id:S.user.id,snap_date:d,assets_usd:+t.a.toFixed(2),liabilities_usd:+t.l.toFixed(2),net_worth_usd:+t.nw.toFixed(2),fx:S.fx,gold22_inr_g:+metalPrice("gold","22K","INR").toFixed(2)},{onConflict:"user_id,snap_date"}).select().single(),"save snapshot");
      S.snapshots=S.snapshots.filter(s=>s.date!==d).concat(rowToSnap(row)).sort((x,y)=>x.date<y.date?-1:1); render(); toast("Snapshot saved for "+d); }catch(e){} return; }
  if(act==="export-json") return exportJSON();
  if(act==="export-csv"){ const h="kind,name,owner,currency,type,amount,metal,qty,unit,purity,value_usd\n";
    return download("vault-vine.csv",h+S.items.map(i=>[i.kind,`"${String(i.entity).replace(/"/g,'""')}"`,`"${i.owner}"`,i.currency,i.type,i.amount??"",i.metal||"",i.qty??"",i.unit||"",i.purity||"",(i.kind==="asset"?valueUSD(i):costUSD(i)).toFixed(2)].join(",")).join("\n"),"text/csv"); }
  if(act==="wipe"){ if(prompt('This permanently deletes all your holdings, snapshots and rate settings.\nType DELETE to confirm.')!=="DELETE") return;
    try{ await q(sb.from("holdings").delete().eq("user_id",S.user.id),"delete"); await q(sb.from("snapshots").delete().eq("user_id",S.user.id),"delete"); await q(sb.from("rate_settings").delete().eq("user_id",S.user.id),"delete");
      await loadUserData(S.user); render(); toast("All data deleted"); }catch(e){} return; }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",render);

/* ---------------- Auth & screens ---------------- */
function show(which){
  $("#loader").classList.toggle("hidden",which!=="loading");
  $("#authScreen").classList.toggle("hidden",which!=="auth");
  $("#setupScreen").classList.toggle("hidden",which!=="setup");
  $("#appScreen").classList.toggle("hidden",which!=="app");
  $("#navMobile").classList.toggle("hidden",which!=="app");
}
function authMsg(text,kind="ok"){ const m=$("#authMsg"); m.textContent=text; m.className="auth-msg show "+kind; }
const redirectTo=()=>location.origin+location.pathname;

$("#googleBtn").addEventListener("click",async()=>{
  if(!sb) return authMsg("Couldn't load the sign-in library. Check your internet connection and reload.","err");
  const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectTo()}});
  if(error) authMsg(error.message,"err");
});
$("#emailForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!sb) return authMsg("Couldn't load the sign-in library. Check your internet connection and reload.","err");
  const email=$("#emailInput").value.trim(); $("#emailBtn").disabled=true;
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo()}});
  $("#emailBtn").disabled=false;
  error?authMsg(error.message,"err"):authMsg(`Check ${email} — we sent you a sign-in link.`);
});

let startedFor=null;
async function start(user){
  if(startedFor===user.id) return; startedFor=user.id;
  show("loading");
  try{
    const res=await loadUserData(user);
    if(res==="setup"){ show("setup"); return; }
    show("app");
    const v=lsGet("vv.view"); go(VIEWS.some(x=>x[0]===v)?v:"dashboard");
    const stale=[R().fx,...Object.values(R().metals)].some(c=>c.mode==="auto"&&(!c.updated||Date.now()-new Date(c.updated)>30*60*1000));
    if(stale) refreshAll(false);
  }catch(e){ console.error(e); startedFor=null; show("auth"); authMsg("Couldn't load your vault: "+(e.message||e),"err"); }
}
function signedOut(){ startedFor=null; S=null; Object.values(charts).forEach(c=>c.destroy()); show("auth"); }

/* ---------- Stocks dialog ---------- */
let editingStock=null;
const stockDlg=$("#stockDlg"), stockForm=$("#stockForm");

async function openStockDlg(stock=null){
  editingStock=stock;
  $("#stockDlgTitle").textContent=(stock?"Edit ":"Add ")+"stock";
  $("#stockDelete").style.display=stock?"":"none";
  stockForm.ticker.value=stock?.ticker||"";
  stockForm.buyDate.value=stock?.buy_date||"";
  stockForm.buyPrice.value=stock?.buy_price||"";
  stockForm.quantity.value=stock?.quantity||"";
  stockForm.currency.value=stock?.currency||"USD";
  stockForm.notes.value=stock?.notes||"";
  $("#tickerInfo").textContent="";
  $("#tickerResults").innerHTML="";
  $("#stockPreview").style.display="none";
  stockDlg.showModal();
}

stockForm.ticker.addEventListener("input",async e=>{
  const q=e.target.value.trim();
  if(q.length<1){ $("#tickerResults").innerHTML=""; return; }

  const results=await searchTickers(q);
  if(results.length){
    $("#tickerResults").style.display="block";
    $("#tickerResults").innerHTML=results.slice(0,8).map(r=>`
      <div class="ticker-item" data-ticker="${esc(r.ticker)}" data-name="${esc(r.name)}" data-exchange="${esc(r.exchange)}">
        <div><b>${esc(r.ticker)}</b></div>
        <div style="font-size:11px;color:var(--muted)">${esc(r.name)} · ${esc(r.exchange)}</div>
      </div>`).join("");
  }else{
    $("#tickerResults").style.display="none";
  }
});

$("#tickerResults").addEventListener("click",e=>{
  const item=e.target.closest(".ticker-item");
  if(item){
    stockForm.ticker.value=item.dataset.ticker;
    $("#tickerInfo").textContent=`${item.dataset.name} (${item.dataset.exchange})`;
    $("#tickerResults").style.display="none";
  }
});

stockForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!stockForm.ticker.value.trim()) return toast("Ticker is required");
  if(!stockForm.buyDate.value) return toast("Purchase date is required");
  if(!stockForm.buyPrice.value) return toast("Purchase price is required");
  if(!stockForm.quantity.value) return toast("Quantity is required");

  saving(true);
  try{
    const ticker=stockForm.ticker.value.toUpperCase().trim();
    const buyDate=stockForm.buyDate.value;
    const buyPrice=parseFloat(stockForm.buyPrice.value);
    const quantity=parseFloat(stockForm.quantity.value);
    const currency=stockForm.currency.value;
    const notes=stockForm.notes.value.trim();

    if(editingStock){
      await updateStock(editingStock.id,{ticker,buy_date:buyDate,buy_price:buyPrice,quantity,currency,notes});
      S.stocks=S.stocks.map(s=>s.id===editingStock.id?{...s,ticker,buy_date:buyDate,buy_price:buyPrice,quantity,currency,notes}:s);
      toast("Stock updated");
    }else{
      const result=await addStock(ticker,buyDate,buyPrice,quantity,currency,"","",notes);
      if(result) S.stocks=[result,...S.stocks];
      else throw new Error("Failed to add stock");
      toast("Stock added");
    }
    render();
    stockDlg.close();
  }catch(e){
    console.error(e);
    toast("Error: "+e.message);
  }finally{
    saving(false);
  }
});

$("#stockDelete").addEventListener("click",async()=>{
  if(!editingStock||!confirm("Delete this stock?")) return;
  saving(true);
  try{
    await deleteStock(editingStock.id);
    S.stocks=S.stocks.filter(s=>s.id!==editingStock.id);
    render();
    stockDlg.close();
    toast("Stock deleted");
  }catch(e){
    console.error(e);
    toast("Error: "+e.message);
  }finally{
    saving(false);
  }
});

$("#stockCancel").addEventListener("click",()=>stockDlg.close());
$("#stockDetailClose").addEventListener("click",()=>$("#stockDetailDlg").close());

// Edit stock handler
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-edit-stock]")){
    const stockId=e.target.closest("[data-edit-stock]").dataset.editStock;
    const stock=S.stocks.find(s=>s.id===stockId);
    if(stock) openStockDlg(stock);
  }

  if(e.target.closest("[data-stock-detail]")){
    const stockId=e.target.closest("[data-stock-detail]").dataset.stockDetail;
    const stock=S.stocks.find(s=>s.id===stockId);
    if(stock) await showStockChart(stock);
  }
});

// Show stock price chart
async function showStockChart(stock){
  $("#stockDetailTitle").textContent=stock.ticker;
  const priceData=await getStockPrice(stock.ticker);

  if(priceData){
    $("#stockDetailPrice").innerHTML=`$${priceData.price.toFixed(2)} (${stock.currency})`;
    const gain=priceData.price*stock.quantity-stock.buy_price*stock.quantity;
    const gainPct=(gain/(stock.buy_price*stock.quantity))*100;
    $("#stockDetailGain").innerHTML=`<span class="${gain>=0?"pos":"neg"}">${gain>=0?"+":"−"}${fmt(Math.abs(gain),stock.currency)} (${gainPct.toFixed(2)}%)</span>`;
  }else{
    $("#stockDetailPrice").textContent="Unable to fetch price";
    $("#stockDetailGain").textContent="—";
  }

  // Fetch historical data
  const history=await getStockHistory(stock.ticker,stock.buy_date,new Date().toISOString().split('T')[0]);

  if(history.length>0){
    baseOpts();
    mk("stockChart",{
      type:"line",
      data:{
        labels:history.map(h=>h.date),
        datasets:[{
          label:"Price ("+stock.currency+")",
          data:history.map(h=>h.price),
          borderColor:css("--accent"),
          backgroundColor:css("--accent")+"22",
          fill:true,
          tension:.3,
          pointRadius:2,
          borderWidth:2
        },{
          label:"Buy price",
          data:Array(history.length).fill(stock.buy_price),
          borderColor:css("--muted"),
          borderDash:[4,4],
          pointRadius:0,
          borderWidth:1,
          fill:false
        }]
      },
      options:{
        maintainAspectRatio:false,
        interaction:{mode:"index",intersect:false},
        plugins:{
          legend:{position:"top",labels:{boxWidth:10}},
          tooltip:{...tip(),callbacks:{label:c=>`${c.dataset.label}: ${c.raw.toFixed(2)}`}}
        },
        scales:{
          y:{ticks:{callback:v=>"$"+v.toFixed(2)},grid:{color:css("--border")}},
          x:{grid:{display:false}}
        }
      }
    });
    $("#stockChartInfo").textContent=`Price from ${history[0].date} to ${history[history.length-1].date}`;
  }else{
    $("#stockChart").style.display="none";
    $("#stockChartInfo").textContent="No historical data available yet. Check back soon!";
  }

  $("#stockDetailDlg").showModal();
}

// Banner close handler
document.addEventListener("DOMContentLoaded",()=>{
  const bannerClose=document.getElementById("bannerClose");
  if(bannerClose) bannerClose.addEventListener("click",()=>document.getElementById("topBanner").style.display="none");
});

(function boot(){
  const th=lsGet("vv.theme"); if(th) document.documentElement.dataset.theme=th;
  const params=new URLSearchParams(location.search+"&"+location.hash.slice(1));
  if(location.protocol==="file:"){ show("auth"); authMsg("Open Vault & Vine through a web address (e.g. http://localhost:5173), not as a file — sign-in can't return to a file. See README.","err"); }
  if(!sb){ show("auth"); authMsg("Couldn't load the sign-in library. Check your internet connection and reload.","err"); return; }
  if(params.get("error_description")){ show("auth"); authMsg(params.get("error_description"),"err"); }
  // Supabase fires INITIAL_SESSION on load, then SIGNED_IN / SIGNED_OUT later.
  sb.auth.onAuthStateChange((event,session)=>{
    setTimeout(()=>{ // never await Supabase calls inside this callback
      if(session?.user) start(session.user); else signedOut();
    },0);
  });
})();
