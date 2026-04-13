import { useState, useEffect, useRef } from "react";

const today = () => new Date().toISOString().split("T")[0];

const MONTHS = [
"Jan","Feb","Mar","Apr","May","Jun",
"Jul","Aug","Sep","Oct","Nov","Dec"
];

const fmt = (n) => Number(n || 0).toFixed(2);

const fmtKm = (n) => Number(n || 0).toFixed(1);

const uid = () =>
Date.now().toString(36) +
Math.random().toString(36).slice(2,6);

function load(k,d){
try{
return JSON.parse(localStorage.getItem(k)) ?? d;
}catch{
return d;
}
}

function save(k,v){
localStorage.setItem(k,JSON.stringify(v));
}

function daysUntil(d){
if(!d) return null;
return Math.ceil(
(new Date(d) - new Date(today()))
/ 86400000
);
}

function expiryBadge(d){

const n = daysUntil(d);

if(n === null) return null;

if(n <= 0){
return {
label:`EXPIRED ${Math.abs(n)} days ago`,
color:"#cc2222",
bg:"#ff6160",
icon:"🚫"
};
}

if(n <= 60){
return {
label:`${n} days`,
color:"#b85c00",
bg:"#fff8ee",
icon:"⚠️"
};
}

return {
label:`${n} days left`,
color:"#1a7a48",
bg:"#e0faf4",
icon:"✅"
};

}

function taxYearRange(){
const now = new Date();

let start =
now.getMonth() >= 2
? now.getFullYear()
: now.getFullYear() - 1;

return {
start: `${start}-03-01`,
end: `${start+1}-02-28`
};
}

function inRange(d,{start,end}){
if(!d) return false;
return d >= start && d <= end;
}

function buildTaxYears(){
const n = new Date();
const end =
n.getMonth() >= 2
? n.getFullYear()+1
: n.getFullYear();

const y=["all"];

for(let i=end;i>=end-5;i--){
y.push(`${i-1}/${i}`);
}

return y;
}

const SARS_RATES = [
{maxKm:8000,fixed:26023,fuel:116.7,maint:42.7},
{maxKm:16000,fixed:46043,fuel:122.7,maint:46.1},
{maxKm:24000,fixed:60261,fuel:122.7,maint:47.3},
{maxKm:32000,fixed:74373,fuel:129.4,maint:50.4},
{maxKm:40000,fixed:90594,fuel:133.1,maint:54.2},
{maxKm:48000,fixed:103523,fuel:133.1,maint:55.9},
{maxKm:56000,fixed:118457,fuel:133.1,maint:56.8},
{maxKm:Infinity,fixed:132350,fuel:147.0,maint:63.5}
];

function getSarsRate(km){
return (
SARS_RATES.find(r=>km<=r.maxKm) ||
SARS_RATES[SARS_RATES.length-1]
);
}

const TYRE_STATUS=[
"New",
"Good",
"Fair",
"Worn",
"Replace"
];

const BLANK_VEHICLE={
id:"",
name:"",
registration:"",
type:"Car",
make:"",
model:"",
year:"",
vin:"",
engine:"",
colour:"",
licenceExpiry:"",
insuranceExpiry:"",
serviceDue:"",
odometer:0,
tyres:{
fl:{km:0,status:"New"},
fr:{km:0,status:"New"},
rl:{km:0,status:"New"},
rr:{km:0,status:"New"},
spare:{km:0,status:"New"}
}
};

function getMaintPredictions(vehicle){

const preds=[];

if(vehicle.serviceDue){

const badge = expiryBadge(
vehicle.serviceDue
);

if(badge){
preds.push({
label:"Service Due",
...badge
});
}

}

return preds;
}

const doCSV = (rows, name="export.csv") => {
const csv =
rows.map(r =>
Object.values(r)
.map(v => `"${v ?? ""}"`)
.join(",")
).join("\n");

const blob =
new Blob([csv], {type:"text/csv"});

const url =
URL.createObjectURL(blob);

const a =
document.createElement("a");

a.href = url;
a.download = name;
a.click();
};

function Card({children,style}){

return(

<div
style={{
background:"#fff",
padding:14,
borderRadius:14,
boxShadow:
"0 3px 10px rgba(0,0,0,0.06)",
marginBottom:10,
...style
}}
>

{children}

</div>

);

}

export default function App(){

const [vehicles,setVehicles]=
useState(load("vehicles",[]));

const [drivers,setDrivers]=
useState(load("drivers",[]));

const [trips,setTrips]=
useState(load("trips",[]));

const [claims,setClaims]=
useState(load("claims",[]));

const [docs,setDocs]=
useState(load("docs",[]));

const [costs,setCosts]=
useState(load("costs",[]));

const [active,setActive]=
useState("dashboard");

const [year,setYear]=
useState("all");

const [installPrompt,setInstallPrompt]=
useState(null);

useEffect(()=>{
save("vehicles",vehicles);
},[vehicles]);

useEffect(()=>{
save("drivers",drivers);
},[drivers]);

useEffect(()=>{
save("trips",trips);
},[trips]);

useEffect(()=>{
save("claims",claims);
},[claims]);

useEffect(()=>{
save("docs",docs);
},[docs]);

useEffect(()=>{
save("costs",costs);
},[costs]);

useEffect(()=>{

window.addEventListener(
"beforeinstallprompt",
(e)=>{
e.preventDefault();
setInstallPrompt(e);
}
);

},[]);

const taxRange =
taxYearRange();

const filteredTrips =
year === "all"
? trips
: trips.filter(t =>
inRange(t.date, taxRange)
);

const businessKm =
filteredTrips
.filter(t => t.type === "Business")
.reduce(
(s,t)=>s+Number(t.km || 0),
0
);

const totalCosts =
costs.reduce(
(s,c)=>s+Number(c.amount||0),
0
);

return(

<div
style={{
maxWidth:520,
margin:"0 auto",
padding:14,
paddingBottom:90,
fontFamily:"system-ui"
}}
>

<div
style={{
fontWeight:700,
fontSize:20,
marginBottom:10
}}
>

Logbook Pro SA

</div>

<Card>

Vehicles: {vehicles.length}

</Card>

<Card>

Drivers: {drivers.length}

</Card>

<Card>

Trips: {trips.length}

</Card>

<Card>

Costs: R {fmt(totalCosts)}

</Card>

<Card>

Business KM: {fmtKm(businessKm)}

</Card>

<div
style={{
position:"fixed",
bottom:0,
left:0,
right:0,
background:"#fff",
borderTop:"1px solid #eee",
display:"flex"
}}
>

[
"dashboard",
"vehicles",
"drivers",
"trips",
"costs",
"claims"
].map(t => (

<button
key={t}
onClick={()=>setActive(t)}
style={{
flex:1,
padding:10,
border:"none",
background:
active===t
? "#eef2ff"
: "#fff"
}}
>

{t}

</button>

))

</div>

</div>

);

}

