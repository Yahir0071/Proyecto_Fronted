const API_BASE_URL = 'http://localhost:8080/api';

let pedidosDisponibles  = [];
let clientesDisponibles = [];
let productosDisponibles = [];

// Lista temporal de detalles del pedido en construcción
let detallesPedidoActual = [];

// ─── TOAST ───────────────────────────────────────────────────────────────────
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

// ─── INIT ─────────────────────────────────────────────────────────────────────
function inicializarPedidos() {
    cargarClientes();
    cargarProductosPedido();
    cargarPedidos();
    actualizarColaPedidos();

    document.getElementById('form-tienda').addEventListener('submit', crearTienda);
    document.getElementById('form-estado').addEventListener('submit', cambiarEstado);
    document.getElementById('historial-pedido').addEventListener('change', mostrarHistorialPedido);
}

// ─── TIENDAS (CLIENTES) ───────────────────────────────────────────────────────
async function cargarClientes() {
    try {
        const res = await fetch(`${API_BASE_URL}/clientes`);
        clientesDisponibles = await res.json();
        poblarSelectClientes();
    } catch (e) {
        console.error('Error cargando clientes:', e);
    }
}

function poblarSelectClientes() {
    const select = document.getElementById('pedido-cliente');
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Selecciona una tienda...</option>';
    clientesDisponibles.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
    });
    if (valorPrevio) select.value = valorPrevio;
}

