const API_URL = 'http://localhost:3111/api';

export const KEY_DATA = 'movements';
export const KEY_SETTINGS = 'settings';
export const KEY_CLIENTS = 'clients';

/**
 * Carga datos desde el servidor.
 * @param {string} key La clave que representa el endpoint (e.g., 'clients').
 * @param {any} defaultValue El valor a devolver si la carga falla.
 * @returns {Promise<any>} Los datos parseados o el valor por defecto.
 */
export async function load(key, defaultValue) {
  try {
    const response = await fetch(`${API_URL}/${key}`);
    if (!response.ok) {
      throw new Error(`Network response was not ok for key: ${key}`);
    }
    const data = await response.json();
    // Si el servidor devuelve nulo, usar el valor por defecto para evitar errores.
    if (data === null) {
      console.warn(`Server returned null for key "${key}", using default value.`);
      return defaultValue;
    }
    return data;
  } catch (error) {
    console.error(`Error al cargar datos desde el servidor para la clave "${key}"`, error);
    return defaultValue;
  }
}

/**
 * Guarda datos en el servidor.
 * @param {string} key La clave que representa el endpoint.
 * @param {any} data Los datos a guardar.
 */
export async function save(key, data) {
  try {
    const response = await fetch(`${API_URL}/${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // Envuelve los datos en un objeto con la clave principal
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok for key: ${key}`);
    }
  } catch (error) {
    console.error(`Error al guardar datos en el servidor para la clave "${key}"`, error);
  }
}

/**
 * Elimina un item por su ID.
 * @param {string} key La clave que representa el endpoint (e.g., 'clients').
 * @param {string} id El ID del item a eliminar.
 */
export async function remove(key, id) {
    try {
        const response = await fetch(`${API_URL}/${key}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Network response was not ok for key: ${key} and id: ${id}`);
        }
    } catch (error) {
        console.error(`Error al eliminar el item con id "${id}" desde "${key}"`, error);
    }
}

