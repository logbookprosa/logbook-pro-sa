import { useState, useEffect, useRef } from "react";

// -- App identity --------------------------------------------------------------
const APP_NAME    = "Logbook Pro SA";
const APP_NAME_SHORT = "Logbook Pro";
const APP_TAGLINE = "SA's #1 Vehicle Logbook";
const APP_VERSION = "1.0.0";
const APP_BUILD  = "Beta 1";

// Brand colours extracted from logo artwork
const BRAND = {
  navy:   "#0d1b35",   // dark background
  blue:   "#1a6bc4",   // shield/primary blue
  blueMid:"#2282e0",   // mid blue
  green:  "#5cb85c",   // checkmark green
  orange: "#e87722",   // location pin / SA accent
  white:  "#ffffff",
  gradient: "linear-gradient(135deg,#0d1b35 0%,#1a6bc4 60%,#2282e0 100%)",
  splashGrad: "linear-gradient(160deg,#0d1b35 0%,#1a6bc4 35%,#2ea8e0 65%,#e87722 100%)",
};

// -- Logo mark SVG (shield + car + pin + checkmark - matches artwork) ----------
function LogoMark({size=48}){
  return(
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield body */}
      <path d="M50 8 L88 22 L88 55 Q88 80 50 94 Q12 80 12 55 L12 22 Z" fill="#1a6bc4"/>
      <path d="M50 14 L82 26 L82 55 Q82 76 50 88 Q18 76 18 55 L18 26 Z" fill="#2282e0"/>
      {/* Green checkmark wings */}
      <path d="M18 38 Q34 28 50 38 Q66 28 82 38" stroke="#5cb85c" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Green checkmark tick */}
      <path d="M30 52 L44 65 L68 40" stroke="#5cb85c" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Car silhouette */}
      <rect x="28" y="63" width="44" height="18" rx="4" fill="white" opacity="0.92"/>
      <path d="M34 63 L38 54 L62 54 L66 63 Z" fill="white" opacity="0.92"/>
      <circle cx="37" cy="81" r="4" fill="#1a6bc4"/>
      <circle cx="63" cy="81" r="4" fill="#1a6bc4"/>
      {/* Location pin */}
      <circle cx="50" cy="18" r="8" fill="#e87722"/>
      <path d="M50 26 L46 32 Q50 38 54 32 Z" fill="#e87722"/>
      <circle cx="50" cy="18" r="3" fill="white"/>
    </svg>
  );
}

// Inline wordmark for header (Logbook Pro SA with brand colours)
function WordMark({dark=false}){
  const base=dark?"#ffffff":"#0d1b35";
  return(
    <div style={{display:"flex",alignItems:"baseline",gap:0,lineHeight:1}}>
      <span style={{fontWeight:800,fontSize:18,color:base,letterSpacing:-0.5}}>Logbook</span>
      <span style={{fontWeight:800,fontSize:18,color:"#5cb85c",marginLeft:5,letterSpacing:-0.5}}>Pro</span>
      <span style={{fontWeight:800,fontSize:13,color:"#e87722",marginLeft:4,letterSpacing:0}}>SA</span>
    </div>
  );
}
// FREE:  1 vehicle, trips/fuel/service, basic dashboard, CSV export, backup
// PRO:   unlimited vehicles, fleet overview, document vault, claims tracker,
//        cost categories, SARS calculator, maintenance predictions, tyre tracker
const PLAN_LIMITS = { free: { vehicles: 1, docs: 5 }, pro: { vehicles: 99, docs: 999 } };

// -- Helpers -------------------------------------------------------------------
const today  = () => new Date().toISOString().split("T")[0];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt    = n => { const [i,d]=Number(n||0).toFixed(2).split("."); return "R "+i.replace(/\B(?=(\d{3})+(?!\d))/g," ")+"."+d; };
const fmtKm  = n => { const [i,d]=Number(n||0).toFixed(1).split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g," ")+"."+d; };
const fmtN   = n => Math.round(Number(n||0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ");
const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

function load(k,d){try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v));}
function daysUntil(d){if(!d)return null;return Math.ceil((new Date(d)-new Date(today()))/86400000);}
function expiryBadge(d){
  const n=daysUntil(d);if(n===null)return null;
  if(n<0)  return{label:`EXPIRED ${Math.abs(n)}d ago`,color:"#cc2222",bg:"#fff0f0",icon:"🚨"};
  if(n<=60)return{label:`${n} days left`,             color:"#b85c00",bg:"#fff8ee",icon:"⚠️"};
  return        {label:`${n} days left`,             color:"#1a7a48",bg:"#f0faf4",icon:"✅"};
}
function taxYearRange(l){if(l==="all")return{start:"0000-01-01",end:"9999-12-31"};const y=Number(l);return{start:`${y-1}-03-01`,end:`${y}-02-28`};}
function inRange(d,r){if(!d)return false;return d>=r.start&&d<=r.end;}
function buildTaxYears(){const n=new Date();const c=n.getMonth()>=2?n.getFullYear()+1:n.getFullYear();const y=["all"];for(let i=c;i>=c-5;i--)y.push(String(i));return y;}

// -- Constants -----------------------------------------------------------------
const SARS_RATES=[
  {maxKm:8000,   fixed:26023, fuel:116.7,maint:42.7},
  {maxKm:16000,  fixed:46043, fuel:122.7,maint:46.1},
  {maxKm:24000,  fixed:60261, fuel:122.7,maint:47.3},
  {maxKm:32000,  fixed:74373, fuel:129.4,maint:50.4},
  {maxKm:40000,  fixed:90594, fuel:133.1,maint:54.2},
  {maxKm:48000,  fixed:103523,fuel:133.1,maint:55.9},
  {maxKm:56000,  fixed:118457,fuel:133.1,maint:56.8},
  {maxKm:Infinity,fixed:132350,fuel:147.0,maint:63.5},
];
function getSarsRate(km){return SARS_RATES.find(r=>km<=r.maxKm)||SARS_RATES[SARS_RATES.length-1];}

const SVC=[
  {id:"minor",  label:"Minor Service",     km:15000,desc:"Oil, oil filter, tyre rotation, fluid top-up"},
  {id:"major",  label:"Major Service",     km:30000,desc:"Full service — filters, spark plugs, belts, brakes"},
  {id:"brakes", label:"Brake Pads & Discs",km:40000,desc:"Inspect and replace brake pads/discs as needed"},
  {id:"tyres",  label:"Tyre Replacement",  km:60000,desc:"Replace all 4 tyres or as condition requires"},
  {id:"cambelt",label:"Cam/Timing Belt",   km:90000,desc:"Replace timing belt and water pump"},
  {id:"custom", label:"Custom / Repair",   km:0,    desc:""},
];
const TYRE_POSITIONS=["Front Left","Front Right","Rear Left","Rear Right","Spare"];
const TYRE_STATUS=t=>{const n=Number(t||0);
  if(n<=0)return{label:"Unknown", color:"#888",  bg:"#f3f4f9",icon:"⬜"};
  if(n<=2)return{label:"Replace!",color:"#cc2222",bg:"#fff0f0",icon:"🔴"};
  if(n<=4)return{label:"Low",     color:"#b85c00",bg:"#fff8ee",icon:"🟠"};
  if(n<=6)return{label:"Wear Soon",color:"#d4820a",bg:"#fffbea",icon:"🟡"};
  return       {label:"Good",    color:"#1a7a48",bg:"#f0faf4",icon:"🟢"};
};
const VEHICLE_TYPES=["Car","Bakkie","Truck","Trailer","Motorcycle","Other"];
const VEHICLE_ICONS={Car:"🚗",Bakkie:"🛻",Truck:"🚛",Trailer:"🚜",Motorcycle:"🏍️",Other:"🚙"};
const VEHICLE_COLORS=["#2c5fff","#1a7a48","#b85c00","#8a1a6c","#cc2222","#1a52cc","#4a1a8c","#555"];
const LICENCE_CODES=["Code 8","Code EB","Code 10","Code 14","Code EC","Code EC1"];
const PDP_TYPES=["None","PDP – Goods","PDP – Passengers","PDP – Dangerous Goods"];
const COST_CATS=[
  {id:"fuel",    label:"Fuel",             icon:"⛽",color:"#1a7a48"},
  {id:"service", label:"Service / Repair", icon:"🔧",color:"#6a2ccc"},
  {id:"tyres",   label:"Tyres",            icon:"🔵",color:"#1a52cc"},
  {id:"licence", label:"Licence Renewal",  icon:"📋",color:"#b85c00"},
  {id:"insure",  label:"Insurance Premium",icon:"🛡️",color:"#cc2222"},
  {id:"rwc",     label:"Roadworthy (RWC)", icon:"✅",color:"#1a7a48"},
  {id:"other",   label:"Other",            icon:"📌",color:"#555"},
];
const CLAIM_STATUS=["Pending","Submitted","In Assessment","Approved","Rejected","Closed"];
const DOC_CATS=[
  {id:"vlic",    label:"Vehicle Licence",      icon:"📋"},
  {id:"ins",     label:"Insurance Documents",  icon:"🛡️"},
  {id:"dlic",    label:"Driver's Licence",     icon:"🪪"},
  {id:"rwc",     label:"Roadworthy Certificate",icon:"✅"},
  {id:"invoice", label:"Service Invoices",     icon:"🧾"},
  {id:"warranty",label:"Warranty Documents",   icon:"📄"},
  {id:"accident",label:"Accident Damage",      icon:"📸"},
  {id:"other",   label:"Other Documents",      icon:"📁"},
];

// All tabs - free users see a subset
const ALL_TABS=[
  {id:"dashboard",icon:"🏠",label:"Home",     free:true},
  {id:"vehicles", icon:"🚗",label:"Vehicles", free:true},
  {id:"trips",    icon:"📍",label:"Trips",    free:true},
  {id:"fuel",     icon:"⛽",label:"Fuel",     free:true},
  {id:"service",  icon:"🔧",label:"Service",  free:true},
  {id:"costs",    icon:"💳",label:"Costs",    free:false},
  {id:"claims",   icon:"📋",label:"Claims",   free:false},
  {id:"tyres",    icon:"🔵",label:"Tyres",    free:false},
  {id:"docs",     icon:"📂",label:"Docs",     free:false},
  {id:"sars",     icon:"🧮",label:"SARS",     free:false},
  {id:"export",   icon:"📊",label:"Export",   free:true},
];

// Free users get 6 tabs: Home, Vehicles, Trips, Fuel, Service, Export
// Pro users get all 11 tabs split across two rows via a "More" overflow
const FREE_TABS  = ALL_TABS.filter(t=>t.free);
const PRO_ROW1   = ALL_TABS.slice(0,6);   // Home → Service
const PRO_ROW2   = ALL_TABS.slice(6);     // Costs → Export

const BLANK_VEHICLE=(colorIdx=0)=>({
  id:uid(),make:"",model:"",year:"",vehicleType:"Car",reg:"",vinNo:"",fuelType:"",
  licenceExpiry:"",rwcExpiry:"",currentOdometer:"",
  color:VEHICLE_COLORS[colorIdx%VEHICLE_COLORS.length],
  driver:{licenceNo:"",licenceCode:"Code EB",licenceExpiry:"",pdpType:"None",pdpNo:"",pdpExpiry:""},
  insurance:{insurer:"",policyNo:"",broker:"",brokerPhone:"",emergencyContact:"",emergencyPhone:"",renewalDate:"",accidentSteps:""},
  tyres:TYRE_POSITIONS.map(pos=>({pos,brand:"",size:"",tread:"",pressure:"",lastChanged:"",notes:""})),
  reminders:[],docs:[],
  driverInfo:{name:"",phone:"",department:"",employeeId:""},
});

// -- Maintenance Prediction ----------------------------------------------------
function getMaintPredictions(services,trips,curOdom){
  if(!curOdom||trips.length<2)return[];
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
  const recent=trips.filter(t=>t.date&&new Date(t.date)>=cutoff);
  const recentKm=recent.reduce((s,t)=>s+(Number(t.odomEnd||0)-Number(t.odomStart||0)),0);
  const daily=recentKm>0?recentKm/90:0;
  if(daily<=0)return[];
  const out=[];
  SVC.filter(s=>s.km>0).forEach(def=>{
    const latest=[...services].filter(s=>s.type===def.id).sort((a,b)=>Number(b.odomAtService||0)-Number(a.odomAtService||0))[0];
    const next=latest?Number(latest.nextOdomDue||0):(curOdom+def.km);
    if(!next)return;
    const kl=next-curOdom;
    if(kl>def.km)return;
    out.push({label:def.label,kmLeft:kl,daysLeft:daily>0?Math.round(kl/daily):null,nextOdom:next,overdue:kl<0,urgent:kl>=0&&kl<=2000});
  });
  return out.sort((a,b)=>a.kmLeft-b.kmLeft);
}

// -- CSV export ----------------------------------------------------------------
function doCSV(trips,fills,services,costs,claims,vehicle,taxYear,sarsDed,claimable,totKm,totB){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const range=taxYearRange(taxYear);
  const fT=trips.filter(t=>inRange(t.date,range));
  const fF=fills.filter(f=>inRange(f.date,range));
  const fS=services.filter(s=>inRange(s.date,range));
  const fC=costs.filter(c=>inRange(c.date,range));
  let c=`${APP_NAME} — SARS LOGBOOK\n${vehicle.make} ${vehicle.model} (${vehicle.reg}) — ${vehicle.vehicleType}\n\n`;
  const needsRWC=["Truck","Trailer"].includes(vehicle.vehicleType);
  c+="VEHICLE\n"+["Type","Make","Model","Year","Reg","VIN No","Lic Expiry",...(needsRWC?["RWC Expiry"]:[])] .map(q).join(",")+"\n";
  c+=[vehicle.vehicleType,vehicle.make,vehicle.model,vehicle.year,vehicle.reg,vehicle.vinNo,vehicle.licenceExpiry,...(needsRWC?[vehicle.rwcExpiry]:[])].map(q).join(",")+"\n\n";
  c+="DRIVER LICENCE\n"+["Lic No","Code","Expiry","PDP Type","PDP No","PDP Expiry"].map(q).join(",")+"\n";
  c+=[vehicle.driver?.licenceNo,vehicle.driver?.licenceCode,vehicle.driver?.licenceExpiry,vehicle.driver?.pdpType,vehicle.driver?.pdpNo,vehicle.driver?.pdpExpiry].map(q).join(",")+"\n\n";
  c+="TRIP LOG\n"+["Date","Description","Odo Start","Odo End","Distance (km)","Type","Notes"].map(q).join(",")+"\n";
  fT.forEach(t=>c+=[t.date,t.description,t.odomStart,t.odomEnd,fmtKm(Number(t.odomEnd||0)-Number(t.odomStart||0)),t.type,t.notes||""].map(q).join(",")+"\n");
  c+="\nFUEL LOG\n"+["Date","Odometer","Station","Fuel Type","Litres","Oil Cost (R)","Total Amount (R)","Cost per Litre (R)","Notes"].map(q).join(",")+"\n";
  fF.forEach(f=>{const fa=Number(f.totalAmount||0)-Number(f.oilCost||0);const cpl=Number(f.litres||0)>0?(fa/Number(f.litres||0)).toFixed(2):"";c+=[f.date,f.odometer,f.station||"",f.fuelType||"",parseFloat(Number(f.litres||0).toFixed(3)),Number(f.oilCost||0).toFixed(2),Number(f.totalAmount||0).toFixed(2),cpl,f.notes||""].map(q).join(",")+"\n";});
  c+="\nSERVICE LOG\n"+["Date","Type","Service Centre","Invoice No","Odometer","Cost (R)","Next Odo","Next Date","Notes"].map(q).join(",")+"\n";
  fS.forEach(s=>{const l=s.type==="custom"?s.customLabel:(SVC.find(x=>x.id===s.type)?.label||s.type);c+=[s.date,l,s.serviceCenter||"",s.invoiceNo||"",s.odomAtService,fmt(Number(s.cost||0)),s.nextOdomDue,s.nextDateDue,s.notes].map(q).join(",")+"\n";});
  c+="\nOTHER COSTS\n"+["Date","Category","Description","Amount (R)"].map(q).join(",")+"\n";
  fC.forEach(c2=>{const cat=COST_CATS.find(x=>x.id===c2.cat)?.label||c2.cat;c+=[c2.date,cat,c2.desc,fmt(Number(c2.amount||0))].map(q).join(",")+"\n";});
  if(claims.length){c+="\nINSURANCE CLAIMS\n"+["Accident Date","Claim No","Repair Cost","Status","Notes"].map(q).join(",")+"\n";claims.forEach(cl=>c+=[cl.accidentDate,cl.claimNo,fmt(Number(cl.repairCost||0)),cl.status,cl.notes].map(q).join(",")+"\n");}
  const mo={},fo={},so={},co={};
  fT.forEach(t=>{const m=t.date?.slice(0,7);if(!m)return;if(!mo[m])mo[m]={p:0,b:0};const k=Number(t.odomEnd||0)-Number(t.odomStart||0);t.type==="Private"?mo[m].p+=k:mo[m].b+=k;});
  fF.forEach(f=>{const m=f.date?.slice(0,7);if(!m)return;fo[m]=(fo[m]||0)+Number(f.totalAmount||0);});
  fS.forEach(s=>{const m=s.date?.slice(0,7);if(!m)return;so[m]=(so[m]||0)+Number(s.cost||0);});
  fC.forEach(c2=>{const m=c2.date?.slice(0,7);if(!m)return;co[m]=(co[m]||0)+Number(c2.amount||0);});
  c+="\nMONTHLY SUMMARY\n"+["Month","Private km","Business km","Total km","Fuel R","Service R","Other R","Total R"].map(q).join(",")+"\n";
  [...new Set([...Object.keys(mo),...Object.keys(fo),...Object.keys(so),...Object.keys(co)])].sort().forEach(m=>{const d=mo[m]||{p:0,b:0};c+=[m,fmtKm(d.p),fmtKm(d.b),fmtKm(d.p+d.b),fmt(fo[m]||0),fmt(so[m]||0),fmt(co[m]||0),fmt((fo[m]||0)+(so[m]||0)+(co[m]||0))].map(q).join(",")+"\n";});
  const tP=fT.reduce((s,t)=>t.type==="Private"?s+(Number(t.odomEnd||0)-Number(t.odomStart||0)):s,0);
  const tB2=fT.reduce((s,t)=>t.type==="Business"?s+(Number(t.odomEnd||0)-Number(t.odomStart||0)):s,0);
  const tF2=fF.reduce((s,f)=>s+Number(f.totalAmount||0),0);
  const tS2=fS.reduce((s,sv)=>s+Number(sv.cost||0),0);
  const tC2=fC.reduce((s,c2)=>s+Number(c2.amount||0),0);
  c+="\nYEAR TOTALS\n"+["Private km","Business km","Total km","Fuel+Extras R","Service R","Other R","Total Running Cost R"].map(q).join(",")+"\n";
  c+=[fmtKm(tP),fmtKm(tB2),fmtKm(tP+tB2),fmt(tF2),fmt(tS2),fmt(tC2),fmt(tF2+tS2+tC2)].map(q).join(",")+"\n";
  c+="\nSARS TRAVEL DEDUCTION ESTIMATE\n"+["Total km","Business km","Business %","Estimated Deduction (R)","Claimable (R)"].map(q).join(",")+"\n";
  c+=[fmtKm(totKm),fmtKm(totB),(totKm>0?(totB/totKm*100).toFixed(1):0)+"%",fmt(sarsDed),fmt(claimable)].map(q).join(",")+"\n";
  const blob=new Blob([c],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`LogbookProSA_${vehicle.reg||"logbook"}_${taxYear}.csv`;a.click();URL.revokeObjectURL(url);
}

// -- UI atoms ------------------------------------------------------------------
function Card({children,style={}}){return <div style={{background:"#fff",borderRadius:16,padding:"18px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",marginBottom:14,...style}}>{children}</div>;}
function ST({children}){return <h2 style={{fontSize:11,fontWeight:700,color:"#9aa",letterSpacing:1.5,textTransform:"uppercase",margin:"20px 0 8px"}}>{children}</h2>;}
function Badge({type}){return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:type==="Business"?"#d4f5e2":"#fce8d5",color:type==="Business"?"#1a7a48":"#b85c00"}}>{type}</span>;}
function Tile({label,value,sub,bg,color}){return <div style={{background:bg,borderRadius:12,padding:"10px 12px"}}><div style={{fontSize:10,color:"#888",marginBottom:2}}>{label}</div><div style={{fontSize:14,fontWeight:800,color}}>{value}</div>{sub&&<div style={{fontSize:10,color:"#aaa",marginTop:1}}>{sub}</div>}</div>;}
function InfoRow({label,value,children}){return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}><span style={{fontSize:12,color:"#888"}}>{label}</span><div style={{textAlign:"right"}}>{value?<span style={{fontSize:13,fontWeight:600,color:"#1e2235"}}>{value}</span>:<span style={{color:"#ccc",fontSize:13}}>—</span>}{children}</div></div>;}
function ExpiryChip({dateStr}){const st=expiryBadge(dateStr);if(!st)return null;return <span style={{fontSize:11,fontWeight:700,color:st.color,background:st.bg,padding:"2px 8px",borderRadius:20,marginLeft:6}}>{st.icon} {st.label}</span>;}
function ProBadge(){return <span style={{fontSize:9,fontWeight:800,background:"linear-gradient(135deg,#f0a500,#e06000)",color:"#fff",padding:"2px 6px",borderRadius:10,marginLeft:6,verticalAlign:"middle"}}>PRO</span>;}

