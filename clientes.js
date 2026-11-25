// Panel del dueño: lista de clientes adheridos y detalle de sus movimientos.
// Usa las funciones de comun.js (esc, fmt, fmtFecha, describir) y la base `db`.
(function () {
  const cont = document.getElementById('panelClientes');
  if (!cont) return;

  cont.innerHTML =
    '<div class="border-t pt-4">' +
    '<p class="etiqueta">Clientes adheridos</p>' +
    '<div class="flex gap-2 mb-2">' +
    '<button id="cvCargar" class="btn btn-azul text-sm">Ver clientes</button>' +
    '<button id="cvCsv" class="btn btn-gris text-sm hidden">Descargar lista (Excel)</button>' +
    '</div>' +
    '<input id="cvBuscar" class="campo hidden mb-2" placeholder="Buscar por nombre o mail">' +
    '<p id="cvResumen" class="text-xs text-slate-500 mb-2"></p>' +
    '<div id="cvTabla" class="overflow-x-auto"></div>' +
    '<div id="cvDetalle" class="hidden mt-4 bg-slate-50 rounded-2xl p-3"></div>' +
    '</div>';

  const $c = (id) => document.getElementById(id);
  let lista = [];
  let porUid = {};

  function fecha(t) { return t && t.toDate ? t.toDate().toLocaleDateString('es-AR') : '-'; }
  function ms(t) { return t && t.toMillis ? t.toMillis() : 0; }

  function calcular(c, movs) {
    const anuladas = new Set(movs.filter(m => m.tipo === 'anulacion' && m.anula).map(m => m.anula));
    let saldo = 0, ganados = 0, canjeados = 0, gastado = 0, ultima = 0;
    movs.forEach(m => {
      saldo += Number(m.puntos) || 0;
      if (anuladas.has(m.id)) return;
      if (m.tipo === 'compra') { ganados += m.puntos; gastado += Number(m.monto) || 0; ultima = Math.max(ultima, ms(m.fecha)); }
      if (m.tipo === 'canje') canjeados += -m.puntos;
    });
    return Object.assign({}, c, { saldo, ganados, canjeados, gastado, ultima, anuladas });
  }

  async function cargar() {
    const btn = $c('cvCargar');
    btn.disabled = true; btn.textContent = 'Cargando…';
    try {
      const [cs, ms_] = await Promise.all([
        db.collection('clientes').get(),
        db.collection('movimientos').get()
      ]);
      porUid = {};
      ms_.docs.forEach(d => {
        const m = Object.assign({ id: d.id }, d.data());
        (porUid[m.uid] = porUid[m.uid] || []).push(m);
      });
      lista = cs.docs.map(d => calcular(Object.assign({ uid: d.id }, d.data()), porUid[d.id] || []));
      lista.sort((a, b) => ms(b.creado) - ms(a.creado));
      $c('cvBuscar').classList.remove('hidden');
      $c('cvCsv').classList.remove('hidden');
      btn.textContent = 'Actualizar';
      pintar();
    } catch (e) {
      aviso(errorAuth(e), true);
      btn.textContent = 'Ver clientes';
    }
    btn.disabled = false;
  }

  function pintar() {
    const q = $c('cvBuscar').value.trim().toLowerCase();
    const ver = lista.filter(c => !q || (c.nombre + ' ' + c.apellido + ' ' + c.email + ' ' + c.numero).toLowerCase().includes(q));
    $c('cvResumen').textContent = lista.length + ' clientes en total' + (q ? ' · ' + ver.length + ' coinciden' : '');
    $c('cvTabla').innerHTML = ver.length
      ? '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-500">' +
        '<th class="py-1 pr-2">Cliente</th><th class="pr-2">Mail</th><th class="pr-2">Alta</th><th class="pr-2 text-right">Puntos</th></tr></thead><tbody>' +
        ver.map(c => '<tr data-cv="' + esc(c.uid) + '" class="border-t cursor-pointer hover:bg-blue-50">' +
          '<td class="py-1.5 pr-2 font-semibold">' + esc(c.nombre + ' ' + c.apellido) + '</td>' +
          '<td class="pr-2 text-xs">' + esc(c.email) + '</td>' +
          '<td class="pr-2 text-xs whitespace-nowrap">' + esc(fecha(c.creado)) + '</td>' +
          '<td class="pr-2 text-right font-bold text-blue-700">' + fmt(c.saldo) + '</td></tr>').join('') +
        '</tbody></table>'
      : '<p class="text-sm text-slate-500">No hay clientes que coincidan.</p>';
  }

  function detalle(uid) {
    const c = lista.find(x => x.uid === uid); if (!c) return;
    const movs = (porUid[uid] || []).slice().sort((a, b) => ms(b.fecha) - ms(a.fecha));
    const dato = (t, v) => '<div class="bg-white rounded-xl p-2"><p class="text-xs text-slate-500">' + t + '</p><p class="font-extrabold">' + v + '</p></div>';
    $c('cvDetalle').classList.remove('hidden');
    $c('cvDetalle').innerHTML =
      '<div class="flex justify-between items-start mb-2"><div>' +
      '<p class="text-lg font-extrabold">' + esc(c.nombre + ' ' + c.apellido) + '</p>' +
      '<p class="text-xs text-slate-500">' + esc(c.email) + ' · Tarjeta ' + esc(c.numero) + '</p>' +
      '<p class="text-xs text-slate-500">Adherido el ' + esc(fecha(c.creado)) + '</p></div>' +
      '<button id="cvCerrar" class="text-xs text-slate-500 underline">Cerrar</button></div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">' +
      dato('Saldo actual', fmt(c.saldo) + ' pts') +
      dato('Puntos ganados', fmt(c.ganados)) +
      dato('Puntos canjeados', fmt(c.canjeados)) +
      dato('Total comprado', '$' + fmt(c.gastado)) +
      dato('Última compra', c.ultima ? new Date(c.ultima).toLocaleDateString('es-AR') : '-') +
      dato('Movimientos', movs.length) + '</div>' +
      '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-500">' +
      '<th class="py-1 pr-2">Fecha</th><th class="pr-2">Movimiento</th><th class="pr-2 text-right">Puntos</th><th>Cargó</th></tr></thead><tbody>' +
      (movs.map(m => '<tr class="border-t">' +
        '<td class="py-1.5 pr-2 text-xs whitespace-nowrap">' + esc(fmtFecha(m.fecha)) + '</td>' +
        '<td class="pr-2 ' + (c.anuladas.has(m.id) ? 'line-through text-slate-400' : '') + '">' + esc(describir(m)) + (c.anuladas.has(m.id) ? ' (anulado)' : '') + '</td>' +
        '<td class="pr-2 text-right font-bold ' + (m.puntos < 0 ? 'text-red-600' : 'text-emerald-600') + '">' + (m.puntos > 0 ? '+' : '') + fmt(m.puntos) + '</td>' +
        '<td class="text-xs">' + esc(m.empleado || '') + '</td></tr>').join('') || '<tr><td colspan="4" class="py-2 text-slate-500">Sin movimientos todavía.</td></tr>') +
      '</tbody></table></div>';
    $c('cvDetalle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function csv() {
    const celda = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = [['Nombre', 'Apellido', 'Mail', 'Tarjeta', 'Fecha de alta', 'Saldo', 'Puntos ganados', 'Puntos canjeados', 'Total comprado', 'Ultima compra']];
    lista.forEach(c => filas.push([c.nombre, c.apellido, c.email, c.numero, fecha(c.creado), c.saldo, c.ganados, c.canjeados, c.gastado,
      c.ultima ? new Date(c.ultima).toLocaleDateString('es-AR') : '']));
    const texto = '\ufeff' + filas.map(f => f.map(celda).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    a.download = 'clientes-club-triskel.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  $c('cvCargar').onclick = cargar;
  $c('cvCsv').onclick = csv;
  $c('cvBuscar').addEventListener('input', pintar);
  cont.addEventListener('click', (e) => {
    const fila = e.target.closest('tr[data-cv]');
    if (fila) detalle(fila.dataset.cv);
    if (e.target.id === 'cvCerrar') $c('cvDetalle').classList.add('hidden');
  });
})();
