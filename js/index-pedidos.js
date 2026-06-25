// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

let pedidosDisponibles = [];
let clientesDisponibles = [];

// ============== ESTRUCTURA DE DATOS: PILA (STACK) ==============
class Stack {
    constructor() {
        this.items = [];
    }

    push(element) {
        this.items.push(element);
    }

    pop() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }

    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.items.length - 1];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    print() {
        console.log(this.items.toString());
    }
}

// ============== ESTRUCTURA DE DATOS: COLA (QUEUE) ==============
class Queue {
    constructor() {
        this.items = {};
        this.count = 0;
        this.lowestCount = 0;
    }

    enqueue(element) {
        this.items[this.count] = element;
        this.count++;
    }

    dequeue() {
        if (this.isEmpty()) return null;
        const result = this.items[this.lowestCount];
        delete this.items[this.lowestCount];
        this.lowestCount++;
        return result;
    }

    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.lowestCount];
    }

    isEmpty() {
        return this.count - this.lowestCount === 0;
    }

    size() {
        return this.count - this.lowestCount;
    }

    clear() {
        this.items = {};
        this.count = 0;
        this.lowestCount = 0;
    }

    print() {
        console.log(Object.values(this.items).toString());
    }

    toArray() {
        const result = [];
        for (let i = this.lowestCount; i < this.count; i++) {
            result.push(this.items[i]);
        }
        return result;
    }
}

// ============== INSTANCIAS GLOBALES ==============
const pilaHistorialEstados = new Stack(); // Pila para deshacer cambios de estado
const colaLocalPedidos = new Queue(); // Cola para manejar pedidos en secuencia

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
    document.getElementById('historial-pedido').addEventListener('change', (e) => {
        mostrarHistorialPedido(e);
        // ✨ Actualizar estado del botón cuando cambia el pedido
        if (typeof actualizarContadorPila !== 'undefined') {
            actualizarContadorPila();
        }
    });

    // ✨ Actualizar contador inicial
    if (typeof actualizarContadorPila !== 'undefined') {
        actualizarContadorPila();
    }
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

        // ✨ SINCRONIZAR COLA CON PEDIDOS PENDIENTES
        if (typeof colaDespacho !== 'undefined') {
            colaDespacho.length = 0; // Vaciar cola
            pedidos.forEach(ped => {
                if (ped.estado === 'PENDIENTE' || ped.estado === 'EN_PREPARACION') {
                    colaDespacho.push({
                        id: ped.id,
                        cliente: ped.clienteNombre || 'Cliente',
                        estado: ped.estado
                    });
                }
            });
            if (typeof actualizarUICola !== 'undefined') {
                actualizarUICola();
            }
        }
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

    const clienteId = document.getElementById('pedido-cliente').value;
    const prioridad = document.getElementById('pedido-prioridad').value;
    const total = parseFloat(document.getElementById('pedido-total').value);

    // ✨ VALIDACIONES MEJORADAS
    if (!clienteId) {
        mostrarToast('⚠️ Debe seleccionar un cliente', 'warning');
        return;
    }

    if (!prioridad || prioridad < 1 || prioridad > 3) {
        mostrarToast('⚠️ Debe seleccionar una prioridad válida', 'warning');
        return;
    }

    if (isNaN(total) || total <= 0) {
        mostrarToast('⚠️ El monto total debe ser mayor a 0', 'warning');
        return;
    }

    const pedido = {
        clienteId: parseInt(clienteId),
        prioridad: parseInt(prioridad),
        total: total,
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
            const nuevoPedido = await response.json();
            mostrarToast('✅ Pedido creado exitosamente', 'success');
            document.getElementById('form-pedido').reset();

            // ✨ AÑADIR A LA COLA DEL HTML
            if (typeof encolarPedido !== 'undefined') {
                const clienteNombre = clientesDisponibles.find(c => c.id === parseInt(clienteId))?.nombre || 'Cliente';
                encolarPedido({
                    id: nuevoPedido.id || nuevoPedido.clienteId,
                    cliente: clienteNombre,
                    estado: 'PENDIENTE'
                });
            }

            cargarPedidos();
            actualizarColaPedidos();
        } else {
            mostrarToast('❌ Error al crear pedido', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error de conexión', 'error');
    }
}

