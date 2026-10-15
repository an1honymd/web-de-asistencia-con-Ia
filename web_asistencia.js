/* ==========================================
   CONFIGURACIÓN Y UTILIDADES + GEMINI IA
========================================== */

const GEMINI_API_KEY = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function mostrarNotificacion(mensaje) {
    const notificacion = $("#notificacion");
    notificacion.textContent = mensaje;
    notificacion.classList.add("visible");
    clearTimeout(mostrarNotificacion.temporizador);
    mostrarNotificacion.temporizador = setTimeout(() => {
        notificacion.classList.remove("visible");
    }, 2500);
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => {
        const caracteres = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
        return caracteres[caracter];
    });
}

function cargarJSON(clave, valorPredeterminado) {
    try {
        const valor = localStorage.getItem(clave);
        if (valor === null) return valorPredeterminado;
        return JSON.parse(valor);
    } catch (error) {
        console.error("No se pudieron cargar los datos:", error);
        return valorPredeterminado;
    }
}

/* ==========================================
   NAVEGACIÓN
========================================== */

const nombresVistas = {
    inicio: "Panel principal",
    asistente: "Asistente inteligente",
    tareas: "Mis tareas",
    ideas: "Generador de ideas"
};

function cambiarVista(nombre) {
    const vista = $("#vista-" + nombre);
    if (!vista) return;
    $$(".vista").forEach(elemento => { elemento.classList.remove("activa"); });
    vista.classList.add("activa");
    $$(".menu-item").forEach(boton => {
        boton.classList.toggle("activo", boton.dataset.vista === nombre);
    });
    $("#tituloPagina").textContent = nombresVistas[nombre];
    if (nombre === "inicio") {
        actualizarEstadisticas();
        mostrarTareasRecientes();
    }
}

$$(".menu-item").forEach(boton => {
    boton.addEventListener("click", () => { cambiarVista(boton.dataset.vista); });
});
$$("[data-ir]").forEach(boton => {
    boton.addEventListener("click", () => { cambiarVista(boton.dataset.ir); });
});

/* ==========================================
   MODO CLARO Y OSCURO
========================================== */

const temaGuardado = localStorage.getItem("studyai-tema");
if (temaGuardado === "oscuro") { document.body.classList.add("oscuro"); }

function actualizarBotonTema() {
    $("#btnTema").textContent = document.body.classList.contains("oscuro")? "☀️" : "🌙";
}
actualizarBotonTema();
$("#btnTema").addEventListener("click", () => {
    document.body.classList.toggle("oscuro");
    const tema = document.body.classList.contains("oscuro")? "oscuro" : "claro";
    localStorage.setItem("studyai-tema", tema);
    actualizarBotonTema();
});

/* ==========================================
   ADMINISTRADOR DE TAREAS
========================================== */

let tareas = cargarJSON("studyai-tareas", []);
let filtroActual = "Todas";

function guardarTareas() {
    try {
        localStorage.setItem("studyai-tareas", JSON.stringify(tareas));
        return true;
    } catch (error) {
        console.error("Error al guardar tareas:", error);
        mostrarNotificacion("No se pudieron guardar los datos del navegador.");
        return false;
    }
}

function fechaLocalActual() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    const partes = fecha.split("-");
    if (partes.length!== 3) return "Fecha no disponible";
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function crearElementoTarea(tarea) {
    const elemento = document.createElement("article");
    elemento.className = "tarea";
    if (tarea.completada) elemento.classList.add("completada");
    elemento.innerHTML = `
        <input class="check-tarea" type="checkbox" ${tarea.completada? "checked" : ""}>
        <div class="tarea-info">
            <h3>${escaparHTML(tarea.nombre)}</h3>
            <p>📅 ${formatearFecha(tarea.fecha)} · Prioridad ${escaparHTML(tarea.prioridad)}</p>
        </div>
        <span class="etiqueta-prioridad prioridad-${escaparHTML(tarea.prioridad)}">${escaparHTML(tarea.prioridad)}</span>
        <button class="btn-eliminar" type="button">🗑️</button>
    `;
    elemento.querySelector(".check-tarea").addEventListener("change", evento => {
        tarea.completada = evento.target.checked;
        guardarTareas(); renderizarTareas(); actualizarEstadisticas(); mostrarTareasRecientes();
        mostrarNotificacion(tarea.completada? "¡Tarea completada!" : "Tarea pendiente.");
    });
    elemento.querySelector(".btn-eliminar").addEventListener("click", () => {
        if (!window.confirm(`¿Eliminar "${tarea.nombre}"?`)) return;
        tareas = tareas.filter(item => item.id!== tarea.id);
        guardarTareas(); renderizarTareas(); actualizarEstadisticas(); mostrarTareasRecientes();
        mostrarNotificacion("Tarea eliminada.");
    });
    return elemento;
}

