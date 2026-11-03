const {construir,tipoArchivo,leerRespuesta}=require('../server.js');
const base=()=>({paciente:{edad:60,peso:90,talla:160,sexo:'Femenino',creatinina:1,cistatina:null},seleccion:{metodo:'cg',estable:false,tendencia:'bajos',trr:'No',medicamentos:['Meropenem','Ceftriaxona']}});
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('X',m)}};
const r=construir(base());ok(r.funcion_renal.clcr_ml_min===45.4,'cg');ok(r.medicamentos[0].id_regla==='F35-R2','regla');ok(r.funcion_renal.mensaje.endsWith('toxicidad'),'msg');
const trampa=base();trampa.seleccion.clcr=999;ok(construir(trampa).funcion_renal.clcr_ml_min===45.4,'ignora ClCr del navegador');
const bad1=(f,m)=>{const b=base();f(b);let e=0;try{construir(b)}catch{e=1}ok(e,m)};
bad1(b=>b.paciente.edad=10,'edad');bad1(b=>b.seleccion.metodo='cys','cys sin cistatina');bad1(b=>b.seleccion.metodo='bis','bis 60a');bad1(b=>b.seleccion.medicamentos=['Linezolid'],'fuera');bad1(b=>b.seleccion.trr='x','trr');bad1(b=>b.seleccion.metodo='__proto__','metodo');bad1(b=>b.seleccion.tendencia=null,'tendencia');
const f=base();f.seleccion.origen='pdf';f.seleccion.fuera=['Linezolid'];const q=construir(f);ok(q.origen==='pdf'&&q.medicamentos[2].modo==='fuera_de_tabla'&&q.medicamentos[2].dosis===null,'fuera en archivo');
bad1(b=>{b.seleccion.fuera=['Linezolid']},'fuera en lista');bad1(b=>{b.seleccion.origen='pdf';b.seleccion.medicamentos=['Inventado']},'no declarado');
ok(tipoArchivo(Buffer.from('%PDF-1.4')).tipo==='pdf','pdf');ok(tipoArchivo(Buffer.from([0xff,0xd8,0xff,0])).mime==='image/jpeg','jpg');ok(tipoArchivo(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])).mime==='image/png','png');ok(tipoArchivo(Buffer.from('RIFF0000WEBP')).mime==='image/webp','webp');ok(tipoArchivo(Buffer.from('MZ<html>'))===null,'otro');
const l=leerRespuesta({legible:true,principios_activos:['Meropenem','Inventado'],no_en_tabla:['Linezolid','Meropenem']});ok(l.medicamentos.length===1&&l.fuera.length===1&&l.fuera[0]==='Linezolid','filtro lectura');
let e=0;try{leerRespuesta({})}catch{e=1}ok(e,'lectura invalida');
console.log('servidor:',bad,'fallos');process.exit(bad?1:0)
