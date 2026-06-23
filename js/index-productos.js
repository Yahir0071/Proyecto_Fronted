// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

let productosDisponibles = [];
let almacenesDisponibles = [];
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

// Inicializar módulo de productos
function inicializarProductos() {
    console.log('✅ Inicializando módulo Productos...');
    
    // Cargar datos
    cargarAlmacenes();
    cargarProductos();

    // Event listeners para tabs
    document.getElementById('tab-crear').addEventListener('click', mostrarFormCrear);
    document.getElementById('tab-almacen').addEventListener('click', mostrarFormAlmacen);
    document.getElementById('tab-stock').addEventListener('click', mostrarFormStock);

    // Event listeners para formularios
    document.getElementById('form-crear').addEventListener('submit', crearProducto);
    document.getElementById('form-almacen').addEventListener('submit', asignarAlmacen);
    document.getElementById('form-stock').addEventListener('submit', ingresarStock);
    
    // Event listeners para selects
    document.getElementById('productoSelectAlmacen').addEventListener('change', mostrarInfoProductoAlmacen);
    document.getElementById('almacenSelect').addEventListener('change', cargarUbicacionesPorAlmacen);
    document.getElementById('productoSelect').addEventListener('change', mostrarInfoProducto);
}

// Cargar almacenes desde API
async function cargarAlmacenes() {
    try {
        const response = await fetch(`${API_BASE_URL}/almacenes`);
        const almacenes = await response.json();
        almacenesDisponibles = almacenes;

        const selectAlmacen = document.getElementById('almacenSelect');
        selectAlmacen.innerHTML = '<option value="">Selecciona un almacén...</option>';
        
        almacenes.forEach(alm => {
            const option = document.createElement('option');
            option.value = alm.id;
            option.textContent = `${alm.nombre}${alm.direccion ? ' (' + alm.direccion + ')' : ''}`;
            selectAlmacen.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando almacenes:', error);
        mostrarToast('Error al cargar almacenes', 'error');
    }
}

// Cargar ubicaciones por almacén
async function cargarUbicacionesPorAlmacen(e) {
    const almacenId = parseInt(e.target.value);

    if (!almacenId) {
        // Reset si no hay almacén seleccionado
        document.getElementById('ubicacionIdAlmacen').disabled = true;
        document.getElementById('ubicacionIdAlmacen').innerHTML = '<option value="">Selecciona un almacén primero...</option>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones/por-almacen/${almacenId}`);
        const ubicaciones = await response.json();
        ubicacionesDisponibles = ubicaciones;

        const selectUbicacion = document.getElementById('ubicacionIdAlmacen');
        selectUbicacion.disabled = false;
        selectUbicacion.innerHTML = '<option value="">Selecciona una ubicación...</option>';
        
        if (ubicaciones.length === 0) {
            selectUbicacion.innerHTML = '<option value="" disabled>No hay ubicaciones en este almacén</option>';
            selectUbicacion.disabled = true;
            mostrarToast('⚠️ Este almacén no tiene ubicaciones disponibles', 'warning');
        } else {
            ubicaciones.forEach(ub => {
                const option = document.createElement('option');
                option.value = ub.id;
                option.textContent = `${ub.nombre}${ub.descripcion ? ' - ' + ub.descripcion : ''}`;
                selectUbicacion.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        mostrarToast('Error al cargar ubicaciones', 'error');
    }
}

// Cargar productos desde API
async function cargarProductos() {
    try {
        const response = await fetch(`${API_BASE_URL}/productos`);
        const productos = await response.json();
        productosDisponibles = productos;

        // Llenar select en Form 2
        const selectAlmacen = document.getElementById('productoSelectAlmacen');
        selectAlmacen.innerHTML = '<option value="">Selecciona un producto...</option>';
        
        // Llenar select en Form 3
        const selectStock = document.getElementById('productoSelect');
        selectStock.innerHTML = '<option value="">Selecciona un producto...</option>';
        
        productos.forEach(prod => {
            // Para Form 2
            const optionAlmacen = document.createElement('option');
            optionAlmacen.value = prod.id;
            optionAlmacen.textContent = `${prod.nombre}`;
            selectAlmacen.appendChild(optionAlmacen);

            // Para Form 3
            const optionStock = document.createElement('option');
            optionStock.value = prod.id;
            optionStock.textContent = `${prod.nombre} (Stock: ${prod.stockActual})`;
            selectStock.appendChild(optionStock);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarToast('Error al cargar productos', 'error');
    }
}

// Mostrar formulario de crear
function mostrarFormCrear() {
    ocultarTodosLosFormularios();
    document.getElementById('form-crear').classList.remove('hidden');
    actualizarTabActivo('tab-crear');
}

// Mostrar formulario de almacén
function mostrarFormAlmacen() {
    ocultarTodosLosFormularios();
    document.getElementById('form-almacen').classList.remove('hidden');
    actualizarTabActivo('tab-almacen');
}

// Mostrar formulario de stock
function mostrarFormStock() {
    ocultarTodosLosFormularios();
    document.getElementById('form-stock').classList.remove('hidden');
    actualizarTabActivo('tab-stock');
}

// Ocultar todos los formularios
function ocultarTodosLosFormularios() {
    document.getElementById('form-crear').classList.add('hidden');
    document.getElementById('form-almacen').classList.add('hidden');
    document.getElementById('form-stock').classList.add('hidden');
}

// Actualizar tab activo
function actualizarTabActivo(tabActivo) {
    const tabs = ['tab-crear', 'tab-almacen', 'tab-stock'];
    
    tabs.forEach(tab => {
        const elemento = document.getElementById(tab);
        if (tab === tabActivo) {
            elemento.classList.add('text-blue-600', 'border-blue-600');
            elemento.classList.remove('text-slate-500', 'border-transparent');
        } else {
            elemento.classList.remove('text-blue-600', 'border-blue-600');
            elemento.classList.add('text-slate-500', 'border-transparent');
        }
    });
}

// Crear nuevo producto
async function crearProducto(e) {
    e.preventDefault();

    const producto = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        precio: parseFloat(document.getElementById('precio').value),
        stockMinimo: parseInt(document.getElementById('stockMinimo').value),
        unidadMedida: document.getElementById('unidadMedida').value,
        stockActual: 0
    };

    try {
        const response = await fetch(`${API_BASE_URL}/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(producto)
        });

        if (response.ok) {
            mostrarToast('✅ Producto creado exitosamente', 'success');
            document.getElementById('form-crear').reset();
            cargarProductos();
            setTimeout(() => {
                mostrarFormAlmacen();
            }, 500);
        } else {
            mostrarToast('Error al crear producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Asignar almacén a producto
async function asignarAlmacen(e) {
    e.preventDefault();

    const productoId = parseInt(document.getElementById('productoSelectAlmacen').value);
    const ubicacionId = parseInt(document.getElementById('ubicacionIdAlmacen').value);

    if (!productoId || !ubicacionId) {
        mostrarToast('Selecciona un producto, almacén y una ubicación', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/productos/${productoId}/ubicacion`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ubicacionId: ubicacionId
            })
        });

        if (response.ok) {
            mostrarToast('✅ Almacén asignado correctamente', 'success');
            document.getElementById('form-almacen').reset();
            document.getElementById('info-producto-almacen').classList.add('hidden');
            document.getElementById('ubicacionIdAlmacen').disabled = true;
            cargarProductos();
            setTimeout(() => {
                mostrarFormStock();
            }, 500);
        } else {
            mostrarToast('Error al asignar almacén', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Ingresar stock
async function ingresarStock(e) {
    e.preventDefault();

    const productoId = parseInt(document.getElementById('productoSelect').value);
    const cantidad = parseInt(document.getElementById('cantidadEntrante').value);

    try {
        const response = await fetch(`${API_BASE_URL}/movimientos-stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productoId: productoId,
                cantidad: cantidad,
                tipo: 'ENTRADA'
            })
        });

        if (response.ok) {
            mostrarToast('✅ Stock ingresado correctamente', 'success');
            document.getElementById('form-stock').reset();
            document.getElementById('info-producto').classList.add('hidden');
            cargarProductos();
        } else {
            mostrarToast('Error al ingresar stock', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Mostrar información del producto (Form 2)
function mostrarInfoProductoAlmacen(e) {
    const productoId = parseInt(e.target.value);
    const producto = productosDisponibles.find(p => p.id === productoId);

    if (producto) {
        document.getElementById('lbl-nombre-almacen').textContent = producto.nombre;
        document.getElementById('lbl-categoria-almacen').textContent = producto.categoria;
        document.getElementById('lbl-precio-almacen').textContent = producto.precio.toFixed(2);
        
        const almacen = almacenesDisponibles.find(a => {
            return a.ubicaciones && a.ubicaciones.some(u => u.id === producto.ubicacionId);
        });
        
        const ubicacion = almacenesDisponibles.flatMap(a => a.ubicaciones || [])
                          .find(u => u.id === producto.ubicacionId);
        
        document.getElementById('lbl-ubicacion-actual').textContent = ubicacion ? 
            `${ubicacion.nombre} (${ubicacion.almacenNombre})` : 'Sin asignar';
        
        document.getElementById('info-producto-almacen').classList.remove('hidden');
    }
}

// Mostrar información del producto (Form 3)
function mostrarInfoProducto(e) {
    const productoId = parseInt(e.target.value);
    const producto = productosDisponibles.find(p => p.id === productoId);

    if (producto) {
        document.getElementById('lbl-categoria').textContent = producto.categoria;
        document.getElementById('lbl-precio').textContent = producto.precio.toFixed(2);
        
        const ubicacion = almacenesDisponibles.flatMap(a => a.ubicaciones || [])
                          .find(u => u.id === producto.ubicacionId);
        
        document.getElementById('lbl-ubicacion').textContent = ubicacion ? ubicacion.nombre : 'N/A';
        document.getElementById('lbl-stock').textContent = producto.stockActual;
        
        document.getElementById('info-producto').classList.remove('hidden');
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarProductos);
} else {
    inicializarProductos();
}

function logout() {
    localStorage.removeItem("logueado");
    window.location.href = "index-login.html";
}