function renderizarTareas() {
    const lista = $("#listaTareas");
    lista.replaceChildren();
    let tareasFiltradas = [...tareas];
    if (filtroActual === "Pendientes") tareasFiltradas = tareasFiltradas.filter(t =>!t.completada);
    if (filtroActual === "Completadas") tareasFiltradas = tareasFiltradas.filter(t => t.completada);
    tareasFiltradas.sort((a, b) => {
        if (a.completada!== b.completada) return Number(a.completada) - Number(b.completada);
        return a.fecha.localeCompare(b.fecha);
    });
    if (tareasFiltradas.length === 0) {
        const mensaje = document.createElement("div");
        mensaje.className = "vacio";
        mensaje.textContent = "No hay tareas aquí.";
        lista.appendChild(mensaje); return;
    }
    tareasFiltradas.forEach(tarea => { lista.appendChild(crearElementoTarea(tarea)); });
}

$("#formTarea").addEventListener("submit", evento => {
    evento.preventDefault();
    const nombre = $("#nombreTarea").value.trim();
    const fecha = $("#fechaTarea").value;
    const prioridad = $("#prioridadTarea").value;
    if (!nombre ||!fecha) { mostrarNotificacion("Completa todos los campos."); return; }
    const nuevaTarea = { id: crypto.randomUUID? crypto.randomUUID() : `${Date.now()}`, nombre, fecha, prioridad, completada: false };
    tareas.push(nuevaTarea);
    if (!guardarTareas()) { tareas.pop(); return; }
    $("#formTarea").reset();
    $("#prioridadTarea").value = "Media";
    filtroActual = "Todas";
    actualizarBotonesFiltro(); renderizarTareas(); actualizarEstadisticas(); mostrarTareasRecientes();
    mostrarNotificacion("¡Tarea agregada!");
});

function actualizarBotonesFiltro() {
    $$(".filtro").forEach(boton => { boton.classList.toggle("activo", boton.dataset.filtro === filtroActual); });
}
$$(".filtro").forEach(boton => {
    boton.addEventListener("click", () => { filtroActual = boton.dataset.filtro; actualizarBotonesFiltro(); renderizarTareas(); });
});

function actualizarEstadisticas() {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
    const pendientes = total - completadas;
    const porcentaje = total === 0? 0 : Math.round((completadas / total) * 100);
    $("#totalTareas").textContent = total;
    $("#tareasCompletadas").textContent = completadas;
    $("#tareasPendientes").textContent = pendientes;
    $("#progreso").textContent = `${porcentaje}%`;
}

function mostrarTareasRecientes() {
    const contenedor = $("#tareasRecientes");
    contenedor.replaceChildren();
    const recientes = [...tareas].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);
    if (recientes.length === 0) {
        const mensaje = document.createElement("div");
        mensaje.className = "vacio";
        mensaje.textContent = "Todavía no tienes tareas.";
        contenedor.appendChild(mensaje); return;
    }
    recientes.forEach(tarea => { contenedor.appendChild(crearElementoTarea(tarea)); });
}

/* ==========================================
   ASISTENTE INTELIGENTE CON GEMINI REAL - VERSIÓN RÁPIDA FINAL 2026
========================================== */

function agregarMensaje(texto, tipo) {
    const contenedor = $("#mensajes");
    const mensaje = document.createElement("div");
    mensaje.className = `mensaje ${tipo}`;
    const avatar = document.createElement("div");
    avatar.className = "mensaje-avatar";
    avatar.textContent = tipo === "usuario"? "👤" : "🤖";
    const burbuja = document.createElement("div");
    burbuja.className = "burbuja";
    burbuja.textContent = texto;
    mensaje.append(avatar, burbuja);
    contenedor.appendChild(mensaje);
    contenedor.scrollTop = contenedor.scrollHeight;
    return burbuja;
}

async function preguntarAGemini(pregunta) {
    // Modelo nuevo obligatorio para claves AQ. gratis desde octubre 2026
    const MODELO = "gemini-3.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const respuesta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: pregunta }] }],
                systemInstruction: {
                    parts: [{ text: "Eres AcademiaIA. Responde en español, máximo 3 líneas, corto y directo, sin saludar largo." }]
                },
                generationConfig: {
                    maxOutputTokens: 250,
                    temperature: 0.5,
                    topP: 0.8
                }
            })
        });
        const data = await respuesta.json();
        console.log(data);
        if (data.error) return `Error Google: ${data.error.message}`;
        if (!data.candidates || data.candidates.length === 0) return "Sin respuesta de Google.";
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        return "Error de conexión: " + error.message;
    }
}