const INP={width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e5e7ef",fontSize:14,background:"#f8f9fc",color:"#1e2235",outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const LBL={fontSize:12,fontWeight:600,color:"#6b7080",marginBottom:4,display:"block"};
const G2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:10};
const S2={gridColumn:"span 2"};

function PhotoPicker({value,onChange,label="📷 Photo / Scan (optional)"}){
  const r=useRef();
  const pick=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=ev=>onChange(ev.target.result);rd.readAsDataURL(f);};
  return(<div><label style={LBL}>{label}</label>{value?<div style={{position:"relative",marginTop:8}}><img src={value} alt="img" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:10,border:"1.5px solid #e5e7ef"}}/><button onClick={()=>onChange("")} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.55)",border:"none",borderRadius:20,color:"#fff",fontSize:13,padding:"2px 8px",cursor:"pointer",fontFamily:"inherit"}}>✕</button></div>:<button onClick={()=>r.current.click()} style={{...INP,color:"#888",textAlign:"left",cursor:"pointer",border:"1.5px dashed #ccd"}}>Tap to attach photo or scan</button>}<input ref={r} type="file" accept="image/*" style={{display:"none"}} onChange={pick}/></div>);
}
function TyreWheel({tread,label,onClick}){const st=TYRE_STATUS(tread);return(<div onClick={onClick} style={{cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:44,height:66,borderRadius:8,background:st.bg,border:`3px solid ${st.color}`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:12,fontWeight:800,color:st.color}}>{tread?tread+"mm":"?"}</div></div><div style={{fontSize:9,color:"#888",textAlign:"center",maxWidth:50}}>{label}</div><div style={{fontSize:9,fontWeight:700,color:st.color}}>{st.label}</div></div>);}

