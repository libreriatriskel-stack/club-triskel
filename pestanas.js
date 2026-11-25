// Ordena la pantalla del mostrador en pestañas. El dueño ve 4; el resto del personal solo "Mostrador".
(function () {
  const main = document.getElementById('vMain');
  const admin = document.getElementById('admin');
  const ficha = document.getElementById('ficha');
  if (!main || !admin || !ficha) return;

  const scan = main.children[0];
  const hijo = (id) => { const e = document.getElementById(id); return e && e.closest('#admin > div'); };
  const bloques = {
    clientes: hijo('panelClientes'),
    pesos: hijo('aPesos'),
    premios: hijo('aPremios'),
    staff: hijo('aStaff'),
    ajuste: hijo('jPuntos')
  };
  if (Object.values(bloques).some(b => !b)) return; // si algo no está, se deja la pantalla como estaba

  const crear = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'space-y-4 hidden'; return d; };
  const pMost = crear('pMost'), pCli = crear('pClientes'), pPre = crear('pPremios'), pEmp = crear('pEmpleados');
  const tarjeta = (el) => { el.classList.add('tarjeta'); return el; };

  pMost.append(scan, ficha, tarjeta(bloques.ajuste));
  pCli.append(tarjeta(bloques.clientes));
  pPre.append(tarjeta(bloques.pesos), tarjeta(bloques.premios));
  pEmp.append(tarjeta(bloques.staff));
  bloques.clientes.firstElementChild.classList.remove('border-t', 'pt-4');

  const barra = document.createElement('div');
  barra.className = 'hidden flex flex-wrap gap-2';
  const pestanas = [['pMost', 'Mostrador'], ['pClientes', 'Clientes'], ['pPremios', 'Premios'], ['pEmpleados', 'Empleados']];
  const paneles = { pMost, pClientes: pCli, pPremios: pPre, pEmpleados: pEmp };

  function mostrar(id) {
    Object.keys(paneles).forEach(k => paneles[k].classList.toggle('hidden', k !== id));
    barra.querySelectorAll('button').forEach(b => {
      b.className = 'btn text-sm !py-2 ' + (b.dataset.p === id ? 'btn-azul' : 'btn-gris');
    });
    if (id === 'pMost') { const s = document.getElementById('scan'); if (s) s.focus(); }
  }

  pestanas.forEach(([id, texto]) => {
    const b = document.createElement('button');
    b.dataset.p = id; b.textContent = texto; b.type = 'button';
    b.onclick = () => mostrar(id);
    barra.appendChild(b);
  });

  main.prepend(barra);
  main.append(pMost, pCli, pPre, pEmp);
  admin.style.display = 'none'; // ya quedó vacío de contenido útil; lo maneja el código principal

  // Solo el dueño ve las pestañas y el ajuste manual de puntos.
  function sincronizar() {
    const esDueno = !admin.classList.contains('hidden');
    barra.classList.toggle('hidden', !esDueno);
    bloques.ajuste.classList.toggle('hidden', !esDueno);
    if (!esDueno) mostrar('pMost');
  }
  new MutationObserver(sincronizar).observe(admin, { attributes: true, attributeFilter: ['class'] });
  mostrar('pMost');
  sincronizar();
})();
