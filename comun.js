// Código compartido entre la app de clientes (index.html) y la de empleados (empleados.html).

const CONFIG_INCOMPLETA = JSON.stringify([firebaseConfig, PROGRAMA]).includes('PEGAR_AQUI');
let auth = null;
let db = null;
if (!CONFIG_INCOMPLETA) {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  auth.languageCode = 'es';
  db = firebase.firestore();
}
const ts = () => firebase.firestore.FieldValue.serverTimestamp();

const PESOS_POR_PUNTO_DEFECTO = 1000;
const $ = (id) => document.getElementById(id);

// Evita que un nombre o mail "raro" rompa la pantalla o inyecte código.
function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
function fmt(n) { return nf.format(n); }

function fmtFecha(t) {
  const d = t && t.toDate ? t.toDate() : null;
  if (!d) return 'ahora';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function msMov(m) { return m.fecha && m.fecha.toMillis ? m.fecha.toMillis() : Date.now(); }
function ordenarMovs(lista) { return lista.sort((a, b) => msMov(b) - msMov(a)); }
function totalPuntos(movs) { return movs.reduce((s, m) => s + (Number(m.puntos) || 0), 0); }
function numTarjeta(n) { const s = String(n); return s.slice(0, 4) + ' ' + s.slice(4); }

// Convierte lo que escribe el empleado en un número.
//   "20000" -> 20000   "20.000" -> 20000   "20.000,50" -> 20000.5   "1500.50" -> 1500.5
function parseMonto(texto) {
  let t = String(texto || '').trim().replace(/\s/g, '').replace(/^\$/, '');
  if (/^\d+\.\d{1,2}$/.test(t)) {
    // un solo punto con 1 o 2 decimales: es el separador decimal
  } else {
    t = t.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(t);
  return isFinite(n) ? n : NaN;
}

function describir(m) {
  switch (m.tipo) {
    case 'compra': return 'Compra de $' + fmt(m.monto || 0);
    case 'canje': return 'Canje: ' + (m.premio || 'premio');
    case 'anulacion': return 'Anulación de un movimiento';
    case 'ajuste': return 'Ajuste' + (m.nota ? ': ' + m.nota : '');
    default: return m.tipo || '';
  }
}

function errorAuth(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'El mail o la contraseña no son correctos.';
  if (c === 'auth/email-already-in-use') return 'Ya existe una cuenta con ese mail. Probá ingresar.';
  if (c === 'auth/weak-password') return 'La contraseña es muy corta (mínimo 6 caracteres).';
  if (c === 'auth/invalid-email') return 'El mail no es válido.';
  if (c === 'auth/too-many-requests') return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
  if (c === 'auth/network-request-failed' || c === 'unavailable') return 'No hay conexión. Revisá tu internet.';
  if (c === 'permission-denied') return 'No tenés permiso para hacer esto.';
  return (e && e.message) ? e.message : 'Ocurrió un error. Probá de nuevo.';
}

let _toastTimer = null;
function aviso(texto, error) {
  const t = $('toast');
  if (!t) return;
  t.textContent = texto;
  t.className = 'fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-[90%] px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ' +
    (error ? 'bg-red-600' : 'bg-emerald-600');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'hidden'; }, 4500);
}
