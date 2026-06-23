// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

// Estado global del formulario
let isLoginMode = true;

// Función para mostrar notificaciones Toast (Mismo estándar de Productos)
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

// Inicializar módulo de Autenticación
function inicializarLogin() {
    console.log('✅ Inicializando módulo Autenticación...');

    // Event listener para alternar entre Login y Registro
    document.getElementById('toggleBtn').addEventListener('click', alternarModoFormulario);

    // Event listener para el envío de datos
    document.getElementById('loginForm').addEventListener('submit', procesarAutenticacion);
}

// Alternar entre modo Login y Registro
function alternarModoFormulario() {
    isLoginMode = !isLoginMode;

    const formTitle = document.getElementById("formTitle");
    const submitBtn = document.getElementById("submitBtn");
    const toggleBtn = document.getElementById("toggleBtn");

    if (isLoginMode) {
        formTitle.textContent = "Iniciar Sesión";
        submitBtn.textContent = "Entrar";
        toggleBtn.textContent = "¿No tienes cuenta? Regístrate aquí";
    } else {
        formTitle.textContent = "Crear Cuenta";
        submitBtn.textContent = "Registrarse";
        toggleBtn.textContent = "¿Ya tienes cuenta? Inicia sesión";
    }
}

// Procesar el envío del formulario (Login o Registro)
async function procesarAutenticacion(e) {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    // Estructura limpia que espera tu UsuarioDTO en Spring Boot
    const usuarioDTO = {
        username: usuario,
        password: password
    };

    // Definimos el endpoint de la API según el modo activo
    const endpoint = isLoginMode ? '/auth/login' : '/auth/registro';
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuarioDTO)
        });

        if (response.ok) {
            if (isLoginMode) {
                // Flujo de Login exitoso
                mostrarToast('✅ Sesión iniciada correctamente', 'success');
                localStorage.setItem("logueado", "true");
                
                // Pequeña pausa para que se aprecie el Toast antes de redirigir
                setTimeout(() => {
                    window.location.href = "index-productos.html";
                }, 1000);
            } else {
                // Flujo de Registro exitoso
                mostrarToast('✅ Usuario registrado exitosamente', 'success');
                document.getElementById('loginForm').reset();
                
                // Forzamos el clic para regresar al modo login automáticamente
                alternarModoFormulario();
            }
        } else {
            // El backend responde con error (400 o 401). Leemos el texto del mensaje lanzado en el catch del Controller
            const errorMsg = await response.text();
            mostrarToast(errorMsg || 'Error en la solicitud', 'error');
        }
    } catch (error) {
        console.error('Error en autenticación:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    }
}

// Ejecutar cuando el DOM esté listo (Mismo estándar de Productos)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarLogin);
} else {
    inicializarLogin();
}