// Cambiar estado de pedido
async function cambiarEstado(e) {
    e.preventDefault();

    const pedidoId = parseInt(document.getElementById('estado-pedido').value);
    const nuevoEstado = document.getElementById('nuevo-estado').value;

    try {
        // Obtener estado anterior antes de cambiar
        const pedidoActual = pedidosDisponibles.find(p => p.id === pedidoId);
        if (pedidoActual) {
            // Guardar en la PILA para poder deshacer después
            pilaHistorialEstados.push({
                pedidoId: pedidoId,
                estadoAnterior: pedidoActual.estado,
                estadoNuevo: nuevoEstado,
                fecha: new Date()
            });
            console.log(`📚 Cambio guardado en pila. Tamaño pila: ${pilaHistorialEstados.size()}`);

            // ✨ REGISTRAR TAMBIÉN EN LA PILA VISUAL DEL HTML
            if (typeof registrarCambioEstado !== 'undefined') {
                registrarCambioEstado(pedidoId, pedidoActual.estado, nuevoEstado);
            }
        }

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

            // ✨ SINCRONIZAR COLA CUANDO CAMBIO ESTADO
            if (typeof actualizarUICola !== 'undefined') {
                actualizarUICola();
            }
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

        // Mantener sincronizada la COLA LOCAL con la API
        colaLocalPedidos.clear();
        if (colaData.tamanio > 0) {
            colaLocalPedidos.enqueue({
                id: colaData.idPrimero,
                estado: colaData.estatusPrimero
            });
        }
        console.log(`📋 Cola actualizada. Tamaño: ${colaLocalPedidos.size()}`);

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

// Deshacer estado (usando PILA) - Integrado con modal
async function deshacerEstado() {
    const pedidoId = parseInt(document.getElementById('historial-pedido').value);

    if (!pedidoId) {
        mostrarToast('Seleccione un pedido', 'warning');
        return;
    }

    // Obtener último cambio de la PILA
    const ultimoCambio = pilaHistorialEstados.peek();

    if (!ultimoCambio || ultimoCambio.pedidoId !== pedidoId) {
        mostrarToast('No hay cambios para deshacer', 'warning');
        return;
    }

    try {
        // Pop del stack para remover
        pilaHistorialEstados.pop();

        // Restaurar estado anterior
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: ultimoCambio.estadoAnterior
            })
        });

        if (response.ok) {
            mostrarToast(`↩️ Cambio deshecho: ${ultimoCambio.estadoAnterior}`, 'success');
            console.log(`📚 Cambio deshecho. Tamaño pila: ${pilaHistorialEstados.size()}`);
            
            // ✨ Actualizar la pila visual si existe la función
            if (typeof actualizarContadorPila !== 'undefined') {
                actualizarContadorPila();
            }
            
            mostrarHistorialPedido({ target: document.getElementById('historial-pedido') });
            cargarPedidos();
        } else {
            mostrarToast('Error al deshacer cambio', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Ver detalles de pedido
function verDetallesPedido(pedidoId) {
    const pedido = pedidosDisponibles.find(p => p.id === pedidoId);
    if (pedido) {
        alert(`Pedido #${pedido.id}\nCliente: ${pedido.clienteNombre}\nEstado: ${pedido.estado}\nTotal: S/. ${pedido.total.toFixed(2)}`);
    }
}

// ============== FUNCIONES AUXILIARES PARA DEBUG ==============
// Ver información de la PILA de historial
function verEstadoPila() {
    if (pilaHistorialEstados.isEmpty()) {
        console.log('📚 PILA VACÍA - No hay cambios para deshacer');
    } else {
        console.log(`📚 PILA DE HISTORIAL - Tamaño: ${pilaHistorialEstados.size()}`);
        console.log('Últimos cambios (LIFO):', pilaHistorialEstados.items);
    }
}

// Ver información de la COLA de pedidos
function verEstadoCola() {
    if (colaLocalPedidos.isEmpty()) {
        console.log('📋 COLA VACÍA - No hay pedidos en cola');
    } else {
        console.log(`📋 COLA DE PEDIDOS - Tamaño: ${colaLocalPedidos.size()}`);
        console.log('Próximo pedido:', colaLocalPedidos.peek());
        console.log('Todos los pedidos en cola:', colaLocalPedidos.toArray());
    }
}

// Mostrar estadísticas de estructuras de datos
function mostrarEstadisticasEstructuras() {
    console.log('========== ESTADÍSTICAS DE ESTRUCTURAS ==========');
    console.log(`📚 PILA: ${pilaHistorialEstados.size()} elementos en historial`);
    console.log(`📋 COLA: ${colaLocalPedidos.size()} pedidos en cola`);
    verEstadoPila();
    verEstadoCola();
    console.log('===============================================');
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

function logout() {
    localStorage.removeItem("logueado");
    window.location.href = "index-login.html";
}