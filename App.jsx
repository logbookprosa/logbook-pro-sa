import { useState, useEffect } from "react";

const uid = () => Date.now().toString(36);

const today = () =>
new Date().toISOString().split("T")[0];

const VEHICLE_TYPES = [
"Car",
"Bakkie",
"Truck",
"Trailer",
"Horsebox",
"Motorcycle",
"Other"
];

const CLAIM_STATUS = [
"Open",
"Submitted",
"In Progress",
"Approved",
"Rejected",
"Closed"
];

export default function App(){

const [installPrompt,setInstallPrompt]=useState(null);

const [vehicles,setVehicles]=useState(

()=>JSON.parse(localStorage.getItem("vehicles")||"[]")
);

const [drivers,setDrivers]=useState(
()=>JSON.parse(localStorage.getItem("drivers")||"[]")
);

const [trips,setTrips]=useState(
()=>JSON.parse(localStorage.getItem("trips")||"[]")
);

const [claims,setClaims]=useState(
()=>JSON.parse(localStorage.getItem("claims")||"[]")
);

const [activeTab,setActiveTab]=useState("dashboard");
useEffect(()=>{

window.addEventListener("beforeinstallprompt",(e)=>{
e.preventDefault();
setInstallPrompt(e);
});

},[]);

useEffect(()=>{
localStorage.setItem("vehicles",JSON.stringify(vehicles));
},[vehicles]);

useEffect(()=>{
localStorage.setItem("drivers",JSON.stringify(drivers));
},[drivers]);

useEffect(()=>{
localStorage.setItem("trips",JSON.stringify(trips));
},[trips]);

useEffect(()=>{
localStorage.setItem("claims",JSON.stringify(claims));
},[claims]);

const addVehicle = ()=>{
setVehicles([
...vehicles,
{
id:uid(),
make:"",
model:"",
reg:"",
type:"Car",
licenceExpiry:"",
insuranceExpiry:""
}
]);
};

const addDriver = ()=>{
setDrivers([
...drivers,
{
id:uid(),
name:"",
licence:"",
licenceExpiry:"",
pdpExpiry:""
}
]);
};

const addTrip = ()=>{
setTrips([
...trips,
{
id:uid(),
date:today(),
vehicle:"",
start:"",
end:"",
type:"Business"
}
]);
};

const addClaim = ()=>{
setClaims([
...claims,
{
id:uid(),
date:today(),
vehicle:"",
driver:"",
status:"Open",
description:""
}
]);
};

return (

<div style={{maxWidth:480,margin:"0 auto",paddingBottom:80}}>

{/* HEADER */}

<div style={{
background:"#1a2a6c",
color:"white",
padding:16
}}>

<div style={{fontWeight:800,fontSize:18}}>
Logbook Pro SA
</div>

<div style={{fontSize:12,opacity:.7}}>
Fleet & SARS Logbook
</div>

</div>

{/* DASHBOARD */}

{activeTab==="dashboard" && (

<div style={{padding:16}}>

<div className="card">
Vehicles: {vehicles.length}
</div>

<div className="card">
Drivers: {drivers.length}
</div>

<div className="card">
Trips: {trips.length}
</div>

<div className="card">
Claims: {claims.length}
</div>

</div>

)}

{/* VEHICLES */}

{activeTab==="vehicles" && (

<div style={{padding:16}}>

<button onClick={addVehicle}>
+ Add Vehicle
</button>

{vehicles.map(v=>(

<div key={v.id} className="card">

<input
placeholder="Make"
value={v.make}
onChange={e=>{
setVehicles(
vehicles.map(x=>
x.id===v.id ?
{...x,make:e.target.value}
:x
)
);
}}
/>

<input
placeholder="Model"
value={v.model}
onChange={e=>{
setVehicles(
vehicles.map(x=>
x.id===v.id ?
{...x,model:e.target.value}
:x
)
);
}}
/>

<input
placeholder="Registration"
value={v.reg}
onChange={e=>{
setVehicles(
vehicles.map(x=>
x.id===v.id ?
{...x,reg:e.target.value}
:x
)
);
}}
/>

<select
value={v.type}
onChange={e=>{
setVehicles(
vehicles.map(x=>
x.id===v.id ?
{...x,type:e.target.value}
:x
)
);
}}
>

{VEHICLE_TYPES.map(t=>(
<option key={t}>{t}</option>
))}

</select>

</div>

))}

</div>

)}

{/* DRIVERS */}

{activeTab==="drivers" && (

<div style={{padding:16}}>

<button onClick={addDriver}>
+ Add Driver
</button>

{drivers.map(d=>(

<div key={d.id} className="card">

<input
placeholder="Driver Name"
value={d.name}
onChange={e=>{
setDrivers(
drivers.map(x=>
x.id===d.id ?
{...x,name:e.target.value}
:x
)
);
}}
/>

<input
placeholder="Licence"
value={d.licence}
onChange={e=>{
setDrivers(
drivers.map(x=>
x.id===d.id ?
{...x,licence:e.target.value}
:x
)
);
}}
/>

<input
type="date"
value={d.licenceExpiry}
onChange={e=>{
setDrivers(
drivers.map(x=>
x.id===d.id ?
{...x,licenceExpiry:e.target.value}
:x
)
);
}}
/>

<input
type="date"
value={d.pdpExpiry}
onChange={e=>{
setDrivers(
drivers.map(x=>
x.id===d.id ?
{...x,pdpExpiry:e.target.value}
:x
)
);
}}
/>

</div>

))}

</div>

)}

{/* CLAIMS */}

{activeTab==="claims" && (

<div style={{padding:16}}>

<button onClick={addClaim}>
+ Add Claim
</button>

{claims.map(c=>(

<div key={c.id} className="card">

<input
type="date"
value={c.date}
onChange={e=>{
setClaims(
claims.map(x=>
x.id===c.id ?
{...x,date:e.target.value}
:x
)
);
}}
/>

<select
value={c.status}
onChange={e=>{
setClaims(
claims.map(x=>
x.id===c.id ?
{...x,status:e.target.value}
:x
)
);
}}
>

{CLAIM_STATUS.map(s=>(
<option key={s}>{s}</option>
))}

</select>

<textarea
placeholder="Description"
value={c.description}
onChange={e=>{
setClaims(
claims.map(x=>
x.id===c.id ?
{...x,description:e.target.value}
:x
)
);
}}
/>

</div>

))}

</div>

)}

{/* NAVIGATION */}

<div style={{
position:"fixed",
bottom:0,
width:"100%",
maxWidth:480,
display:"flex",
background:"white",
borderTop:"1px solid #eee"
}}>

{["dashboard","vehicles","drivers","claims"]
.map(t=>(

<button
key={t}
onClick={()=>setActiveTab(t)}
style={{
flex:1,
padding:12,
border:"none",
background:
activeTab===t ?
"#eef2ff":"white"
}}
>

{t}

</button>

))}

</div>

</div>

);

}
