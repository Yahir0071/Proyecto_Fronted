// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

let pedidosDisponibles = [];
let clientesDisponibles = [];

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

// Inicializar módulo de pedidos
function inicializarPedidos() {
    console.log('✅ Inicializando módulo Pedidos...');
    
    cargarClientes();
    cargarPedidos();
    actualizarColaPedidos();

    document.getElementById('form-pedido').addEventListener('submit', crearPedido);
    document.getElementById('form-estado').addEventListener('submit', cambiarEstado);
    document.getElementById('historial-pedido').addEventListener('change', mostrarHistorialPedido);
}

// Cargar clientes desde API
async function cargarClientes() {
    try {
        const response = await fetch(`${API_BASE_URL}/clientes`);
        const clientes = await response.json();
        clientesDisponibles = clientes;

        const select = document.getElementById('pedido-cliente');
        select.innerHTML = '<option value="">Selecciona un cliente...</option>';
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// Cargar pedidos desde API
async function cargarPedidos() {
    try {
        const response = await fetch(`${API_BASE_URL}/pedidos`);
        const pedidos = await response.json();
        pedidosDisponibles = pedidos;

        actualizarTablaPedidos(pedidos);

        const selects = [
            document.getElementById('estado-pedido'),
            document.getElementById('historial-pedido')
        ];

        selects.forEach(select => {
            const selectedValue = select.value;
            select.innerHTML = '<option value="">Selecciona un pedido...</option>';
            
            pedidos.forEach(ped => {
                const option = document.createElement('option');
                option.value = ped.id;
                option.textContent = `Pedido #${ped.id} - ${ped.clienteNombre || 'Cliente'}`;
                select.appendChild(option);
            });

            if (selectedValue) {
                select.value = selectedValue;
            }
        });
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        mostrarToast('Error al cargar pedidos', 'error');
    }
}

// Actualizar tabla de pedidos
function actualizarTablaPedidos(pedidos) {
    const tbody = document.getElementById('tabla-pedidos');
    
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No hay pedidos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map((ped, index) => `
        <tr>
            <td class="px-6 py-3 text-slate-700 font-medium">#${ped.id}</td>
            <td class="px-6 py-3 text-slate-700">${ped.clienteNombre || '-'}</td>
            <td class="px-6 py-3 text-center">
                <span class="estado-badge estado-${ped.estado.toLowerCase().replace(/_/g, '')}">${ped.estado}</span>
            </td>
            <td class="px-6 py-3 text-right text-slate-700">S/. ${ped.total ? ped.total.toFixed(2) : '0.00'}</td>
            <td class="px-6 py-3 text-center">
                <span class="prioridad-badge prioridad-${ped.prioridad}">${ped.prioridad}</span>
            </td>
            <td class="px-6 py-3 text-center">
                <button onclick="verDetallesPedido(${ped.id})" class="btn-accion btn-ver">Ver</button>
                <button onclick="eliminarPedido(${ped.id})" class="btn-accion btn-eliminar">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Crear nuevo pedido
async function crearPedido(e) {
    e.preventDefault();

    const pedido = {
        clienteId: parseInt(document.getElementById('pedido-cliente').value),
        prioridad: parseInt(document.getElementById('pedido-prioridad').value),
        total: parseFloat(document.getElementById('pedido-total').value) || 0,
        estado: 'PENDIENTE'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pedido)
        });

        if (response.ok) {
            mostrarToast('✅ Pedido creado exitosamente', 'success');
            document.getElementById('form-pedido').reset();
            cargarPedidos();
            actualizarColaPedidos();
        } else {
            mostrarToast('Error al crear pedido', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Cambiar estado de pedido
async function cambiarEstado(e) {
    e.preventDefault();

    const pedidoId = parseInt(document.getElementById('estado-pedido').value);
    const nuevoEstado = document.getElementById('nuevo-estado').value;

    try {
        await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados?estado=${nuevoEstado}`, {
            method: 'POST'
        });

        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: nuevoEstado
            })
        });

        if (response.ok) {
            mostrarToast('✅ Estado actualizado correctamente', 'success');
            document.getElementById('form-estado').reset();
            cargarPedidos();
        } else {
            mostrarToast('Error al actualizar estado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Actualizar cola de pedidos
async function actualizarColaPedidos() {
    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/cola/tamanio`);
        const colaData = await response.json();

        document.getElementById('tamanio-cola').textContent = colaData.tamanio;

        if (colaData.idPrimero) {
            document.getElementById('siguiente-numero').textContent = `Pedido #${colaData.idPrimero}`;
            document.getElementById('siguiente-estado').textContent = `Estado: ${colaData.estatusPrimero}`;
            document.getElementById('info-siguiente').classList.remove('hidden');
        } else {
            document.getElementById('info-siguiente').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error actualizando cola:', error);
    }
}

// Procesar siguiente pedido en cola
async function procesarSiguiente() {
    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/procesar-siguiente`, {
            method: 'POST'
        });

        if (response.ok) {
            const pedido = await response.json();
            mostrarToast(`✅ Procesando Pedido #${pedido.id}`, 'success');
            cargarPedidos();
            actualizarColaPedidos();
        } else if (response.status === 204) {
            mostrarToast('⚠️ No hay pedidos en la cola', 'warning');
        } else {
            mostrarToast('Error al procesar pedido', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Mostrar historial de un pedido
async function mostrarHistorialPedido(e) {
    const pedidoId = parseInt(e.target.value);

    if (!pedidoId) {
        document.getElementById('historial-contenido').innerHTML = '<p class="text-sm text-slate-600">Seleccione un pedido para ver su historial</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados`);
        const historial = await response.json();

        if (historial.length === 0) {
            document.getElementById('historial-contenido').innerHTML = '<p class="text-sm text-slate-600">Sin historial registrado</p>';
            return;
        }

        const html = historial.map(h => `
            <div class="historial-item">
                <div>
                    <p class="font-semibold text-slate-800">${h.estado}</p>
                    <p class="historial-fecha">${new Date(h.fecha).toLocaleString()}</p>
                </div>
            </div>
        `).join('');

        document.getElementById('historial-contenido').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('historial-contenido').innerHTML = '<p class="text-sm text-red-600">Error al cargar historial</p>';
    }
}

// Deshacer estado (pila)
async function deshacerEstado() {
    const pedidoId = parseInt(document.getElementById('historial-pedido').value);

    if (!pedidoId) {
        mostrarToast('Seleccione un pedido', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados/deshacer`, {
            method: 'POST'
        });

        if (response.ok) {
            const estado = await response.json();
            mostrarToast(`↩️ Cambio deshecho: ${estado.estado}`, 'success');
            mostrarHistorialPedido({ target: document.getElementById('historial-pedido') });
            cargarPedidos();
        } else {
            mostrarToast('No hay cambios para deshacer', 'warning');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al deshacer cambio', 'error');
    }
}

// Ver detalles de pedido
function verDetallesPedido(pedidoId) {
    const pedido = pedidosDisponibles.find(p => p.id === pedidoId);
    if (pedido) {
        alert(`Pedido #${pedido.id}\nCliente: ${pedido.clienteNombre}\nEstado: ${pedido.estado}\nTotal: S/. ${pedido.total.toFixed(2)}`);
    }
}

// Eliminar pedido
async function eliminarPedido(id) {
    if (!confirm('¿Desea eliminar este pedido?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarToast('✅ Pedido eliminado', 'success');
            cargarPedidos();
            actualizarColaPedidos();
        } else {
            mostrarToast('Error al eliminar pedido', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPedidos);
} else {
    inicializarPedidos();
}