// -- Trip List View ------------------------------------------------------------
function TripList({ trips, onBack }) {
  if (!trips || trips.length === 0) {
    return (
      <div style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "#eef2ff", border: "none", borderRadius: 10, padding: "8px 14px", color: "#2c5fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e2235" }}>All Trips</div>
        </div>
        <div style={{ textAlign: "center", color: "#bbb", fontSize: 14, marginTop: 40 }}>No trips logged yet.</div>
      </div>
    );
  }
  const sorted = [...trips].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalKM = sorted.reduce((sum, t) => sum + (Number(t.odomEnd || 0) - Number(t.odomStart || 0)), 0);
  const totalBiz = sorted.filter(t => t.type === "Business").reduce((sum, t) => sum + (Number(t.odomEnd || 0) - Number(t.odomStart || 0)), 0);
  const totalPriv = sorted.filter(t => t.type === "Private").reduce((sum, t) => sum + (Number(t.odomEnd || 0) - Number(t.odomStart || 0)), 0);
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "#eef2ff", border: "none", borderRadius: 10, padding: "8px 14px", color: "#2c5fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e2235" }}>All Trips</div>
          <div style={{ fontSize: 11, color: "#888" }}>{trips.length} trip{trips.length !== 1 ? "s" : ""} recorded</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "#eef2ff", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Total KM</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#2c5fff" }}>{fmtKm(totalKM)}</div>
        </div>
        <div style={{ background: "#d4f5e2", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Business</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a7a48" }}>{fmtKm(totalBiz)}</div>
        </div>
        <div style={{ background: "#fce8d5", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Private</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#b85c00" }}>{fmtKm(totalPriv)}</div>
        </div>
      </div>
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f9" }}>
              {["Date","Description","Odo Start","Odo End","KM","Type","Notes"].map(h => (
                <th key={h} style={{ padding: "10px 8px", textAlign: "left", fontWeight: 700, color: "#6b7080", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((trip, index) => {
              const prevTrip = sorted[index - 1];
              const hasGap = prevTrip && Number(trip.odomStart) !== Number(prevTrip.odomEnd);
              const km = Number(trip.odomEnd || 0) - Number(trip.odomStart || 0);
              return (
                <tr key={trip.id || index} style={{ backgroundColor: hasGap ? "#fff3cd" : index % 2 === 0 ? "#fff" : "#fafbfc", borderTop: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "9px 8px", whiteSpace: "nowrap", color: "#1e2235", fontWeight: 600 }}>{trip.date}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 11, color: "white", fontWeight: 700, background: trip.type === "Business" ? "#1a6bc4" : "#e87722", whiteSpace: "nowrap" }}>
                      {trip.type}
                    </span>
                  </td>
                  <td style={{ padding: "9px 8px", color: "#555", maxWidth: 140 }}>{trip.description || "—"}</td>
                  <td style={{ padding: "9px 8px", color: "#888", whiteSpace: "nowrap" }}>{fmtN(trip.odomStart)}</td>
                  <td style={{ padding: "9px 8px", color: "#888", whiteSpace: "nowrap" }}>{fmtN(trip.odomEnd)}</td>
                  <td style={{ padding: "9px 8px", fontWeight: 700, color: "#2c5fff", whiteSpace: "nowrap" }}>{fmtKm(km)}</td>
                  <td style={{ padding: "9px 8px", color: "#888", maxWidth: 120 }}>
                    {trip.notes || "—"}
                    {hasGap && <div style={{ fontSize: 10, color: "#b85c00", fontWeight: 700, marginTop: 2 }}>⚠️ ODO gap before this trip</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 10, textAlign: "center" }}>🟡 Yellow rows indicate an odometer gap from the previous trip</div>
    </div>
  );
}

// -- Pro Gate ------------------------------------------------------------------
function ProGate({feature,onUpgrade}){
  return(
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><LogoMark size={56}/></div>
      <div style={{fontWeight:800,fontSize:18,color:BRAND.navy,marginBottom:8}}>Pro Feature</div>
      <div style={{fontSize:14,color:"#666",marginBottom:24,lineHeight:1.6}}><b>{feature}</b> is included in <span style={{color:BRAND.green,fontWeight:700}}>Logbook Pro SA</span>.</div>
      <button onClick={onUpgrade} style={{padding:"14px 32px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${BRAND.orange},#c45e00)`,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 16px ${BRAND.orange}66`}}>
        Upgrade to Pro
      </button>
      <div style={{fontSize:11,color:"#aaa",marginTop:10}}>Fleet management · Document vault · SARS calculator & more</div>
    </div>
  );
}

// -- Onboarding ----------------------------------------------------------------
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({make:"",model:"",year:"",reg:"",vehicleType:"Car"});
  const steps=[
    {title:"Welcome to Logbook Pro SA",sub:"SA's most complete vehicle & fleet logbook. SARS-ready, always with you.",action:null},
    {title:"What do you drive?",sub:"Set up your first vehicle to get started.",action:"vehicle"},
    {title:"You're all set! 🎉",sub:"Start logging trips, fuel, services and more.",action:null},
  ];
  const cur=steps[step];
  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:BRAND.splashGrad,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",color:"#fff"}}>

      {/* Splash logo — step 0 only */}
      {step===0&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
          {/* Pin-shaped logo container matching splash screen artwork */}
          <div style={{position:"relative",marginBottom:16}}>
            <div style={{width:110,height:130,background:"linear-gradient(160deg,#fff 0%,#e0efff 100%)",borderRadius:"50% 50% 48% 48% / 40% 40% 60% 60%",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
              <LogoMark size={80}/>
            </div>
            <div style={{position:"absolute",bottom:-10,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"18px solid transparent",borderRight:"18px solid transparent",borderTop:"22px solid #e87722"}}/>
          </div>
          <div style={{marginTop:18,textAlign:"center"}}>
            <div style={{fontSize:32,fontWeight:900,letterSpacing:-1,lineHeight:1.1}}>
              <span style={{color:"#fff"}}>Logbook</span>
              <span style={{color:"#5cb85c",marginLeft:6}}>Pro</span>
              <span style={{color:"#e87722",fontSize:22,marginLeft:5}}>SA</span>
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4,letterSpacing:1}}>{APP_TAGLINE.toUpperCase()}</div>
          </div>
        </div>
      )}

      {step>0&&(
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <LogoMark size={36}/>
          <WordMark dark/>
        </div>
      )}

      <div style={{fontSize:9,letterSpacing:2,fontWeight:700,opacity:0.5,marginBottom:10,textTransform:"uppercase"}}>v{APP_VERSION} ({APP_BUILD})</div>
      <div style={{fontSize:step===0?22:24,fontWeight:800,textAlign:"center",marginBottom:8,lineHeight:1.2}}>{cur.title}</div>
      <div style={{fontSize:14,opacity:0.8,textAlign:"center",marginBottom:28,lineHeight:1.6,maxWidth:300}}>{cur.sub}</div>

      {cur.action==="vehicle"&&(
        <div style={{width:"100%",background:"rgba(255,255,255,0.12)",borderRadius:16,padding:"20px 16px",marginBottom:24}}>
          <div style={G2}>
            <div style={S2}>
              <label style={{...LBL,color:"rgba(255,255,255,0.7)"}}>Vehicle Type</label>
              <select style={{...INP,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)"}} value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}>
                {VEHICLE_TYPES.map(t=><option key={t} style={{color:"#1e2235"}}>{t}</option>)}
              </select>
            </div>
            <div><label style={{...LBL,color:"rgba(255,255,255,0.7)"}}>Make</label><input style={{...INP,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)"}} placeholder="Toyota" value={form.make} onChange={e=>setForm({...form,make:e.target.value})}/></div>
            <div><label style={{...LBL,color:"rgba(255,255,255,0.7)"}}>Model</label><input style={{...INP,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)"}} placeholder="Hilux" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
            <div><label style={{...LBL,color:"rgba(255,255,255,0.7)"}}>Year</label><input style={{...INP,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)"}} placeholder="2020" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></div>
            <div><label style={{...LBL,color:"rgba(255,255,255,0.7)"}}>Registration</label><input style={{...INP,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)"}} placeholder="GP 123-456" value={form.reg} onChange={e=>setForm({...form,reg:e.target.value})}/></div>
          </div>
        </div>
      )}

      <button onClick={()=>{
        if(step===steps.length-1){onComplete(cur.action==="vehicle"||step>=1?form:null);}
        else if(step===1&&cur.action==="vehicle"){if(!form.make&&!form.reg){alert("Please enter at least a make or registration.");return;}setStep(s=>s+1);}
        else setStep(s=>s+1);
      }} style={{width:"100%",maxWidth:320,padding:"15px",borderRadius:14,border:"none",background:"#fff",color:BRAND.navy,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
        {step===0?"Get Started →":step===1?"Continue →":"Start Logging →"}
      </button>
      {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:12,background:"none",border:"none",color:"rgba(255,255,255,0.6)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>}
      <div style={{display:"flex",gap:8,marginTop:24}}>
        {steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?BRAND.orange:"rgba(255,255,255,0.3)",transition:"width 0.25s"}}/>)}
      </div>
    </div>
  );
}

// -- Upgrade Modal -------------------------------------------------------------
function UpgradeModal({onClose,onUpgrade}){
  const features=[
    ["🚗","Multiple Vehicles","Manage your full fleet"],
    ["🧮","SARS Calculator","Auto deduction estimate"],
    ["📂","Document Vault","Store all vehicle docs"],
    ["📋","Claims Tracker","Track insurance claims"],
    ["💳","Cost Categories","Full running cost breakdown"],
    ["🔵","Tyre Tracker","Visual tyre health monitor"],
    ["🔮","Maintenance AI","Predict next service dates"],
    ["📊","Fleet Analytics","Compare vehicle costs"],
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><LogoMark size={56}/></div>
          <div style={{fontWeight:900,fontSize:22,marginBottom:2}}>
            <span style={{color:BRAND.navy}}>Logbook</span>
            <span style={{color:BRAND.green,marginLeft:5}}>Pro</span>
            <span style={{color:BRAND.orange,fontSize:16,marginLeft:4}}>SA</span>
          </div>
          <div style={{fontSize:13,color:"#666",lineHeight:1.6,marginTop:4}}>Unlock every feature. Built for SA drivers, fleet managers and business owners.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {features.map(([icon,title,desc])=>(
            <div key={title} style={{background:"#f8f9fc",borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:"#1e2235",marginBottom:2}}>{title}</div>
              <div style={{fontSize:10,color:"#888"}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{background:`linear-gradient(135deg,${BRAND.navy},${BRAND.blue})`,borderRadius:14,padding:"16px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>Beta Tester Price</div>
          <div style={{fontSize:28,fontWeight:800,color:"#fff",marginBottom:2}}>FREE during beta</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Full Pro access while you test the app</div>
        </div>
        <button onClick={onUpgrade} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${BRAND.orange},#c45e00)`,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",marginBottom:10,boxShadow:`0 4px 16px ${BRAND.orange}55`}}>
          ✨ Activate Pro (Free Beta)
        </button>
        <button onClick={onClose} style={{width:"100%",padding:"11px",borderRadius:12,border:"1.5px solid #e5e7ef",background:"#fff",color:"#888",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Maybe later</button>
      </div>
    </div>
  );
}

// -- Main App ------------------------------------------------------------------
export default function App(){
  // -- App meta state ------------------------------------------------------
  const [onboarded,setOnboarded]=useState(()=>load("lb_onboarded",false));
  const [plan,setPlan]=useState(()=>load("lb_plan","free")); // "free" | "pro"
  const [showUpgrade,setShowUpgrade]=useState(false);
  const isPro=plan==="pro";

  const [tab,setTab]=useState("dashboard");
  // FREE_TABS and PRO_ROW1/PRO_ROW2 are used directly in the nav

  const [vehicles,setVehicles]=useState(()=>{
    const v=load("lb_vehicles",null);if(v)return v;
    const old=load("lb_vehicle",null);
    if(old){const bv=BLANK_VEHICLE();return[{...bv,...old,vinNo:old.vinNo||old.engineNo||"",driver:{...bv.driver,...load("lb_driver",{}),licenceCode:load("lb_driver",{}).licenceType||"Code EB",pdpType:"None",pdpNo:"",pdpExpiry:""},insurance:load("lb_ins",bv.insurance),tyres:bv.tyres,reminders:[],docs:[],vehicleType:"Car",rwcExpiry:""}];}
    return[BLANK_VEHICLE()];
  });
  const [activeVid,setActiveVid]=useState(()=>{const v=load("lb_vehicles",null);return v?v[0]?.id:"";});
  const [trips,setTrips]=useState(()=>load("lb_trips",[]));
  const [fills,setFills]=useState(()=>load("lb_fills",[]));
  const [services,setServices]=useState(()=>load("lb_services",[]));
  const [costs,setCosts]=useState(()=>load("lb_costs",[]));
  const [claims,setClaims]=useState(()=>load("lb_claims",[]));
  const [taxYear,setTaxYear]=useState("all");
  const TAX_YEARS=buildTaxYears();
  const [tripSearch,setTripSearch]=useState("");

  const [vEdit,setVEdit]=useState(false);const [vDraft,setVDraft]=useState({});
  const [tripForm,setTripForm]=useState({date:today(),description:"",odomStart:"",odomEnd:"",type:"Business",notes:"",receipt:""});
  const [editTripId,setEditTripId]=useState(null);
  const BLANK_FILL=()=>({date:today(),odometer:"",station:"",fuelType:vehicle?.fuelType||"Diesel",litres:"",oilCost:"",totalAmount:"",notes:"",receipt:""});
  const [fillForm,setFillForm]=useState(BLANK_FILL());
  const [editFillId,setEditFillId]=useState(null);
  const [extraItem,setExtraItem]=useState({item:"",cost:""});
  const [svcForm,setSvcForm]=useState({date:today(),type:"minor",customLabel:"",serviceCenter:"",invoiceNo:"",odomAtService:"",nextOdomDue:"",nextDateDue:"",cost:"",notes:"",receipt:""});
  const [editSvcId,setEditSvcId]=useState(null);
  const BLANK_COST=()=>({date:today(),cat:"licence",desc:"",amount:"",receipt:""});
  const [costForm,setCostForm]=useState(BLANK_COST());
  const [editCostId,setEditCostId]=useState(null);
  const BLANK_CLAIM=()=>({accidentDate:today(),claimNo:"",repairCost:"",status:"Pending",notes:"",receipt:""});
  const [claimForm,setClaimForm]=useState(BLANK_CLAIM());
  const [editClaimId,setEditClaimId]=useState(null);
  const [tyreIdx,setTyreIdx]=useState(null);const [tyreDraft,setTyreDraft]=useState({});
  const [reminderForm,setReminderForm]=useState({title:"",dueDate:"",note:""});
  const [backupMsg,setBackupMsg]=useState("");
  const restoreRef=useRef();
  const [mapTrip,setMapTrip]=useState(null);
  const [docCat,setDocCat]=useState("vlic");
  const [docForm,setDocForm]=useState({label:"",data:"",date:today()});
  const [showSOS,setShowSOS]=useState(false);
  const [showTripList,setShowTripList]=useState(false);
  const [showFuelHistory,setShowFuelHistory]=useState(false);
  const [descWarn,setDescWarn]=useState(false);

  // -- Persist -------------------------------------------------------------
  useEffect(()=>{save("lb_vehicles",vehicles);},[vehicles]);
  useEffect(()=>{save("lb_trips",trips);},[trips]);
  useEffect(()=>{save("lb_fills",fills);},[fills]);
  useEffect(()=>{save("lb_services",services);},[services]);
  useEffect(()=>{save("lb_costs",costs);},[costs]);
  useEffect(()=>{save("lb_claims",claims);},[claims]);
  useEffect(()=>{save("lb_plan",plan);},[plan]);
  useEffect(()=>{save("lb_onboarded",onboarded);},[onboarded]);

  const vehicle=vehicles.find(v=>v.id===activeVid)||vehicles[0]||BLANK_VEHICLE();
  const setVehicle=upd=>setVehicles(vs=>vs.map(v=>v.id===upd.id?upd:v));

  const range=taxYearRange(taxYear);
  const vTrips   =trips.filter(t=>t.vehicleId===vehicle.id&&inRange(t.date,range));
  const vFills   =fills.filter(f=>f.vehicleId===vehicle.id&&inRange(f.date,range));
  const vServices=services.filter(s=>s.vehicleId===vehicle.id&&inRange(s.date,range));
  const vCosts   =costs.filter(c=>c.vehicleId===vehicle.id&&inRange(c.date,range));
  const vClaims  =claims.filter(c=>c.vehicleId===vehicle.id);

  // Filtered trips (search)
  const filteredTrips=tripSearch.trim()
    ?vTrips.filter(t=>[t.description,t.notes].join(" ").toLowerCase().includes(tripSearch.toLowerCase()))
    :vTrips;

  // -- Computed -------------------------------------------------------------
  const totP=vTrips.reduce((s,t)=>t.type==="Private"?s+(Number(t.odomEnd||0)-Number(t.odomStart||0)):s,0);
  const totB=vTrips.reduce((s,t)=>t.type==="Business"?s+(Number(t.odomEnd||0)-Number(t.odomStart||0)):s,0);
  const totKm=totP+totB;
  const totF=vFills.reduce((s,f)=>s+Number(f.totalAmount||0),0);
  const totS=vServices.reduce((s,sv)=>s+Number(sv.cost||0),0);
  const totLitres=vFills.reduce((s,f)=>s+Number(f.litres||0),0);
  const totOther=vCosts.reduce((s,c)=>s+Number(c.amount||0),0);
  const costByCat=Object.fromEntries(COST_CATS.map(c=>[c.id,vCosts.filter(x=>x.cat===c.id).reduce((s,x)=>s+Number(x.amount||0),0)]));
  const totRunning=totF+totS+totOther;
  const costPerKm=totKm>0?totRunning/totKm:0;
  const fuelEff=totKm>0&&totLitres>0?(totLitres/totKm)*100:0;
  const curOdom=Number(vehicle.currentOdometer||0);
  const vLic=expiryBadge(vehicle.licenceExpiry);
  const rwcExp=expiryBadge(vehicle.rwcExpiry);
  const dLic=expiryBadge(vehicle.driver?.licenceExpiry);
  const pdpExp=expiryBadge(vehicle.driver?.pdpExpiry);
  const insR=expiryBadge(vehicle.insurance?.renewalDate);
  const maintPreds=getMaintPredictions(vServices,vTrips,curOdom);
  const sarsRate=getSarsRate(totKm);
  const bizPct=totKm>0?totB/totKm:0;
  const sarsDed=(sarsRate.fixed*bizPct)+(sarsRate.fuel/100*totB)+(sarsRate.maint/100*totB);
  const claimable=Math.min(sarsDed,totRunning);
  const allMonthKeys=[...new Set([...vTrips.map(t=>t.date?.slice(0,7)),...vFills.map(f=>f.date?.slice(0,7)),...vServices.map(s=>s.date?.slice(0,7)),...vCosts.map(c=>c.date?.slice(0,7))].filter(Boolean))].sort().reverse();

  // Fleet
  const fleetTrips=trips.filter(t=>inRange(t.date,range));
  const fleetFills=fills.filter(f=>inRange(f.date,range));
  const fleetServices=services.filter(s=>inRange(s.date,range));
  const fleetCosts=costs.filter(c=>inRange(c.date,range));
  const fleetTotalKm=fleetTrips.reduce((s,t)=>s+(Number(t.odomEnd||0)-Number(t.odomStart||0)),0);
  const fleetTotalCost=fleetFills.reduce((s,f)=>s+Number(f.totalAmount||0),0)+fleetServices.reduce((s,sv)=>s+Number(sv.cost||0),0)+fleetCosts.reduce((s,c)=>s+Number(c.amount||0),0);
  const fleetCostPerKm=fleetTotalKm>0?fleetTotalCost/fleetTotalKm:0;
  const vehicleStats=vehicles.map(v=>{
    const vTA=trips.filter(t=>t.vehicleId===v.id&&inRange(t.date,range));
    const vFA=fills.filter(f=>f.vehicleId===v.id&&inRange(f.date,range));
    const vSA=services.filter(s=>s.vehicleId===v.id&&inRange(s.date,range));
    const vCA=costs.filter(c=>c.vehicleId===v.id&&inRange(c.date,range));
    const km=vTA.reduce((s,t)=>s+(Number(t.odomEnd||0)-Number(t.odomStart||0)),0);
    const total=vFA.reduce((s,f)=>s+Number(f.totalAmount||0),0)+vSA.reduce((s,sv)=>s+Number(sv.cost||0),0)+vCA.reduce((s,c)=>s+Number(c.amount||0),0);
    return{id:v.id,name:(`${v.make||""} ${v.model||""}`).trim()||v.reg||"Vehicle",reg:v.reg,km,total,costPerKm:km>0?total/km:0,color:v.color||VEHICLE_COLORS[0]};
  });
  const mostExpensive=[...vehicleStats].sort((a,b)=>b.costPerKm-a.costPerKm)[0];
  const cheapest=[...vehicleStats].sort((a,b)=>a.costPerKm-b.costPerKm)[0];
  const mostUsed=[...vehicleStats].sort((a,b)=>b.km-a.km)[0];

  // Alerts
  const alerts=[];
  if(vLic&&daysUntil(vehicle.licenceExpiry)<=60)         alerts.push({...vLic,label:"Vehicle Licence"});
  if(rwcExp&&["Truck","Trailer"].includes(vehicle.vehicleType)&&daysUntil(vehicle.rwcExpiry)<=60) alerts.push({...rwcExp,label:"Roadworthy (RWC)"});
  if(dLic&&daysUntil(vehicle.driver?.licenceExpiry)<=60)  alerts.push({...dLic,label:`Driver's Licence (${vehicle.driver?.licenceCode||""})`});
  if(pdpExp&&vehicle.driver?.pdpType!=="None"&&daysUntil(vehicle.driver?.pdpExpiry)<=60)alerts.push({...pdpExp,label:`PDP (${vehicle.driver?.pdpType})`});
  if(insR&&daysUntil(vehicle.insurance?.renewalDate)<=60) alerts.push({...insR,label:"Insurance Renewal"});
  maintPreds.filter(p=>p.overdue||p.urgent).forEach(p=>alerts.push({icon:p.overdue?"🚨":"🔧",color:p.overdue?"#cc2222":"#b85c00",bg:p.overdue?"#fff0f0":"#fff8ee",label:`${p.label}${p.overdue?` OVERDUE ${fmtN(Math.abs(p.kmLeft))} km`:`due in ${fmtN(p.kmLeft)} km${p.daysLeft!=null?` (~${p.daysLeft}d)`:""}`}`}));
  (vehicle.tyres||[]).forEach(t=>{const st=TYRE_STATUS(t.tread);if(t.tread&&Number(t.tread)<=4)alerts.push({icon:st.label==="Replace!"?"🚨":"⚠️",color:st.color,bg:st.bg,label:`${t.pos} tyre: ${st.label} (${t.tread}mm)`});});
  (vehicle.reminders||[]).filter(r=>!r.done).forEach(r=>{const d=daysUntil(r.dueDate);if(d!=null&&d<=7)alerts.push({icon:"🔔",color:d<0?"#cc2222":"#1a52cc",bg:d<0?"#fff0f0":"#eef6ff",label:`Reminder: ${r.title}${d<0?` (${Math.abs(d)}d overdue)`:`in ${d}d`}`});});

  // -- CRUD ----------------------------------------------------------------
  useEffect(()=>{
    const lastTrip=[...trips].filter(t=>t.vehicleId===vehicle.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    if(lastTrip&&!editTripId){setTripForm(f=>({...f,odomStart:lastTrip.odomEnd||""}));}
  },[vehicle.id]);

  const saveTrip=()=>{
    if(!tripForm.date||!tripForm.odomStart||!tripForm.odomEnd)return;
    if(Number(tripForm.odomEnd)<Number(tripForm.odomStart)){alert("❌ End odometer cannot be lower than start.");return;}
    if(!tripForm.description){setDescWarn(true);}else{setDescWarn(false);}
    const e={...tripForm,vehicleId:vehicle.id,id:editTripId||uid()};
    if(editTripId){setTrips(ts=>ts.map(t=>t.id===editTripId?e:t));setEditTripId(null);}
    else setTrips(ts=>[...ts,e]);
    setVehicle({...vehicle,currentOdometer:tripForm.odomEnd});
    setTripForm({date:today(),description:"",odomStart:"",odomEnd:"",type:"Business",notes:"",receipt:""});
  };
  const saveFill=()=>{
    if(!fillForm.date||!fillForm.odometer)return;
    if(Number(fillForm.litres)<=0){alert("❌ Litres must be greater than 0.");return;}
    if(Number(fillForm.totalAmount)<=0){alert("❌ Total amount must be greater than 0.");return;}
    if(Number(fillForm.oilCost)>0&&Number(fillForm.oilCost)>=Number(fillForm.totalAmount)){alert("❌ Oil cost must be less than total amount.");return;}
    const e={...fillForm,vehicleId:vehicle.id,id:editFillId||uid()};
    if(editFillId){setFills(fs=>fs.map(f=>f.id===editFillId?e:f));setEditFillId(null);}else setFills(fs=>[...fs,e]);
    setFillForm(BLANK_FILL());
  };
  const saveSvc=()=>{if(!svcForm.date)return;const e={...svcForm,vehicleId:vehicle.id,id:editSvcId||uid()};if(editSvcId){setServices(ss=>ss.map(s=>s.id===editSvcId?e:s));setEditSvcId(null);}else setServices(ss=>[...ss,e]);setSvcForm({date:today(),type:"minor",customLabel:"",serviceCenter:"",invoiceNo:"",odomAtService:"",nextOdomDue:"",nextDateDue:"",cost:"",notes:"",receipt:""});};
  const saveCost=()=>{if(!costForm.date||!costForm.amount)return;const e={...costForm,vehicleId:vehicle.id,id:editCostId||uid()};if(editCostId){setCosts(cs=>cs.map(c=>c.id===editCostId?e:c));setEditCostId(null);}else setCosts(cs=>[...cs,e]);setCostForm(BLANK_COST());};
  const saveClaim=()=>{if(!claimForm.accidentDate)return;const e={...claimForm,vehicleId:vehicle.id,id:editClaimId||uid()};if(editClaimId){setClaims(cs=>cs.map(c=>c.id===editClaimId?e:c));setEditClaimId(null);}else setClaims(cs=>[...cs,e]);setClaimForm(BLANK_CLAIM());};
  const saveTyre=()=>{const tyres=(vehicle.tyres||TYRE_POSITIONS.map(pos=>({pos,brand:"",size:"",tread:"",pressure:"",lastChanged:"",notes:""}))).map((t,i)=>i===tyreIdx?{...tyreDraft}:t);setVehicle({...vehicle,tyres});setTyreIdx(null);};
  const saveReminder=()=>{if(!reminderForm.title)return;setVehicle({...vehicle,reminders:[...(vehicle.reminders||[]),{...reminderForm,id:uid(),done:false}]});setReminderForm({title:"",dueDate:"",note:""});};
  const addExtra=()=>{if(!extraItem.item||!extraItem.cost)return;setFillForm(f=>({...f,extras:[...(f.extras||[]),{...extraItem,id:uid()}]}));setExtraItem({item:"",cost:""});};
  const removeExtra=id=>setFillForm(f=>({...f,extras:(f.extras||[]).filter(e=>e.id!==id)}));
  const saveDoc=()=>{if(!docForm.label||!docForm.data)return;setVehicle({...vehicle,docs:[...(vehicle.docs||[]),{...docForm,id:uid(),cat:docCat}]});setDocForm({label:"",data:"",date:today()});};
  const doBackup=()=>{const d={version:6,app:APP_NAME,exported:new Date().toISOString(),plan,vehicles,trips,fills,services,costs,claims};const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`LogbookProSA_backup_${today()}.json`;a.click();URL.revokeObjectURL(url);setBackupMsg("✅ Backup downloaded!");setTimeout(()=>setBackupMsg(""),3000);};
  const doRestore=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.vehicles)setVehicles(d.vehicles);if(d.trips)setTrips(d.trips);if(d.fills)setFills(d.fills);if(d.services)setServices(d.services);if(d.costs)setCosts(d.costs);if(d.claims)setClaims(d.claims);if(d.plan)setPlan(d.plan);setActiveVid(d.vehicles?.[0]?.id||"");setBackupMsg("✅ Restore complete!");}catch{setBackupMsg("❌ Invalid backup file.");}setTimeout(()=>setBackupMsg(""),4000);};r.readAsText(file);e.target.value="";};

  // -- UI helpers -----------------------------------------------------------
  const BtnP=({g,children,onClick,style={}})=><button onClick={onClick} style={{width:"100%",marginTop:12,padding:"12px",borderRadius:12,border:"none",background:g,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",...style}}>{children}</button>;
  const BtnC=({onClick})=><button onClick={onClick} style={{width:"100%",marginTop:6,padding:"10px",borderRadius:12,border:"1.5px solid #e5e7ef",background:"#fff",color:"#888",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>;
  const Eb=({color,bg,onClick})=><button onClick={onClick} style={{background:bg,border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color,fontWeight:600,fontSize:12,fontFamily:"inherit"}}>Edit</button>;
  // Fix 2: Db now always asks for confirmation before deleting
  const Db=({onClick,label="this entry"})=><button onClick={()=>{if(window.confirm(`Delete ${label}? This cannot be undone.`))onClick();}} style={{background:"#fff0f0",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#cc2222",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>Del</button>;
  const tabStyle=id=>({flex:1,padding:"5px 1px 4px",border:"none",background:"none",fontFamily:"inherit",fontSize:"8px",fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:tab===id?BRAND.blue:"#9aa",borderTop:tab===id?`2.5px solid ${BRAND.blue}`:"2.5px solid transparent"});
  const TaxBar=()=>(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,margin:"10px 0 0"}}>{TAX_YEARS.map(y=>(<button key={y} onClick={()=>setTaxYear(y)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"none",background:taxYear===y?BRAND.blue:"#e8eaf0",color:taxYear===y?"#fff":"#555",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{y==="all"?"All Time":`${Number(y)-1}/${y}`}</button>))}</div>);
  const VPill=()=>(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,margin:"0 0 4px"}}>{vehicles.map(v=>(<button key={v.id} onClick={()=>setActiveVid(v.id)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`2px solid ${activeVid===v.id?"#fff":"rgba(255,255,255,0.3)"}`,background:activeVid===v.id?"#fff":"transparent",color:activeVid===v.id?BRAND.navy:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{VEHICLE_ICONS[v.vehicleType]||"🚗"} {v.make&&v.model?`${v.make} ${v.model}`:v.reg||"Vehicle"}</button>))}{isPro&&<button onClick={()=>{const nv=BLANK_VEHICLE(vehicles.length);setVehicles(vs=>[...vs,nv]);setActiveVid(nv.id);setTab("vehicles");setVEdit(true);setVDraft({...nv});}} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:"1.5px solid rgba(255,255,255,0.5)",background:"transparent",color:"rgba(255,255,255,0.8)",fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>}</div>);

  // Fix 3: data persistence notice - shown once, dismissed permanently
  const [dataBannerDismissed,setDataBannerDismissed]=useState(()=>load("lb_data_banner_ok",false));
  const dismissDataBanner=()=>{setDataBannerDismissed(true);save("lb_data_banner_ok",true);};

  // -- Onboarding -----------------------------------------------------------
  if(!onboarded){
    return <Onboarding onComplete={vForm=>{
      if(vForm?.make||vForm?.reg){
        const bv=BLANK_VEHICLE(0);
        const newV={...bv,...vForm,id:bv.id};
        setVehicles([newV]);setActiveVid(newV.id);
      }
      setOnboarded(true);
    }}/>;
  }

  // -------------------------------------------------------------------------
  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#f3f4f9",minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:isPro?100:72}}>

      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,${BRAND.navy} 0%,${vehicle.color||BRAND.blue} 100%)`,padding:"16px 20px 14px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <LogoMark size={32}/>
            <WordMark dark/>
            {isPro&&<span style={{fontSize:9,background:"rgba(255,255,255,0.2)",padding:"2px 7px",borderRadius:10,fontWeight:800,color:"#fff",marginLeft:2}}>PRO</span>}
            <span style={{fontSize:9,opacity:0.55,color:"#fff",marginLeft:2}}>{APP_BUILD}</span>
          </div>
          <button onClick={()=>setShowSOS(true)} style={{background:"rgba(220,0,0,0.35)",border:"1.5px solid rgba(255,255,255,0.5)",borderRadius:20,padding:"4px 12px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🚨 SOS</button>
        </div>
        {vehicles.length>1&&<VPill/>}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
          <div>
            <div style={{fontSize:17,fontWeight:800}}>{vehicle.make&&vehicle.model?`${vehicle.make} ${vehicle.model}`:"Your Vehicle"}</div>
            {vehicle.reg&&<div style={{fontSize:12,opacity:0.7}}>{vehicle.reg}{vehicle.year?` · ${vehicle.year}`:""}{vehicle.vehicleType?` · ${vehicle.vehicleType}`:""}</div>}
          </div>
          <div style={{marginLeft:"auto",fontSize:26}}>{VEHICLE_ICONS[vehicle.vehicleType]||"🚗"}</div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {[["💼 Biz km",fmtN(totB)+" km","main"],["💸 Cost","R "+fmtN(totRunning),"main"],costPerKm>0?["💰 /km",fmt(costPerKm),"small"]:null,fuelEff>0?["🔋 L/100",fmtKm(fuelEff),"small"]:null].filter(Boolean).map(([l,v,sz])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"5px 8px",flex:sz==="main"?1.3:0.8,minWidth:0,overflow:"hidden"}}>
              <div style={{fontSize:9,opacity:0.75,marginBottom:1,whiteSpace:"nowrap"}}>{l}</div>
              <div style={{fontSize:sz==="main"?12:11,fontWeight:800,whiteSpace:"nowrap"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ALERTS */}
      {alerts.length>0&&<div style={{padding:"10px 16px 0"}}>{alerts.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,background:a.bg,marginBottom:6}}><span style={{fontSize:16}}>{a.icon}</span><span style={{fontSize:12,fontWeight:700,color:a.color}}>{a.label}</span></div>)}</div>}

      {/* Fix 3: Data persistence notice — shown until dismissed */}
      {!dataBannerDismissed&&(
        <div style={{margin:"10px 16px 0",padding:"10px 14px",background:"#fffbea",border:"1px solid #f0d060",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7a5c00",marginBottom:2}}>💾 How your data is saved</div>
            <div style={{fontSize:11,color:"#7a5c00",lineHeight:1.6}}>Your data is stored in <b>this browser only</b>. To keep it safe or move it to another device, use <b>Export → Download Backup</b>.</div>
          </div>
          <button onClick={dismissDataBanner} style={{background:"none",border:"none",fontSize:18,color:"#b8a000",cursor:"pointer",padding:"0 4px",flexShrink:0}}>✕</button>
        </div>
      )}

      <div style={{padding:"0 16px"}}>

        {/* ---- DASHBOARD ---- */}
        {tab==="dashboard"&&(
          <div>
            <TaxBar/>
            {isPro&&vehicles.length>1&&(<>
              <ST>Fleet Overview</ST>
              <Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Tile label="🚗 Vehicles"  value={vehicles.length}                                  bg="#eef6ff" color="#1a52cc"/>
                  <Tile label="📏 Fleet KM"  value={fmtKm(fleetTotalKm)+" km"}                      bg="#fff5ee" color="#b85c00"/>
                  <Tile label="💸 Fleet Cost"value={fmt(fleetTotalCost)}                         bg="#fef6f6" color="#b52222"/>
                  <Tile label="💰 Cost/km"   value={fleetCostPerKm>0?fmt(fleetCostPerKm):"—"}   bg="#f0faf4" color="#1a7a48"/>
                </div>
              </Card>
              {vehicleStats.length>1&&(<Card>
                <div style={{fontSize:11,fontWeight:700,color:"#9aa",letterSpacing:1.2,textTransform:"uppercase",marginBottom:10}}>Vehicle Comparison</div>
                {vehicleStats.map(v=>(
                  <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:v.color||"#2c5fff",flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1e2235"}}>{v.name}</div>
                        <div style={{fontSize:11,color:"#888"}}>{fmtKm(v.km)} km · {fmt(v.total)}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:v.costPerKm>0?"#2c5fff":"#ccc"}}>{v.costPerKm>0?fmt(v.costPerKm)+"/km":"—"}</div>
                  </div>
                ))}
                {mostExpensive&&mostUsed&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
                  <div style={{background:"#fff0f0",borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:9,color:"#888"}}>💸 Priciest</div><div style={{fontSize:11,fontWeight:700,color:"#cc2222"}}>{mostExpensive.name}</div></div>
                  <div style={{background:"#f0faf4",borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:9,color:"#888"}}>🟢 Cheapest</div><div style={{fontSize:11,fontWeight:700,color:"#1a7a48"}}>{cheapest.name}</div></div>
                  <div style={{background:"#eef6ff",borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:9,color:"#888"}}>🚛 Most Used</div><div style={{fontSize:11,fontWeight:700,color:"#1a52cc"}}>{mostUsed.name}</div></div>
                </div>)}
              </Card>)}
            </>)}

            <ST>Running Costs</ST>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Tile label="⛽ Fuel + Extras" value={fmt(totF)}      bg="#f0faf4" color="#1a7a48"/>
              <Tile label="🔧 Services"      value={fmt(totS)}      bg="#f5f0ff" color="#6a2ccc"/>
              {COST_CATS.filter(c=>c.id!=="fuel"&&c.id!=="service"&&costByCat[c.id]>0).map(c=>(
                <Tile key={c.id} label={`${c.icon} ${c.label}`} value={fmt(costByCat[c.id])} bg="#fff8f0" color={c.color}/>
              ))}
              <Tile label="🚗 Private km"   value={fmtKm(totP)+" km"}  bg="#fff5ee" color="#b85c00"/>
              <Tile label="💼 Business km"  value={fmtKm(totB)+" km"}  bg="#eef6ff" color="#1a52cc"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
              <div style={{background:"linear-gradient(135deg,#1a2a6c,#2c5fff)",borderRadius:12,padding:"10px 12px",color:"#fff"}}><div style={{fontSize:9,opacity:0.75,marginBottom:2}}>Total Cost</div><div style={{fontSize:13,fontWeight:800}}>{fmt(totRunning)}</div></div>
              <div style={{background:"linear-gradient(135deg,#1a7a48,#2cb96a)",borderRadius:12,padding:"10px 12px",color:"#fff"}}><div style={{fontSize:9,opacity:0.75,marginBottom:2}}>Cost/km</div><div style={{fontSize:13,fontWeight:800}}>{costPerKm>0?fmt(costPerKm):"—"}</div></div>
              <div style={{background:"linear-gradient(135deg,#4a1a8c,#7c3fff)",borderRadius:12,padding:"10px 12px",color:"#fff"}}><div style={{fontSize:9,opacity:0.75,marginBottom:2}}>SARS Est.</div><div style={{fontSize:13,fontWeight:800}}>{claimable>0?fmt(claimable):"—"}</div></div>
            </div>

            {isPro&&maintPreds.length>0&&(<><ST>🔮 Maintenance Predictions</ST>{maintPreds.slice(0,3).map((p,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",borderLeft:`4px solid ${p.overdue?"#cc2222":p.urgent?"#e88c00":"#2c5fff"}`}}><div><div style={{fontWeight:700,fontSize:13,color:p.overdue?"#cc2222":"#1e2235"}}>{p.overdue?"🚨":"🔧"} {p.label}</div><div style={{fontSize:12,color:"#888",marginTop:2}}>{p.overdue?`Overdue by ${fmtN(Math.abs(p.kmLeft))} km`:`${fmtN(p.kmLeft)} km remaining`}{p.daysLeft!=null&&!p.overdue&&<span style={{color:p.daysLeft<=14?"#b85c00":"#888"}}> · ~{p.daysLeft} days</span>}</div></div><div style={{fontSize:12,fontWeight:700,color:p.overdue?"#cc2222":p.urgent?"#e88c00":"#2c5fff",background:p.overdue?"#fff0f0":p.urgent?"#fff8ee":"#eef6ff",padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>{p.daysLeft!=null?(p.overdue?"Overdue":`${p.daysLeft}d`):`${fmtN(p.kmLeft)} km`}</div></div>))}</>)}

            <ST>Quick Status</ST>
            {[{label:"Vehicle Licence",ex:vehicle.licenceExpiry},...(["Truck","Trailer"].includes(vehicle.vehicleType)?[{label:"Roadworthy (RWC)",ex:vehicle.rwcExpiry}]:[]),{label:`Driver's Lic (${vehicle.driver?.licenceCode||"EB"})`,ex:vehicle.driver?.licenceExpiry},{label:`PDP (${vehicle.driver?.pdpType||"None"})`,ex:vehicle.driver?.pdpType!=="None"?vehicle.driver?.pdpExpiry:null},{label:"Insurance Renewal",ex:vehicle.insurance?.renewalDate}].map(({label,ex})=>{const st=expiryBadge(ex);return(<div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}><span style={{fontSize:12,fontWeight:600,color:"#333"}}>{label}</span>{st?<span style={{fontSize:11,fontWeight:700,color:st.color,background:st.bg,padding:"3px 9px",borderRadius:20}}>{st.icon} {st.label}</span>:<span style={{fontSize:12,color:"#bbb"}}>Not set</span>}</div>);})} 

            <ST>Monthly Breakdown</ST>
            {allMonthKeys.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:24}}>No data yet — tap Vehicles to set up your car.</div>}
            {allMonthKeys.map(m=>{
              const mT=vTrips.filter(t=>t.date?.startsWith(m));
              const pK=mT.filter(t=>t.type==="Private").reduce((s,t)=>s+(Number(t.odomEnd||0)-Number(t.odomStart||0)),0);
              const bK=mT.filter(t=>t.type==="Business").reduce((s,t)=>s+(Number(t.odomEnd||0)-Number(t.odomStart||0)),0);
              const mFills=vFills.filter(f=>f.date?.startsWith(m));
              const mFuel=mFills.reduce((s,f)=>s+Number(f.totalAmount||0),0);
              const mLit=mFills.reduce((s,f)=>s+Number(f.litres||0),0);
              const mSvc=vServices.filter(s=>s.date?.startsWith(m)).reduce((s,sv)=>s+Number(sv.cost||0),0);
              const mOth=vCosts.filter(c=>c.date?.startsWith(m)).reduce((s,c)=>s+Number(c.amount||0),0);
              const mKm=pK+bK;const mCpK=mKm>0?(mFuel+mSvc+mOth)/mKm:0;const mEff=mKm>0&&mLit>0?(mLit/mKm)*100:0;
              const [yr,mo]=m.split("-");
              return(<Card key={m} style={{padding:"14px 16px"}}><div style={{fontWeight:700,fontSize:15,marginBottom:10,color:"#1e2235"}}>{MONTHS[Number(mo)-1]} {yr}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Tile label="🚗 Private" value={fmtKm(pK)+" km"} bg="#fff5ee" color="#b85c00"/><Tile label="💼 Business" value={fmtKm(bK)+" km"} bg="#eef6ff" color="#1a52cc"/><Tile label="⛽ Fuel+Ext" value={fmt(mFuel)} bg="#f0faf4" color="#1a7a48"/><Tile label="🔧 Services" value={mSvc>0?fmt(mSvc):"—"} bg="#f5f0ff" color="#6a2ccc"/>{mOth>0&&<Tile label="📌 Other" value={fmt(mOth)} bg="#fff8f0" color="#b85c00"/>}{mCpK>0&&<Tile label="💰 Cost/km" value={fmt(mCpK)} bg="#fff0f8" color="#8a1a6c"/>}{mEff>0&&<Tile label="🔋 L/100km" value={fmtKm(mEff)} bg="#f0f8ff" color="#1a52cc"/>}</div>{(mFuel+mSvc+mOth)>0&&<div style={{marginTop:8,padding:"7px 10px",background:"#f3f4f9",borderRadius:10,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#888"}}>Month total</span><span style={{fontSize:13,fontWeight:700,color:"#1e2235"}}>{fmt(mFuel+mSvc+mOth)}</span></div>}</Card>);
            })}
            <ST>Annual Totals</ST>
            <Card style={{padding:"14px 16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <Tile label="🚗 Private km"    value={fmtKm(totP)+" km"}    bg="#fff5ee" color="#b85c00"/>
                <Tile label="💼 Business km"   value={fmtKm(totB)+" km"}    bg="#eef6ff" color="#1a52cc"/>
                <Tile label="⛽ Fuel+Extras"   value={fmt(totF)}         bg="#f0faf4" color="#1a7a48"/>
                <Tile label="🔧 Service"       value={fmt(totS)}         bg="#f5f0ff" color="#6a2ccc"/>
                {COST_CATS.filter(c=>c.id!=="fuel"&&c.id!=="service"&&costByCat[c.id]>0).map(c=>(
                  <Tile key={c.id} label={`${c.icon} ${c.label}`} value={fmt(costByCat[c.id])} bg="#fff8f0" color={c.color}/>
                ))}
                <Tile label="📏 Total km"      value={fmtKm(totKm)+" km"}   bg="#fff8f0" color="#333"/>
                <Tile label="💸 Running Cost"  value={fmt(totRunning)}   bg="#fef6f6" color="#b52222"/>
                {costPerKm>0&&<Tile label="💰 Cost/km" value={fmt(costPerKm)+"/km"} sub="all costs ÷ km" bg="#fff0f8" color="#8a1a6c"/>}
                {fuelEff>0&&<Tile label="🔋 Fuel Eff." value={fmtKm(fuelEff)+" L/100"} sub={fmtKm(1/(fuelEff/100))+" km/L"} bg="#f0f8ff" color="#1a52cc"/>}
              </div>
            </Card>
            {!isPro&&(
              <div onClick={()=>setShowUpgrade(true)} style={{background:`linear-gradient(135deg,${BRAND.orange},#c45e00)`,borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",marginBottom:14}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><LogoMark size={22}/><div style={{fontWeight:800,fontSize:14,color:"#fff"}}>Upgrade to Pro</div></div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>Fleet tools · SARS calculator · Document vault & more</div>
                </div>
                <div style={{fontSize:22,color:"#fff"}}>›</div>
              </div>
            )}
          </div>
        )}

        {/* ---- VEHICLES ---- */}
        {tab==="vehicles"&&(
          <div>
            {vehicles.length>1&&<><ST>Your Vehicles</ST>{vehicles.map(v=>(<div key={v.id} onClick={()=>setActiveVid(v.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:activeVid===v.id?"#eef2ff":"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`2px solid ${activeVid===v.id?v.color||"#2c5fff":"transparent"}`,cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:12,height:12,borderRadius:"50%",background:v.color||"#2c5fff"}}/><div><div style={{fontWeight:700,fontSize:14}}>{v.make&&v.model?`${v.make} ${v.model}`:"Unnamed"} <span style={{fontSize:12,color:"#888"}}>{v.vehicleType||""}</span></div><div style={{fontSize:12,color:"#888"}}>{v.reg||"No reg"}{v.year?` · ${v.year}`:""}</div></div></div><div style={{display:"flex",gap:6,alignItems:"center"}}>{activeVid===v.id&&<span style={{fontSize:11,fontWeight:700,color:v.color||"#2c5fff",background:"#eef2ff",padding:"2px 8px",borderRadius:20}}>Active</span>}{vehicles.length>1&&<button onClick={e=>{e.stopPropagation();if(window.confirm("Delete vehicle and all data?")){setVehicles(vs=>vs.filter(x=>x.id!==v.id));setTrips(ts=>ts.filter(t=>t.vehicleId!==v.id));setFills(fs=>fs.filter(f=>f.vehicleId!==v.id));setServices(ss=>ss.filter(s=>s.vehicleId!==v.id));setCosts(cs=>cs.filter(c=>c.vehicleId!==v.id));setClaims(cs=>cs.filter(c=>c.vehicleId!==v.id));setActiveVid(vehicles.find(x=>x.id!==v.id)?.id||"");}}} style={{background:"#fff0f0",border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",color:"#cc2222",fontSize:12,fontFamily:"inherit"}}>Del</button>}</div></div>))}{isPro&&<button onClick={()=>{const nv=BLANK_VEHICLE(vehicles.length);setVehicles(vs=>[...vs,nv]);setActiveVid(nv.id);setVEdit(true);setVDraft({...nv});}} style={{width:"100%",padding:"11px",borderRadius:12,border:"1.5px dashed #aab",background:"transparent",color:"#555",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>+ Add Another Vehicle</button>}</>}
            <ST>Vehicle Details</ST>
            <Card>
              {!vEdit?(<div>
                <InfoRow label="Type" value={vehicle.vehicleType}/>
                {[["Make",vehicle.make],["Model",vehicle.model],["Year",vehicle.year],["Registration",vehicle.reg],["VIN No",vehicle.vinNo],["Odometer",vehicle.currentOdometer?fmtN(vehicle.currentOdometer)+" km":""]].map(([l,v])=><InfoRow key={l} label={l} value={v}/>)}
                <InfoRow label="Vehicle Licence" value={vehicle.licenceExpiry}><ExpiryChip dateStr={vehicle.licenceExpiry}/></InfoRow>
                {["Truck","Trailer"].includes(vehicle.vehicleType)&&<InfoRow label="Roadworthy (RWC)" value={vehicle.rwcExpiry}><ExpiryChip dateStr={vehicle.rwcExpiry}/></InfoRow>}
                <div style={{marginTop:10,padding:"10px 12px",background:"#eef2ff",borderRadius:10}}>
                  <div style={{fontWeight:700,fontSize:12,color:"#1a2a6c",marginBottom:6}}>🪪 Driver's Licence</div>
                  <InfoRow label="Licence No"   value={vehicle.driver?.licenceNo}/>
                  <InfoRow label="Code"         value={vehicle.driver?.licenceCode}/>
                  <InfoRow label="Expiry"       value={vehicle.driver?.licenceExpiry}><ExpiryChip dateStr={vehicle.driver?.licenceExpiry}/></InfoRow>
                </div>
                {vehicle.driver?.pdpType&&vehicle.driver.pdpType!=="None"&&<div style={{marginTop:8,padding:"10px 12px",background:"#f5f0ff",borderRadius:10}}>
                  <div style={{fontWeight:700,fontSize:12,color:"#4a1a8c",marginBottom:6}}>📋 PDP</div>
                  <InfoRow label="Type"   value={vehicle.driver.pdpType}/>
                  <InfoRow label="PDP No" value={vehicle.driver.pdpNo}/>
                  <InfoRow label="Expiry" value={vehicle.driver.pdpExpiry}><ExpiryChip dateStr={vehicle.driver.pdpExpiry}/></InfoRow>
                </div>}
                <InfoRow label="Insurer"   value={vehicle.insurance?.insurer}/>
                <InfoRow label="Policy No" value={vehicle.insurance?.policyNo}/>
                <InfoRow label="Emergency" value={vehicle.insurance?.emergencyPhone}/>
                <InfoRow label="Ins Renewal" value={vehicle.insurance?.renewalDate}><ExpiryChip dateStr={vehicle.insurance?.renewalDate}/></InfoRow>
                <BtnP g="linear-gradient(135deg,#1a2a6c,#2c5fff)" onClick={()=>{setVDraft({...vehicle,driver:{...vehicle.driver},insurance:{...vehicle.insurance},driverInfo:{...vehicle.driverInfo}});setVEdit(true);}}>✏️ Edit All Details</BtnP>
              </div>):(<div>
                <div style={{fontWeight:700,fontSize:13,color:"#555",marginBottom:8}}>Vehicle</div>
                <div style={G2}>
                  <div style={S2}><label style={LBL}>Vehicle Type</label><select style={INP} value={vDraft.vehicleType||"Car"} onChange={e=>setVDraft({...vDraft,vehicleType:e.target.value})}>{VEHICLE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={LBL}>Make</label><input style={INP} placeholder="Toyota" value={vDraft.make||""} onChange={e=>setVDraft({...vDraft,make:e.target.value})}/></div>
                  <div><label style={LBL}>Model</label><input style={INP} placeholder="Hilux" value={vDraft.model||""} onChange={e=>setVDraft({...vDraft,model:e.target.value})}/></div>
                  <div><label style={LBL}>Year</label><input style={INP} placeholder="2019" value={vDraft.year||""} onChange={e=>setVDraft({...vDraft,year:e.target.value})}/></div>
                  <div><label style={LBL}>Registration</label><input style={INP} placeholder="GP 123-456" value={vDraft.reg||""} onChange={e=>setVDraft({...vDraft,reg:e.target.value})}/></div>
                  <div style={S2}><label style={LBL}>VIN No</label><input style={INP} placeholder="e.g. AAVZZZ1TZWP000001" value={vDraft.vinNo||""} onChange={e=>setVDraft({...vDraft,vinNo:e.target.value})}/></div>
                  <div style={S2}><label style={LBL}>Current Odometer (km)</label><input type="number" style={INP} value={vDraft.currentOdometer||""} onChange={e=>setVDraft({...vDraft,currentOdometer:e.target.value})}/></div>
                  <div style={["Truck","Trailer"].includes(vDraft.vehicleType)?S2:{gridColumn:"span 2"}}><label style={LBL}>Vehicle Licence Expiry</label><input type="date" style={INP} value={vDraft.licenceExpiry||""} onChange={e=>setVDraft({...vDraft,licenceExpiry:e.target.value})}/></div>
                  {["Truck","Trailer"].includes(vDraft.vehicleType)&&<div><label style={LBL}>Roadworthy (RWC) Expiry</label><input type="date" style={INP} value={vDraft.rwcExpiry||""} onChange={e=>setVDraft({...vDraft,rwcExpiry:e.target.value})}/></div>}
                  {["Truck","Trailer"].includes(vDraft.vehicleType)&&vDraft.rwcExpiry&&(()=>{const st=expiryBadge(vDraft.rwcExpiry);return st?<div style={{...S2,padding:"7px 12px",borderRadius:8,background:st.bg,fontSize:12,fontWeight:700,color:st.color}}>{st.icon} Roadworthy {st.label}</div>:null;})()} 
                  <div style={S2}><label style={LBL}>Vehicle Colour</label><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>{VEHICLE_COLORS.map(c=><button key={c} onClick={()=>setVDraft({...vDraft,color:c})} style={{width:28,height:28,borderRadius:"50%",background:c,border:vDraft.color===c?"3px solid #1e2235":"2px solid transparent",cursor:"pointer"}}/> )}</div></div>
                </div>
                <div style={{fontWeight:700,fontSize:13,color:"#1a2a6c",margin:"14px 0 8px",padding:"8px 10px",background:"#eef2ff",borderRadius:8}}>🪪 Driver's Licence</div>
                <div style={G2}>
                  <div style={S2}><label style={LBL}>Licence Number</label><input style={INP} placeholder="7304085012084" value={vDraft.driver?.licenceNo||""} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,licenceNo:e.target.value}})}/></div>
                  <div style={S2}><label style={LBL}>Licence Code</label><select style={INP} value={vDraft.driver?.licenceCode||"Code EB"} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,licenceCode:e.target.value}})}>{LICENCE_CODES.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div style={S2}><label style={LBL}>Driver's Licence Expiry</label><input type="date" style={INP} value={vDraft.driver?.licenceExpiry||""} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,licenceExpiry:e.target.value}})}/></div>
                  {vDraft.driver?.licenceExpiry&&(()=>{const st=expiryBadge(vDraft.driver.licenceExpiry);return st?<div style={{...S2,padding:"7px 12px",borderRadius:8,background:st.bg,fontSize:12,fontWeight:700,color:st.color}}>{st.icon} Driver's licence {st.label}</div>:null;})()}
                </div>
                <div style={{fontWeight:700,fontSize:13,color:"#4a1a8c",margin:"14px 0 8px",padding:"8px 10px",background:"#f5f0ff",borderRadius:8}}>📋 PDP</div>
                <div style={G2}>
                  <div style={S2}><label style={LBL}>PDP Type</label><select style={INP} value={vDraft.driver?.pdpType||"None"} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,pdpType:e.target.value}})}>{PDP_TYPES.map(p=><option key={p}>{p}</option>)}</select></div>
                  {vDraft.driver?.pdpType&&vDraft.driver.pdpType!=="None"&&<><div><label style={LBL}>PDP No</label><input style={INP} value={vDraft.driver?.pdpNo||""} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,pdpNo:e.target.value}})}/></div><div><label style={LBL}>PDP Expiry</label><input type="date" style={INP} value={vDraft.driver?.pdpExpiry||""} onChange={e=>setVDraft({...vDraft,driver:{...vDraft.driver,pdpExpiry:e.target.value}})}/></div>{vDraft.driver?.pdpExpiry&&(()=>{const st=expiryBadge(vDraft.driver.pdpExpiry);return st?<div style={{...S2,padding:"7px 12px",borderRadius:8,background:st.bg,fontSize:12,fontWeight:700,color:st.color}}>{st.icon} PDP {st.label}</div>:null;})()}</>}
                </div>
                <div style={{fontWeight:700,fontSize:13,color:"#555",margin:"14px 0 8px"}}>Insurance</div>
                <div style={G2}>
                  <div style={S2}><label style={LBL}>Insurer</label><input style={INP} value={vDraft.insurance?.insurer||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,insurer:e.target.value}})}/></div>
                  <div style={S2}><label style={LBL}>Policy Number</label><input style={INP} value={vDraft.insurance?.policyNo||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,policyNo:e.target.value}})}/></div>
                  <div><label style={LBL}>Broker</label><input style={INP} value={vDraft.insurance?.broker||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,broker:e.target.value}})}/></div>
                  <div><label style={LBL}>Broker Phone</label><input type="tel" style={INP} value={vDraft.insurance?.brokerPhone||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,brokerPhone:e.target.value}})}/></div>
                  <div><label style={LBL}>Emergency Contact</label><input style={INP} value={vDraft.insurance?.emergencyContact||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,emergencyContact:e.target.value}})}/></div>
                  <div><label style={LBL}>Emergency Phone</label><input type="tel" style={INP} value={vDraft.insurance?.emergencyPhone||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,emergencyPhone:e.target.value}})}/></div>
                  <div style={S2}><label style={LBL}>Renewal Date</label><input type="date" style={INP} value={vDraft.insurance?.renewalDate||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,renewalDate:e.target.value}})}/></div>
                  <div style={S2}><label style={LBL}>Accident Procedure</label><textarea style={{...INP,minHeight:100,resize:"vertical",lineHeight:1.6}} placeholder={"1. Stay calm\n2. Call 10111/10177\n3. Do NOT admit fault\n4. Photo scene & plates\n5. Exchange details\n6. Report to police 24hrs\n7. Notify insurer"} value={vDraft.insurance?.accidentSteps||""} onChange={e=>setVDraft({...vDraft,insurance:{...vDraft.insurance,accidentSteps:e.target.value}})}/></div>
                </div>
                <div style={{fontWeight:700,fontSize:13,color:"#1a7a48",margin:"14px 0 8px",padding:"8px 10px",background:"#f0faf4",borderRadius:8}}>👤 Assigned Driver</div>
                <div style={G2}>
                  <div style={S2}><label style={LBL}>Driver Name</label><input style={INP} placeholder="e.g. John Smith" value={vDraft.driverInfo?.name||""} onChange={e=>setVDraft({...vDraft,driverInfo:{...vDraft.driverInfo,name:e.target.value}})}/></div>
                  <div><label style={LBL}>Phone</label><input type="tel" style={INP} placeholder="082 123 4567" value={vDraft.driverInfo?.phone||""} onChange={e=>setVDraft({...vDraft,driverInfo:{...vDraft.driverInfo,phone:e.target.value}})}/></div>
                  <div><label style={LBL}>Employee ID</label><input style={INP} placeholder="EMP001" value={vDraft.driverInfo?.employeeId||""} onChange={e=>setVDraft({...vDraft,driverInfo:{...vDraft.driverInfo,employeeId:e.target.value}})}/></div>
                  <div style={S2}><label style={LBL}>Department</label><input style={INP} placeholder="Sales / Delivery / Operations" value={vDraft.driverInfo?.department||""} onChange={e=>setVDraft({...vDraft,driverInfo:{...vDraft.driverInfo,department:e.target.value}})}/></div>
                </div>
                <BtnP g="linear-gradient(135deg,#1a2a6c,#2c5fff)" onClick={()=>{setVehicle({...vDraft});setVEdit(false);}}>Save All Details</BtnP>
                <BtnC onClick={()=>setVEdit(false)}/>
              </div>)}
            </Card>
            {!vEdit&&vehicle.driverInfo?.name&&(
              <Card style={{background:"#f0faf4",border:"1px solid #b0e8c8"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#1a7a48",marginBottom:8}}>👤 Assigned Driver</div>
                <InfoRow label="Name"        value={vehicle.driverInfo.name}/>
                <InfoRow label="Phone"       value={vehicle.driverInfo.phone}/>
                <InfoRow label="Employee ID" value={vehicle.driverInfo.employeeId}/>
                <InfoRow label="Department"  value={vehicle.driverInfo.department}/>
              </Card>
            )}
            {!vEdit&&<>
              <div style={{padding:"10px 14px",background:"#fff0f0",border:"1px solid #f0a0a0",borderRadius:12,marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:12,color:"#9a1a1a",marginBottom:4}}>🚨 Accident Procedure</div>
                <div style={{fontSize:12,color:"#7a2020",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{vehicle.insurance?.accidentSteps||"1. Stop — never leave the scene\n2. Call 10111 or 10177\n3. Do NOT admit fault\n4. Photograph scene & plates\n5. Exchange ID, lic, reg & insurer details\n6. Report to police within 24 hours\n7. Notify insurer immediately"}</div>
              </div>
              {vehicle.insurance?.emergencyPhone&&<a href={`tel:${vehicle.insurance.emergencyPhone}`} style={{display:"block",padding:"12px",borderRadius:14,background:"linear-gradient(135deg,#cc0000,#ff4444)",color:"#fff",fontWeight:800,fontSize:15,textAlign:"center",textDecoration:"none",marginBottom:14}}>📞 Call Insurer: {vehicle.insurance.emergencyPhone}</a>}
            </>}
            <ST>🔔 Reminders</ST>
            <Card><div style={G2}><div style={S2}><label style={LBL}>Title</label><input style={INP} placeholder="e.g. Renew vehicle licence" value={reminderForm.title} onChange={e=>setReminderForm({...reminderForm,title:e.target.value})}/></div><div style={S2}><label style={LBL}>Due Date</label><input type="date" style={INP} value={reminderForm.dueDate} onChange={e=>setReminderForm({...reminderForm,dueDate:e.target.value})}/></div><div style={S2}><label style={LBL}>Note</label><input style={INP} placeholder="Extra detail…" value={reminderForm.note} onChange={e=>setReminderForm({...reminderForm,note:e.target.value})}/></div></div><BtnP g="linear-gradient(135deg,#1a52cc,#2c5fff)" onClick={saveReminder}>+ Add Reminder</BtnP></Card>
            {(vehicle.reminders||[]).map(r=>{const d=daysUntil(r.dueDate);const ov=d!=null&&d<0;return(<Card key={r.id} style={{opacity:r.done?0.5:1,borderLeft:`4px solid ${r.done?"#ccc":ov?"#cc2222":"#2c5fff"}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,textDecoration:r.done?"line-through":"none"}}>{r.title}</div>{r.dueDate&&<div style={{fontSize:12,color:ov&&!r.done?"#cc2222":"#888"}}>{r.dueDate}{d!=null&&!r.done?(ov?` (${Math.abs(d)}d overdue)`:`  (${d}d left)`):""}</div>}{r.note&&<div style={{fontSize:12,color:"#888"}}>{r.note}</div>}</div><div style={{display:"flex",gap:6}}><button onClick={()=>setVehicle({...vehicle,reminders:(vehicle.reminders||[]).map(x=>x.id===r.id?{...x,done:!x.done}:x)})} style={{background:r.done?"#f0faf4":"#eef2ff",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:r.done?"#1a7a48":"#2c5fff",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>{r.done?"↩":"✓"}</button><Db onClick={()=>setVehicle({...vehicle,reminders:(vehicle.reminders||[]).filter(x=>x.id!==r.id)})}/></div></div></Card>);})}
          </div>
        )}

        {/* ---- TRIPS ---- */}
        {tab==="trips"&&(
          showTripList
          ? <TripList trips={vTrips} onBack={()=>setShowTripList(false)} />
          : <div>
            {/* Trip Reminder Banner */}
            {(()=>{
              const allVTrips=[...trips].filter(t=>t.vehicleId===vehicle.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
              const last=allVTrips[0];
              const daysSince=last?Math.floor((new Date(today())-new Date(last.date))/86400000):null;
              const odoGap=last&&tripForm.odomStart&&!editTripId&&Number(tripForm.odomStart)!==Number(last.odomEnd);
              return(<>
                {daysSince!==null&&daysSince>=2&&(
                  <div style={{margin:"10px 16px 0",padding:"10px 14px",background:"#fff8ee",border:"1px solid #f0c060",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>⏰</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#7a5c00"}}>
                        {daysSince===2?"You haven't logged a trip since yesterday!":daysSince<=7?`No trips logged for ${daysSince} days — don't forget!`:`⚠️ No trips in ${daysSince} days — your SARS logbook may be incomplete!`}
                      </div>
                      <div style={{fontSize:11,color:"#a07020",marginTop:2}}>Last trip: {last.date} — {last.description||"(no description)"}</div>
                    </div>
                  </div>
                )}
                {daysSince===null&&(
                  <div style={{margin:"10px 16px 0",padding:"10px 14px",background:"#eef6ff",border:"1px solid #aad4ff",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>📍</span>
                    <div style={{fontSize:12,fontWeight:700,color:"#1a52cc"}}>Log your first trip below to start your SARS logbook!</div>
                  </div>
                )}
                {daysSince===0&&(
                  <div style={{margin:"10px 16px 0",padding:"10px 14px",background:"#f0faf4",border:"1px solid #a0d8b8",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>✅</span>
                    <div style={{fontSize:12,fontWeight:700,color:"#1a7a48"}}>Trip logged today — great work! Log another if you made more trips.</div>
                  </div>
                )}
                {odoGap&&(
                  <div style={{margin:"6px 16px 0",padding:"9px 14px",background:"#fff0f0",border:"1px solid #f0a0a0",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>⚠️</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#9a1a1a"}}>Odometer gap detected</div>
                      <div style={{fontSize:11,color:"#9a1a1a",marginTop:1}}>Your opening odo ({tripForm.odomStart}) doesn't match the last trip's closing odo ({last.odomEnd}). Did you forget to log a trip in between?</div>
                    </div>
                  </div>
                )}
              </>);
            })()}
            <ST>{editTripId?"Edit Trip":"Log a Trip"}</ST>
            <Card><div style={G2}><div style={S2}><label style={LBL}>Date</label><input type="date" style={INP} value={tripForm.date} onChange={e=>setTripForm({...tripForm,date:e.target.value})}/></div><div style={S2}><label style={LBL}>Purpose</label><input style={{...INP,borderColor:descWarn&&!tripForm.description?"#e88c00":undefined}} placeholder="e.g. Client meeting, site visit" value={tripForm.description} onChange={e=>{setTripForm({...tripForm,description:e.target.value});if(descWarn)setDescWarn(false);}}/>{descWarn&&!tripForm.description&&<div style={{marginTop:4,fontSize:12,color:"#b85c00",fontWeight:600}}>⚠️ Adding a description helps with SARS compliance</div>}</div><div><label style={LBL}>Odo Start (km)</label><input type="number" style={INP} placeholder="87000" value={tripForm.odomStart} onChange={e=>setTripForm({...tripForm,odomStart:e.target.value})}/></div><div><label style={LBL}>Odo End (km)</label><input type="number" style={INP} placeholder="87120" value={tripForm.odomEnd} onChange={e=>setTripForm({...tripForm,odomEnd:e.target.value})}/></div><div style={S2}><label style={LBL}>Type</label><div style={{display:"flex",gap:10}}>{["Business","Private"].map(t=>(<button key={t} onClick={()=>setTripForm({...tripForm,type:t})} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px solid",borderColor:tripForm.type===t?(t==="Business"?"#2c5fff":"#b85c00"):"#e5e7ef",background:tripForm.type===t?(t==="Business"?"#eef2ff":"#fff5ee"):"#fff",color:tripForm.type===t?(t==="Business"?"#2c5fff":"#b85c00"):"#888",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>))}</div></div><div style={S2}><label style={LBL}>Notes <span style={{fontWeight:400,color:"#aaa"}}>(optional)</span></label><input style={INP} placeholder="e.g. Deliveries — see trip sheet #23" value={tripForm.notes||""} onChange={e=>setTripForm({...tripForm,notes:e.target.value})}/></div><div style={S2}><PhotoPicker value={tripForm.receipt} onChange={v=>setTripForm({...tripForm,receipt:v})}/></div></div>{tripForm.odomStart&&tripForm.odomEnd&&<div style={{marginTop:10,padding:"8px 12px",background:"#f0f4ff",borderRadius:8,fontSize:13,color:"#2c5fff",fontWeight:600}}>Distance: {fmtKm(Number(tripForm.odomEnd)-Number(tripForm.odomStart))} km</div>}<BtnP g="linear-gradient(135deg,#1a2a6c,#2c5fff)" onClick={saveTrip}>{editTripId?"Update":"Save Trip"}</BtnP>{editTripId&&<BtnC onClick={()=>{setEditTripId(null);setTripForm({date:today(),description:"",odomStart:"",odomEnd:"",type:"Business",notes:"",receipt:""});}}/>}</Card>
            <div style={{display:"flex",gap:8,alignItems:"center",margin:"16px 0 8px"}}>
              <div style={{fontWeight:700,fontSize:11,color:"#9aa",letterSpacing:1.5,textTransform:"uppercase",flex:1}}>Trips ({filteredTrips.length}{tripSearch?` of ${vTrips.length}`:""}) </div>
              {vTrips.length>0&&<button onClick={()=>setShowTripList(true)} style={{background:"linear-gradient(135deg,#1a2a6c,#2c5fff)",border:"none",borderRadius:10,padding:"6px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>📋 View All</button>}
            </div>
            <div style={{position:"relative",marginBottom:10}}>
              <input style={{...INP,paddingLeft:34}} placeholder="Search trips…" value={tripSearch} onChange={e=>setTripSearch(e.target.value)}/>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#aaa"}}>🔍</span>
              {tripSearch&&<button onClick={()=>setTripSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,color:"#aaa",cursor:"pointer"}}>✕</button>}
            </div>
            {filteredTrips.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>{tripSearch?"No trips match your search.":"No trips for this period."}</div>}
            {[...filteredTrips].reverse().map(t=>{const km=Number(t.odomEnd||0)-Number(t.odomStart||0);return(<Card key={t.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{t.description||"—"}</div><div style={{fontSize:12,color:"#888"}}>{t.date}</div>{t.notes&&<div style={{fontSize:12,color:"#888",marginTop:2,fontStyle:"italic"}}>📝 {t.notes}</div>}<div style={{marginTop:6,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><Badge type={t.type}/><span style={{fontSize:13,fontWeight:700}}>{fmtKm(km)} km</span></div>{t.receipt&&<img src={t.receipt} alt="r" style={{width:"100%",maxHeight:100,objectFit:"cover",borderRadius:8,marginTop:8,border:"1px solid #eee"}}/>}</div><div style={{display:"flex",gap:6,marginLeft:8}}><Eb color="#2c5fff" bg="#f0f4ff" onClick={()=>{setEditTripId(t.id);setTripForm({...t,notes:t.notes||""});window.scrollTo(0,0);}}/><Db onClick={()=>setTrips(ts=>ts.filter(x=>x.id!==t.id))}/></div></div></Card>);})}
          </div>
        )}

        {/* ---- FUEL ---- */}
        {tab==="fuel"&&(()=>{
          // shared fill card renderer — used in both views
          const FillCard=({f})=>{
            const fa=Number(f.totalAmount||0)-Number(f.oilCost||0);
            const cpl=Number(f.litres||0)>0?fa/Number(f.litres||0):0;
            const hasOil=Number(f.oilCost||0)>0;
            return(
              <Card style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:"#1e2235"}}>{f.station||"Unknown Station"}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:1}}>{f.date} · {fmtN(f.odometer)} km</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"#e8f4e8",color:"#1a7a48",whiteSpace:"nowrap"}}>{f.fuelType||"Diesel"}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"0.6fr 1.3fr 1fr 1fr",gap:6,marginBottom:8}}>
                  <div style={{background:"#f3f4f9",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#888",marginBottom:1}}>Litres</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#1e2235"}}>{parseFloat(Number(f.litres||0).toFixed(3))}</div>
                  </div>
                  <div style={{background:"#f0faf4",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#888",marginBottom:1}}>Fuel Amt</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#1a7a48"}}>{fmt(fa)}</div>
                  </div>
                  {hasOil
                    ?<div style={{background:"#fff8ee",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                       <div style={{fontSize:9,color:"#888",marginBottom:1}}>Oil</div>
                       <div style={{fontSize:13,fontWeight:800,color:"#b85c00"}}>{fmt(Number(f.oilCost))}</div>
                     </div>
                    :<div style={{background:"#f3f4f9",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                       <div style={{fontSize:9,color:"#888",marginBottom:1}}>Oil</div>
                       <div style={{fontSize:13,fontWeight:700,color:"#bbb"}}>—</div>
                     </div>
                  }
                  <div style={{background:"#eef2ff",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#888",marginBottom:1}}>R/Litre</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#2c5fff"}}>{cpl>0?fmt(cpl):"—"}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                  <div style={{fontSize:12,color:"#888",fontStyle:"italic"}}>{f.notes||""}</div>
                  <div style={{fontWeight:800,fontSize:15,color:"#1e2235"}}>{fmt(Number(f.totalAmount||0))}</div>
                </div>
                {f.receipt&&<img src={f.receipt} alt="r" style={{width:"100%",maxHeight:100,objectFit:"cover",borderRadius:8,marginTop:8,border:"1px solid #eee"}}/>}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <Eb color="#1a7a48" bg="#f0faf4" onClick={()=>{setEditFillId(f.id);setFillForm({...f});setShowFuelHistory(false);window.scrollTo(0,0);}}/>
                  <Db onClick={()=>setFills(fs=>fs.filter(x=>x.id!==f.id))}/>
                </div>
              </Card>
            );
          };

          // summary tile data — shared between both views
          const totFC=vFills.reduce((s,f)=>s+Number(f.totalAmount||0),0);
          const totOC=vFills.reduce((s,f)=>s+Number(f.oilCost||0),0);
          const totLit=vFills.reduce((s,f)=>s+Number(f.litres||0),0);
          const avgCPL=totLit>0?vFills.reduce((s,f)=>s+(Number(f.totalAmount||0)-Number(f.oilCost||0)),0)/totLit:0;
          const sortedFills=[...vFills].reverse();

          // ── HISTORY VIEW ─────────────────────────────────────
          if(showFuelHistory) return(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 16px 14px"}}>
                <button onClick={()=>setShowFuelHistory(false)} style={{background:"#e8f4e8",border:"none",borderRadius:10,padding:"8px 14px",color:"#1a7a48",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"#1e2235"}}>Fuel History</div>
                  <div style={{fontSize:11,color:"#888"}}>{vFills.length} fill-up{vFills.length!==1?"s":""} recorded</div>
                </div>
              </div>
              {/* Summary tiles in history view */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"0 16px 14px"}}>
                <Tile label="⛽ Total Fuel Cost" value={fmt(totFC)}  bg="#f0faf4" color="#1a7a48"/>
                <Tile label="🛢 Total Oil Cost"  value={fmt(totOC)}  bg="#fff8ee" color="#b85c00"/>
                <Tile label="💧 Total Litres"    value={fmtKm(totLit)+" L"} bg="#eef6ff" color="#1a52cc"/>
                <Tile label="💰 Avg Cost/Litre"  value={avgCPL>0?fmt(avgCPL):"—"} bg="#f5f0ff" color="#6a2ccc"/>
              </div>
              {vFills.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>No fill-ups recorded yet.</div>}
              <div style={{margin:"0 16px"}}>
                {sortedFills.map(f=><FillCard key={f.id} f={f}/>)}
              </div>
            </div>
          );

          // ── MAIN FUEL VIEW ────────────────────────────────────
          return(
            <div>
              {/* Summary tiles */}
              <div style={{padding:"14px 16px 0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
                  <Tile label="⛽ Total Fuel Cost" value={fmt(totFC)}  bg="#f0faf4" color="#1a7a48"/>
                  <Tile label="🛢 Total Oil Cost"  value={fmt(totOC)}  bg="#fff8ee" color="#b85c00"/>
                  <Tile label="💧 Total Litres"    value={fmtKm(totLit)+" L"} bg="#eef6ff" color="#1a52cc"/>
                  <Tile label="💰 Avg Cost/Litre"  value={avgCPL>0?fmt(avgCPL):"—"} bg="#f5f0ff" color="#6a2ccc"/>
                </div>
              </div>
              {/* Log a Fill-Up Form */}
              <ST>{editFillId?"Edit Fill-Up":"Log a Fill-Up"}</ST>
              <Card>
                <div style={G2}>
                  <div><label style={LBL}>📅 Date</label><input type="date" style={INP} value={fillForm.date} onChange={e=>setFillForm({...fillForm,date:e.target.value})}/></div>
                  <div><label style={LBL}>🔢 Odometer (km)</label><input type="number" style={INP} placeholder="e.g. 87 500" value={fillForm.odometer} onChange={e=>setFillForm({...fillForm,odometer:e.target.value})}/></div>
                  <div style={S2}><label style={LBL}>🏪 Station / Garage</label><input style={INP} placeholder="e.g. Engen Vereeniging" value={fillForm.station||""} onChange={e=>setFillForm({...fillForm,station:e.target.value})}/></div>
                  <div style={S2}><label style={LBL}>⛽ Fuel Type</label>
                    {vehicle.fuelType
                      ?<div style={{...INP,background:"#f0faf4",color:"#1a7a48",fontWeight:700,border:"1.5px solid #a0d8b8"}}>{vehicle.fuelType} <span style={{fontSize:11,color:"#888",fontWeight:400}}>(from vehicle profile)</span></div>
                      :<select style={INP} value={fillForm.fuelType} onChange={e=>setFillForm({...fillForm,fuelType:e.target.value})}>{["Diesel","Petrol 93","Petrol 95"].map(o=><option key={o} value={o}>{o}</option>)}</select>
                    }
                  </div>
                  <div><label style={LBL}>💧 Litres Filled</label><input type="number" step="0.001" style={INP} placeholder="e.g. 55" value={fillForm.litres} onChange={e=>setFillForm({...fillForm,litres:e.target.value})}/></div>
                  <div><label style={LBL}>🛢 Oil Cost (R)</label><input type="number" step="0.01" style={INP} placeholder="0.00 if none" value={fillForm.oilCost} onChange={e=>setFillForm({...fillForm,oilCost:e.target.value})}/></div>
                  <div style={S2}><label style={LBL}>💳 Total Amount Paid (R)</label><input type="number" step="0.01" style={INP} placeholder="e.g. 1 265.00" value={fillForm.totalAmount} onChange={e=>setFillForm({...fillForm,totalAmount:e.target.value})}/></div>
                </div>
                {/* Live calculation */}
                {(Number(fillForm.litres)>0||Number(fillForm.totalAmount)>0)&&(()=>{
                  const tot=Number(fillForm.totalAmount||0);const oil=Number(fillForm.oilCost||0);const lit=Number(fillForm.litres||0);
                  const fa=tot-oil;const cpl=lit>0?fa/lit:0;
                  return(
                    <div style={{background:"#f0f4ff",borderRadius:12,padding:"12px 14px",marginTop:10,border:"1px solid #c8d8ff"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#1a52cc",marginBottom:8}}>⚡ Live Calculation</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div style={{background:"#fff",borderRadius:10,padding:"8px 12px"}}>
                          <div style={{fontSize:10,color:"#888",marginBottom:2}}>Fuel Amount</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#1a7a48"}}>{fa>0?fmt(fa):"—"}</div>
                          <div style={{fontSize:10,color:"#888"}}>Total − Oil Cost</div>
                        </div>
                        <div style={{background:"#fff",borderRadius:10,padding:"8px 12px"}}>
                          <div style={{fontSize:10,color:"#888",marginBottom:2}}>Cost per Litre</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#1a52cc"}}>{cpl>0?fmt(cpl):"—"}</div>
                          <div style={{fontSize:10,color:"#888"}}>Fuel ÷ Litres</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{marginTop:10}}><label style={LBL}>📝 Notes (optional)</label><input style={INP} placeholder="e.g. Full tank, oil top-up" value={fillForm.notes} onChange={e=>setFillForm({...fillForm,notes:e.target.value})}/></div>
                <div style={{marginTop:10}}><PhotoPicker value={fillForm.receipt} onChange={v=>setFillForm({...fillForm,receipt:v})}/></div>
                <BtnP g="linear-gradient(135deg,#1a7a48,#2cb96a)" onClick={saveFill}>{editFillId?"Update":"⛽ Save Fill-Up"}</BtnP>
                {editFillId&&<BtnC onClick={()=>{setEditFillId(null);setFillForm(BLANK_FILL());}}/>}
              </Card>
              {/* Recent fills — last 2 + View History button */}
              <div style={{display:"flex",gap:8,alignItems:"center",margin:"16px 16px 8px"}}>
                <div style={{fontWeight:700,fontSize:11,color:"#9aa",letterSpacing:1.5,textTransform:"uppercase",flex:1}}>Recent Fill-Ups ({vFills.length})</div>
                {vFills.length>0&&<button onClick={()=>setShowFuelHistory(true)} style={{background:"linear-gradient(135deg,#1a7a48,#2cb96a)",border:"none",borderRadius:10,padding:"6px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>⛽ View Full Fuel History</button>}
              </div>
              <div style={{margin:"0 16px"}}>
                {vFills.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>No fill-ups recorded yet.</div>}
                {sortedFills.slice(0,2).map(f=><FillCard key={f.id} f={f}/>)}
                {vFills.length>2&&<div style={{textAlign:"center",fontSize:12,color:"#aaa",padding:"8px 0"}}>+ {vFills.length-2} more — tap ⛽ View Full Fuel History to see all</div>}
              </div>
            </div>
          );
        })()}

        {/* ---- SERVICE ---- */}
        {tab==="service"&&(
          <div>
            <ST>Log a Service</ST>
            <Card><div style={G2}><div style={S2}><label style={LBL}>Date</label><input type="date" style={INP} value={svcForm.date} onChange={e=>setSvcForm({...svcForm,date:e.target.value})}/></div><div style={S2}><label style={LBL}>Type</label><select style={INP} value={svcForm.type} onChange={e=>{const t=e.target.value;const def=SVC.find(x=>x.id===t);const next=def?.km&&svcForm.odomAtService?String(Number(svcForm.odomAtService)+def.km):"";setSvcForm({...svcForm,type:t,nextOdomDue:t!=="custom"?next:svcForm.nextOdomDue});}}>{SVC.map(s=><option key={s.id} value={s.id}>{s.label}{s.km?` (every ${fmtN(s.km)} km)`:""}</option>)}</select></div>{svcForm.type==="custom"&&<div style={S2}><label style={LBL}>Name</label><input style={INP} value={svcForm.customLabel} onChange={e=>setSvcForm({...svcForm,customLabel:e.target.value})}/></div>}{svcForm.type!=="custom"&&<div style={{...S2,padding:"8px 12px",background:"#f5f0ff",borderRadius:8,fontSize:12,color:"#6a2ccc"}}>{SVC.find(s=>s.id===svcForm.type)?.desc}</div>}<div><label style={LBL}>Odo at Service</label><input type="number" style={INP} placeholder="87500" value={svcForm.odomAtService} onChange={e=>{const val=e.target.value;const def=SVC.find(x=>x.id===svcForm.type);const next=def?.km&&val?String(Number(val)+def.km):"";setSvcForm({...svcForm,odomAtService:val,nextOdomDue:svcForm.type!=="custom"?next:svcForm.nextOdomDue});}}/></div><div><label style={LBL}>Next Service Odo</label><input type="number" style={INP} placeholder="Auto-set" value={svcForm.nextOdomDue} onChange={e=>setSvcForm({...svcForm,nextOdomDue:e.target.value})}/></div><div style={S2}><label style={LBL}>Next Service Date</label><input type="date" style={INP} value={svcForm.nextDateDue} onChange={e=>setSvcForm({...svcForm,nextDateDue:e.target.value})}/></div><div style={S2}><label style={LBL}>Cost (R)</label><input type="number" step="0.01" style={INP} placeholder="1850.00" value={svcForm.cost} onChange={e=>setSvcForm({...svcForm,cost:e.target.value})}/></div><div style={S2}><label style={LBL}>🏢 Service Centre / Workshop</label><input style={INP} placeholder="e.g. Midas Vereeniging, Toyota dealer" value={svcForm.serviceCenter||""} onChange={e=>setSvcForm({...svcForm,serviceCenter:e.target.value})}/></div><div style={S2}><label style={LBL}>🧾 Invoice Number</label><input style={INP} placeholder="e.g. INV-2025-0042" value={svcForm.invoiceNo||""} onChange={e=>setSvcForm({...svcForm,invoiceNo:e.target.value})}/></div><div style={S2}><label style={LBL}>Notes</label><input style={INP} placeholder="Parts replaced, warranty info…" value={svcForm.notes} onChange={e=>setSvcForm({...svcForm,notes:e.target.value})}/></div><div style={S2}><PhotoPicker value={svcForm.receipt} onChange={v=>setSvcForm({...svcForm,receipt:v})}/></div></div>{svcForm.odomAtService&&svcForm.nextOdomDue&&curOdom>0&&<div style={{marginTop:10,padding:"8px 12px",background:"#f5f0ff",borderRadius:8,fontSize:12,color:"#6a2ccc",fontWeight:600}}>🔧 {fmtKm(Number(svcForm.nextOdomDue)-curOdom)} km until next service</div>}<BtnP g="linear-gradient(135deg,#4a1a8c,#7c3fff)" onClick={saveSvc}>{editSvcId?"Update":"Save Service"}</BtnP>{editSvcId&&<BtnC onClick={()=>{setEditSvcId(null);setSvcForm({date:today(),type:"minor",customLabel:"",serviceCenter:"",invoiceNo:"",odomAtService:"",nextOdomDue:"",nextDateDue:"",cost:"",notes:"",receipt:""});}}/>}</Card>
            <ST>Service History ({vServices.length})</ST>
            {vServices.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>No services logged.</div>}
            {[...vServices].reverse().map(s=>{const def=SVC.find(x=>x.id===s.type);const lbl=s.type==="custom"?s.customLabel:(def?.label||s.type);const kl=s.nextOdomDue&&curOdom>0?Number(s.nextOdomDue)-curOdom:null;const ov=kl!=null&&kl<0;const nd=kl!=null&&kl<=2000&&kl>=0;return(<Card key={s.id} style={{borderLeft:`4px solid ${ov?"#cc2222":nd?"#e88c00":"#7c3fff"}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{lbl}</div><div style={{fontSize:12,color:"#888"}}>{s.date}{s.odomAtService?" · "+fmtN(s.odomAtService)+" km":""}</div>{Number(s.cost)>0&&<div style={{marginTop:4,fontSize:13,fontWeight:700,color:"#6a2ccc"}}>💸 {fmt(Number(s.cost))}</div>}{s.serviceCenter&&<div style={{fontSize:12,color:"#555",marginTop:3}}>🏢 {s.serviceCenter}</div>}{s.invoiceNo&&<div style={{fontSize:12,color:"#888",marginTop:1}}>🧾 Invoice: {s.invoiceNo}</div>}{s.notes&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{s.notes}</div>}{s.nextOdomDue&&<div style={{marginTop:5,fontSize:12,fontWeight:600,color:ov?"#cc2222":nd?"#e88c00":"#6a2ccc"}}>🔧 Next: {fmtN(s.nextOdomDue)} km {kl!=null?(ov?`(OVERDUE ${fmtN(Math.abs(kl))} km)`:`(${fmtKm(kl)} km to go)`):""}</div>}{s.nextDateDue&&<div style={{fontSize:12,color:"#888"}}>📅 By {s.nextDateDue}</div>}{s.receipt&&<img src={s.receipt} alt="r" style={{width:"100%",maxHeight:100,objectFit:"cover",borderRadius:8,marginTop:8,border:"1px solid #eee"}}/>}</div><div style={{display:"flex",gap:6,marginLeft:8}}><Eb color="#7c3fff" bg="#f5f0ff" onClick={()=>{setEditSvcId(s.id);setSvcForm({...s});window.scrollTo(0,0);}}/><Db onClick={()=>setServices(ss=>ss.filter(x=>x.id!==s.id))}/></div></div></Card>);})}
          </div>
        )}

        {/* ---- COSTS ---- */}
        {tab==="costs"&&(!isPro?<ProGate feature="Cost Categories" onUpgrade={()=>setShowUpgrade(true)}/>:(
          <div>
            <ST>Log a Cost</ST>
            <Card><div style={G2}><div style={S2}><label style={LBL}>Category</label><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{COST_CATS.filter(c=>c.id!=="fuel"&&c.id!=="service").map(c=>(<button key={c.id} onClick={()=>setCostForm({...costForm,cat:c.id})} style={{padding:"6px 12px",borderRadius:20,border:"2px solid",borderColor:costForm.cat===c.id?c.color:"#e5e7ef",background:costForm.cat===c.id?c.color+"15":"#fff",color:costForm.cat===c.id?c.color:"#888",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{c.icon} {c.label}</button>))}</div></div><div style={S2}><label style={LBL}>Date</label><input type="date" style={INP} value={costForm.date} onChange={e=>setCostForm({...costForm,date:e.target.value})}/></div><div style={S2}><label style={LBL}>Description</label><input style={INP} placeholder="e.g. Annual licence renewal" value={costForm.desc} onChange={e=>setCostForm({...costForm,desc:e.target.value})}/></div><div style={S2}><label style={LBL}>Amount (R)</label><input type="number" step="0.01" style={INP} placeholder="0.00" value={costForm.amount} onChange={e=>setCostForm({...costForm,amount:e.target.value})}/></div><div style={S2}><PhotoPicker value={costForm.receipt} onChange={v=>setCostForm({...costForm,receipt:v})}/></div></div><BtnP g="linear-gradient(135deg,#b85c00,#e88c00)" onClick={saveCost}>{editCostId?"Update":"Save Cost"}</BtnP>{editCostId&&<BtnC onClick={()=>{setEditCostId(null);setCostForm(BLANK_COST());}}/>}</Card>
            <ST>Cost Summary</ST>
            <Card style={{padding:"14px 16px"}}>{COST_CATS.filter(c=>c.id!=="fuel"&&c.id!=="service").map(c=>{const amt=costByCat[c.id]||0;return(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}><span style={{fontSize:13,color:"#555"}}>{c.icon} {c.label}</span><span style={{fontSize:14,fontWeight:700,color:amt>0?c.color:"#ccc"}}>{fmt(amt)}</span></div>);})}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 0"}}><span style={{fontSize:13,fontWeight:700,color:"#1e2235"}}>Total Other Costs</span><span style={{fontSize:15,fontWeight:800,color:"#b52222"}}>{fmt(totOther)}</span></div></Card>
            <ST>History ({vCosts.length})</ST>
            {vCosts.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>No costs logged.</div>}
            {[...vCosts].reverse().map(c=>{const cat=COST_CATS.find(x=>x.id===c.cat)||COST_CATS[COST_CATS.length-1];return(<Card key={c.id} style={{borderLeft:`4px solid ${cat.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:cat.color,marginBottom:2}}>{cat.icon} {cat.label}</div><div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{c.desc||"—"}</div><div style={{fontSize:12,color:"#888"}}>{c.date}</div><div style={{fontSize:14,fontWeight:700,color:cat.color,marginTop:4}}>{fmt(Number(c.amount))}</div>{c.receipt&&<img src={c.receipt} alt="r" style={{width:"100%",maxHeight:100,objectFit:"cover",borderRadius:8,marginTop:8,border:"1px solid #eee"}}/>}</div><div style={{display:"flex",gap:6,marginLeft:8}}><Eb color={cat.color} bg={cat.color+"15"} onClick={()=>{setEditCostId(c.id);setCostForm({...c});window.scrollTo(0,0);}}/><Db onClick={()=>setCosts(cs=>cs.filter(x=>x.id!==c.id))}/></div></div></Card>);})}
          </div>
        ))}

        {/* ---- CLAIMS ---- */}
        {tab==="claims"&&(!isPro?<ProGate feature="Insurance Claim Tracker" onUpgrade={()=>setShowUpgrade(true)}/>:(
          <div>
            <ST>Log a Claim</ST>
            <Card><div style={G2}><div style={S2}><label style={LBL}>Accident Date</label><input type="date" style={INP} value={claimForm.accidentDate} onChange={e=>setClaimForm({...claimForm,accidentDate:e.target.value})}/></div><div style={S2}><label style={LBL}>Claim Number</label><input style={INP} placeholder="Claim reference" value={claimForm.claimNo} onChange={e=>setClaimForm({...claimForm,claimNo:e.target.value})}/></div><div style={S2}><label style={LBL}>Repair Cost (R)</label><input type="number" step="0.01" style={INP} placeholder="0.00" value={claimForm.repairCost} onChange={e=>setClaimForm({...claimForm,repairCost:e.target.value})}/></div><div style={S2}><label style={LBL}>Status</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{CLAIM_STATUS.map(s=>{const cols={Pending:"#888",Submitted:"#1a52cc","In Assessment":"#b85c00",Approved:"#1a7a48",Rejected:"#cc2222",Closed:"#555"};const col=cols[s]||"#888";return(<button key={s} onClick={()=>setClaimForm({...claimForm,status:s})} style={{padding:"5px 12px",borderRadius:20,border:"2px solid",borderColor:claimForm.status===s?col:"#e5e7ef",background:claimForm.status===s?col+"15":"#fff",color:claimForm.status===s?col:"#888",fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>);})}</div></div><div style={S2}><label style={LBL}>Notes</label><textarea style={{...INP,minHeight:70,resize:"vertical",lineHeight:1.6}} placeholder="Accident details, third party, assessor notes…" value={claimForm.notes} onChange={e=>setClaimForm({...claimForm,notes:e.target.value})}/></div><div style={S2}><PhotoPicker value={claimForm.receipt} onChange={v=>setClaimForm({...claimForm,receipt:v})} label="📸 Damage / Scene Photo"/></div></div><BtnP g="linear-gradient(135deg,#cc2222,#ff4444)" onClick={saveClaim}>{editClaimId?"Update":"Log Claim"}</BtnP>{editClaimId&&<BtnC onClick={()=>{setEditClaimId(null);setClaimForm(BLANK_CLAIM());}}/>}</Card>
            <ST>Claims ({vClaims.length})</ST>
            {vClaims.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:20}}>No claims logged.</div>}
            {[...vClaims].reverse().map(cl=>{const cols={Pending:"#888",Submitted:"#1a52cc","In Assessment":"#b85c00",Approved:"#1a7a48",Rejected:"#cc2222",Closed:"#555"};const col=cols[cl.status]||"#888";return(<Card key={cl.id} style={{borderLeft:`4px solid ${col}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontWeight:700,fontSize:14}}>Accident: {cl.accidentDate}</span><span style={{fontSize:11,fontWeight:700,color:col,background:col+"18",padding:"2px 9px",borderRadius:20}}>{cl.status}</span></div>{cl.claimNo&&<div style={{fontSize:12,color:"#888"}}>Claim No: {cl.claimNo}</div>}{Number(cl.repairCost)>0&&<div style={{fontSize:13,fontWeight:700,color:"#cc2222",marginTop:4}}>💸 {fmt(Number(cl.repairCost))}</div>}{cl.notes&&<div style={{fontSize:12,color:"#888",marginTop:4,lineHeight:1.6}}>{cl.notes}</div>}{cl.receipt&&<img src={cl.receipt} alt="damage" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:10,marginTop:10,border:"1px solid #eee"}}/>}</div><div style={{display:"flex",gap:6,marginLeft:8}}><Eb color={col} bg={col+"15"} onClick={()=>{setEditClaimId(cl.id);setClaimForm({...cl});window.scrollTo(0,0);}}/><Db onClick={()=>setClaims(cs=>cs.filter(x=>x.id!==cl.id))}/></div></div></Card>);})}
          </div>
        ))}

        {/* ---- TYRES ---- */}
        {tab==="tyres"&&(!isPro?<ProGate feature="Tyre Tracker" onUpgrade={()=>setShowUpgrade(true)}/>:(
          <div>
            <ST>Tyre Diagram</ST>
            <Card><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"8px 0"}}><div style={{display:"flex",gap:60,alignItems:"center"}}><TyreWheel tread={(vehicle.tyres||[])[0]?.tread} label="Front Left" onClick={()=>{setTyreIdx(0);setTyreDraft({...(vehicle.tyres||[])[0]});}}/><div style={{width:48,height:90,borderRadius:12,background:"#e8eaf0",border:"2px solid #c8cad8",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:20}}>{VEHICLE_ICONS[vehicle.vehicleType]||"🚗"}</span></div><TyreWheel tread={(vehicle.tyres||[])[1]?.tread} label="Front Right" onClick={()=>{setTyreIdx(1);setTyreDraft({...(vehicle.tyres||[])[1]});}}/></div><div style={{display:"flex",gap:60,alignItems:"center"}}><TyreWheel tread={(vehicle.tyres||[])[2]?.tread} label="Rear Left" onClick={()=>{setTyreIdx(2);setTyreDraft({...(vehicle.tyres||[])[2]});}}/><div style={{width:48,height:40}}/><TyreWheel tread={(vehicle.tyres||[])[3]?.tread} label="Rear Right" onClick={()=>{setTyreIdx(3);setTyreDraft({...(vehicle.tyres||[])[3]});}}/></div><TyreWheel tread={(vehicle.tyres||[])[4]?.tread} label="Spare" onClick={()=>{setTyreIdx(4);setTyreDraft({...(vehicle.tyres||[])[4]});}}/></div><div style={{fontSize:11,color:"#aaa",textAlign:"center",marginTop:4}}>Tap a tyre to update</div></Card>
            {tyreIdx!=null&&(<Card style={{border:"2px solid #2c5fff"}}><div style={{fontWeight:700,fontSize:15,marginBottom:12,color:"#1a2a6c"}}>✏️ {TYRE_POSITIONS[tyreIdx]}</div><div style={G2}><div><label style={LBL}>Tread (mm)</label><input type="number" step="0.1" style={INP} placeholder="6.5" value={tyreDraft.tread||""} onChange={e=>setTyreDraft({...tyreDraft,tread:e.target.value})}/></div><div><label style={LBL}>Pressure (kPa)</label><input style={INP} placeholder="220" value={tyreDraft.pressure||""} onChange={e=>setTyreDraft({...tyreDraft,pressure:e.target.value})}/></div><div style={S2}><label style={LBL}>Brand</label><input style={INP} value={tyreDraft.brand||""} onChange={e=>setTyreDraft({...tyreDraft,brand:e.target.value})}/></div><div style={S2}><label style={LBL}>Size</label><input style={INP} placeholder="205/55R16" value={tyreDraft.size||""} onChange={e=>setTyreDraft({...tyreDraft,size:e.target.value})}/></div><div style={S2}><label style={LBL}>Last Changed</label><input type="date" style={INP} value={tyreDraft.lastChanged||""} onChange={e=>setTyreDraft({...tyreDraft,lastChanged:e.target.value})}/></div><div style={S2}><label style={LBL}>Notes</label><input style={INP} value={tyreDraft.notes||""} onChange={e=>setTyreDraft({...tyreDraft,notes:e.target.value})}/></div></div>{tyreDraft.tread&&(()=>{const st=TYRE_STATUS(tyreDraft.tread);return <div style={{padding:"8px 12px",borderRadius:8,background:st.bg,marginTop:8,fontSize:12,fontWeight:700,color:st.color}}>{st.icon} {tyreDraft.tread}mm — {st.label}</div>;})()}<BtnP g="linear-gradient(135deg,#1a52cc,#2c5fff)" onClick={saveTyre}>Save Tyre</BtnP><BtnC onClick={()=>setTyreIdx(null)}/></Card>)}
            <ST>Tyre Summary</ST>
            {(vehicle.tyres||[]).map((t,i)=>{const st=TYRE_STATUS(t.tread);return(<Card key={i} style={{borderLeft:`4px solid ${st.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:14}}>{t.pos}</div><div style={{fontSize:12,color:"#888"}}>{t.brand||"Unknown"}{t.size?` · ${t.size}`:""}{t.lastChanged?` · Changed ${t.lastChanged}`:""}</div>{t.tread&&<div style={{fontSize:12,fontWeight:700,color:st.color,marginTop:3}}>{st.icon} {t.tread}mm — {st.label}</div>}{t.pressure&&<div style={{fontSize:12,color:"#888"}}>Pressure: {t.pressure} kPa</div>}</div><button onClick={()=>{setTyreIdx(i);setTyreDraft({...t});}} style={{background:"#f0f4ff",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#2c5fff",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>Edit</button></div></Card>);})}
            <Card style={{background:"#fffbea",border:"1px solid #f0d060"}}><div style={{fontSize:12,fontWeight:700,color:"#7a5c00",marginBottom:4}}>📏 Tread Guide</div><div style={{fontSize:12,color:"#7a5c00",lineHeight:1.8}}>{"🟢 7mm+ = New  ·  🟢 5–7mm = Good\n🟡 3–5mm = Wear soon  ·  🟠 2–3mm = Low\n🔴 Below 2mm = Replace immediately\n⚠️ SA legal minimum: 1.6mm"}</div></Card>
          </div>
        ))}

        {/* ---- DOCS ---- */}
        {tab==="docs"&&(!isPro?<ProGate feature="Document Vault" onUpgrade={()=>setShowUpgrade(true)}/>:(
          <div>
            <ST>Document Vault</ST>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:4}}>{DOC_CATS.map(c=>(<button key={c.id} onClick={()=>setDocCat(c.id)} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:"none",background:docCat===c.id?"#1a2a6c":"#e8eaf0",color:docCat===c.id?"#fff":"#555",fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{c.icon} {c.label}</button>))}</div>
            <Card><div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#1e2235"}}>{DOC_CATS.find(c=>c.id===docCat)?.icon} Add {DOC_CATS.find(c=>c.id===docCat)?.label}</div><div style={G2}><div style={S2}><label style={LBL}>Label</label><input style={INP} placeholder="e.g. 2025 vehicle licence" value={docForm.label} onChange={e=>setDocForm({...docForm,label:e.target.value})}/></div><div style={S2}><label style={LBL}>Date</label><input type="date" style={INP} value={docForm.date} onChange={e=>setDocForm({...docForm,date:e.target.value})}/></div><div style={S2}><PhotoPicker value={docForm.data} onChange={v=>setDocForm({...docForm,data:v})} label="📎 Attach Photo / Scan"/></div></div><BtnP g="linear-gradient(135deg,#1a2a6c,#2c5fff)" onClick={saveDoc}>Save Document</BtnP></Card>
            <ST>{DOC_CATS.find(c=>c.id===docCat)?.label} ({(vehicle.docs||[]).filter(d=>d.cat===docCat).length})</ST>
            {(vehicle.docs||[]).filter(d=>d.cat===docCat).length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center",marginTop:12,marginBottom:20}}>No documents yet.</div>}
            {(vehicle.docs||[]).filter(d=>d.cat===docCat).slice().reverse().map(d=>(<Card key={d.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{d.label}</div><div style={{fontSize:12,color:"#888"}}>{d.date}</div>{d.data&&<img src={d.data} alt={d.label} style={{width:"100%",maxHeight:200,objectFit:"contain",borderRadius:10,marginTop:10,border:"1px solid #eee",background:"#f8f9fc",cursor:"pointer"}} onClick={()=>window.open(d.data,"_blank")}/>}{d.data&&<div style={{fontSize:11,color:"#aaa",marginTop:4,textAlign:"center"}}>Tap to view full size</div>}</div><Db onClick={()=>setVehicle({...vehicle,docs:(vehicle.docs||[]).filter(x=>x.id!==d.id)})}/></div></Card>))}
            <ST>All Documents ({(vehicle.docs||[]).length})</ST>
            {DOC_CATS.map(c=>{const n=(vehicle.docs||[]).filter(d=>d.cat===c.id).length;if(!n)return null;return(<div key={c.id} onClick={()=>setDocCat(c.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",cursor:"pointer"}}><span style={{fontSize:13,fontWeight:600}}>{c.icon} {c.label}</span><span style={{fontSize:12,fontWeight:700,color:"#2c5fff",background:"#eef2ff",padding:"2px 10px",borderRadius:20}}>{n}</span></div>);})}
          </div>
        ))}

        {/* ---- SARS ---- */}
        {tab==="sars"&&(!isPro?<ProGate feature="SARS Deduction Calculator" onUpgrade={()=>setShowUpgrade(true)}/>:(
          <div>
            <TaxBar/>
            <ST>SARS Travel Deduction</ST>
            <Card style={{background:"linear-gradient(135deg,#f0f4ff,#e8f0ff)",border:"1px solid #c8d4f8"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <Tile label="📏 Total km"    value={fmtKm(totKm)+" km"} bg="#fff" color="#1e2235"/>
                <Tile label="💼 Business"   value={fmtKm(totB)+" km"}  bg="#fff" color="#1a52cc"/>
                <Tile label="📊 Business %" value={(bizPct*100).toFixed(1)+"%"} bg="#fff" color="#6a2ccc"/>
                <Tile label="💸 Actual Cost"value={fmt(totRunning)} bg="#fff" color="#b52222"/>
              </div>
              <div style={{background:"#1a2a6c",borderRadius:12,padding:"14px 16px",color:"#fff",marginBottom:12}}>
                <div style={{fontSize:11,opacity:0.75,marginBottom:8}}>Rate Bracket: {totKm<=8000?"0–8 000":totKm<=16000?"8k–16k":totKm<=24000?"16k–24k":totKm<=32000?"24k–32k":totKm<=40000?"32k–40k":totKm<=48000?"40k–48k":totKm<=56000?"48k–56k":"56k+"} km/yr</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}><div><div style={{fontSize:10,opacity:0.7}}>Fixed</div><div style={{fontSize:13,fontWeight:700}}>R {fmtN(sarsRate.fixed)}/yr</div></div><div><div style={{fontSize:10,opacity:0.7}}>Fuel</div><div style={{fontSize:13,fontWeight:700}}>{sarsRate.fuel}c/km</div></div><div><div style={{fontSize:10,opacity:0.7}}>Maint</div><div style={{fontSize:13,fontWeight:700}}>{sarsRate.maint}c/km</div></div></div>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.2)",paddingTop:10,fontSize:12,opacity:0.85,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{"Fixed: R"+fmt(sarsRate.fixed*bizPct)+"\nFuel: "+sarsRate.fuel+"c × "+fmtKm(totB)+" km = R"+fmt(sarsRate.fuel/100*totB)+"\nMaint: "+sarsRate.maint+"c × "+fmtKm(totB)+" km = R"+fmt(sarsRate.maint/100*totB)}</div>
              </div>
              <div style={{padding:"14px 16px",background:"#f0faf4",borderRadius:12,border:"1px solid #b0e8c8"}}><div style={{fontSize:12,color:"#888",marginBottom:4}}>Estimated SARS Deduction</div><div style={{fontSize:26,fontWeight:800,color:"#1a7a48"}}>{fmt(sarsDed)}</div><div style={{fontSize:11,color:"#888",marginTop:4}}>Claimable (lesser of deduction vs actual): <b style={{color:"#1a7a48"}}>{fmt(claimable)}</b></div></div>
            </Card>
            <Card style={{background:"#fffbea",border:"1px solid #f0d060"}}><div style={{fontSize:13,fontWeight:700,color:"#7a5c00",marginBottom:4}}>⚠️ Disclaimer</div><div style={{fontSize:12,color:"#7a5c00",lineHeight:1.7}}>Estimate only. A complete trip log for the full tax year is required. Consult a registered tax practitioner. Verify current rates at <b>sars.gov.za</b>.</div></Card>
          </div>
        ))}

        {/* ---- EXPORT ---- */}
        {tab==="export"&&(
          <div>
            <TaxBar/>
            <ST>SARS CSV Export</ST>
            <Card>
              <div style={{textAlign:"center",padding:"8px 0 4px"}}>
                <div style={{fontSize:36,marginBottom:6}}>📊</div>
                <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>Download Your Logbook</div>
                <div style={{fontSize:13,color:"#888",marginBottom:14,lineHeight:1.6}}>
                  <b>{vehicle.make||"Your"} {vehicle.model||"vehicle"} {vehicle.reg?`(${vehicle.reg})`:""}</b><br/>
                  Opens directly in Excel, Google Sheets or Numbers
                </div>
                {/* Summary tiles */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {[
                    [vTrips.length,         "Trips logged",    "#f0f4ff","#1a6bc4"],
                    [vFills.length,         "Fuel fill-ups",   "#f0faf4","#1a7a48"],
                    [vServices.length,      "Services",        "#f5f0ff","#6a2ccc"],
                    [vCosts.length,         "Other costs",     "#fff8f0","#b85c00"],
                    [fmtKm(totKm)+" km",    "Total distance",  "#fff5ee","#b85c00"],
                    [fmt(totRunning),   "Running cost",    "#fef6f6","#b52222"],
                    [fmtKm(totB)+" km",     "Business km",     "#eef6ff","#1a52cc"],
                    [claimable>0?fmt(claimable):"—", "SARS estimate", "#f0faf4","#1a7a48"],
                  ].map(([v,l,bg,col])=>(
                    <div key={l} style={{background:bg,borderRadius:10,padding:"10px 8px"}}>
                      <div style={{fontSize:15,fontWeight:800,color:col}}>{v}</div>
                      <div style={{fontSize:10,color:"#888",marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>doCSV(vTrips,vFills,vServices,vCosts,vClaims,vehicle,taxYear,sarsDed,claimable,totKm,totB)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${BRAND.navy},${BRAND.blue})`,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(26,107,196,0.35)",marginBottom:8}}>
                  ⬇️ Export to Excel (CSV)
                </button>
                <div style={{fontSize:11,color:"#aaa"}}>File: LogbookProSA_{vehicle.reg||"logbook"}_{taxYear}.csv</div>
              </div>
            </Card>

            {/* What's included — for beta testers */}
            <ST>What's included in the export</ST>
            <Card style={{padding:"14px 16px"}}>
              {[
                ["🚗","Vehicle & Driver Details",   "Make, model, reg, VIN number, licence expiry, RWC expiry (trucks/trailers only), driver's licence code & expiry, PDP details"],
                ["📍","Full Trip Log",              "Every trip: date, purpose, from, to, odometer start & end, distance, business/private type, notes"],
                ["⛽","Fuel Log",                  "Every fill-up: date, station name, litres, price per litre, fuel total, itemised extras, station total, odometer"],
                ["🔧","Service Log",               "Every service: date, type, service centre, invoice number, odometer, cost, next service due"],
                ["💳","Other Costs",               "Licence renewals, insurance premiums, tyres, roadworthy fees, repairs — categorised with amounts"],
                ["📋","Insurance Claims",          "Accident date, claim number, repair cost, claim status and notes"],
                ["📅","Monthly Summary",           "Per month: private km, business km, total km, fuel spend, service spend, other costs, monthly total"],
                ["📊","Year Totals",               "Full-year totals across all categories plus total running cost"],
                ["🧮","SARS Deduction Estimate",   "Total km, business km, business %, estimated deduction and claimable amount based on SARS rate tables"],
              ].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:20,flexShrink:0,marginTop:1}}>{icon}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1e2235",marginBottom:2}}>{title}</div>
                    <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{desc}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 12px",background:"#f0faf4",borderRadius:10,fontSize:12,color:"#1a7a48",lineHeight:1.6}}>
                <b>For beta testers</b> — export your data and open it in Excel or Google Sheets to verify every figure matches what you've entered. Each section is clearly labelled and easy to cross-reference.
              </div>
            </Card>

            <ST>Backup &amp; Restore</ST>
            <Card>
              <div style={{fontSize:13,color:"#555",marginBottom:14,lineHeight:1.6}}>
                <b>Backup</b> saves everything as a JSON file — vehicles, all data, and plan status. <b>Restore</b> on any device to pick up exactly where you left off.
              </div>
              {backupMsg&&<div style={{padding:"9px 12px",borderRadius:10,background:backupMsg.startsWith("✅")?"#f0faf4":"#fff0f0",color:backupMsg.startsWith("✅")?"#1a7a48":"#cc2222",fontWeight:600,fontSize:13,marginBottom:12}}>{backupMsg}</div>}
              <button onClick={doBackup} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#1a7a48,#2cb96a)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>💾 Download Backup (JSON)</button>
              <button onClick={()=>restoreRef.current.click()} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px dashed #aab",background:"#f8f9fc",color:"#555",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>📂 Restore from Backup</button>
              <input ref={restoreRef} type="file" accept=".json" style={{display:"none"}} onChange={doRestore}/>
            </Card>

            <Card style={{background:"#fffbea",border:"1px solid #f0d060"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7a5c00",marginBottom:4}}>⚠️ SARS Tip</div>
              <div style={{fontSize:12,color:"#7a5c00",lineHeight:1.6}}>SA tax year runs <b>1 March to 28 February</b>. SARS requires the date, purpose, start and end odometer, and distance for every business trip. Your exported logbook contains all of this.</div>
            </Card>

            <Card style={{background:"#f0f4ff",border:"1px solid #b0c4ff"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a52cc",marginBottom:4}}>💬 Beta Feedback</div>
              <div style={{fontSize:12,color:"#555",marginBottom:12,lineHeight:1.6}}>Spotted a bug or have a suggestion? We'd love to hear from you during the beta.</div>
              <a href={`mailto:logbookprosa@gmail.com?subject=${encodeURIComponent("Logbook Pro SA Beta Feedback")}&body=${encodeURIComponent("Hi, here is my feedback:\n\n")}`} style={{display:"block",padding:"12px",borderRadius:12,background:`linear-gradient(135deg,${BRAND.navy},${BRAND.blue})`,color:"#fff",fontWeight:700,fontSize:15,textAlign:"center",textDecoration:"none"}}>✉️ Send Feedback</a>
            </Card>

            {!isPro&&<div onClick={()=>setShowUpgrade(true)} style={{background:`linear-gradient(135deg,${BRAND.orange},#c45e00)`,borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:10}}><LogoMark size={24}/><div><div style={{fontWeight:800,fontSize:14,color:"#fff"}}>Upgrade to Pro</div><div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>Fleet management · SARS calculator · Document vault</div></div></div><div style={{fontSize:22,color:"#fff"}}>›</div></div>}
          </div>
        )}

      </div>

      {/* QUICK-ADD TRIP BUTTON — Dashboard only */}
      {tab==="dashboard"&&(
        <button onClick={()=>{setShowTripList(false);setDescWarn(false);setTab("trips");window.scrollTo(0,0);}} style={{position:"fixed",bottom:isPro?116:84,right:16,padding:"12px 18px",borderRadius:30,border:"none",background:`linear-gradient(135deg,${BRAND.navy},${BRAND.blue})`,color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 20px rgba(26,107,196,0.5)",display:"flex",alignItems:"center",gap:6,zIndex:25,fontFamily:"inherit",whiteSpace:"nowrap"}}>＋ Quick Add Trip</button>
      )}

      {/* MAP MODAL */}
      {mapTrip&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={()=>setMapTrip(null)}><div style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 16px 32px"}} onClick={e=>e.stopPropagation()}><div style={{fontWeight:800,fontSize:16,marginBottom:4}}>{mapTrip.description||"Trip"}</div><div style={{fontSize:13,color:"#888",marginBottom:14}}>{mapTrip.date} · {mapTrip.from} → {mapTrip.to} · {fmtKm(Number(mapTrip.odomEnd||0)-Number(mapTrip.odomStart||0))} km</div><iframe title="map" style={{width:"100%",height:260,borderRadius:12,border:"none"}} src={`https://maps.google.com/maps?q=${encodeURIComponent(mapTrip.from)}&daddr=${encodeURIComponent(mapTrip.to)}&output=embed`} allowFullScreen/><button onClick={()=>setMapTrip(null)} style={{width:"100%",marginTop:12,padding:"11px",borderRadius:12,border:"none",background:"#f0f0f0",color:"#555",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Close</button><a href={`https://www.google.com/maps/dir/${encodeURIComponent(mapTrip.from)}/${encodeURIComponent(mapTrip.to)}`} target="_blank" rel="noreferrer" style={{display:"block",marginTop:8,padding:"11px",borderRadius:12,background:"linear-gradient(135deg,#1a2a6c,#2c5fff)",color:"#fff",fontWeight:700,fontSize:14,textAlign:"center",textDecoration:"none"}}>Open in Google Maps</a></div></div>)}

      {/* SOS MODAL */}
      {showSOS&&(<div style={{position:"fixed",inset:0,background:"rgba(180,0,0,0.85)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowSOS(false)}><div style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px"}} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:48,marginBottom:4}}>🚨</div><div style={{fontWeight:800,fontSize:20,color:"#cc2222"}}>Emergency / Accident</div></div>
        <div style={{padding:"12px 14px",background:"#fff0f0",border:"1px solid #f0a0a0",borderRadius:12,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"#9a1a1a",marginBottom:6}}>What to do NOW:</div>
          <div style={{fontSize:13,color:"#7a2020",lineHeight:2,whiteSpace:"pre-wrap"}}>{vehicle.insurance?.accidentSteps||"1. Stop — never leave the scene\n2. Check injuries — call 10111 or 10177\n3. Do NOT admit fault\n4. Photograph scene & plates\n5. Exchange ID, licence, reg & insurer details\n6. Report to nearest police within 24hrs\n7. Notify insurer immediately"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <a href="tel:10111" style={{display:"block",padding:"14px",borderRadius:12,background:"#cc2222",color:"#fff",fontWeight:800,fontSize:15,textAlign:"center",textDecoration:"none"}}>📞 10111 Police</a>
          <a href="tel:10177" style={{display:"block",padding:"14px",borderRadius:12,background:"#e06000",color:"#fff",fontWeight:800,fontSize:15,textAlign:"center",textDecoration:"none"}}>🚑 10177 Ambulance</a>
        </div>
        {vehicle.insurance?.emergencyPhone&&<a href={`tel:${vehicle.insurance.emergencyPhone}`} style={{display:"block",padding:"14px",borderRadius:12,background:"linear-gradient(135deg,#1a2a6c,#2c5fff)",color:"#fff",fontWeight:800,fontSize:15,textAlign:"center",textDecoration:"none",marginBottom:12}}>📞 Call Insurer: {vehicle.insurance.emergencyPhone}</a>}
        <button onClick={()=>setShowSOS(false)} style={{width:"100%",padding:"11px",borderRadius:12,border:"1.5px solid #e5e7ef",background:"#fff",color:"#888",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
      </div></div>)}

      {/* UPGRADE MODAL */}
      {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} onUpgrade={()=>{setPlan("pro");setShowUpgrade(false);}}/>}

      {/* BOTTOM NAV — Fix 1: 6 tabs for free, 2 rows of 6 for Pro */}
      {!isPro?(
        // Free: 6 tabs, spacious
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #eee",display:"flex",zIndex:20}}>
          {FREE_TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(t.id)}><span style={{fontSize:16}}>{t.icon}</span><span>{t.label}</span></button>))}
          {/* Fix 4: Upgrade slot always visible in free nav */}
          <button onClick={()=>setShowUpgrade(true)} style={{flex:1,padding:"5px 1px 4px",border:"none",background:"none",fontFamily:"inherit",fontSize:"8px",fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:BRAND.orange,borderTop:`2px solid ${BRAND.orange}`}}>
            <span style={{fontSize:16}}>⭐</span>
            <span>Pro</span>
          </button>
        </div>
      ):(
        // Pro: 2 rows of 6 tabs
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #eee",zIndex:20}}>
          <div style={{display:"flex"}}>
            {PRO_ROW1.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(t.id)}><span style={{fontSize:14}}>{t.icon}</span><span>{t.label}</span></button>))}
          </div>
          <div style={{display:"flex",borderTop:"1px solid #f0f0f0"}}>
            {PRO_ROW2.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(t.id)}><span style={{fontSize:14}}>{t.icon}</span><span>{t.label}</span></button>))}
          </div>
        </div>
      )}
    </div>
  );
}
