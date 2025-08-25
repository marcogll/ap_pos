import { load, save, remove, KEY_CLIENTS } from './storage.js';

let clients = [];

// --- UTILITIES ---
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const year = adjustedDate.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- DOM ELEMENTS ---
const formClient = document.getElementById('formClient');
const tblClientsBody = document.getElementById('tblClients')?.querySelector('tbody');
const searchClientInput = document.getElementById('search-client');

// --- LÓGICA DE NEGOCIO ---

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
      genero: document.getElementById('c-genero').value,
      cumpleaños: document.getElementById('c-cumple').value,
      consentimiento: document.getElementById('c-consent').checked,
      esOncologico: document.getElementById('c-esOncologico').checked,
      oncologoAprueba: document.getElementById('c-oncologoAprueba').checked,
      nombreMedico: document.getElementById('c-nombreMedico').value,
      telefonoMedico: document.getElementById('c-telefonoMedico').value,
      cedulaMedico: document.getElementById('c-cedulaMedico').value,
      pruebaAprobacion: document.getElementById('c-pruebaAprobacion').checked,
    };
  }

  await save('clients', { client: clientToSave });

  if (isUpdate) {
    const index = clients.findIndex(c => c.id === clientToSave.id);
    if (index > -1) clients[index] = clientToSave;
  } else {
    clients.unshift(clientToSave);
  }
  
  renderClientsTable();

  if (!clientData) {
    document.getElementById('formClient').reset();
    document.getElementById('c-id').value = '';
    document.getElementById('oncologico-fields').classList.add('hidden');
  }
}

async function deleteClient(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se conservarán sus recibos históricos.')) {
    await remove(KEY_CLIENTS, id);
    clients = clients.filter(c => c.id !== id);
    renderClientsTable();
  }
}

function exportClientHistoryCSV(client, history) {
  const headers = 'Folio,Fecha,Servicio,Monto';
  const rows = history.map(mov => {
    const servicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
    return [
      mov.folio,
      formatDate(mov.fechaISO),
      `"${servicio}"`, // Corrected: escaped inner quotes for CSV compatibility
      Number(mov.monto).toFixed(2)
    ].join(',');
  });

  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `historial-${client.nombre.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function toggleClientHistory(row, client) {
  const historyRowId = `history-for-${client.id}`;
  const existingHistoryRow = document.getElementById(historyRowId);

  if (existingHistoryRow) {
    existingHistoryRow.remove();
    return;
  }

  try {
    const response = await fetch(`/api/clients/${client.id}/history`);
    const history = await response.json();
    
    const historyRow = document.createElement('tr');
    historyRow.id = historyRowId;
    historyRow.className = 'client-history-row';
    
    let historyHtml = `
      <div class="client-history-header">
        <h4>Historial de Servicios</h4>
        <button class="action-btn" id="btn-export-history-${client.id}">Exportar CSV</button>
      </div>
    `;

    if (history.length > 0) {
      historyHtml += '<table><thead><tr><th>Folio</th><th>Fecha</th><th>Servicio</th><th>Monto</th></tr></thead><tbody>';
      history.forEach(mov => {
        const servicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
        historyHtml += `<tr><td>${mov.folio}</td><td>${formatDate(mov.fechaISO)}</td><td>${servicio}</td><td>${Number(mov.monto).toFixed(2)}</td></tr>`;
      });
      historyHtml += '</tbody></table>';
    } else {
      historyHtml += '<p>No hay historial de servicios para este cliente.</p>';
    }

    historyRow.innerHTML = `<td colspan="4"><div class="client-history-content">${historyHtml}</div></td>`;
    row.after(historyRow);

    const exportButton = document.getElementById(`btn-export-history-${client.id}`);
    if (exportButton) {
      exportButton.addEventListener('click', (e) => {
        e.stopPropagation();
        exportClientHistoryCSV(client, history);
      });
    }

  } catch (error) {
    console.error('Error al cargar el historial del cliente:', error);
    alert('No se pudo cargar el historial.');
  }
}

// --- RENDERIZADO ---

function renderClientsTable(clientList = clients) {
  if (!tblClientsBody) return;
  tblClientsBody.innerHTML = '';
  clientList.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.id = c.id;
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.telefono || ''}</td>
      <td>${c.esOncologico ? 'Sí' : 'No'}</td>
      <td>
        <button class="action-btn" data-id="${c.id}" data-action="view-history">Historial</button>
        <button class="action-btn" data-id="${c.id}" data-action="edit-client">Editar</button>
        <button class="action-btn" data-id="${c.id}" data-action="delete-client">Eliminar</button>
      </td>
    `;
    tblClientsBody.appendChild(tr);
  });
}

// --- MANEJADORES DE EVENTOS ---

function handleTableClick(e) {
  const target = e.target;
  const row = target.closest('tr');
  if (!row) return;

  const actionBtn = target.closest('.action-btn');
  if (actionBtn) {
    e.preventDefault();
    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;
    const client = clients.find(c => c.id === id);

    if (!client) return;

    if (action === 'view-history') {
      toggleClientHistory(row, client);
    } else if (action === 'edit-client') {
      document.getElementById('c-id').value = client.id;
      document.getElementById('c-nombre').value = client.nombre;
      document.getElementById('c-telefono').value = client.telefono || '';
      document.getElementById('c-genero').value = client.genero || '';
      document.getElementById('c-cumple').value = client.cumpleaños;
      document.getElementById('c-consent').checked = client.consentimiento;
      
      const esOncologicoCheckbox = document.getElementById('c-esOncologico');
      const oncologicoFields = document.getElementById('oncologico-fields');
      esOncologicoCheckbox.checked = client.esOncologico;
      oncologicoFields.classList.toggle('hidden', !client.esOncologico);
      
      document.getElementById('c-oncologoAprueba').checked = client.oncologoAprueba;
      document.getElementById('c-nombreMedico').value = client.nombreMedico || '';
      document.getElementById('c-telefonoMedico').value = client.telefonoMedico || '';
      document.getElementById('c-cedulaMedico').value = client.cedulaMedico || '';
      document.getElementById('c-pruebaAprobacion').checked = client.pruebaAprobacion;
    } else if (action === 'delete-client') {
      deleteClient(id);
    }
  }
}

async function handleClientForm(e) {
  e.preventDefault();
  await saveClient();
}

// --- INICIALIZACIÓN ---

async function initializeClientsPage() {
  try {
    const response = await fetch('/api/check-auth');
    const auth = await response.json();
    if (!auth.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }
  } catch (error) {
    console.error('Error de autenticación', error);
    window.location.href = '/login.html';
    return;
  }

  clients = await load(KEY_CLIENTS, []);
  renderClientsTable();

  formClient?.addEventListener('submit', handleClientForm);
  tblClientsBody?.addEventListener('click', handleTableClick);

  document.getElementById('btnCancelEditClient')?.addEventListener('click', () => {
    formClient.reset();
    document.getElementById('c-id').value = '';
    document.getElementById('oncologico-fields').classList.add('hidden');
  });

  document.getElementById('c-esOncologico')?.addEventListener('change', (e) => {
    const oncologicoFields = document.getElementById('oncologico-fields');
    oncologicoFields.classList.toggle('hidden', !e.target.checked);
  });

  searchClientInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredClients = clients.filter(c => c.nombre.toLowerCase().includes(searchTerm));
    renderClientsTable(filteredClients);
  });
}

document.addEventListener('DOMContentLoaded', initializeClientsPage);