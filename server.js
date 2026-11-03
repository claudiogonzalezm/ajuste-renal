// Servidor del formulario: entrega la página, recalcula todo y registra en Make.
const express = require('express');
const path = require('path');
const {calcularFuncionRenal, redondearClCr} = require('./public/calc.js');
const {cruzarMedicamentos} = require('./public/cruce.js');
const tabla = require('./data/tabla.json');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Evita que un envío repetido gaste los créditos de Make.
const visitas = new Map();
function limitar(req, res, next) {
  const ahora = Date.now(), v = (visitas.get(req.ip) || []).filter(t => ahora - t < 60000);
  if (v.length >= 20) return res.status(429).json({error: 'Demasiados envíos. Espera un minuto'});
  v.push(ahora); visitas.set(req.ip, v);
  if (visitas.size > 5000) visitas.clear();
  next();
}

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
  const origen = s.origen === undefined ? 'lista' : s.origen;
  if (!['lista','pdf','imagen'].includes(origen)) throw new Error('Origen no válido');
  const fuera = Array.isArray(s.fuera) ? s.fuera : [];
  if (origen === 'lista' && fuera.length) throw new Error('Medicamento fuera de la tabla');
  if (fuera.some(n => typeof n !== 'string' || !n.trim() || n.length > 80 || tabla.farmacos[n])) throw new Error('Revisa los medicamentos fuera de la tabla');
  const nombres = [...new Set((Array.isArray(s.medicamentos) ? s.medicamentos : []).concat(fuera.map(n => n.trim())))];
  if (!nombres.length || nombres.length > 30) throw new Error('Revisa la lista de medicamentos');
  const validos = new Set(fuera.map(n => n.trim()));
  if (nombres.some(n => !tabla.farmacos[n] && !validos.has(n))) throw new Error('Medicamento fuera de la tabla');
  return {
    etapa: 'registrar',
    origen,
    paciente: {edad:d.edad, peso_kg:d.peso, talla_cm:d.talla, sexo:d.sexo, creatinina_mg_dl:d.creatinina, cistatina_mg_l:cis},
    funcion_renal: {metodo:NOM[s.metodo], clcr_ml_min:redondearClCr(clcr), estable:s.estable,
      tendencia:s.estable?null:s.tendencia, mensaje:s.estable?null:MSG[s.tendencia], trr:s.trr},
    tabla_version: tabla.version,
    medicamentos: cruzarMedicamentos(clcr, s.trr, nombres, tabla)
  };
}

// Reconoce el archivo por sus bytes, no por su nombre.
function tipoArchivo(b) {
  const h = (i, t) => b.subarray(i, i + t.length).toString('latin1') === t;
  if (h(0, '%PDF-')) return {tipo:'pdf', mime:'application/pdf', nombre:'receta.pdf'};
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return {tipo:'imagen', mime:'image/jpeg', nombre:'receta.jpg'};
  if (h(0, '\x89PNG\r\n\x1a\n')) return {tipo:'imagen', mime:'image/png', nombre:'receta.png'};
  if (h(0, 'RIFF') && h(8, 'WEBP')) return {tipo:'imagen', mime:'image/webp', nombre:'receta.webp'};
  return null;
}

function leerRespuesta(j) {
  if (!j || typeof j.legible !== 'boolean') throw new Error('Gemini no entregó una lectura válida');
  const lista = v => (Array.isArray(v) ? v : []).filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean);
  const enTabla = [...new Set(lista(j.principios_activos).filter(n => tabla.farmacos[n]))];
  const fuera = [...new Set(lista(j.no_en_tabla).map(n => n.slice(0, 80)).filter(n => !tabla.farmacos[n]))];
  return {legible: j.legible, medicamentos: enTabla, fuera};
}

app.post('/api/leer', limitar, express.json({limit: '2mb'}), async (req, res) => {
  const texto = req.body && req.body.datos_b64;
  if (typeof texto !== 'string' || !texto) return res.status(400).json({error: 'Falta el archivo'});
  const b = Buffer.from(texto, 'base64');
  if (b.length >= 1048576) return res.status(400).json({error: 'El archivo debe ser menor a 1 MB'});
  const t = tipoArchivo(b);
  if (!t) return res.status(400).json({error: 'Solo se aceptan PDF, JPG, PNG o WEBP'});
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return res.status(503).json({error: 'Falta configurar la lectura'});
  try {
    const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({etapa:'extraer', tipo:t.tipo, mime:t.mime, nombre:t.nombre, archivo_b64:b.toString('base64')}),
      signal: AbortSignal.timeout(170000)});
    if (!r.ok) return res.status(502).json({error: 'Gemini no pudo leer el archivo'});
    res.json({tipo: t.tipo, ...leerRespuesta(JSON.parse(await r.text()))});
  } catch { res.status(502).json({error: 'No se pudo completar la lectura'}); }
});

app.post('/api/evaluar', limitar, express.json({limit: '50kb'}), async (req, res) => {
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
app.get('/salud', (_q, res) => res.json({ok:true, tabla:tabla.version, etapa:4}));
app.use(express.static(path.join(__dirname, 'public')));
if (require.main === module) app.listen(process.env.PORT || 3000);
module.exports = {app, construir, tipoArchivo, leerRespuesta};
