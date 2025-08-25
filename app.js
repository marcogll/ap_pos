import { load, save, remove, KEY_DATA, KEY_SETTINGS, KEY_CLIENTS } from './storage.js';
import { renderTicketAndPrint } from './print.js';

// --- UTILITIES ---
function escapeHTML(str) {
    if (str === null || str === undefined) {
        return '';
    }
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

const APP_VERSION = '1.3.0';

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
let products = [];
let incomeChart = null;
let paymentMethodChart = null;
let currentUser = {};
let currentClientId = null;

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
  const tblServicesBody = document.getElementById('tblServices')?.querySelector('tbody');
  const tblCoursesBody = document.getElementById('tblCourses')?.querySelector('tbody');
  const formProduct = document.getElementById('formProduct');
const appointmentsList = document.getElementById('upcoming-appointments-list');

let isDashboardLoading = false;

// --- LÓGICA DE NEGOCIO ---

async function loadDashboardData() {
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
      return;
    }
    const data = await response.json();

    const dashboardTab = document.getElementById('tab-dashboard');
    if (!dashboardTab.classList.contains('active')) {
      return;
    }

    document.getElementById('stat-total-income').textContent = `${Number(data.totalIncome || 0).toFixed(2)}`;
    document.getElementById('stat-total-movements').textContent = data.totalMovements || 0;

    if (incomeChart) {
      incomeChart.data.labels = data.incomeByService.map(item => item.tipo);
      incomeChart.data.datasets[0].data = data.incomeByService.map(item => item.total);
      incomeChart.update('none');
    }
    
    if (paymentMethodChart) {
      paymentMethodChart.data.labels = data.incomeByPaymentMethod.map(item => item.metodo);
      paymentMethodChart.data.datasets[0].data = data.incomeByPaymentMethod.map(item => item.total);
      paymentMethodChart.update('none');
    }

    if (appointmentsList) {
      appointmentsList.innerHTML = '';
      if (data.upcomingAppointments.length > 0) {
        data.upcomingAppointments.forEach(appt => {
          const item = document.createElement('div');
          item.className = 'appointment-item';
          item.innerHTML = `
            <a href="#" data-id="${appt.id}" data-action="reprint">${appt.clienteNombre}</a>
            <span class="date">${formatDate(appt.fechaCita)} - ${appt.horaCita}</span>
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

  if (isUpdate) {
    const index = clients.findIndex(c => c.id === clientToSave.id);
    if (index > -1) clients[index] = clientToSave;
  } else {
    clients.unshift(clientToSave);
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
    clearClientRecord();
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
    const tr = tblMovesBody.insertRow();
    
    const tipoServicio = mov.subtipo ? `${escapeHTML(mov.tipo)} (${escapeHTML(mov.subtipo)})` : escapeHTML(mov.tipo);

    const folioCell = tr.insertCell();
    const folioLink = document.createElement('a');
    folioLink.href = '#';
    folioLink.className = 'action-btn';
    folioLink.dataset.id = mov.id;
    folioLink.dataset.action = 'reprint';
    folioLink.textContent = mov.folio;
    folioCell.appendChild(folioLink);

    tr.insertCell().textContent = formatDate(mov.fechaISO);
    tr.insertCell().textContent = `${formatDate(mov.fechaCita)} ${mov.horaCita || ''}`.trim();
    tr.insertCell().textContent = client ? escapeHTML(client.nombre) : 'Cliente Eliminado';
    tr.insertCell().textContent = tipoServicio;
    tr.insertCell().textContent = Number(mov.monto).toFixed(2);

    const actionsCell = tr.insertCell();
    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-btn';
    deleteButton.dataset.id = mov.id;
    deleteButton.dataset.action = 'delete';
    deleteButton.textContent = 'Eliminar';
    actionsCell.appendChild(deleteButton);
  });
}

function renderClientsTable(clientList = clients) {
  if (!tblClientsBody) return;
  tblClientsBody.innerHTML = '';
  clientList.forEach(c => {
    const tr = tblClientsBody.insertRow();
    tr.dataset.id = c.id;
    if (c.id === currentClientId) {
        tr.classList.add('selected');
    }
    tr.insertCell().textContent = escapeHTML(c.nombre);
    tr.insertCell().textContent = escapeHTML(c.telefono || '');
  });
}

function renderUsersTable() {
    if (!tblUsersBody) return;
    tblUsersBody.innerHTML = '';
    users.forEach(u => {
        const tr = tblUsersBody.insertRow();
        tr.insertCell().textContent = escapeHTML(u.name);
        tr.insertCell().textContent = escapeHTML(u.username);
        tr.insertCell().textContent = u.role === 'admin' ? 'Administrador' : 'Usuario';

        const actionsCell = tr.insertCell();
        const editButton = document.createElement('button');
        editButton.className = 'action-btn';
        editButton.dataset.id = u.id;
        editButton.dataset.action = 'edit-user';
        editButton.textContent = 'Editar';
        actionsCell.appendChild(editButton);

        if (u.id !== currentUser.id) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn';
            deleteButton.dataset.id = u.id;
            deleteButton.dataset.action = 'delete-user';
            deleteButton.textContent = 'Eliminar';
            actionsCell.appendChild(deleteButton);
        }
    });
}

function renderProductTables() {
    const tblServicesBody = document.getElementById('tblServices')?.querySelector('tbody');
    const tblCoursesBody = document.getElementById('tblCourses')?.querySelector('tbody');

    if (!tblServicesBody || !tblCoursesBody) return;

    tblServicesBody.innerHTML = '';
    tblCoursesBody.innerHTML = '';

    products.forEach(p => {
        const tableBody = p.type === 'service' ? tblServicesBody : tblCoursesBody;
        const tr = tableBody.insertRow();
        tr.insertCell().textContent = escapeHTML(p.name);
        tr.insertCell().textContent = Number(p.price || 0).toFixed(2);

        const actionsCell = tr.insertCell();
        const editButton = document.createElement('button');
        editButton.className = 'action-btn';
        editButton.dataset.id = p.id;
        editButton.dataset.action = 'edit-product';
        editButton.textContent = 'Editar';
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn';
        deleteButton.dataset.id = p.id;
        deleteButton.dataset.action = 'delete-product';
        deleteButton.textContent = 'Eliminar';
        actionsCell.appendChild(deleteButton);
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

function populateArticuloDropdown(category) {
    const articuloSelect = document.getElementById('m-articulo');
    if (!articuloSelect) return;
    articuloSelect.innerHTML = '';
    const items = products.filter(p => p.type === category);
    items.forEach(i => {
        const option = document.createElement('option');
        option.value = i.name;
        option.textContent = i.name;
        articuloSelect.appendChild(option);
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
            currentUser.name = name;
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

async function handleAddOrUpdateProduct(e) {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    const type = document.getElementById('p-type').value;
    const price = document.getElementById('p-price').value;

    const isUpdate = !!id;
    const url = isUpdate ? `/api/products/${id}` : '/api/products';
    const method = isUpdate ? 'PUT' : 'POST';

    const body = { name, type, price };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Producto ${isUpdate ? 'actualizado' : 'creado'} exitosamente.`);
            if (isUpdate) {
                const index = products.findIndex(p => p.id === parseInt(id));
                if (index > -1) {
                    products[index] = { ...products[index], name, type, price };
                }
            } else {
                products.push(result);
            }
            renderProductTables();
            formProduct.reset();
            document.getElementById('p-id').value = '';
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar el producto.');
    }
}

async function deleteProduct(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
            const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (response.ok) {
                products = products.filter(p => p.id !== id);
                renderProductTables();
            }
        } catch (error) {
            alert('Error de conexión al eliminar el producto.');
        }
    }
}

