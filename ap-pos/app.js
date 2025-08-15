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
let users = [];
let incomeChart = null;
let paymentMethodChart = null;
let currentUser = {};

// --- DOM ELEMENTS ---
const formSettings = document.getElementById('formSettings');
const formMove = document.getElementById('formMove');
const tblMovesBody = document.getElementById('tblMoves')?.querySelector('tbody');
const btnExport = document.getElementById('btnExport');
const btnTestTicket = document.getElementById('btnTestTicket');
const formClient = document.getElementById('formClient');
const tblClientsBody = document.getElementById('tblClients')?.querySelector('tbody');
const clientDatalist = document.getElementById('client-list');
const formCredentials = document.getElementById('formCredentials');
const formAddUser = document.getElementById('formAddUser');
const tblUsersBody = document.getElementById('tblUsers')?.querySelector('tbody');
const appointmentsList = document.getElementById('upcoming-appointments-list');

let isDashboardLoading = false;

// --- LÓGICA DE NEGOCIO ---

async function loadDashboardData() {
  // Guardia para prevenir ejecuciones múltiples y re-entradas.
  if (currentUser.role !== 'admin' || isDashboardLoading) {
    return;
  }
  isDashboardLoading = true;

  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Acceso al dashboard denegado.');
      } else {
        throw new Error('Falló la carga de datos del dashboard');
      }
      return; // Salir aquí después de manejar el error
    }
    const data = await response.json();

    // Antes de actualizar, verificar que el dashboard sigue activo.
    const dashboardTab = document.getElementById('tab-dashboard');
    if (!dashboardTab.classList.contains('active')) {
      return;
    }

    // Actualizar tarjetas de estadísticas
    document.getElementById('stat-total-income').textContent = `${Number(data.totalIncome || 0).toFixed(2)}`;
    document.getElementById('stat-total-movements').textContent = data.totalMovements || 0;

    // Actualizar datos del gráfico de ingresos
    if (incomeChart) {
      incomeChart.data.labels = data.incomeByService.map(item => item.tipo);
      incomeChart.data.datasets[0].data = data.incomeByService.map(item => item.total);
      incomeChart.update('none');
    }
    
    // Actualizar datos del gráfico de método de pago
    if (paymentMethodChart) {
      paymentMethodChart.data.labels = data.incomeByPaymentMethod.map(item => item.metodo);
      paymentMethodChart.data.datasets[0].data = data.incomeByPaymentMethod.map(item => item.total);
      paymentMethodChart.update('none');
    }

    // Renderizar próximas citas
    if (appointmentsList) {
      appointmentsList.innerHTML = '';
      if (data.upcomingAppointments.length > 0) {
        data.upcomingAppointments.forEach(appt => {
          const item = document.createElement('div');
          item.className = 'appointment-item';
          const fechaCita = new Date(appt.fechaCita + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long' });
          item.innerHTML = `
            <a href="#" data-id="${appt.id}" data-action="reprint">${appt.clienteNombre}</a>
            <span class="date">${fechaCita} - ${appt.horaCita}</span>
          `;
          appointmentsList.appendChild(item);
        });
      } else {
        appointmentsList.innerHTML = '<p>No hay citas próximas.</p>';
      }
    }
    
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
  } finally {
    // Asegurar que el bloqueo se libere sin importar el resultado.
    isDashboardLoading = false;
  }
}

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

  // Optimización: en lugar de recargar, actualizamos el estado local.
  if (isUpdate) {
    const index = clients.findIndex(c => c.id === clientToSave.id);
    if (index > -1) clients[index] = clientToSave;
  } else {
    clients.unshift(clientToSave); // Añadir al principio para que aparezca primero
  }
  
  renderClientsTable();
  updateClientDatalist();

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
    const tipoServicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
    tr.innerHTML = `
      <td><a href="#" class="action-btn" data-id="${mov.id}" data-action="reprint">${mov.folio}</a></td>
      <td>${new Date(mov.fechaISO).toLocaleDateString('es-MX')}</td>
      <td>${fechaCita} ${mov.horaCita || ''}</td>
      <td>${client ? client.nombre : 'Cliente Eliminado'}</td>
      <td>${tipoServicio}</td>
      <td>${Number(mov.monto).toFixed(2)}</td>
      <td><button class="action-btn" data-id="${mov.id}" data-action="delete">Eliminar</button></td>
    `;
    tblMovesBody.appendChild(tr);
  });
}

