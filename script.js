function inicializarFormulario() {
    // Variables globales
    let listaProductos = [];
    
    // Elementos del DOM
    const tabCrear = document.getElementById('tab-crear');
    const tabStock = document.getElementById('tab-stock');
    const formCrear = document.getElementById('form-crear');
    const formStock = document.getElementById('form-stock');
    const toast = document.getElementById('status-toast');
    
    // Elementos Formulario 1
    const selectUbicacion = document.getElementById('ubicacionId');
    
    // Elementos Formulario 2
    const selectProducto = document.getElementById('productoSelect');
    const infoCard = document.getElementById('info-producto');

    // --- PETICIONES GET ---
    async function cargarUbicaciones() {
        try {
            const res = await fetch('http://localhost:8080/api/ubicaciones');
            if (res.ok) {
                const ubicaciones = await res.json();
                if (selectUbicacion) {
                    selectUbicacion.innerHTML = '<option value="">-- Seleccione Ubicación --</option>';
                    ubicaciones.forEach((u) => selectUbicacion.innerHTML += `<option value="${u.id}">${u.nombre}</option>`);
                }
            }
        } catch (e) { 
            console.error('Error cargando ubicaciones:', e);
        }
    }

    async function cargarProductos() {
        try {
            const res = await fetch('http://localhost:8080/api/productos');
            if (res.ok) {
                listaProductos = await res.json();
                if (selectProducto) {
                    selectProducto.innerHTML = '<option value="">-- Elija un Producto Existente --</option>';
                    listaProductos.forEach((p) => selectProducto.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);
                }
            }
        } catch (e) { 
            console.error('Error cargando productos:', e);
        }
    }

    function showToast(msj, clases) {
        if (toast) {
            toast.textContent = msj;
            toast.className = `mx-6 mb-6 p-3 rounded-lg text-sm text-center font-medium ${clases}`;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 5000);
        }
    }

    // --- LÓGICA DE PESTAÑAS ---
    tabCrear?.addEventListener('click', () => {
        formCrear.classList.remove('hidden');
        formStock.classList.add('hidden');
        tabCrear.className = 'flex-1 py-3 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 focus:outline-none transition-colors';
        tabStock.className = 'flex-1 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent hover:text-slate-700 focus:outline-none transition-colors';
    });

    tabStock?.addEventListener('click', () => {
        formStock.classList.remove('hidden');
        formCrear.classList.add('hidden');
        tabStock.className = 'flex-1 py-3 text-sm font-semibold text-emerald-600 border-b-2 border-emerald-600 focus:outline-none transition-colors';
        tabCrear.className = 'flex-1 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent hover:text-slate-700 focus:outline-none transition-colors';
        cargarProductos();
    });

    // Mostrar info del producto al seleccionarlo
    selectProducto?.addEventListener('change', (e) => {
        const idSelec = parseInt(e.target.value);
        const prod = listaProductos.find((p) => p.id === idSelec);
        
        if (prod && infoCard) {
            infoCard.classList.remove('hidden');
            document.getElementById('lbl-categoria').textContent = prod.categoria;
            document.getElementById('lbl-precio').textContent = prod.precio.toFixed(2);
            document.getElementById('lbl-stock').textContent = prod.stockActual + ' ' + prod.unidadMedida;
            document.getElementById('lbl-ubicacion').textContent = prod.ubicacionId;
        } else if (infoCard) {
            infoCard.classList.add('hidden');
        }
    });

    // --- ENVÍOS DE FORMULARIOS ---

    // 1. Crear Producto Nuevo
    formCrear?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('nombre').value,
            categoria: document.getElementById('categoria').value,
            precio: parseFloat(document.getElementById('precio').value),
            stockActual: 0,
            stockMinimo: parseInt(document.getElementById('stockMinimo').value) || 0,
            unidadMedida: document.getElementById('unidadMedida').value,
            ubicacionId: parseInt(selectUbicacion.value),
            activo: true
        };

        try {
            const res = await fetch('http://localhost:8080/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Producto registrado. Ahora puede ingresarle stock.', 'bg-blue-50 text-blue-700 border border-blue-200');
                formCrear.reset();
            } else {
                showToast('Error al crear el producto.', 'bg-red-50 text-red-700 border border-red-200');
            }
        } catch (e) { 
            showToast('Error de red al crear.', 'bg-red-50 text-red-700 border border-red-200');
            console.error('Error:', e);
        }
    });

    // 2. Añadir Stock
    formStock?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idProducto = selectProducto.value;
        const cantidadAñadir = parseInt(document.getElementById('cantidadEntrante').value);
        
        try {
            const res = await fetch(`http://localhost:8080/api/productos/${idProducto}/stock?cantidad=${cantidadAñadir}`, {
                method: 'PUT',
            });
            
            if (res.ok) {
                showToast(`Se añadieron ${cantidadAñadir} unidades al inventario.`, 'bg-emerald-50 text-emerald-700 border border-emerald-200');
                formStock.reset();
                infoCard?.classList.add('hidden');
                cargarProductos();
            } else {
                showToast('Error al actualizar stock.', 'bg-red-50 text-red-700 border border-red-200');
            }
        } catch (e) { 
            showToast('Error de conexión al sumar stock.', 'bg-red-50 text-red-700 border border-red-200');
            console.error('Error:', e);
        }
    });

    // Inicializar al cargar
    cargarUbicaciones();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarFormulario);
} else {
    inicializarFormulario();
}