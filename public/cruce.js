/* Cruce por regla: nunca interpreta ni reescribe la dosis; copia el texto de la tabla. */
function cruzarMedicamentos(clcr, trr, nombres, tabla){
  var enTrr = !!trr && trr !== 'No';
  var x = Math.min(Math.round(clcr * 10) / 10, 999.9);
  return nombres.map(function(n){
    var f = tabla.farmacos[n];
    var r = {principio_activo:n, en_tabla:!!f, requiere_ajuste:f?f.requiere_ajuste:null, familia:f?f.familia:null,
             modo:null, id_regla:null, rango:null, dosis:null, estado:null, nota:f?f.nota:null, nota_trr:f?f.nota_trr:null};
    if(!f){ r.modo='fuera_de_tabla'; r.estado='SIN_DATO'; return r; }
    if(enTrr){ r.modo='trr'; r.estado=f.nota_trr?'NOTA_TRR':'SIN_DATO'; return r; }
    var m = f.reglas.filter(function(q){ return q.desde <= x && x <= q.hasta; });
    if(m.length !== 1){ r.modo='error_tabla'; r.estado='REVISAR'; return r; }
    var q = m[0];
    r.modo='clcr'; r.id_regla=q.id; r.rango=q.rango; r.estado=q.estado;
    r.dosis = q.estado === 'PENDIENTE' ? null : q.dosis;
    return r;
  });
}
if (typeof module !== 'undefined') module.exports = {cruzarMedicamentos:cruzarMedicamentos};