function showAddCourseModal(clientId) {
    const courses = products.filter(p => p.type === 'course');
    const courseOptions = courses.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

    const modalHTML = `
        <div id="course-modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Registrar Curso a Cliente</h2>
                <form id="formAddCourseToClient">
                    <div class="form-grid-single">
                        <label>Curso:</label>
                        <select id="course-id" required>${courseOptions}</select>
                        <label>Fecha del Curso:</label>
                        <input type="date" id="course-date" />
                        <label>Score General:</label>
                        <input type="text" id="course-score" />
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-presencial" />
                            <label for="course-presencial">¿Completó curso presencial?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-online" />
                            <label for="course-online">¿Completó curso online?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-practicas" />
                            <label for="course-practicas">¿Realizó prácticas?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-certificacion" />
                            <label for="course-certificacion">¿Obtuvo certificación?</label>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Guardar Curso</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('course-modal');
    const closeButton = modal.querySelector('.close-button');
    const form = modal.querySelector('#formAddCourseToClient');

    const closeModal = () => modal.remove();

    closeButton.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const courseData = {
            course_id: document.getElementById('course-id').value,
            fecha_curso: document.getElementById('course-date').value,
            score_general: document.getElementById('course-score').value,
            completo_presencial: document.getElementById('course-presencial').checked ? 1 : 0,
            completo_online: document.getElementById('course-online').checked ? 1 : 0,
            realizo_practicas: document.getElementById('course-practicas').checked ? 1 : 0,
            obtuvo_certificacion: document.getElementById('course-certificacion').checked ? 1 : 0,
        };

        try {
            const response = await fetch(`/api/clients/${clientId}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });

            if (response.ok) {
                alert('Curso registrado exitosamente.');
                closeModal();
                showClientRecord(clientId);
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('Error de conexión al registrar el curso.');
        }
    };
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
    tipo: document.getElementById('m-categoria').value,
    subtipo: '',
    monto: Number(monto.toFixed(2)),
    metodo: document.getElementById('m-metodo').value,
    concepto: document.getElementById('m-articulo').value,
    staff: currentUser.name,
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

