const {cruzarMedicamentos:c}=require('../public/cruce.js');const T=require('../data/tabla.json');const src=require('./fuente.json');
let n=0,bad=0;const fail=(...a)=>{bad++;if(bad<15)console.log('X',...a)};
const band=x=>x>50?1:x>=30?2:x>=10?3:4;
const nombres=Object.keys(T.farmacos);if(nombres.length!==47)fail('n');
for(const d of nombres){const prop=T.farmacos[d].reglas.some(r=>r.tipo==='Propio');
 for(let i=0;i<=9999;i++){const x=i/10;const r=c(x,'No',[d],T)[0];n++;
  if(r.modo!=='clcr'||!r.dosis)fail(d,x,r.modo);
  if(!prop&&x<=999.9&&r.dosis!==src[d][band(x)])fail('regresion',d,x,r.dosis,src[d][band(x)])}
 const nt=c(45,'No',[d],T)[0];if(nt.requiere_ajuste!==src[d][0]||nt.nota!==src[d][5])fail('meta',d)}
const eq=(cl,tr,d,k,v)=>{n++;const r=c(cl,tr,[d],T)[0];if(r[k]!==v)fail(cl,d,k,r[k],'!=',v)};
[[20,'Imipenem/Cilastatina','250-500 mg c/12h'],[45,'Imipenem/Cilastatina','500 mg c/8h'],[60,'Imipenem/Cilastatina','500 mg c/8h'],[60.1,'Imipenem/Cilastatina','500 mg-1 g c/6-8h (1g c/6h si ClCr >90)'],
[5.5,'Ceftazidima/Avibactam','No usar'],[4.9,'Ceftazidima/Avibactam','1,25g c/48h'],[6,'Ceftazidima/Avibactam','1,25 g c/24h EV'],[15.1,'Ceftazidima/Avibactam','1,25 g c/12h EV'],
[5,'Valganciclovir','No recomendado'],[59.9,'Valganciclovir','Inducción 450mg c/12h, Mant 450mg c/24h'],[60,'Valganciclovir','Inducción 900mg c/12h, Mant 900mg c/24h'],
[45,'Ganciclovir','Inducción: 2,5 mg/kg c/24h; Mant: 1,25 mg/kg c/24h'],[50,'Vancomicina','15-20 mg/kg c/12h'],[120,'Vancomicina','15-20 mg/kg c/8-12h'],[19.9,'Vancomicina','15-20 mg/kg c/24-48h'],
[29.96,'Meropenem','1 g c/12h (ó 2g c/12h inf 3h)'],[29.94,'Meropenem','500 mg - 1 g c/12h'],[50.04,'Meropenem','1 g c/12h (ó 2g c/12h inf 3h)'],[50.06,'Meropenem','1-2 g c/8h EV (inf 3h)'],[9.96,'Meropenem','500 mg - 1 g c/12h'],[3000,'Meropenem','1-2 g c/8h EV (inf 3h)'],
[12,'Ceftriaxona','1-2 g c/12-24h EV'],[45,'Fosfomicina','4-6 g c/6-8h EV'],[40,'Fosfomicina','4 g c/6-8h EV'],[20,'Fosfomicina','4 g c/8-12h EV'],[19.9,'Fosfomicina','2g c/8-12h'],[15,'Levofloxacino','750 mg carga, luego 500 mg c/48h'],[14.9,'Rifampicina','<= 600 mg c/24h']].forEach(([x,d,v])=>eq(x,'No',d,'dosis',v));
eq(45,'Hemodiálisis intermitente','Cefazolina','dosis',null);eq(45,'TRRC','Cefazolina','estado','NOTA_TRR');eq(45,'TRRC','Ceftriaxona','estado','SIN_DATO');eq(45,'','Meropenem','modo','clcr');
const lz=c(45,'No',['Linezolid'],T)[0];n++;if(lz.en_tabla||lz.dosis!==null||lz.modo!=='fuera_de_tabla')fail('fuera');
const ntrr=nombres.filter(d=>T.farmacos[d].nota_trr).length;
console.log(n,'comprobaciones,',bad,'fallos; con nota TRR',ntrr);process.exit(bad?1:0)
