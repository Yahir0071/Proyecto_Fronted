// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

let productosDisponibles = [];
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
    
    // Cargar ubicaciones
    cargarUbicaciones();
    
    // Cargar productos
    cargarProductos();

    // Event listeners para tabs
    document.getElementById('tab-crear').addEventListener('click', mostrarFormCrear);
    document.getElementById('tab-stock').addEventListener('click', mostrarFormStock);

    // Event listeners para formularios
    document.getElementById('form-crear').addEventListener('submit', crearProducto);
    document.getElementById('form-stock').addEventListener('submit', ingresarStock);
    document.getElementById('productoSelect').addEventListener('change', mostrarInfoProducto);
}

// Cargar ubicaciones desde API
async function cargarUbicaciones() {
    try {
        const response = await fetch(`${API_BASE_URL}/ubicaciones`);
        const ubicaciones = await response.json();
        ubicacionesDisponibles = ubicaciones;

        const select = document.getElementById('ubicacionId');
        select.innerHTML = '<option value="">Selecciona una ubicación...</option>';
        
        ubicaciones.forEach(ub => {
            const option = document.createElement('option');
            option.value = ub.id;
            option.textContent = `${ub.nombre}${ub.descripcion ? ' - ' + ub.descripcion : ''}`;
            select.appendChild(option);
        });
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

        const select = document.getElementById('productoSelect');
        select.innerHTML = '<option value="">Selecciona un producto...</option>';
        
        productos.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = `${prod.nombre} (Stock: ${prod.stock})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarToast('Error al cargar productos', 'error');
    }
}

// Mostrar formulario de crear
function mostrarFormCrear() {
    document.getElementById('form-crear').classList.remove('hidden');
    document.getElementById('form-stock').classList.add('hidden');
    
    document.getElementById('tab-crear').classList.add('text-blue-600', 'border-blue-600');
    document.getElementById('tab-crear').classList.remove('text-slate-500', 'border-transparent');
    
    document.getElementById('tab-stock').classList.remove('text-blue-600', 'border-blue-600');
    document.getElementById('tab-stock').classList.add('text-slate-500', 'border-transparent');
}

// Mostrar formulario de stock
function mostrarFormStock() {
    document.getElementById('form-crear').classList.add('hidden');
    document.getElementById('form-stock').classList.remove('hidden');
    
    document.getElementById('tab-stock').classList.add('text-blue-600', 'border-blue-600');
    document.getElementById('tab-stock').classList.remove('text-slate-500', 'border-transparent');
    
    document.getElementById('tab-crear').classList.remove('text-blue-600', 'border-blue-600');
    document.getElementById('tab-crear').classList.add('text-slate-500', 'border-transparent');
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
        ubicacionId: parseInt(document.getElementById('ubicacionId').value),
        stock: 0
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
        } else {
            mostrarToast('Error al crear producto', 'error');
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

// Mostrar información del producto
function mostrarInfoProducto(e) {
    const productoId = parseInt(e.target.value);
    const producto = productosDisponibles.find(p => p.id === productoId);

    if (producto) {
        document.getElementById('lbl-categoria').textContent = producto.categoria;
        document.getElementById('lbl-precio').textContent = producto.precio.toFixed(2);
        
        const ubicacion = ubicacionesDisponibles.find(u => u.id === producto.ubicacionId);
        document.getElementById('lbl-ubicacion').textContent = ubicacion ? ubicacion.nombre : 'N/A';
        document.getElementById('lbl-stock').textContent = producto.stock;
        
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