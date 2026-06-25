const API_BASE_URL = 'http://localhost:8080/api';

let productosDisponibles = [];
let almacenesDisponibles = [];
let ubicacionesDisponibles = [];
let proveedoresDisponibles = [];

// IDs de productos marcados como "En Tránsito" (estado temporal en frontend)
const enTransito = new Set();

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
function inicializarProductos() {
    cargarAlmacenes();
    cargarProductos();
    cargarProveedores();
    cargarAlertas();

    document.getElementById('tab-crear').addEventListener('click', mostrarFormCrear);
    document.getElementById('tab-almacen').addEventListener('click', mostrarFormAlmacen);
    document.getElementById('tab-stock').addEventListener('click', mostrarFormStock);
    document.getElementById('tab-proveedor').addEventListener('click', mostrarFormProveedor);

    document.getElementById('form-crear').addEventListener('submit', crearProducto);
    document.getElementById('form-almacen').addEventListener('submit', asignarAlmacen);
    document.getElementById('form-stock').addEventListener('submit', ingresarStock);
    document.getElementById('form-proveedor').addEventListener('submit', crearProveedor);

    document.getElementById('productoSelectAlmacen').addEventListener('change', mostrarInfoProductoAlmacen);
    document.getElementById('almacenSelect').addEventListener('change', cargarUbicacionesPorAlmacen);
    document.getElementById('productoSelect').addEventListener('change', mostrarInfoProducto);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function ocultarTodosLosFormularios() {
    ['form-crear', 'form-almacen', 'form-stock', 'form-proveedor']
        .forEach(id => document.getElementById(id).classList.add('hidden'));
}

function actualizarTabActivo(tabActivo) {
    ['tab-crear', 'tab-almacen', 'tab-stock', 'tab-proveedor'].forEach(tab => {
        const el = document.getElementById(tab);
        if (tab === tabActivo) {
            el.classList.add('text-blue-600', 'border-blue-600');
            el.classList.remove('text-slate-500', 'border-transparent');
        } else {
            el.classList.remove('text-blue-600', 'border-blue-600');
            el.classList.add('text-slate-500', 'border-transparent');
        }
    });
}

function mostrarFormCrear()      { ocultarTodosLosFormularios(); document.getElementById('form-crear').classList.remove('hidden');     actualizarTabActivo('tab-crear'); }
function mostrarFormAlmacen()    { ocultarTodosLosFormularios(); document.getElementById('form-almacen').classList.remove('hidden');   actualizarTabActivo('tab-almacen'); }
function mostrarFormStock()      { ocultarTodosLosFormularios(); document.getElementById('form-stock').classList.remove('hidden');     actualizarTabActivo('tab-stock'); }
function mostrarFormProveedor()  { ocultarTodosLosFormularios(); document.getElementById('form-proveedor').classList.remove('hidden'); actualizarTabActivo('tab-proveedor'); renderListaProveedores(); }

// ─── PROVEEDORES ──────────────────────────────────────────────────────────────
async function cargarProveedores() {
    try {
        const res = await fetch(`${API_BASE_URL}/proveedores`);
        proveedoresDisponibles = await res.json();

        const select = document.getElementById('producto-proveedor');
        select.innerHTML = '<option value="">Sin proveedor asignado</option>';
        proveedoresDisponibles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando proveedores:', e);
    }
}

async function crearProveedor(e) {
    e.preventDefault();
    const body = {
        nombre:    document.getElementById('prov-nombre').value.trim(),
        ruc:       document.getElementById('prov-ruc').value.trim(),
        telefono:  document.getElementById('prov-telefono').value.trim(),
        contacto:  document.getElementById('prov-contacto').value.trim(),
        direccion: document.getElementById('prov-direccion').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE_URL}/proveedores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            mostrarToast('✅ Proveedor guardado correctamente', 'success');
            document.getElementById('form-proveedor').reset();
            await cargarProveedores();
            renderListaProveedores();
        } else {
            mostrarToast('Error al guardar proveedor', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

function renderListaProveedores() {
    const contenedor = document.getElementById('lista-proveedores');
    if (proveedoresDisponibles.length === 0) {
        contenedor.innerHTML = '<p class="text-xs text-slate-400">No hay proveedores registrados.</p>';
        return;
    }
    contenedor.innerHTML = proveedoresDisponibles.map(p => `
        <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div>
                <p class="text-sm font-medium text-slate-800">${p.nombre}</p>
                <p class="text-xs text-slate-500">RUC: ${p.ruc || '-'} · Tel: ${p.telefono || '-'}</p>
            </div>
        </div>
    `).join('');
}

// ─── ALERTAS ──────────────────────────────────────────────────────────────────
async function cargarAlertas() {
    try {
        const res = await fetch(`${API_BASE_URL}/productos/alertas`);
        const alertas = await res.json();
        renderTablaAlertas(alertas);
    } catch (e) {
        console.error('Error cargando alertas:', e);
    }
}

function renderTablaAlertas(alertas) {
    const tbody = document.getElementById('tabla-alertas');

    if (alertas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-5 py-6 text-center text-emerald-600 font-medium">
                    ✅ Todos los productos tienen stock suficiente.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = alertas.map(p => {
        const transitando = enTransito.has(p.id);
        const estadoBadge = transitando
            ? `<span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">En Tránsito</span>`
            : `<span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Crítico</span>`;

        const accionBtn = transitando
            ? `<span class="text-xs text-slate-400 italic">Solicitud enviada</span>`
            : `<button onclick="solicitarAProveedor(${p.id})"
                class="bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                Solicitar a Proveedor
               </button>`;

        // Buscar proveedor del producto si existe el campo proveedorId
        const proveedor = proveedoresDisponibles.find(pv => pv.id === p.proveedorId);
        const nombreProv = proveedor ? proveedor.nombre : '<span class="text-slate-400 italic">Sin asignar</span>';

        return `
            <tr id="alerta-row-${p.id}" class="border-b border-slate-100 last:border-0">
                <td class="px-5 py-3 font-medium text-slate-800">${p.nombre}</td>
                <td class="px-5 py-3 text-center font-bold text-red-600">${p.stockActual}</td>
                <td class="px-5 py-3 text-center text-slate-600">${p.stockMinimo}</td>
                <td class="px-5 py-3 text-slate-700">${nombreProv}</td>
                <td class="px-5 py-3 text-center">${estadoBadge}</td>
                <td class="px-5 py-3 text-center">${accionBtn}</td>
            </tr>`;
    }).join('');
}

function solicitarAProveedor(productoId) {
    enTransito.add(productoId);
    // Actualizar solo la fila afectada sin recargar todo
    const row = document.getElementById(`alerta-row-${productoId}`);
    if (row) {
        row.querySelector('td:nth-child(5)').innerHTML =
            `<span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">En Tránsito</span>`;
        row.querySelector('td:nth-child(6)').innerHTML =
            `<span class="text-xs text-slate-400 italic">Solicitud enviada</span>`;
    }
    mostrarToast('📦 Solicitud enviada al proveedor', 'info');
}

// ─── ALMACENES ────────────────────────────────────────────────────────────────
async function cargarAlmacenes() {
    try {
        const res = await fetch(`${API_BASE_URL}/almacenes`);
        almacenesDisponibles = await res.json();

        const select = document.getElementById('almacenSelect');
        select.innerHTML = '<option value="">Selecciona un almacén...</option>';
        almacenesDisponibles.forEach(alm => {
            const opt = document.createElement('option');
            opt.value = alm.id;
            opt.textContent = `${alm.nombre}${alm.direccion ? ' (' + alm.direccion + ')' : ''}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando almacenes:', e);
        mostrarToast('Error al cargar almacenes', 'error');
    }
}

async function cargarUbicacionesPorAlmacen(e) {
    const almacenId = parseInt(e.target.value);
    const selectUbicacion = document.getElementById('ubicacionIdAlmacen');

    if (!almacenId) {
        selectUbicacion.disabled = true;
        selectUbicacion.innerHTML = '<option value="">Selecciona un almacén primero...</option>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/ubicaciones/por-almacen/${almacenId}`);
        const ubicaciones = await res.json();
        ubicacionesDisponibles = ubicaciones;

        selectUbicacion.disabled = false;
        selectUbicacion.innerHTML = '<option value="">Selecciona una ubicación...</option>';

        if (ubicaciones.length === 0) {
            selectUbicacion.innerHTML = '<option value="" disabled>No hay ubicaciones en este almacén</option>';
            selectUbicacion.disabled = true;
            mostrarToast('⚠️ Este almacén no tiene ubicaciones disponibles', 'warning');
        } else {
            ubicaciones.forEach(ub => {
                const opt = document.createElement('option');
                opt.value = ub.id;
                opt.textContent = `${ub.nombre}${ub.descripcion ? ' - ' + ub.descripcion : ''}`;
                selectUbicacion.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error cargando ubicaciones:', e);
        mostrarToast('Error al cargar ubicaciones', 'error');
    }
}

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────
async function cargarProductos() {
    try {
        const res = await fetch(`${API_BASE_URL}/productos`);
        productosDisponibles = await res.json();

        const selectAlmacen = document.getElementById('productoSelectAlmacen');
        const selectStock   = document.getElementById('productoSelect');

        selectAlmacen.innerHTML = '<option value="">Selecciona un producto...</option>';
        selectStock.innerHTML   = '<option value="">Selecciona un producto...</option>';

        productosDisponibles.forEach(prod => {
            const optA = document.createElement('option');
            optA.value = prod.id;
            optA.textContent = prod.nombre;
            selectAlmacen.appendChild(optA);

            const optS = document.createElement('option');
            optS.value = prod.id;
            optS.textContent = `${prod.nombre} (Stock: ${prod.stockActual})`;
            selectStock.appendChild(optS);
        });
    } catch (e) {
        console.error('Error cargando productos:', e);
        mostrarToast('Error al cargar productos', 'error');
    }
}

async function crearProducto(e) {
    e.preventDefault();
    const proveedorId = parseInt(document.getElementById('producto-proveedor').value) || null;

    const producto = {
        nombre:       document.getElementById('nombre').value,
        categoria:    document.getElementById('categoria').value,
        precio:       parseFloat(document.getElementById('precio').value),
        stockMinimo:  parseInt(document.getElementById('stockMinimo').value),
        unidadMedida: document.getElementById('unidadMedida').value,
        stockActual:  0,
        ...(proveedorId && { proveedorId })
    };

    try {
        const res = await fetch(`${API_BASE_URL}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });

        if (res.ok) {
            mostrarToast('✅ Producto creado exitosamente', 'success');
            document.getElementById('form-crear').reset();
            await cargarProductos();
            setTimeout(() => mostrarFormAlmacen(), 500);
        } else {
            mostrarToast('Error al crear producto', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

async function asignarAlmacen(e) {
    e.preventDefault();
    const productoId  = parseInt(document.getElementById('productoSelectAlmacen').value);
    const ubicacionId = parseInt(document.getElementById('ubicacionIdAlmacen').value);

    if (!productoId || !ubicacionId) {
        mostrarToast('Selecciona un producto y una ubicación', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/productos/${productoId}/ubicacion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ubicacionId })
        });

        if (res.ok) {
            mostrarToast('✅ Almacén asignado correctamente', 'success');
            document.getElementById('form-almacen').reset();
            document.getElementById('info-producto-almacen').classList.add('hidden');
            document.getElementById('ubicacionIdAlmacen').disabled = true;
            await cargarProductos();
            setTimeout(() => mostrarFormStock(), 500);
        } else {
            mostrarToast('Error al asignar almacén', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

async function ingresarStock(e) {
    e.preventDefault();
    const productoId = parseInt(document.getElementById('productoSelect').value);
    const cantidad   = parseInt(document.getElementById('cantidadEntrante').value);

    try {
        const res = await fetch(`${API_BASE_URL}/movimientos-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId, cantidad, tipo: 'ENTRADA' })
        });

        if (res.ok) {
            mostrarToast('✅ Stock ingresado correctamente', 'success');
            document.getElementById('form-stock').reset();
            document.getElementById('info-producto').classList.add('hidden');
            await cargarProductos();

            // Si el producto ya salió del estado crítico, lo quitamos de En Tránsito también
            const productoActualizado = productosDisponibles.find(p => p.id === productoId);
            if (productoActualizado && productoActualizado.stockActual > productoActualizado.stockMinimo) {
                enTransito.delete(productoId);
            }

            // Refrescar tabla de alertas
            await cargarAlertas();
        } else {
            mostrarToast('Error al ingresar stock', 'error');
        }
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión', 'error');
    }
}

// ─── INFO HELPERS ─────────────────────────────────────────────────────────────
function mostrarInfoProductoAlmacen(e) {
    const prod = productosDisponibles.find(p => p.id === parseInt(e.target.value));
    if (!prod) return;

    document.getElementById('lbl-nombre-almacen').textContent   = prod.nombre;
    document.getElementById('lbl-categoria-almacen').textContent = prod.categoria;
    document.getElementById('lbl-precio-almacen').textContent   = prod.precio.toFixed(2);

    const ubicacion = almacenesDisponibles.flatMap(a => a.ubicaciones || [])
                        .find(u => u.id === prod.ubicacionId);
    document.getElementById('lbl-ubicacion-actual').textContent =
        ubicacion ? `${ubicacion.nombre} (${ubicacion.almacenNombre})` : 'Sin asignar';

    document.getElementById('info-producto-almacen').classList.remove('hidden');
}

function mostrarInfoProducto(e) {
    const prod = productosDisponibles.find(p => p.id === parseInt(e.target.value));
    if (!prod) return;

    document.getElementById('lbl-categoria').textContent = prod.categoria;
    document.getElementById('lbl-precio').textContent    = prod.precio.toFixed(2);

    const ubicacion = almacenesDisponibles.flatMap(a => a.ubicaciones || [])
                        .find(u => u.id === prod.ubicacionId);
    document.getElementById('lbl-ubicacion').textContent = ubicacion ? ubicacion.nombre : 'N/A';
    document.getElementById('lbl-stock').textContent     = prod.stockActual;

    document.getElementById('info-producto').classList.remove('hidden');
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('logueado');
    window.location.href = 'index-login.html';
}

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarProductos);
} else {
    inicializarProductos();
}