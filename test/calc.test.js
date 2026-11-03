const {calcularFuncionRenal:f}=require('../public/calc.js');const ref=require('./ref_excel.json');
let n=0,bad=0,max=0;const cmp=(a,b,l,i)=>{n++;if(b==='NO USAR'||b===null||b===undefined){if(a!==null){bad++;console.log('X',i,l,a,b)}return}
const r=Math.abs(a/b-1);max=Math.max(max,r);if(r>1e-9){bad++;console.log('X',i,l,a,b)}};
ref.forEach((c,i)=>{const r=f({edad:c.edad,peso:c.peso,talla:c.talla,sexo:c.sexo,creatinina:c.crea,cistatina:c.cis});
cmp(r.imc,c.imc,'imc',i);cmp(r.superficie,c.sc,'sc',i);cmp(r.pesoMagro,c.magro,'magro',i);cmp(r.cg,c.c17,'C17',i);cmp(r.vfgCrea,c.c21,'C21',i);cmp(r.ckdCrea,c.c22,'C22',i);cmp(r.vfgCys,c.c25,'C25',i);cmp(r.ckdCys,c.c26,'C26',i);cmp(r.vfgBis,c.c28,'C28',i);
if(c.c28!=='NO USAR'){const e=c.sc/1.73*c.c28;cmp(r.bis,e,'BIS desn',i)}
n++;if(r.preferirCG!==(c.e21==='Preferir C-G')){bad++;console.log('X',i,'pref')}});
console.log(ref.length,'casos,',n,'comparaciones,',bad,'fallos, dif rel max',max);process.exit(bad?1:0)
