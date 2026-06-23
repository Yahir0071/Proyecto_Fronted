// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

let ubicacionesDisponibles = [];

// Función para mostrar notificaciones Toast
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}

// Inicializar módulo de ubicaciones
function inicializarUbicaciones() {
    console.log('✅ Inicializando módulo Ubicaciones...');
    
    // Cargar ubicaciones
    cargarUbicacionesModulo();
    cargarAlmacenesParaSelect();

    // [NUEVO] Escuchador para el formulario de crear Almacén:
    document.getElementById('form-almacen').addEventListener('submit', crearAlmacen);

    // Event listeners para formularios
    document.getElementById('form-ubicacion').addEventListener('submit', crearUbicacion);
    document.getElementById('form-conectar').addEventListener('submit', conectarUbicaciones);
}

// Cargar ubicaciones desde API
async function cargarUbicacionesModulo() {
    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones`);
        const ubicaciones = await response.json();
        ubicacionesDisponibles = ubicaciones;

        // Actualizar tabla
        actualizarTablaUbicaciones(ubicaciones);

        // Actualizar selects
        actualizarSelectsUbicaciones(ubicaciones);
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        mostrarToast('Error al cargar ubicaciones', 'error');
    }
}

// Actualizar tabla de ubicaciones
function actualizarTablaUbicaciones(ubicaciones) {
    const tbody = document.getElementById('tabla-ubicaciones');
    
    if (ubicaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-500">No hay ubicaciones registradas</td></tr>';
        return;
    }

    tbody.innerHTML = ubicaciones.map((ub, index) => `
        <tr>
            <td class="px-6 py-3 text-slate-700 font-medium">${index + 1}</td>
            <td class="px-6 py-3 text-slate-700">${ub.nombre}</td>
            <td class="px-6 py-3 text-slate-600 text-sm">${ub.descripcion || '-'}</td>
            <td class="px-6 py-3 text-center">
                <button onclick="eliminarUbicacion(${ub.id})" class="btn-eliminar">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Actualizar selects de ubicaciones
function actualizarSelectsUbicaciones(ubicaciones) {
    const selects = [
        document.getElementById('ubicacion-origen'),
        document.getElementById('ubicacion-destino'),
        document.getElementById('ruta-origen'),
        document.getElementById('ruta-destino')
    ];

    selects.forEach(select => {
        const selectedValue = select.value;
        select.innerHTML = '<option value="">Seleccione...</option>';
        
        ubicaciones.forEach(ub => {
            const option = document.createElement('option');
            option.value = ub.id;
            option.textContent = ub.nombre;
            select.appendChild(option);
        });

        if (selectedValue) {
            select.value = selectedValue;
        }
    });
}

// Crear nueva ubicación
async function crearUbicacion(e) {
    e.preventDefault();

    const ubicacion = {
        almacenId: parseInt(document.getElementById('ubicacion-almacen').value),
        nombre: document.getElementById('ubicacion-nombre').value,
        descripcion: document.getElementById('ubicacion-descripcion').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ubicacion)
        });

        if (response.ok) {
            mostrarToast('✅ Ubicación creada exitosamente', 'success');
            document.getElementById('form-ubicacion').reset();
            cargarUbicacionesModulo();
        } else {
            mostrarToast('Error al crear ubicación', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Conectar ubicaciones
async function conectarUbicaciones(e) {
    e.preventDefault();

    const origen = parseInt(document.getElementById('ubicacion-origen').value);
    const destino = parseInt(document.getElementById('ubicacion-destino').value);
    const distancia = parseFloat(document.getElementById('distancia').value);

    if (origen === destino) {
        mostrarToast('Origen y destino no pueden ser iguales', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones/conectar?origen=${origen}&destino=${destino}&distancia=${distancia}`, {
            method: 'POST'
        });

        if (response.ok) {
            mostrarToast('✅ Ubicaciones conectadas exitosamente', 'success');
            document.getElementById('form-conectar').reset();
        } else {
            mostrarToast('Error al conectar ubicaciones', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Eliminar ubicación
async function eliminarUbicacion(id) {
    if (!confirm('¿Desea eliminar esta ubicación?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        console.log('Respuesta:', data);

        if (data.exitoso) {
            // ✅ Se eliminó correctamente
            mostrarToast(data.mensaje, 'success');
            setTimeout(() => {
                cargarUbicacionesModulo(); // ✅ Recarga después de 1 segundo
            }, 1000);
        } else {
            // ❌ No se puede eliminar
            mostrarToast(data.mensaje, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// Calcular ruta
async function calcularRuta(algoritmo) {
    const origen = parseInt(document.getElementById('ruta-origen').value);
    const destino = parseInt(document.getElementById('ruta-destino').value);

    if (!origen || !destino) {
        mostrarToast('Seleccione origen y destino', 'warning');
        return;
    }

    try {
        const endpoint = algoritmo === 'dijkstra' ? 'ruta-corta' : 'ruta-bfs';
        const response = await fetch(`${API_BASE_URL}/ubicaciones/${endpoint}?origen=${origen}&destino=${destino}`);
        const datos = await response.json();

        const ruta = datos.ruta.map(id => {
            const ub = ubicacionesDisponibles.find(u => u.id === id);
            return ub ? ub.nombre : `(ID: ${id})`;
        }).join(' → ');

        document.getElementById('ruta-texto').textContent = ruta;
        document.getElementById('resultado-ruta').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al calcular ruta', 'error');
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUbicaciones);
} else {
    inicializarUbicaciones();
}

function logout() {
    localStorage.removeItem("logueado");
    window.location.href = "index-login.html";
}

// ==================== LÓGICA DE ALMACENES ====================

async function crearAlmacen(e) {
    e.preventDefault();

    // 1. Construimos el DTO exacto que pide Spring Boot
    const nuevoAlmacen = {
        nombre: document.getElementById('almacen-nombre').value.trim(),
        direccion: document.getElementById('almacen-direccion').value.trim(),
        filas: parseInt(document.getElementById('almacen-filas').value),
        columnas: parseInt(document.getElementById('almacen-columnas').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/almacenes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoAlmacen)
        });

        if (response.ok) {
            const data = await response.json();
            mostrarToast(`✅ Almacén "${data.nombre}" creado con ID: ${data.id}`, 'success');
            document.getElementById('form-almacen').reset();
            cargarAlmacenesParaSelect();
        } else {
            const err = await response.text();
            mostrarToast(`Error del servidor: ${err}`, 'error');
        }
    } catch (error) {
        console.error('Error al crear almacén:', error);
        mostrarToast('Error de red al intentar conectar con /api/almacenes', 'error');
    }
}

// Cargar almacenes en el select de "Crear Ubicación"
async function cargarAlmacenesParaSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/almacenes`);
        const almacenes = await response.json();

        const select = document.getElementById('ubicacion-almacen');
        select.innerHTML = '<option value="">Seleccione un almacén...</option>';

        almacenes.forEach(alm => {
            const option = document.createElement('option');
            option.value = alm.id;
            option.textContent = `${alm.nombre} (${alm.direccion})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando almacenes para el select:', error);
        document.getElementById('ubicacion-almacen').innerHTML = '<option value="">Error al cargar almacenes</option>';
    }
}