import { load, save, remove, KEY_DATA, KEY_SETTINGS, KEY_CLIENTS } from './storage.js';
import { renderTicketAndPrint } from './print.js';

// --- ESTADO Y DATOS ---
const DEFAULT_SETTINGS = {
  negocio: 'Ale Ponce',
  tagline: 'beauty expert',
  calle: 'Benito Juarez 246',
  colonia: 'Col. Los Pinos',
  cp: '252 pinos',
  rfc: '',
  tel: '8443555108',
  leyenda: '¡Gracias por tu preferencia!',
  folioPrefix: 'AP-',
  folioSeq: 1
};

let settings = {};
let movements = [];
let clients = [];

// --- DOM ELEMENTS ---
const formSettings = document.getElementById('formSettings');
const formMove = document.getElementById('formMove');
const tblMovesBody = document.getElementById('tblMoves')?.querySelector('tbody');
const btnExport = document.getElementById('btnExport');
const btnTestTicket = document.getElementById('btnTestTicket');
const formClient = document.getElementById('formClient');
const tblClientsBody = document.getElementById('tblClients')?.querySelector('tbody');
const clientDatalist = document.getElementById('client-list');

// --- LÓGICA DE NEGOCIO ---

function generateFolio() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function addMovement(mov) {
  await save('movements', { movement: mov });
  movements.unshift(mov);
  renderTable();
}

async function deleteMovement(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
    await remove(KEY_DATA, id);
    movements = movements.filter(m => m.id !== id);
    renderTable();
  }
}

async function saveClient(clientData) {
  let clientToSave;
  let isUpdate = false;

  if (clientData) {
    clientToSave = clientData;
  } else {
    isUpdate = !!document.getElementById('c-id').value;
    const id = isUpdate ? document.getElementById('c-id').value : crypto.randomUUID();
    clientToSave = {
      id: id,
      nombre: document.getElementById('c-nombre').value,
      telefono: document.getElementById('c-telefono').value,
      cumpleaños: document.getElementById('c-cumple').value,
      consentimiento: document.getElementById('c-consent').checked,
    };
  }

  await save('clients', { client: clientToSave });

  if (isUpdate) {
    const index = clients.findIndex(c => c.id === clientToSave.id);
    if (index > -1) {
      clients[index] = clientToSave;
    }
  } else {
    if (!clients.some(c => c.id === clientToSave.id)) {
        clients.push(clientToSave);
    }
  }
  
  renderClientsTable();
  updateClientDatalist();

  if (!clientData) {
    document.getElementById('formClient').reset();
    document.getElementById('c-id').value = '';
  }
}

async function deleteClient(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se conservarán sus recibos históricos.')) {
    await remove(KEY_CLIENTS, id);
    clients = clients.filter(c => c.id !== id);
    renderClientsTable();
    updateClientDatalist();
  }
}

