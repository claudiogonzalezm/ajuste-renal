const {construir}=require('../server.js');
const base=()=>({paciente:{edad:60,peso:90,talla:160,sexo:'Femenino',creatinina:1,cistatina:null},seleccion:{metodo:'cg',estable:false,tendencia:'bajos',trr:'No',medicamentos:['Meropenem','Ceftriaxona']}});
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('X',m)}};
const r=construir(base());ok(r.funcion_renal.clcr_ml_min===45.4,'cg');ok(r.medicamentos[0].id_regla==='F35-R2','regla');ok(r.funcion_renal.mensaje.endsWith('toxicidad'),'msg');
const trampa=base();trampa.seleccion.clcr=999;ok(construir(trampa).funcion_renal.clcr_ml_min===45.4,'ignora ClCr del navegador');
const bad1=(f,m)=>{const b=base();f(b);let e=0;try{construir(b)}catch{e=1}ok(e,m)};
bad1(b=>b.paciente.edad=10,'edad');bad1(b=>b.seleccion.metodo='cys','cys sin cistatina');bad1(b=>b.seleccion.metodo='bis','bis 60a');bad1(b=>b.seleccion.medicamentos=['Linezolid'],'fuera');bad1(b=>b.seleccion.trr='x','trr');bad1(b=>b.seleccion.metodo='__proto__','metodo');bad1(b=>b.seleccion.tendencia=null,'tendencia');
console.log('servidor:',bad,'fallos');process.exit(bad?1:0)