function exportClientHistoryCSV(client, history) {
  const headers = 'Folio,Fecha,Servicio,Monto';
  const rows = history.map(mov => {
    const servicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
    return [
      mov.folio,
      formatDate(mov.fechaISO),
      `"${servicio}"`, 
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

async function showClientRecord(clientId) {
    currentClientId = clientId;
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        clearClientRecord();
        return;
    }

    renderClientsTable(clients.filter(c => c.nombre.toLowerCase().includes(document.getElementById('search-client').value.toLowerCase())));

    const clientRecordContent = document.getElementById('client-record-content');
    const clientRecordPlaceholder = document.getElementById('client-record-placeholder');
    const clientDetails = document.getElementById('client-details');
    const clientHistoryTableBody = document.getElementById('client-history-table').querySelector('tbody');
    const clientCoursesContainer = document.getElementById('client-courses-history-container');

    clientDetails.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHTML(client.nombre)}</p>
        <p><strong>Teléfono:</strong> ${escapeHTML(client.telefono || 'N/A')}</p>
        <p><strong>Cumpleaños:</strong> ${escapeHTML(formatDate(client.cumpleaños) || 'N/A')}</p>
        <p><strong>Género:</strong> ${escapeHTML(client.genero || 'N/A')}</p>
        <p><strong>Oncológico:</strong> ${client.esOncologico ? 'Sí' : 'No'}</p>
    `;

    try {
        const [historyResponse, coursesResponse] = await Promise.all([
            fetch(`/api/clients/${client.id}/history`),
            fetch(`/api/clients/${client.id}/courses`)
        ]);

        const history = await historyResponse.json();
        const courses = await coursesResponse.json();

        clientHistoryTableBody.innerHTML = '';
        if (history.length > 0) {
            history.forEach(mov => {
                const tr = clientHistoryTableBody.insertRow();
                const servicio = mov.subtipo ? `${escapeHTML(mov.tipo)} (${escapeHTML(mov.subtipo)})` : escapeHTML(mov.tipo);
                tr.insertCell().textContent = mov.folio;
                tr.insertCell().textContent = formatDate(mov.fechaISO);
                tr.insertCell().textContent = servicio;
                tr.insertCell().textContent = Number(mov.monto).toFixed(2);
            });
        } else {
            clientHistoryTableBody.innerHTML = '<tr><td colspan="4">No hay historial de servicios.</td></tr>';
        }

        clientCoursesContainer.innerHTML = '';
        if (courses.length > 0) {
            const coursesTable = document.createElement('table');
            coursesTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Curso</th>
                        <th>Fecha</th>
                        <th>Score</th>
                        <th>Presencial</th>
                        <th>Online</th>
                        <th>Prácticas</th>
                        <th>Certificación</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(course => `
                        <tr>
                            <td>${escapeHTML(course.course_name)}</td>
                            <td>${escapeHTML(formatDate(course.fecha_curso))}</td>
                            <td>${escapeHTML(course.score_general)}</td>
                            <td>${course.completo_presencial ? 'Sí' : 'No'}</td>
                            <td>${course.completo_online ? 'Sí' : 'No'}</td>
                            <td>${course.realizo_practicas ? 'Sí' : 'No'}</td>
                            <td>${course.obtuvo_certificacion ? 'Sí' : 'No'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            clientCoursesContainer.appendChild(coursesTable);
        } else {
            clientCoursesContainer.innerHTML = '<p>No hay cursos registrados para este cliente.</p>';
        }

    } catch (error) {
        console.error('Error al cargar el historial del cliente:', error);
        clientHistoryTableBody.innerHTML = '<tr><td colspan="4">Error al cargar historial.</td></tr>';
        clientCoursesContainer.innerHTML = '<p>Error al cargar historial de cursos.</p>';
    }

    clientRecordContent.classList.remove('hidden');
    clientRecordPlaceholder.classList.add('hidden');
}

function clearClientRecord() {
    currentClientId = null;
    const clientRecordContent = document.getElementById('client-record-content');
    const clientRecordPlaceholder = document.getElementById('client-record-placeholder');
    clientRecordContent.classList.add('hidden');
    clientRecordPlaceholder.classList.remove('hidden');
    renderClientsTable();
}

function handleTableClick(e) {
  const target = e.target;
  const row = target.closest('tr');
  if (!row) return;

  const tableId = row.closest('table')?.id;

  if (tableId === 'tblClients') {
      const clientId = row.dataset.id;
      showClientRecord(clientId);
      return;
  }

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
    } else if (action === 'edit-product') {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            document.getElementById('p-id').value = product.id;
            document.getElementById('p-name').value = product.name;
            document.getElementById('p-type').value = product.type;
            document.getElementById('p-price').value = product.price;
        }
    } else if (action === 'delete-product') {
        deleteProduct(parseInt(id, 10));
    }
  }
}