function renderClientsTable(clientList = clients) {
  if (!tblClientsBody) return;
  tblClientsBody.innerHTML = '';
  clientList.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.id = c.id; // Importante para la función de expandir
    tr.style.cursor = 'pointer'; // Indicar que la fila es clickeable
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.telefono || ''}</td>
      <td>${c.esOncologico ? 'Sí' : 'No'}</td>
      <td>
        <button class="action-btn" data-id="${c.id}" data-action="edit-client">Editar</button>
        <button class="action-btn" data-id="${c.id}" data-action="delete-client">Eliminar</button>
      </td>
    `;
    tblClientsBody.appendChild(tr);
  });
}

function renderUsersTable() {
    if (!tblUsersBody) return;
    tblUsersBody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td>${u.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
            <td>
                <button class="action-btn" data-id="${u.id}" data-action="edit-user">Editar</button>
                ${u.id !== currentUser.id ? `<button class="action-btn" data-id="${u.id}" data-action="delete-user">Eliminar</button>` : ''}
            </td>
        `;
        tblUsersBody.appendChild(tr);
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

async function handleSaveCredentials(e) {
    e.preventDefault();
    const name = document.getElementById('s-name').value;
    const username = document.getElementById('s-username').value;
    const password = document.getElementById('s-password').value;

    const body = { username, name };
    if (password) {
        body.password = password;
    }

    try {
        const response = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert('Credenciales actualizadas.');
            currentUser.name = name; // Actualizar el nombre en el estado local
            currentUser.username = username;
            document.getElementById('s-password').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar credenciales.');
    }
}

