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

const COST_TYPES = [
"Fuel",
"Service",
"Repairs",
"Tyres",
"Insurance",
"Licence",
"Tolls",
"Parking",
"Other"
];

const LIMITS = {
free:{
vehicles:2,
drivers:3
},
pro:{
vehicles:999,
drivers:999
}
};

const ADMIN_EMAIL = "logbookprosa@gmail.com";

export default function App(){

const [installPrompt,setInstallPrompt]=useState(null);

const [subscription,setSubscription]=useState(
()=>JSON.parse(localStorage.getItem("subscription")||"free")
);

const [user,setUser]=useState(
()=>JSON.parse(localStorage.getItem("user")||"null")
);

const [fleet,setFleet]=useState(
()=>JSON.parse(localStorage.getItem("fleet")||"{}")
);

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

const [costs,setCosts]=useState(
()=>JSON.parse(localStorage.getItem("costs")||"[]")
);

const [feedback,setFeedback]=useState("");

const [activeTab,setActiveTab]=useState("dashboard");

const isAdmin = user?.email === ADMIN_EMAIL;

useEffect(()=>{
window.addEventListener("beforeinstallprompt",(e)=>{
e.preventDefault();
setInstallPrompt(e);
});
},[]);

useEffect(()=>{
localStorage.setItem("subscription",subscription);
},[subscription]);

useEffect(()=>{
localStorage.setItem("user",JSON.stringify(user));
},[user]);

useEffect(()=>{
localStorage.setItem("fleet",JSON.stringify(fleet));
},[fleet]);

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

useEffect(()=>{
localStorage.setItem("costs",JSON.stringify(costs));
},[costs]);

if(!user){

return(

<div style={{padding:20,maxWidth:480,margin:"0 auto"}}>

<h2>Logbook Pro SA</h2>

<input
placeholder="Your Name"
onChange={e=>setUser({
...user,
name:e.target.value
})}
/>

<input
placeholder="Company / Organisation"
onChange={e=>setUser({
...user,
company:e.target.value
})}
/>

<input
placeholder="Email"
onChange={e=>setUser({
...user,
email:e.target.value
})}
/>

<button
onClick={()=>setUser({...user})}
style={{marginTop:20,padding:12,width:"100%"}}
>

Start Using App

</button>

</div>

);

}

const totalCosts = costs.reduce(
(sum,c)=>sum + Number(c.amount || 0),
0
);

const businessKm = trips
.filter(t=>t.type==="Business")
.reduce(
(sum,t)=>sum + Number(t.km || 0),
0
);

const exportData = ()=>{

const data = {
user,
fleet,
vehicles,
drivers,
trips,
costs,
claims
};

const blob = new Blob(
[JSON.stringify(data,null,2)],
{type:"application/json"}
);

const url = URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;

a.download = "Logbook-Pro-SA-Export.json";

a.click();

};

return(

<div style={{maxWidth:480,margin:"0 auto",paddingBottom:80}}>

{/* HEADER */}

<div style={{
background:"linear-gradient(135deg,#1a2a6c,#2c5fff)",
color:"white",
padding:18,
borderBottomLeftRadius:20,
borderBottomRightRadius:20
}}>

<div style={{fontWeight:800,fontSize:20}}>
Logbook Pro SA
</div>

<div style={{fontSize:12,opacity:.8}}>
Fleet & SARS Logbook Platform
</div>

<div style={{
fontSize:10,
background:"#ffcc00",
color:"#000",
display:"inline-block",
padding:"2px 8px",
borderRadius:10,
marginTop:6
}}>
Beta
</div>

{installPrompt && (

<button
onClick={()=>installPrompt.prompt()}
style={{
marginTop:10,
padding:"8px 14px",
borderRadius:20,
border:"none",
background:"#ffcc00",
fontWeight:700
}}
>

📱 Install App

</button>

)}

</div>

{/* DASHBOARD */}

{activeTab==="dashboard" && (

<div style={{padding:16}}>

<div className="card">
🚗 Vehicles: {vehicles.length}
</div>

<div className="card">
👨‍✈️ Drivers: {drivers.length}
</div>

<div className="card">
📍 Trips: {trips.length}
</div>

<div className="card">
💰 Costs: R {totalCosts.toFixed(2)}
</div>

<div className="card">
💼 Business KM: {businessKm}
</div>

</div>

)}

{/* EXPORT */}

{activeTab==="export" && (

<div style={{padding:16}}>

<div className="card">

<button onClick={exportData}>
Export Data
</button>

</div>

</div>

)}

{/* SUBSCRIPTION */}

{activeTab==="subscription" && (

<div style={{padding:16}}>

<div className="card">

Current Plan: {subscription}

<button
onClick={()=>setSubscription("pro")}
style={{marginTop:10}}
>

Upgrade Pro

</button>

</div>

</div>

)}

{/* FEEDBACK */}

{activeTab==="feedback" && (

<div style={{padding:16}}>

<div className="card">

<textarea
placeholder="Feedback"
value={feedback}
onChange={e=>setFeedback(e.target.value)}
style={{width:"100%",height:120}}
/>

<button
onClick={()=>{

alert("Thank you!");
setFeedback("");

}}
>

Submit

</button>

</div>

</div>

)}

{/* NAV */}

<div style={{
position:"fixed",
bottom:0,
width:"100%",
maxWidth:480,
display:"flex",
background:"white",
borderTop:"1px solid #eee"
}}>

{[
"dashboard",
"vehicles",
"drivers",
"trips",
"costs",
"claims",
"fleet",
"export",
"subscription",
"feedback",
...(isAdmin ? ["admin"] : [])
].map(t=>(

<button
key={t}
onClick={()=>setActiveTab(t)}
style={{
flex:1,
padding:8,
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
