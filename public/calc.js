/* Cálculos de función renal. Fuente: CalculadoraVFG.xlsx (hojas Clrobesos y Calculos),
   con peso magro femenino corregido a 8780 (Janmahasatian 2005) y BIS-1 desnormalizado. */
function calcularFuncionRenal(d){
  var m = d.sexo === 'Masculino';
  var e = d.edad, p = d.peso, t = d.talla, cr = d.creatinina, cys = d.cistatina;
  var imc = p / (t * t / 10000);
  var sc = Math.pow(p, 0.425) * Math.pow(t, 0.725) * 0.007184;
  var magro = (9270 * p) / ((m ? 6680 : 8780) + (m ? 216 : 244) * imc);
  var usaMagro = imc > 30;
  var peso = usaMagro ? magro : p;
  var cg = ((140 - e) * peso / (72 * cr)) * (m ? 1 : 0.85);
  var k = m ? 0.9 : 0.7;
  var crSobreK = cr > k;
  var vfgCrea = 142 * Math.pow(cr / k, crSobreK ? -1.2 : (m ? -0.302 : -0.241)) *
                Math.pow(0.9938, e) * (m ? 1 : 1.012);
  var ckdCrea = (sc / 1.73) * vfgCrea;
  var vfgCys = null, ckdCys = null;
  if (cys !== null && cys !== undefined && cys > 0){
    vfgCys = 135 * Math.pow(cr / k, crSobreK ? -0.544 : (m ? -0.144 : -0.219)) *
             Math.pow(cys / 0.8, cys <= 0.8 ? -0.323 : -0.778) *
             Math.pow(0.9961, e) * (m ? 1 : 0.963);
    ckdCys = (sc / 1.73) * vfgCys;
  }
  var vfgBis = null, bis = null;
  if (e > 70){
    vfgBis = 3736 * Math.pow(cr, -0.87) * Math.pow(e, -0.95) * (m ? 1 : 0.82);
    bis = (sc / 1.73) * vfgBis;
  }
  return {imc:imc, superficie:sc, pesoMagro:magro, usaPesoMagro:usaMagro, pesoUsado:peso,
          cg:cg, vfgCrea:vfgCrea, ckdCrea:ckdCrea, vfgCys:vfgCys, ckdCys:ckdCys,
          vfgBis:vfgBis, bis:bis, preferirCG:imc > 30};
}
function redondearClCr(x){ return Math.round(x * 10) / 10; }
if (typeof module !== 'undefined') module.exports = {calcularFuncionRenal:calcularFuncionRenal, redondearClCr:redondearClCr};