async function handleClientForm(e) {
  e.preventDefault();
  await saveClient();
  activateClientSubTab('sub-tab-consult');
}

function activateClientSubTab(subTabId) {
  if (!subTabId) return;

  document.querySelectorAll('#tab-clients .sub-tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#tab-clients .sub-tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-subtab="${subTabId}"]`);
  const tabContent = document.getElementById(subTabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }
}

function handleClientTabChange(e) {
  const subTabButton = e.target.closest('.sub-tab-link');
  if (!subTabButton) return;
  e.preventDefault();
  const subTabId = subTabButton.dataset.subtab;
  activateClientSubTab(subTabId);
}

function activateTab(tabId) {
  if (!tabId) return;

  document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(tabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }

  if (tabId === 'tab-dashboard' && currentUser.role === 'admin') {
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
    loadDashboardData();
  }
}

function handleTabChange(e) {
  const tabButton = e.target.closest('.tab-link');
  if (!tabButton) return;

  if (tabButton.dataset.tab) {
    e.preventDefault();
    const tabId = tabButton.dataset.tab;
    activateTab(tabId);
  }
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
    const dashboardTab = document.querySelector('[data-tab="dashboard"]');
    const settingsTab = document.querySelector('[data-tab="settings"]');
    const userManagementSection = document.getElementById('user-management-section');
    const staffInput = document.getElementById('m-staff');
    const dbInfoIcon = document.getElementById('db-info-icon');

    if (role === 'admin') {
        if (dashboardTab) dashboardTab.style.display = 'block';
        if (settingsTab) settingsTab.style.display = 'block';
        if (userManagementSection) userManagementSection.style.display = 'block';
        if (dbInfoIcon) dbInfoIcon.style.display = 'inline-block';
        
        fetch('/api/users')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch users list');
                return res.json();
            })
            .then(data => {
                users = data;
                renderUsersTable();
            })
            .catch(err => console.error(err));
    } else {
        if (dashboardTab) dashboardTab.style.display = 'none';
        if (settingsTab) settingsTab.style.display = 'none';
        if (userManagementSection) userManagementSection.style.display = 'none';
        if (dbInfoIcon) dbInfoIcon.style.display = 'none';
    }
    
    if (staffInput) {
        staffInput.disabled = true;
    }
}

function populateFooter() {
    const dateElement = document.getElementById('footer-date');
    const versionElement = document.getElementById('footer-version');

    if (dateElement) {
        dateElement.textContent = formatDate(new Date().toISOString());
    }
    if (versionElement) {
        versionElement.textContent = `Versión ${APP_VERSION}`;
    }
}


// --- INICIALIZACIÓN ---

