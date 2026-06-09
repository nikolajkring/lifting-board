const CONFIG={
  csvUrl:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRn0sQFifBYHHP6XtvgnVYQG5NRUP2PZEau0pS7O-qAyAPVKU5mKknJdyGtli1wqYXT82BMayCeSaGW/pub?gid=564549302&single=true&output=csv",
  pollInterval:30000,rotateInterval:12000,TOP:5
};
const LIFTS=[
  {key:"squat",label:"SQUAT",class:"squat-bg"},
  {key:"bench",label:"BENCH",class:"bench-bg"},
  {key:"dead", label:"DEADLIFT", class:"dead-bg"}
];
const WEIGHT_CLASSES={
  men:  ["Below 66 kg","Below 74 kg","Below 83 kg","Below 93 kg","Below 105 kg","105 kg and above"],
  women:["Below 57 kg","Below 63 kg","Below 69 kg","Below 76 kg","Below 84 kg","84 kg and above"]
};
function normalizeWeightClass(v,g){
  const r=String(v||"").trim().toLowerCase().replace(/\s+/g," ");
  const m={men:{"below 66 kg":"Below 66 kg","66":"Below 66 kg","66 kg":"Below 66 kg","below 74 kg":"Below 74 kg","74":"Below 74 kg","74 kg":"Below 74 kg","below 83 kg":"Below 83 kg","83":"Below 83 kg","83 kg":"Below 83 kg","below 93 kg":"Below 93 kg","93":"Below 93 kg","93 kg":"Below 93 kg","below 105 kg":"Below 105 kg","105":"Below 105 kg","105 kg":"Below 105 kg","105 kg and above":"105 kg and above","open":"105 kg and above"},women:{"below 57 kg":"Below 57 kg","57":"Below 57 kg","57 kg":"Below 57 kg","below 63 kg":"Below 63 kg","63":"Below 63 kg","63 kg":"Below 63 kg","below 69 kg":"Below 69 kg","69":"Below 69 kg","69 kg":"Below 69 kg","below 76 kg":"Below 76 kg","76":"Below 76 kg","76 kg":"Below 76 kg","below 84 kg":"Below 84 kg","84":"Below 84 kg","84 kg":"Below 84 kg","84 kg and above":"84 kg and above","open":"84 kg and above"}};
  return (m[g]||{})[r]||r;
}
function parseCSVLine(line){const cells=[];let cur="",q=false;for(let i=0;i<line.length;i++){const c=line[i],n=line[i+1];if(c==='"'){if(q&&n==='"'){cur+='"';i++;}else q=!q;}else if(c===","&&!q){cells.push(cur.trim());cur="";}else cur+=c;}cells.push(cur.trim());return cells;}
function nh(h){return String(h||"").trim().toLowerCase().replace(/\s+/g," ");}
function gfv(row,fn){const k=Object.keys(row).find(fn);return k?row[k]:"";}
function pickWC(row,g){const s=gfv(row,h=>h.includes("weight class")&&h.includes(g));if(s)return normalizeWeightClass(s,g);return normalizeWeightClass(gfv(row,h=>h.includes("weight class")),g);}
function parseCSV(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2)return[];
  const headers=parseCSVLine(lines[0]).map(nh);
  const records=[];
  for(let i=1;i<lines.length;i++){
    const vals=parseCSVLine(lines[i]);if(!vals.length)continue;
    const row={};headers.forEach((h,idx)=>{row[h]=vals[idx]?vals[idx].trim():"";});
    const lt=gfv(row,h=>h.includes("exercise")||h.includes("lift"));
    const rl=String(lt||"").toLowerCase().trim();
    let lift=rl.includes("squat")?"squat":rl.includes("bench")?"bench":rl.includes("dead")?"dead":rl.replace(/\s+/g,"-").replace(/[^\w\-]/g,"");
    const sx=gfv(row,h=>h.includes("sex")||h.includes("gender"));
    const rg=(String(sx||"").toLowerCase()==="female"||String(sx||"").toLowerCase()==="women")?"women":"men";
    const wc=pickWC(row,rg);
    const wt=gfv(row,h=>h.includes("weight lifted")||(h.includes("weight")&&!h.includes("weight class")));
    const w=parseFloat(String(wt||"").replace(/[^\d.\-]/g,""));
    const date=gfv(row,h=>h.includes("timestamp")||h.includes("date"));
    const name=gfv(row,h=>h.includes("name"))||"Anonymous";
    if(lift&&wc&&Number.isFinite(w)&&w>0)records.push({gender:rg,weightClass:wc,lift,name,weight:w,date});
  }
  return records;
}
function structureData(records){
  const known=new Set(LIFTS.map(l=>l.key));
  records.forEach(r=>{if(!known.has(r.lift)){LIFTS.push({key:r.lift,label:r.lift.toUpperCase(),class:"dead-bg"});known.add(r.lift);}});
  const s={men:{},women:{}};
  ["men","women"].forEach(g=>{LIFTS.forEach(l=>{s[g][l.key]={};WEIGHT_CLASSES[g].forEach(wc=>{s[g][l.key][wc]=[];});});});
  records.forEach(r=>{if(s[r.gender]?.[r.lift])s[r.gender][r.lift][r.weightClass]?.push(r);});
  ["men","women"].forEach(g=>{LIFTS.forEach(l=>{WEIGHT_CLASSES[g].forEach(wc=>{const a=s[g][l.key][wc];if(a){a.sort((a,b)=>b.weight-a.weight);s[g][l.key][wc]=a.slice(0,CONFIG.TOP);}});});});
  return s;
}
function renderTable(gender,records){
  const c=document.getElementById("board-"+gender);if(!c)return;c.innerHTML="";
  const cls=WEIGHT_CLASSES[gender];
  const t=document.createElement("table");
  const thead=document.createElement("thead");
  const tr=document.createElement("tr");
  const th0=document.createElement("th");th0.className="corner";tr.appendChild(th0);
  cls.forEach(wc=>{const th=document.createElement("th");th.className="wc";th.textContent=wc;tr.appendChild(th);});
  thead.appendChild(tr);t.appendChild(thead);
  const tbody=document.createElement("tbody");
  LIFTS.forEach(lift=>{
    const row=document.createElement("tr");row.className="row-"+lift.key;
    const tdl=document.createElement("td");tdl.className="lift-col";
    const b=document.createElement("div");b.className="lift-badge "+lift.class;b.textContent=lift.label;tdl.appendChild(b);row.appendChild(tdl);
    cls.forEach(wc=>{
      const td=document.createElement("td");td.className="cell";
      const inner=document.createElement("div");inner.className="cell-inner";
      const recs=(records[gender][lift.key]||{})[wc]||[];
      for(let i=0;i<CONFIG.TOP;i++){
        const slot=document.createElement("div");
        if(i<recs.length){
          const r=recs[i];slot.className="slot";
          const dateOnly=r.date.split(" ")[0]||r.date;
          slot.innerHTML='<span class="rn">'+( i+1)+'</span><div class="si"><div class="sn">'+esc(r.name)+'</div><div class="sw"><span class="sk">'+r.weight+'</span><span class="su">kg</span></div></div><span class="sd">'+dateOnly+'</span>';
        }else{slot.className="empty-slot";slot.innerHTML='<span class="en">'+( i+1)+'</span><span class="ed">—</span>';}
        inner.appendChild(slot);
      }
      td.appendChild(inner);row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  t.appendChild(tbody);c.appendChild(t);
}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function setStatus(live,text){
  const dot=document.getElementById("dot"),txt=document.getElementById("status-txt");
  if(!dot||!txt)return;
  const was=dot.classList.contains("live");
  dot.className=live?"dot live":"dot";
  if(was&&live&&txt.textContent!=="Loading\u2026"&&txt.textContent!==text)showToast();
  txt.textContent=text;
}
function showToast(){const t=document.getElementById("toast");if(!t)return;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000);}
let cache=null;
async function fetchAndRender(){
  try{
    const res=await fetch(CONFIG.csvUrl+"&t="+Date.now(),{cache:"no-store"});
    if(!res.ok)throw new Error();
    const csv=await res.text();
    cache=structureData(parseCSV(csv));
    renderTable("men",cache);renderTable("women",cache);
    setStatus(true,"Live");
  }catch(e){
    if(cache){renderTable("men",cache);renderTable("women",cache);}
    setStatus(false,"Offline");
  }
}
let currentGender="men";
function showGender(g){
  currentGender=g;
  document.getElementById("panel-men").classList.toggle("active",g==="men");
  document.getElementById("panel-women").classList.toggle("active",g==="women");
  const pill=document.getElementById("gender-indicator");
  pill.textContent=g==="men"?"MEN'S DIVISION":"WOMEN'S DIVISION";
  pill.className="gender-pill "+g;
}
// Init
cache=structureData([]);
renderTable("men",cache);renderTable("women",cache);
fetchAndRender();
setInterval(()=>showGender(currentGender==="men"?"women":"men"),CONFIG.rotateInterval);
setInterval(fetchAndRender,CONFIG.pollInterval);