async function crearTienda(e) {
    e.preventDefault();
    const body = {
        nombre:    document.getElementById('tienda-nombre').value.trim(),
        dni:       document.getElementById('tienda-ruc').value.trim(),   // campo dni = RUC
        telefono:  document.getElementById('tienda-telefono').value.trim(),
        direccion: document.getElementById('tienda-direccion').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const nueva = await res.json();
            clientesDisponibles.push(nueva);
            poblarSelectClientes();
            // Seleccionar la tienda recién creada automáticamente
            document.getElementById('pedido-cliente').value = nueva.id;
            mostrarToast(`✅ Tienda "${nueva.nombre}" registrada`, 'success');
            document.getElementById('form-tienda').reset();
        } else {
            mostrarToast('Error al registrar la tienda', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

// ─── PRODUCTOS PARA PEDIDO ────────────────────────────────────────────────────
async function cargarProductosPedido() {
    try {
        const res = await fetch(`${API_BASE_URL}/productos`);
        productosDisponibles = await res.json();

        const select = document.getElementById('detalle-producto');
        select.innerHTML = '<option value="">Selecciona producto...</option>';
        productosDisponibles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nombre} — S/. ${p.precio.toFixed(2)}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando productos:', e);
    }
}

// ─── DETALLES DEL PEDIDO (tabla temporal) ────────────────────────────────────
function agregarDetalle() {
    const productoId = parseInt(document.getElementById('detalle-producto').value);
    const cantidad   = parseInt(document.getElementById('detalle-cantidad').value);

    if (!productoId || !cantidad || cantidad < 1) {
        mostrarToast('Selecciona un producto y una cantidad válida', 'warning');
        return;
    }

    const producto = productosDisponibles.find(p => p.id === productoId);
    if (!producto) return;

    // Si ya existe el producto en la lista, sumar cantidad
    const existente = detallesPedidoActual.find(d => d.productoId === productoId);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        detallesPedidoActual.push({
            productoId,
            nombre:   producto.nombre,
            precio:   producto.precio,
            cantidad
        });
    }

    // Limpiar inputs
    document.getElementById('detalle-producto').value  = '';
    document.getElementById('detalle-cantidad').value  = 1;

    renderTablaDetalles();
}

function quitarDetalle(productoId) {
    detallesPedidoActual = detallesPedidoActual.filter(d => d.productoId !== productoId);
    renderTablaDetalles();
}

function renderTablaDetalles() {
    const tbody     = document.getElementById('tabla-detalles');
    const container = document.getElementById('detalles-container');
    const totalEl   = document.getElementById('total-pedido');

    if (detallesPedidoActual.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    let total = 0;
    tbody.innerHTML = detallesPedidoActual.map(d => {
        const subtotal = d.precio * d.cantidad;
        total += subtotal;
        return `
            <tr class="border-b border-slate-100">
                <td class="py-2 text-slate-700">${d.nombre}</td>
                <td class="py-2 text-center text-slate-700">${d.cantidad}</td>
                <td class="py-2 text-right text-slate-600">S/. ${d.precio.toFixed(2)}</td>
                <td class="py-2 text-right font-medium text-slate-800">S/. ${subtotal.toFixed(2)}</td>
                <td class="py-2 text-center">
                    <button onclick="quitarDetalle(${d.productoId})"
                        class="text-red-400 hover:text-red-600 text-xs font-bold transition-colors">✕</button>
                </td>
            </tr>`;
    }).join('');

    totalEl.textContent = `S/. ${total.toFixed(2)}`;
}

// ─── CREAR PEDIDO ─────────────────────────────────────────────────────────────
async function crearPedido() {
    const clienteId = parseInt(document.getElementById('pedido-cliente').value);
    const prioridad = parseInt(document.getElementById('pedido-prioridad').value);

    if (!clienteId) {
        mostrarToast('Selecciona una tienda', 'warning');
        return;
    }
    if (detallesPedidoActual.length === 0) {
        mostrarToast('Agrega al menos un producto al pedido', 'warning');
        return;
    }

    const total = detallesPedidoActual.reduce((acc, d) => acc + d.precio * d.cantidad, 0);

    const body = {
        clienteId,
        prioridad,
        total: parseFloat(total.toFixed(2)),
        estado: 'PENDIENTE',
        detalles: detallesPedidoActual.map(d => ({
            productoId: d.productoId,
            cantidad:   d.cantidad
        }))
    };

    try {
        const res = await fetch(`${API_BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            mostrarToast('✅ Pedido creado exitosamente', 'success');
            // Limpiar formulario
            document.getElementById('pedido-cliente').value   = '';
            document.getElementById('pedido-prioridad').value = '3';
            detallesPedidoActual = [];
            renderTablaDetalles();
            cargarPedidos();
            actualizarColaPedidos();
        } else {
            const err = await res.text();
            mostrarToast(`Error: ${err}`, 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
async function cargarPedidos() {
    try {
        const res = await fetch(`${API_BASE_URL}/pedidos`);
        pedidosDisponibles = await res.json();
        actualizarTablaPedidos(pedidosDisponibles);
        sincronizarSelectsPedidos(pedidosDisponibles);
        actualizarColaPedidos();
    } catch (e) {
        console.error('Error cargando pedidos:', e);
        mostrarToast('Error al cargar pedidos', 'error');
    }
}

function actualizarTablaPedidos(pedidos) {
    const tbody = document.getElementById('tabla-pedidos');

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No hay pedidos registrados</td></tr>';
        return;
    }

    // Mapa explícito de estado → clase CSS
    const estadoClases = {
        'PENDIENTE':       'estado-pendiente',
        'EN_PREPARACION':  'estado-preparacion',
        'ENVIADO':         'estado-enviado',
        'ENTREGADO':       'estado-entregado'
    };

    tbody.innerHTML = pedidos.map(ped => {
        const claseEstado = estadoClases[ped.estado] || 'estado-pendiente';
        return `
        <tr class="border-b border-slate-100 last:border-0">
            <td class="px-6 py-3 text-slate-700 font-medium">#${ped.id}</td>
            <td class="px-6 py-3 text-slate-700">${ped.clienteNombre || '-'}</td>
            <td class="px-6 py-3 text-center">
                <span class="estado-badge ${claseEstado}">${ped.estado}</span>
            </td>
            <td class="px-6 py-3 text-right text-slate-700">S/. ${(ped.total || 0).toFixed(2)}</td>
            <td class="px-6 py-3 text-center">
                <span class="prioridad-badge prioridad-${ped.prioridad}">${ped.prioridad}</span>
            </td>
            <td class="px-6 py-3 text-center">
                <button onclick="verDetallesPedido(${ped.id})"
                    class="btn-accion btn-ver">Ver</button>
                <button onclick="eliminarPedido(${ped.id})"
                    class="btn-accion btn-eliminar">Eliminar</button>
            </td>
        </tr>`;
    }).join('');
}

function sincronizarSelectsPedidos(pedidos) {
    ['estado-pedido', 'historial-pedido'].forEach(selectId => {
        const select = document.getElementById(selectId);
        const prev   = select.value;
        select.innerHTML = '<option value="">Selecciona un pedido...</option>';
        pedidos.forEach(ped => {
            const opt = document.createElement('option');
            opt.value = ped.id;
            opt.textContent = `Pedido #${ped.id} — ${ped.clienteNombre || 'Sin tienda'}`;
            select.appendChild(opt);
        });
        if (prev) select.value = prev;
    });
}