async function initializeApp() {
  let userResponse;
  try {
    userResponse = await fetch('/api/user');
    if (!userResponse.ok) {
      window.location.href = '/login.html';
      return;
    }

    const contentType = userResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('La respuesta del servidor no es JSON. Redirigiendo al login.');
      window.location.href = '/login.html';
      return;
    }
    
    currentUser = await userResponse.json();

  } catch (error) {
    console.error('Error de conexión al verificar la autenticación. Redirigiendo al login.', error);
    window.location.href = '/login.html';
    return;
  }

  const tabs = document.querySelector('.tabs');
  const btnLogout = document.getElementById('btnLogout');
  const btnCancelEditUser = document.getElementById('btnCancelEditUser');
  const tipoServicioSelect = document.getElementById('m-tipo');
  const clientSubTabs = document.querySelector('#tab-clients .sub-tabs');
  const dbInfoIcon = document.getElementById('db-info-icon');
  
  formSettings?.addEventListener('submit', handleSaveSettings);
  formCredentials?.addEventListener('submit', handleSaveCredentials);
  formMove?.addEventListener('submit', handleNewMovement);
  tblMovesBody?.addEventListener('click', handleTableClick);
  tblClientsBody?.addEventListener('click', handleTableClick);
  tblServicesBody?.addEventListener('click', handleTableClick);
  tblCoursesBody?.addEventListener('click', handleTableClick);
  appointmentsList?.addEventListener('click', handleTableClick);
  btnExport?.addEventListener('click', exportCSV);
  btnTestTicket?.addEventListener('click', handleTestTicket);
  formClient?.addEventListener('submit', handleClientForm);
  formProduct?.addEventListener('submit', handleAddOrUpdateProduct);
  tabs?.addEventListener('click', handleTabChange);
  clientSubTabs?.addEventListener('click', handleClientTabChange);
  
  if (currentUser.role === 'admin') {
      formAddUser?.addEventListener('submit', handleAddOrUpdateUser);
      tblUsersBody?.addEventListener('click', handleTableClick);
      dbInfoIcon?.addEventListener('click', () => {
        document.getElementById('db-instructions').classList.toggle('hidden');
      });
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

  const searchClientInput = document.getElementById('search-client');
  searchClientInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredClients = clients.filter(c => 
      c.nombre.toLowerCase().includes(searchTerm) || 
      c.telefono?.toLowerCase().includes(searchTerm)
    );
    renderClientsTable(filteredClients);
  });

  const categoriaSelect = document.getElementById('m-categoria');
  categoriaSelect?.addEventListener('change', (e) => {
    populateArticuloDropdown(e.target.value);
  });

  tipoServicioSelect?.addEventListener('change', (e) => {
    const subtipoContainer = document.getElementById('m-subtipo-container');
    const servicesWithSubtype = ['Microblading', 'Lashes', 'Nail Art', 'Lash Lifting'];
    subtipoContainer.classList.toggle('hidden', !servicesWithSubtype.includes(e.target.value));
  });

    document.getElementById('btn-edit-client')?.addEventListener('click', () => {
      if (!currentClientId) return;
      const client = clients.find(c => c.id === currentClientId);
      if (client) {
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

          activateClientSubTab('sub-tab-register');
      }
  });

  document.getElementById('btn-delete-client')?.addEventListener('click', () => {
      if (!currentClientId) return;
      deleteClient(currentClientId);
  });

  document.getElementById('btnAddCourseToClient')?.addEventListener('click', () => {
    const clientId = document.getElementById('c-id').value;
    if (!clientId) {
        alert('Por favor, primero guarda el cliente antes de añadir un curso.');
        return;
    }
    showAddCourseModal(clientId);
  });

  Promise.all([
    load(KEY_SETTINGS, DEFAULT_SETTINGS),
    load(KEY_DATA, []),
    load(KEY_CLIENTS, []),
    fetch('/api/products').then(res => res.json()),
  ]).then(values => {
    console.log('Initial data loaded:', values);
    [settings, movements, clients, products] = values;
    
    console.log('Rendering settings...');
    renderSettings();
    console.log('Rendering movements table...');
    renderTable();
    console.log('Rendering clients table...');
    renderClientsTable();
    console.log('Rendering products table...');
    renderProductTables();
    console.log('Updating client datalist...');
    updateClientDatalist();
    populateArticuloDropdown(document.getElementById('m-categoria').value);
    
    if (currentUser) {
        console.log('Setting user info in form...');
        document.getElementById('s-name').value = currentUser.name || '';
        document.getElementById('s-username').value = currentUser.username;
        document.getElementById('m-staff').value = currentUser.name || '';
    }
    
    console.log('Setting up UI for role...');
    setupUIForRole(currentUser.role);
    
    console.log('Activating initial tab...');
    if (currentUser.role === 'admin') {
        activateTab('tab-dashboard');
    } else {
        activateTab('tab-movements');
    }

    console.log('Activating client sub-tab...');
    activateClientSubTab('sub-tab-register');
    console.log('Clearing client record...');
    clearClientRecord();
    console.log('Populating footer...');
    populateFooter();
    console.log('Initialization complete.');

  }).catch(error => {
    console.error('CRITICAL: Failed to load initial data.', error);
    alert('Error Crítico: No se pudieron cargar los datos del servidor.');
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);