function exportCSV() {
  const headers = 'folio,fechaISO,cliente,tipo,monto,metodo,concepto,staff,notas,fechaCita,horaCita';
  const rows = movements.map(m => {
    const client = clients.find(c => c.id === m.clienteId);
    return [
      m.folio, m.fechaISO, client ? client.nombre : 'N/A', m.tipo, m.monto,
      m.metodo || '', m.concepto || '', m.staff || '', m.notas || '',
      m.fechaCita || '', m.horaCita || ''
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'movimientos.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- RENDERIZADO ---

function renderSettings() {
  document.getElementById('s-negocio').value = settings.negocio || '';
  document.getElementById('s-tagline').value = settings.tagline || '';
  document.getElementById('s-calle').value = settings.calle || '';
  document.getElementById('s-colonia-cp').value = settings.colonia && settings.cp ? `${settings.colonia}, ${settings.cp}` : '';
  document.getElementById('s-rfc').value = settings.rfc || '';
  document.getElementById('s-tel').value = settings.tel || '';
  document.getElementById('s-leyenda').value = settings.leyenda || '';
  document.getElementById('s-folioPrefix').value = settings.folioPrefix || '';
}

function renderTable() {
  if (!tblMovesBody) return;
  tblMovesBody.innerHTML = '';
  movements.forEach(mov => {
    const client = clients.find(c => c.id === mov.clienteId);
    const tr = document.createElement('tr');
    const fechaCita = mov.fechaCita ? new Date(mov.fechaCita + 'T00:00:00').toLocaleDateString('es-MX') : '';
    tr.innerHTML = `
      <td><a href="#" class="action-btn" data-id="${mov.id}" data-action="reprint">${mov.folio}</a></td>
      <td>${new Date(mov.fechaISO).toLocaleDateString('es-MX')}</td>
      <td>${fechaCita} ${mov.horaCita || ''}</td>
      <td>${client ? client.nombre : 'Cliente Eliminado'}</td>
      <td>${mov.tipo}</td>
      <td>${Number(mov.monto).toFixed(2)}</td>
      <td><button class="action-btn" data-id="${mov.id}" data-action="delete">Eliminar</button></td>
    `;
    tblMovesBody.appendChild(tr);
  });
}

function renderClientsTable() {
  if (!tblClientsBody) return;
  tblClientsBody.innerHTML = '';
  clients.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.telefono || ''}</td>
      <td>${c.cumpleaños ? new Date(c.cumpleaños).toLocaleDateString('es-MX') : ''}</td>
      <td>${c.consentimiento ? 'Sí' : 'No'}</td>
      <td>
        <button class="action-btn" data-id="${c.id}" data-action="edit-client">Editar</button>
        <button class="action-btn" data-id="${c.id}" data-action="delete-client">Eliminar</button>
      </td>
    `;
    tblClientsBody.appendChild(tr);
  });
}

function updateClientDatalist() {
  if (!clientDatalist) return;
  clientDatalist.innerHTML = '';
  clients.forEach(c => {
    const option = document.createElement('option');
    option.value = c.nombre;
    clientDatalist.appendChild(option);
  });
}

// --- MANEJADORES DE EVENTOS ---

async function handleSaveSettings(e) {
  e.preventDefault();
  settings.negocio = document.getElementById('s-negocio').value;
  settings.tagline = document.getElementById('s-tagline').value;
  settings.calle = document.getElementById('s-calle').value;
  
  const coloniaCp = document.getElementById('s-colonia-cp').value.split(',');
  settings.colonia = coloniaCp[0]?.trim() || '';
  settings.cp = coloniaCp[1]?.trim() || '';

  settings.rfc = document.getElementById('s-rfc').value;
  settings.tel = document.getElementById('s-tel').value;
  settings.leyenda = document.getElementById('s-leyenda').value;
  settings.folioPrefix = document.getElementById('s-folioPrefix').value;
  await save(KEY_SETTINGS, { settings });
  alert('Configuración guardada.');
}

async function handleNewMovement(e) {
  e.preventDefault();
  const form = e.target;
  const monto = parseFloat(document.getElementById('m-monto').value || 0);
  const clienteNombre = document.getElementById('m-cliente').value;

  let client = clients.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
  if (!client) {
    if (confirm(`El cliente "${clienteNombre}" no existe. ¿Deseas crearlo?`)) {
      const newClient = {
        id: crypto.randomUUID(),
        nombre: clienteNombre,
        telefono: '',
        cumpleaños: '',
        consentimiento: false
      };
      await saveClient(newClient);
      client = newClient;
    } else {
      return;
    }
  }

  const newMovement = {
    id: crypto.randomUUID(),
    folio: generateFolio(),
    fechaISO: new Date().toISOString(),
    clienteId: client.id,
    tipo: document.getElementById('m-tipo').value,
    monto: Number(monto.toFixed(2)),
    metodo: document.getElementById('m-metodo').value,
    concepto: document.getElementById('m-concepto').value,
    staff: document.getElementById('m-staff').value,
    notas: document.getElementById('m-notas').value,
    fechaCita: document.getElementById('m-fecha-cita').value,
    horaCita: document.getElementById('m-hora-cita').value,
  };

  await addMovement(newMovement);
  const movementForTicket = { ...newMovement, cliente: client.nombre };
  renderTicketAndPrint(movementForTicket, settings);
  form.reset();
  document.getElementById('m-cliente').focus();
}

function handleTableClick(e) {
  if (e.target.classList.contains('action-btn')) {
    e.preventDefault();
    const id = e.target.dataset.id;
    const action = e.target.dataset.action;
    
    if (action === 'reprint' || action === 'delete') {
      const movement = movements.find(m => m.id === id);
      if (movement) {
        if (action === 'reprint') {
          const client = clients.find(c => c.id === movement.clienteId);
          const movementForTicket = { ...movement, cliente: client ? client.nombre : 'N/A' };
          renderTicketAndPrint(movementForTicket, settings);
        } else if (action === 'delete') {
          deleteMovement(id);
        }
      }
    } else if (action === 'edit-client' || action === 'delete-client') {
      const client = clients.find(c => c.id === id);
      if (client) {
        if (action === 'edit-client') {
          document.getElementById('c-id').value = client.id;
          document.getElementById('c-nombre').value = client.nombre;
          document.getElementById('c-telefono').value = client.telefono;
          document.getElementById('c-cumple').value = client.cumpleaños;
          document.getElementById('c-consent').checked = client.consentimiento;
        } else if (action === 'delete-client') {
          deleteClient(id);
        }
      }
    }
  }
}

async function handleClientForm(e) {
  e.preventDefault();
  await saveClient();
}

function handleTabChange(e) {
  const tabButton = e.target.closest('.tab-link');
  if (!tabButton) return;

  e.preventDefault();

  document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const tabId = tabButton.dataset.tab;
  tabButton.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
}

function handleTestTicket() {
    const demoMovement = {
        id: 'demo',
        folio: 'DEMO-000001',
        fechaISO: new Date().toISOString(),
        cliente: 'Cliente de Prueba',
        tipo: 'Pago',
        monto: 123.45,
        metodo: 'Efectivo',
        concepto: 'Producto de demostración',
        staff: 'Admin',
        notas: 'Esta es una impresión de prueba.'
    };
    renderTicketAndPrint(demoMovement, settings);
}

// --- INICIALIZACIÓN ---

function initializeApp() {
  const tabs = document.querySelector('.tabs');
  
  formSettings?.addEventListener('submit', handleSaveSettings);
  formMove?.addEventListener('submit', handleNewMovement);
  tblMovesBody?.addEventListener('click', handleTableClick);
  tblClientsBody?.addEventListener('click', handleTableClick);
  btnExport?.addEventListener('click', exportCSV);
  btnTestTicket?.addEventListener('click', handleTestTicket);
  formClient?.addEventListener('submit', handleClientForm);
  tabs?.addEventListener('click', handleTabChange);
  document.getElementById('btnCancelEditClient')?.addEventListener('click', () => {
    formClient.reset();
    document.getElementById('c-id').value = '';
  });

  Promise.all([
    load(KEY_SETTINGS, DEFAULT_SETTINGS),
    load(KEY_DATA, []),
    load(KEY_CLIENTS, [])
  ]).then(values => {
    [settings, movements, clients] = values;
    renderSettings();
    renderTable();
    renderClientsTable();
    updateClientDatalist();
  }).catch(error => {
    console.error('CRITICAL: Failed to load initial data. The app may not function correctly.', error);
    alert('Error Crítico: No se pudieron cargar los datos del servidor. Asegúrate de que el servidor (npm start) esté corriendo y que no haya errores en la terminal del servidor.');
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);