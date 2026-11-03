// Servidor del formulario: entrega la página, recalcula todo y registra en Make.
const express = require('express');
const path = require('path');
const {calcularFuncionRenal, redondearClCr} = require('./public/calc.js');
const {cruzarMedicamentos} = require('./public/cruce.js');
const tabla = require('./data/tabla.json');

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit: '50kb'}));

const LIM = {edad:[18,120], peso:[20,300], talla:[100,250], creatinina:[0.1,25], cistatina:[0.1,15]};
const NOM = {cg:'Cockcroft-Gault', ckd:'CKD-EPI creatinina 2021', cys:'CKD-EPI crea-cys 2021', bis:'BIS-1', orina:'Recolección de orina'};
const TRR = ['No','Hemodiálisis intermitente','TRRC','SLED','Diálisis peritoneal'];
const MSG = {altos:'Precaución con su ajuste requiere seguimiento diario para evaluar riesgo de infradosificación',
             bajos:'Precaución con su ajuste requiere seguimiento diario para evaluar riesgo de toxicidad'};

const enRango = (v, [a, b]) => typeof v === 'number' && v >= a && v <= b;

function construir(body) {
  const p = body && body.paciente, s = body && body.seleccion;
  if (!p || !s) throw new Error('Solicitud incompleta');
  for (const k of ['edad','peso','talla','creatinina'])
    if (!enRango(p[k], LIM[k])) throw new Error(`Valor fuera de rango: ${k}`);
  if (!['Femenino','Masculino'].includes(p.sexo)) throw new Error('Sexo no válido');
  const cis = p.cistatina === null || p.cistatina === undefined ? null : p.cistatina;
  if (cis !== null && !enRango(cis, LIM.cistatina)) throw new Error('Valor fuera de rango: cistatina');
  const d = {edad:p.edad, peso:p.peso, talla:p.talla, sexo:p.sexo, creatinina:p.creatinina, cistatina:cis};
  const r = calcularFuncionRenal(d);
  const clcr = {cg:r.cg, ckd:r.ckdCrea, cys:r.ckdCys, bis:r.bis, orina:s.clcr}[s.metodo];
  if (s.metodo === undefined || !(s.metodo in NOM)) throw new Error('Método no válido');
  if (typeof clcr !== 'number' || !isFinite(clcr) || clcr <= 0 || clcr > (s.metodo === 'orina' ? 300 : Infinity))
    throw new Error('Aclaramiento no disponible');
  if (typeof s.estable !== 'boolean') throw new Error('Falta estabilidad renal');
  if (!s.estable && !MSG[s.tendencia]) throw new Error('Falta tendencia');
  if (!TRR.includes(s.trr)) throw new Error('Terapia de reemplazo no válida');
  const nombres = [...new Set(Array.isArray(s.medicamentos) ? s.medicamentos : [])];
  if (!nombres.length || nombres.length > 30) throw new Error('Revisa la lista de medicamentos');
  if (nombres.some(n => !tabla.farmacos[n])) throw new Error('Medicamento fuera de la tabla');
  return {
    origen: 'lista',
    paciente: {edad:d.edad, peso_kg:d.peso, talla_cm:d.talla, sexo:d.sexo, creatinina_mg_dl:d.creatinina, cistatina_mg_l:cis},
    funcion_renal: {metodo:NOM[s.metodo], clcr_ml_min:redondearClCr(clcr), estable:s.estable,
      tendencia:s.estable?null:s.tendencia, mensaje:s.estable?null:MSG[s.tendencia], trr:s.trr},
    tabla_version: tabla.version,
    medicamentos: cruzarMedicamentos(clcr, s.trr, nombres, tabla)
  };
}

app.post('/api/evaluar', async (req, res) => {
  let carga;
  try { carga = construir(req.body); }
  catch (e) { return res.status(400).json({error: e.message}); }
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return res.status(503).json({error: 'Falta configurar el registro'});
  try {
    const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(carga), signal: AbortSignal.timeout(170000)});
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = null; }
    if (!r.ok || !j || !j.correlativo) return res.status(502).json({error:'Make no confirmó el registro'});
    res.json({correlativo:j.correlativo, fecha:j.fecha, filas:j.filas, resultado:carga});
  } catch { res.status(502).json({error:'No se pudo contactar a Make'}); }
});

app.get('/tabla.js', (_q, res) => res.type('application/javascript').send('var TABLA=' + JSON.stringify(tabla) + ';'));
app.get('/salud', (_q, res) => res.json({ok:true, tabla:tabla.version}));
app.use(express.static(path.join(__dirname, 'public')));
if (require.main === module) app.listen(process.env.PORT || 3000);
module.exports = {app, construir};