async function handleAddOrUpdateUser(e) {
    e.preventDefault();
    const id = document.getElementById('u-id').value;
    const name = document.getElementById('u-name').value;
    const username = document.getElementById('u-username').value;
    const password = document.getElementById('u-password').value;
    const role = document.getElementById('u-role').value;

    const isUpdate = !!id;
    const url = isUpdate ? `/api/users/${id}` : '/api/users';
    const method = isUpdate ? 'PUT' : 'POST';

    const body = { name, username, role };
    if (password || !isUpdate) {
        if (!password && !isUpdate) {
            alert('La contraseña es obligatoria para nuevos usuarios.');
            return;
        }
        body.password = password;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Usuario ${isUpdate ? 'actualizado' : 'creado'} exitosamente.`);
            if (isUpdate) {
                const index = users.findIndex(u => u.id === parseInt(id));
                if (index > -1) {
                    users[index] = { ...users[index], name, username, role };
                }
            } else {
                users.push(result);
            }
            renderUsersTable();
            formAddUser.reset();
            document.getElementById('u-id').value = '';
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar el usuario.');
    }
}

async function deleteUser(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        try {
            const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (response.ok) {
                users = users.filter(u => u.id !== id);
                renderUsersTable();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('Error de conexión al eliminar usuario.');
        }
    }
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

  const tipoServicio = document.getElementById('m-tipo').value;
  const subtipoContainer = document.getElementById('m-subtipo-container');
  let subtipo = '';
  if (!subtipoContainer.classList.contains('hidden')) {
    subtipo = document.getElementById('m-subtipo').value;
  }

  const newMovement = {
    id: crypto.randomUUID(),
    folio: generateFolio(),
    fechaISO: new Date().toISOString(),
    clienteId: client.id,
    tipo: tipoServicio,
    subtipo: subtipo,
    monto: Number(monto.toFixed(2)),
    metodo: document.getElementById('m-metodo').value,
    concepto: document.getElementById('m-concepto').value,
    staff: currentUser.name, // Usar el nombre del usuario actual
    notas: document.getElementById('m-notas').value,
    fechaCita: document.getElementById('m-fecha-cita').value,
    horaCita: document.getElementById('m-hora-cita').value,
  };

  await addMovement(newMovement);
  renderTicketAndPrint({ ...newMovement, client }, settings);
  form.reset();
  document.getElementById('m-cliente').focus();
  subtipoContainer.classList.add('hidden');
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
    
    let historyHtml = '<h4>Historial de Servicios</h4>';
    if (history.length > 0) {
      historyHtml += '<table><thead><tr><th>Fecha</th><th>Servicio</th><th>Monto</th></tr></thead><tbody>';
      history.forEach(mov => {
        const fecha = new Date(mov.fechaISO).toLocaleDateString('es-MX');
        const servicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
        historyHtml += `<tr><td>${fecha}</td><td>${servicio}</td><td>${Number(mov.monto).toFixed(2)}</td></tr>`;
      });
      historyHtml += '</tbody></table>';
    } else {
      historyHtml += '<p>No hay historial de servicios para este cliente.</p>';
    }

    historyRow.innerHTML = `<td colspan="4"><div class="client-history-content">${historyHtml}</div></td>`;
    row.after(historyRow);

  } catch (error) {
    console.error('Error al cargar el historial del cliente:', error);
    alert('No se pudo cargar el historial.');
  }
}

function handleTableClick(e) {
  const target = e.target;
  const row = target.closest('tr');
  if (!row) return;

  const actionBtn = target.closest('.action-btn');
  if (actionBtn) {
    e.preventDefault();
    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;
    
    if (action === 'reprint' || action === 'delete') {
      const movement = movements.find(m => m.id === id);
      if (movement) {
        if (action === 'reprint') {
          const client = clients.find(c => c.id === movement.clienteId);
          renderTicketAndPrint({ ...movement, client }, settings);
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
    } else if (action === 'edit-user') {
        const user = users.find(u => u.id === parseInt(id));
        if (user) {
            document.getElementById('u-id').value = user.id;
            document.getElementById('u-name').value = user.name;
            document.getElementById('u-username').value = user.username;
            document.getElementById('u-role').value = user.role;
            document.getElementById('u-password').value = '';
            document.getElementById('u-password').placeholder = 'Dejar en blanco para no cambiar';
        }
    } else if (action === 'delete-user') {
        deleteUser(parseInt(id, 10));
    }
  } else if (row.parentElement.id === 'tblClientsBody') {
    // Si se hace clic en cualquier parte de la fila del cliente (que no sea un botón)
    const clientId = row.dataset.id;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      toggleClientHistory(row, client);
    }
  }
}

async function handleClientForm(e) {
  e.preventDefault();
  await saveClient();
}

function activateTab(tabId) {
  if (!tabId) return;

  // Desactivar todas las pestañas y contenidos
  document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  // Activar la pestaña y el contenido correctos
  const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(tabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }

  // Cargar datos dinámicos si es la pestaña del dashboard
  if (tabId === 'tab-dashboard' && currentUser.role === 'admin') {
    // Si es la primera vez que se visita la pestaña, inicializar el gráfico
    if (!incomeChart) {
      const ctx = document.getElementById('incomeChart').getContext('2d');
      incomeChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: [],
          datasets: [{
            label: 'Ingresos por Servicio',
            data: [],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
    }
    if (!paymentMethodChart) {
      const ctx = document.getElementById('paymentMethodChart').getContext('2d');
      paymentMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            label: 'Ingresos por Método de Pago',
            data: [],
            backgroundColor: ['#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
    }
    // Cargar (o recargar) los datos del dashboard
    loadDashboardData();
  }
}

function handleTabChange(e) {
  const tabButton = e.target.closest('.tab-link');
  if (!tabButton) return;
  e.preventDefault();
  const tabId = tabButton.dataset.tab;
  activateTab(tabId);
}

function handleTestTicket() {
    const demoMovement = {
        id: 'demo',
        folio: 'DEMO-000001',
        fechaISO: new Date().toISOString(),
        client: {
          nombre: 'Cliente de Prueba',
          esOncologico: true,
          nombreMedico: 'Dr. Juan Pérez',
          telefonoMedico: '5512345678',
          cedulaMedico: '1234567'
        },
        tipo: 'Pago',
        monto: 123.45,
        metodo: 'Efectivo',
        concepto: 'Producto de demostración',
        staff: 'Admin',
        notas: 'Esta es una impresión de prueba.'
    };
    renderTicketAndPrint(demoMovement, settings);
}

function setupUIForRole(role) {
    const dashboardTab = document.querySelector('[data-tab="tab-dashboard"]');
    const settingsTab = document.querySelector('[data-tab="tab-settings"]');
    const userManagementSection = document.getElementById('user-management-section');
    const staffInput = document.getElementById('m-staff');

    if (role === 'admin') {
        // El admin puede ver todo
        dashboardTab.style.display = 'block';
        settingsTab.style.display = 'block';
        userManagementSection.style.display = 'block';
        
        // Cargar la lista de usuarios para el admin
        fetch('/api/users').then(res => res.json()).then(data => {
            users = data;
            renderUsersTable();
        });
    } else {
        // El usuario normal tiene vistas ocultas
        dashboardTab.style.display = 'none';
        settingsTab.style.display = 'none';
        userManagementSection.style.display = 'none';
    }
    
    // Deshabilitar el campo "Atendió" para todos, ya que se autocompleta
    if (staffInput) {
        staffInput.disabled = true;
    }
}


// --- INICIALIZACIÓN ---

async function initializeApp() {
  // 1. Verificar autenticación y obtener datos del usuario.
  let userResponse;
  try {
    userResponse = await fetch('/api/user');
    if (!userResponse.ok) {
      // Si la respuesta no es 2xx, el usuario no está autenticado o hay un error.
      window.location.href = '/login.html';
      return;
    }

    // Verificar que la respuesta sea JSON antes de procesarla.
    const contentType = userResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('La respuesta del servidor no es JSON. Redirigiendo al login.');
      window.location.href = '/login.html';
      return;
    }
    
    // 2. Procesar datos del usuario.
    currentUser = await userResponse.json();

  } catch (error) {
    // Si hay un error de red, es probable que el servidor no esté corriendo.
    console.error('Error de conexión al verificar la autenticación. Redirigiendo al login.', error);
    window.location.href = '/login.html';
    return;
  }

  // 3. Añadir manejadores de eventos.
  const tabs = document.querySelector('.tabs');
  const btnLogout = document.getElementById('btnLogout');
  const btnCancelEditUser = document.getElementById('btnCancelEditUser');
  const searchClientInput = document.getElementById('search-client');
  const tipoServicioSelect = document.getElementById('m-tipo');
  
  formSettings?.addEventListener('submit', handleSaveSettings);
  formCredentials?.addEventListener('submit', handleSaveCredentials);
  formMove?.addEventListener('submit', handleNewMovement);
  tblMovesBody?.addEventListener('click', handleTableClick);
  tblClientsBody?.addEventListener('click', handleTableClick);
  appointmentsList?.addEventListener('click', handleTableClick);
  btnExport?.addEventListener('click', exportCSV);
  btnTestTicket?.addEventListener('click', handleTestTicket);
  formClient?.addEventListener('submit', handleClientForm);
  tabs?.addEventListener('click', handleTabChange);
  
  if (currentUser.role === 'admin') {
      formAddUser?.addEventListener('submit', handleAddOrUpdateUser);
      tblUsersBody?.addEventListener('click', handleTableClick);
  }
  
  btnLogout?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  document.getElementById('btnCancelEditClient')?.addEventListener('click', () => {
    formClient.reset();
    document.getElementById('c-id').value = '';
    document.getElementById('oncologico-fields').classList.add('hidden');
  });

  document.getElementById('c-esOncologico')?.addEventListener('change', (e) => {
    const oncologicoFields = document.getElementById('oncologico-fields');
    oncologicoFields.classList.toggle('hidden', !e.target.checked);
  });

  btnCancelEditUser?.addEventListener('click', (e) => {
    e.preventDefault();
    formAddUser.reset();
    document.getElementById('u-id').value = '';
    document.getElementById('u-password').placeholder = 'Contraseña';
  });

  searchClientInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredClients = clients.filter(c => c.nombre.toLowerCase().includes(searchTerm));
    renderClientsTable(filteredClients);
  });

  tipoServicioSelect?.addEventListener('change', (e) => {
    const subtipoContainer = document.getElementById('m-subtipo-container');
    const servicesWithSubtype = ['Microblading', 'Lashes', 'Nail Art', 'Lash Lifting'];
    subtipoContainer.classList.toggle('hidden', !servicesWithSubtype.includes(e.target.value));
  });

  // 4. Cargar el resto de los datos de la aplicación.
  Promise.all([
    load(KEY_SETTINGS, DEFAULT_SETTINGS),
    load(KEY_DATA, []),
    load(KEY_CLIENTS, []),
  ]).then(values => {
    [settings, movements, clients] = values;
    
    renderSettings();
    renderTable();
    renderClientsTable();
    updateClientDatalist();
    
    if (currentUser) {
        document.getElementById('s-name').value = currentUser.name || '';
        document.getElementById('s-username').value = currentUser.username;
        document.getElementById('m-staff').value = currentUser.name || '';
    }
    
    // 5. Configurar la UI y activar la pestaña inicial correcta.
    setupUIForRole(currentUser.role);
    
    if (currentUser.role === 'admin') {
        activateTab('tab-dashboard');
    } else {
        activateTab('tab-movements');
    }

  }).catch(error => {
    console.error('CRITICAL: Failed to load initial data.', error);
    alert('Error Crítico: No se pudieron cargar los datos del servidor.');
  });
}


document.addEventListener('DOMContentLoaded', initializeApp);