// ─── CAMBIAR ESTADO ───────────────────────────────────────────────────────────
async function cambiarEstado(e) {
    e.preventDefault();
    const pedidoId    = parseInt(document.getElementById('estado-pedido').value);
    const nuevoEstado = document.getElementById('nuevo-estado').value;

    if (!pedidoId || !nuevoEstado) {
        mostrarToast('Selecciona un pedido y un estado', 'warning');
        return;
    }

    // Buscar el pedido actual para preservar total y prioridad
    const pedidoActual = pedidosDisponibles.find(p => p.id === pedidoId);
    if (!pedidoActual) {
        mostrarToast('Pedido no encontrado', 'error');
        return;
    }

    try {
        // Registrar en pila de historial
        await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados?estado=${nuevoEstado}`, { method: 'POST' });

        // Actualizar en BD
        const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado, 
                total: pedidoActual.total,       // ← preservar
                prioridad: pedidoActual.prioridad    // ← preservar 
            })
        });

        if (res.ok) {
            mostrarToast('✅ Estado actualizado correctamente', 'success');
            document.getElementById('form-estado').reset();
            cargarPedidos();
        } else {
            mostrarToast('Error al actualizar estado', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

// ─── COLA ─────────────────────────────────────────────────────────────────────
async function actualizarColaPedidos() {
    try {
        const res      = await fetch(`${API_BASE_URL}/pedidos/cola/tamanio`);
        const colaData = await res.json();

        document.getElementById('tamanio-cola').textContent = colaData.tamanio;

        if (colaData.idPrimero) {
            document.getElementById('siguiente-numero').textContent = `Pedido #${colaData.idPrimero}`;
            document.getElementById('siguiente-estado').textContent = `Estado: ${colaData.estatusPrimero}`;
            document.getElementById('info-siguiente').classList.remove('hidden');
        } else {
            document.getElementById('info-siguiente').classList.add('hidden');
        }
    } catch (e) {
        console.error('Error actualizando cola:', e);
    }
}

async function procesarSiguiente() {
    try {
        const res = await fetch(`${API_BASE_URL}/pedidos/procesar-siguiente`, { method: 'POST' });

        if (res.ok) {
            const pedido = await res.json();
            mostrarToast(`✅ Procesando Pedido #${pedido.id}`, 'success');
            cargarPedidos();
            actualizarColaPedidos();
        } else if (res.status === 204) {
            mostrarToast('⚠️ No hay pedidos en la cola', 'warning');
        } else {
            mostrarToast('Error al procesar pedido', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

// ─── HISTORIAL (PILA) ─────────────────────────────────────────────────────────
async function mostrarHistorialPedido(e) {
    const pedidoId = parseInt(e.target.value);
    const contenedor = document.getElementById('historial-contenido');

    if (!pedidoId) {
        contenedor.innerHTML = '<p class="text-sm text-slate-600">Seleccione un pedido para ver su historial</p>';
        return;
    }

    // El historial vive en memoria del backend (pila), mostramos solo el último estado disponible
    try {
        const res    = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados/ultimo`);
        const ultimo = await res.text();

        contenedor.innerHTML = ultimo
            ? `<div class="historial-item">
                   <p class="font-semibold text-slate-800">Último estado registrado: 
                       <span class="text-blue-600">${ultimo}</span>
                   </p>
                   <p class="historial-fecha text-xs text-slate-500 mt-1">
                       Usa el botón "Deshacer" para revertir al estado anterior.
                   </p>
               </div>`
            : '<p class="text-sm text-slate-500">Sin historial registrado en esta sesión.</p>';
    } catch (err) {
        contenedor.innerHTML = '<p class="text-sm text-red-500">Error al cargar historial.</p>';
    }
}

async function deshacerEstado() {
    const pedidoId = parseInt(document.getElementById('historial-pedido').value);
    if (!pedidoId) { mostrarToast('Selecciona un pedido', 'warning'); return; }

    try {
        const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estados/deshacer`, { method: 'POST' });

        if (res.status === 204 || res.status === 404) {
            mostrarToast('No hay cambios para deshacer', 'warning');
            return;
        }

        if (res.ok) {
            const estadoAnterior = await res.json();
            const pedidoActual = pedidosDisponibles.find(p => p.id === pedidoId);

            // Actualizar estado en BD
            await fetch(`${API_BASE_URL}/pedidos/${pedidoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado:    estadoAnterior.estado,
                    total:     pedidoActual?.total    || 0,
                    prioridad: pedidoActual?.prioridad || 1
                })
            });

            mostrarToast(`↩️ Revertido a: ${estadoAnterior.estado}`, 'success');
            await cargarPedidos(); // refresca tabla HTML
            mostrarHistorialPedido({ target: document.getElementById('historial-pedido') });
        } else {
            mostrarToast('No hay cambios para deshacer', 'warning');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error al deshacer cambio', 'error');
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function verDetallesPedido(pedidoId) {
    const ped = pedidosDisponibles.find(p => p.id === pedidoId);
    if (ped) {
        alert(`Pedido #${ped.id}\nTienda: ${ped.clienteNombre}\nEstado: ${ped.estado}\nTotal: S/. ${(ped.total || 0).toFixed(2)}`);
    }
}

async function eliminarPedido(id) {
    if (!confirm('¿Desea eliminar este pedido?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/pedidos/${id}`, { method: 'DELETE' });
        if (res.ok) {
            mostrarToast('✅ Pedido eliminado', 'success');
            cargarPedidos();
            actualizarColaPedidos();
        } else {
            mostrarToast('Error al eliminar pedido', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

function logout() {
    localStorage.removeItem('logueado');
    window.location.href = 'index-login.html';
}

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPedidos);
} else {
    inicializarPedidos();
}