async function enviarPregunta(pregunta) {
    const texto = pregunta.trim();
    if (!texto) return;
    agregarMensaje(texto, "usuario");
    const burbujaPensando = agregarMensaje("AcademiaIA está pensando... 🤔", "asistente");
    const respuesta = await preguntarAGemini(texto);
    burbujaPensando.textContent = respuesta;
}

$("#formChat").addEventListener("submit", evento => {
    evento.preventDefault();
    const entrada = $("#entradaChat");
    enviarPregunta(entrada.value);
    entrada.value = "";
    entrada.focus();
});

$$(".sugerencia").forEach(boton => {
    boton.addEventListener("click", () => { enviarPregunta(boton.dataset.pregunta); });
});

/* ==========================================
   GENERADOR DE IDEAS
========================================== */

const ideas = {
    web: [
        { icono: "🛒", titulo: "Tienda virtual inteligente", descripcion: "Crea una tienda que permita registrar productos y recomendar productos." },
        { icono: "📚", titulo: "Plataforma educativa", descripcion: "Web con materiales de estudio y asistente para dudas." },
        { icono: "🏥", titulo: "Sistema de citas", descripcion: "Plataforma para registrar pacientes y programar citas." }
    ],
    android: [
        { icono: "📱", titulo: "Organizador universitario", descripcion: "App para cursos, horarios y tareas." },
        { icono: "💊", titulo: "Recordatorio de medicamentos", descripcion: "App para recordatorios de medicamentos." },
        { icono: "💰", titulo: "Control de gastos", descripcion: "App que registre ingresos y gastos." }
    ],
    ia: [
        { icono: "🤖", titulo: "Tutor académico", descripcion: "Conecta una web a un modelo de IA para explicar conceptos." },
        { icono: "📝", titulo: "Resumidor de textos", descripcion: "App que envía textos a una API de IA para resumir." },
        { icono: "💡", titulo: "Generador de proyectos", descripcion: "Herramienta que propone proyectos según el área." }
    ],
    electronica: [
        { icono: "🚪", titulo: "Puerta automática", descripcion: "Usa Arduino y sensor ultrasónico para abrir puerta." },
        { icono: "🌱", titulo: "Riego inteligente", descripcion: "Sistema que detecta humedad y activa bomba de agua." },
        { icono: "📡", titulo: "Monitor de sensores", descripcion: "Interfaz web que muestra lecturas de sensores." }
    ],
    datos: [
        { icono: "📊", titulo: "Analizador de notas", descripcion: "Sistema para registrar calificaciones y mostrar gráficos." },
        { icono: "📦", titulo: "Control de inventario", descripcion: "Sistema que registre productos y alertas de inventario." },
        { icono: "👥", titulo: "Registro de estudiantes", descripcion: "App para administrar estudiantes y cursos." }
    ],
    educacion: [
        { icono: "🧮", titulo: "Tutor de matemáticas", descripcion: "Herramienta con ejercicios y explicaciones paso a paso." },
        { icono: "🔬", titulo: "Laboratorio virtual", descripcion: "Simulaciones interactivas de fenómenos científicos." },
        { icono: "🎯", titulo: "Cuestionarios educativos", descripcion: "Cuestionarios con puntuaciones y retroalimentación." }
    ]
};

$("#formIdeas").addEventListener("submit", evento => {
    evento.preventDefault();
    const categoria = $("#categoriaIdea").value;
    const nivel = $("#nivelIdea").value;
    const nivelTexto = { facil: "Fácil", medio: "Intermedio", avanzado: "Avanzado" };
    const contenedor = $("#resultadoIdeas");
    contenedor.replaceChildren();
    const propuestas = [...ideas[categoria]].sort(() => Math.random() - 0.5).slice(0, 3);
    propuestas.forEach(idea => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "idea-card";
        tarjeta.innerHTML = `<div class="idea-icono">${idea.icono}</div><h3>${idea.titulo}</h3><p>${idea.descripcion}</p><span class="idea-nivel">Dificultad: ${nivelTexto[nivel]}</span>`;
        contenedor.appendChild(tarjeta);
    });
    mostrarNotificacion("¡Se generaron tres ideas!");
});

/* ==========================================
   INICIALIZACIÓN
========================================== */

renderizarTareas();
actualizarEstadisticas();
mostrarTareasRecientes();
actualizarBotonesFiltro();
$("#fechaTarea").min = fechaLocalActual();
console.log("AcademiaIA con Gemini 3.5 FLASH-LITE RÁPIDO iniciado.");