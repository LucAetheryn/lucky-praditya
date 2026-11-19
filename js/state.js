/* Shared runtime state (EMB = running inside the Live Preview iframe). */
const EMB=window.name==="lpv";
let PUB=null,PVM=false,introOn=false,built=false,FB=false,ready=false,pt;const OPEN=new Set(),prevCnt={};
