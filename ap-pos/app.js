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

let isDashboardLoading = false;

// --- LÓGICA DE NEGOCIO ---

async function loadDashboardData() {
  // Guardia para prevenir ejecuciones múltiples
  if (currentUser.role !== 'admin' || !incomeChart || isDashboardLoading) return;
  
  isDashboardLoading = true;

  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Acceso al dashboard denegado.');
        return;
      }
      throw new Error('Falló la carga de datos del dashboard');
    }
    const data = await response.json();

    // Actualizar tarjetas de estadísticas
    document.getElementById('stat-total-income').textContent = `${Number(data.totalIncome || 0).toFixed(2)}`;
    document.getElementById('stat-total-movements').textContent = data.totalMovements || 0;

    // Actualizar datos del gráfico
    incomeChart.data.labels = data.incomeByService.map(item => item.tipo);
    incomeChart.data.datasets[0].data = data.incomeByService.map(item => item.total);
    incomeChart.update();
    
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
  } finally {
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

function renderUsersTable() {
    if (!tblUsersBody) return;
    tblUsersBody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.username}</td>
            <td>${u.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
            <td>
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
    const username = document.getElementById('s-username').value;
    const password = document.getElementById('s-password').value;

    const body = { username };
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
            document.getElementById('s-password').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar credenciales.');
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('u-username').value;
    const password = document.getElementById('u-password').value;
    const role = document.getElementById('u-role').value;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        const newUser = await response.json();

        if (response.ok) {
            alert('Usuario creado exitosamente.');
            users.push(newUser);
            renderUsersTable();
            formAddUser.reset();
        } else {
            alert(`Error: ${newUser.error}`);
        }
    } catch (error) {
        alert('Error de conexión al crear usuario.');
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
    } else if (action === 'delete-user') {
        deleteUser(parseInt(id, 10));
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

function setupUIForRole(role) {
    const dashboardTab = document.querySelector('[data-tab="tab-dashboard"]');
    const settingsTab = document.querySelector('[data-tab="tab-settings"]');
    const userManagementSection = document.getElementById('user-management-section');

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
  
  formSettings?.addEventListener('submit', handleSaveSettings);
  formCredentials?.addEventListener('submit', handleSaveCredentials);
  formMove?.addEventListener('submit', handleNewMovement);
  tblMovesBody?.addEventListener('click', handleTableClick);
  tblClientsBody?.addEventListener('click', handleTableClick);
  btnExport?.addEventListener('click', exportCSV);
  btnTestTicket?.addEventListener('click', handleTestTicket);
  formClient?.addEventListener('submit', handleClientForm);
  tabs?.addEventListener('click', handleTabChange);
  
  if (currentUser.role === 'admin') {
      formAddUser?.addEventListener('submit', handleAddUser);
      tblUsersBody?.addEventListener('click', handleTableClick);
  }
  
  btnLogout?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  document.getElementById('btnCancelEditClient')?.addEventListener('click', () => {
    formClient.reset();
    document.getElementById('c-id').value = '';
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
        document.getElementById('s-username').value = currentUser.username;
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
