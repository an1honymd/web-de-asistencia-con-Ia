/* ==========================================
   CONFIGURACIÓN Y UTILIDADES
========================================== */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

function mostrarNotificacion(mensaje) {
    const GEMINI_MODEL = "gemini-3.5-flash-lite";
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
        const caracteres = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return caracteres[caracter];
    });
}

function cargarJSON(clave, valorPredeterminado) {
    try {
        const valor = localStorage.getItem(clave);

        if (valor === null) {
            return valorPredeterminado;
        }

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

    if (!vista) {
        return;
    }

    $$(".vista").forEach(elemento => {
        elemento.classList.remove("activa");
    });

    vista.classList.add("activa");

    $$(".menu-item").forEach(boton => {
        boton.classList.toggle(
            "activo",
            boton.dataset.vista === nombre
        );
    });

    $("#tituloPagina").textContent = nombresVistas[nombre];

    if (nombre === "inicio") {
        actualizarEstadisticas();
        mostrarTareasRecientes();
    }
}

$$(".menu-item").forEach(boton => {
    boton.addEventListener("click", () => {
        cambiarVista(boton.dataset.vista);
    });
});

$$("[data-ir]").forEach(boton => {
    boton.addEventListener("click", () => {
        cambiarVista(boton.dataset.ir);
    });
});


/* ==========================================
   MODO CLARO Y OSCURO
========================================== */

const temaGuardado = localStorage.getItem("studyai-tema");

if (temaGuardado === "oscuro") {
    document.body.classList.add("oscuro");
}

function actualizarBotonTema() {
    $("#btnTema").textContent =
        document.body.classList.contains("oscuro") ? "☀️" : "🌙";
}

actualizarBotonTema();

$("#btnTema").addEventListener("click", () => {
    document.body.classList.toggle("oscuro");

    const tema = document.body.classList.contains("oscuro")
        ? "oscuro"
        : "claro";

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

        mostrarNotificacion(
            "No se pudieron guardar los datos del navegador."
        );

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
    if (!fecha) {
        return "Sin fecha";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return "Fecha no disponible";
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function crearElementoTarea(tarea) {
    const elemento = document.createElement("article");

    elemento.className = "tarea";

    if (tarea.completada) {
        elemento.classList.add("completada");
    }

    elemento.innerHTML = `
        <input
            class="check-tarea"
            type="checkbox"
            aria-label="Marcar tarea como completada"
            ${tarea.completada ? "checked" : ""}
        >

        <div class="tarea-info">
            <h3>${escaparHTML(tarea.nombre)}</h3>

            <p>
                📅 ${formatearFecha(tarea.fecha)}
                · Prioridad ${escaparHTML(tarea.prioridad)}
            </p>
        </div>

        <span class="etiqueta-prioridad prioridad-${escaparHTML(tarea.prioridad)}">
            ${escaparHTML(tarea.prioridad)}
        </span>

        <button
            class="btn-eliminar"
            type="button"
            aria-label="Eliminar tarea"
            title="Eliminar tarea"
        >🗑️</button>
    `;

    elemento.querySelector(".check-tarea")
        .addEventListener("change", evento => {
            tarea.completada = evento.target.checked;

            guardarTareas();
            renderizarTareas();
            actualizarEstadisticas();
            mostrarTareasRecientes();

            mostrarNotificacion(
                tarea.completada
                    ? "¡Tarea completada!"
                    : "Tarea pendiente."
            );
        });

    elemento.querySelector(".btn-eliminar")
        .addEventListener("click", () => {
            const confirmar = window.confirm(
                `¿Quieres eliminar la tarea "${tarea.nombre}"?`
            );

            if (!confirmar) {
                return;
            }

            tareas = tareas.filter(item => item.id !== tarea.id);

            guardarTareas();
            renderizarTareas();
            actualizarEstadisticas();
            mostrarTareasRecientes();

            mostrarNotificacion("Tarea eliminada.");
        });

    return elemento;
}

function renderizarTareas() {
    const lista = $("#listaTareas");

    lista.replaceChildren();

    let tareasFiltradas = [...tareas];

    if (filtroActual === "Pendientes") {
        tareasFiltradas = tareasFiltradas.filter(
            tarea => !tarea.completada
        );
    }

    if (filtroActual === "Completadas") {
        tareasFiltradas = tareasFiltradas.filter(
            tarea => tarea.completada
        );
    }

    tareasFiltradas.sort((a, b) => {
        if (a.completada !== b.completada) {
            return Number(a.completada) - Number(b.completada);
        }

        return a.fecha.localeCompare(b.fecha);
    });

    if (tareasFiltradas.length === 0) {
        const mensaje = document.createElement("div");

        mensaje.className = "vacio";

        mensaje.textContent =
            filtroActual === "Completadas"
                ? "Todavía no tienes tareas completadas."
                : filtroActual === "Pendientes"
                    ? "¡No tienes tareas pendientes!"
                    : "No tienes tareas. Agrega tu primera actividad.";

        lista.appendChild(mensaje);
        return;
    }

    tareasFiltradas.forEach(tarea => {
        lista.appendChild(crearElementoTarea(tarea));
    });
}

$("#formTarea").addEventListener("submit", evento => {
    evento.preventDefault();

    const nombre = $("#nombreTarea").value.trim();
    const fecha = $("#fechaTarea").value;
    const prioridad = $("#prioridadTarea").value;

    if (!nombre || !fecha) {
        mostrarNotificacion("Completa todos los campos.");
        return;
    }

    if (fecha < fechaLocalActual()) {
        mostrarNotificacion("La fecha límite no puede estar en el pasado.");
        return;
    }

    const nuevaTarea = {
        id: window.crypto?.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,

        nombre,
        fecha,
        prioridad,
        completada: false
    };

    tareas.push(nuevaTarea);

    if (!guardarTareas()) {
        tareas.pop();
        return;
    }

    $("#formTarea").reset();

    $("#prioridadTarea").value = "Media";

    filtroActual = "Todas";

    actualizarBotonesFiltro();
    renderizarTareas();
    actualizarEstadisticas();
    mostrarTareasRecientes();

    mostrarNotificacion("¡Tarea agregada correctamente!");
});

function actualizarBotonesFiltro() {
    $$(".filtro").forEach(boton => {
        boton.classList.toggle(
            "activo",
            boton.dataset.filtro === filtroActual
        );
    });
}

$$(".filtro").forEach(boton => {
    boton.addEventListener("click", () => {
        filtroActual = boton.dataset.filtro;

        actualizarBotonesFiltro();
        renderizarTareas();
    });
});


/* ==========================================
   ESTADÍSTICAS
========================================== */

function actualizarEstadisticas() {
    const total = tareas.length;

    const completadas = tareas.filter(
        tarea => tarea.completada
    ).length;

    const pendientes = total - completadas;

    const porcentaje = total === 0
        ? 0
        : Math.round((completadas / total) * 100);

    $("#totalTareas").textContent = total;
    $("#tareasCompletadas").textContent = completadas;
    $("#tareasPendientes").textContent = pendientes;
    $("#progreso").textContent = `${porcentaje}%`;
}

function mostrarTareasRecientes() {
    const contenedor = $("#tareasRecientes");

    contenedor.replaceChildren();

    const recientes = [...tareas]
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 4);

    if (recientes.length === 0) {
        const mensaje = document.createElement("div");

        mensaje.className = "vacio";
        mensaje.textContent =
            "Todavía no tienes tareas. ¡Agrega una para comenzar!";

        contenedor.appendChild(mensaje);
        return;
    }

    recientes.forEach(tarea => {
        contenedor.appendChild(crearElementoTarea(tarea));
    });
}


/* ==========================================
   ASISTENTE DE DEMOSTRACIÓN
========================================== */

function agregarMensaje(texto, tipo) {
    const contenedor = $("#mensajes");

    const mensaje = document.createElement("div");

    mensaje.className = `mensaje ${tipo}`;

    const avatar = document.createElement("div");

    avatar.className = "mensaje-avatar";
    avatar.textContent = tipo === "usuario" ? "👤" : "🤖";

    const burbuja = document.createElement("div");

    burbuja.className = "burbuja";

    // textContent evita interpretar la respuesta como HTML.
    burbuja.textContent = texto;

    mensaje.append(avatar, burbuja);

    contenedor.appendChild(mensaje);

    contenedor.scrollTop = contenedor.scrollHeight;
}

function responderPregunta(pregunta) {
    const texto = pregunta.toLowerCase();

    if (
        texto.includes("hola") ||
        texto.includes("buenos días") ||
        texto.includes("buenas tardes")
    ) {
        return "¡Hola! 👋 Bienvenido a StudyAI. Estoy aquí para ayudarte a estudiar.";
    }

    if (
        texto.includes("html") ||
        texto.includes("página web")
    ) {
        return "HTML es el lenguaje que se utiliza para organizar el contenido de una página web. Por ejemplo, permite crear títulos, párrafos, botones, imágenes y formularios.";
    }

    if (texto.includes("css")) {
        return "CSS sirve para diseñar páginas web. Permite cambiar colores, tamaños, espacios, fondos, animaciones y adaptar la página a computadoras y celulares.";
    }

    if (
        texto.includes("javascript") ||
        texto.includes("programación")
    ) {
        return "JavaScript permite agregar interactividad a una página web. Con él puedes validar formularios, crear aplicaciones, manejar datos y comunicarte con servidores y servicios de IA.";
    }

    if (
        texto.includes("base de datos") ||
        texto.includes("sql")
    ) {
        return "Una base de datos almacena información de manera organizada. SQL permite consultar y modificar datos. Algunos sistemas conocidos son MySQL, PostgreSQL y MariaDB.";
    }

    if (
        texto.includes("inteligencia artificial") ||
        texto.includes(" ia ")
    ) {
        return "La inteligencia artificial permite crear sistemas capaces de realizar tareas como comprender preguntas, analizar información y generar texto. Una aplicación web puede utilizar una API para comunicarse con un modelo de IA.";
    }

    if (
        texto.includes("proyecto") ||
        texto.includes("idea")
    ) {
        return "Puedes desarrollar un administrador de tareas, una tienda virtual, un asistente educativo, un sistema de citas o una aplicación que controle dispositivos Arduino. Elige un problema real y crea una solución.";
    }

    if (
        texto.includes("arduino") ||
        texto.includes("electrónica")
    ) {
        return "Arduino es una plataforma de electrónica programable. Puedes utilizar sensores, motores y luces LED para crear proyectos como puertas automáticas, sistemas de alarma y estaciones de medición.";
    }

    if (
        texto.includes("estudiar") ||
        texto.includes("examen")
    ) {
        return "Organiza tu estudio en sesiones de 25 minutos y descansa 5 minutos entre ellas. Divide los temas, resuelve ejercicios y repasa los errores antes del examen.";
    }

    if (
        texto.includes("ayuda") ||
        texto.includes("qué puedes hacer")
    ) {
        return "Puedo mostrarte explicaciones básicas sobre HTML, CSS, JavaScript, bases de datos y electrónica. También puedes utilizar el generador de ideas y el administrador de tareas.";
    }

    return "Gracias por tu pregunta. Esta versión es una demostración con respuestas programadas y todavía no puede responder cualquier consulta. Para obtener respuestas personalizadas y más completas, conecta el chat a una API de inteligencia artificial.";
}

function enviarPregunta(pregunta) {
    const texto = pregunta.trim();

    if (!texto) {
        return;
    }

    agregarMensaje(texto, "usuario");

    const respuesta = responderPregunta(texto);

    setTimeout(() => {
        agregarMensaje(respuesta, "asistente");
    }, 350);
}

$("#formChat").addEventListener("submit", evento => {
    evento.preventDefault();

    const entrada = $("#entradaChat");

    enviarPregunta(entrada.value);

    entrada.value = "";
    entrada.focus();
});

$$(".sugerencia").forEach(boton => {
    boton.addEventListener("click", () => {
        enviarPregunta(boton.dataset.pregunta);
    });
});


/* ==========================================
   GENERADOR DE IDEAS
========================================== */

const ideas = {

    web: [
        {
            icono: "🛒",
            titulo: "Tienda virtual inteligente",
            descripcion: "Crea una tienda que permita registrar productos, organizar categorías, gestionar pedidos y recomendar productos según las necesidades del cliente."
        },
        {
            icono: "📚",
            titulo: "Plataforma educativa",
            descripcion: "Desarrolla una web con materiales de estudio, cuestionarios, seguimiento de tareas y un asistente que ayude a resolver dudas."
        },
        {
            icono: "🏥",
            titulo: "Sistema de citas",
            descripcion: "Construye una plataforma para registrar pacientes, programar citas y consultar horarios disponibles."
        }
    ],

    android: [
        {
            icono: "📱",
            titulo: "Organizador universitario",
            descripcion: "Crea una aplicación para registrar cursos, horarios, evaluaciones y fechas de entrega de tareas."
        },
        {
            icono: "💊",
            titulo: "Recordatorio de medicamentos",
            descripcion: "Desarrolla una aplicación para registrar horarios y mostrar recordatorios de medicamentos indicados por un profesional."
        },
        {
            icono: "💰",
            titulo: "Control de gastos",
            descripcion: "Programa una aplicación que registre ingresos, gastos y presupuestos mensuales."
        }
    ],

    ia: [
        {
            icono: "🤖",
            titulo: "Tutor académico",
            descripcion: "Conecta una página web a un modelo de IA para explicar conceptos, proponer ejercicios y ayudar a organizar el estudio."
        },
        {
            icono: "📝",
            titulo: "Resumidor de textos",
            descripcion: "Crea una aplicación que envíe documentos o textos a una API de IA para generar resúmenes y extraer ideas principales."
        },
        {
            icono: "💡",
            titulo: "Generador de proyectos",
            descripcion: "Desarrolla una herramienta que proponga proyectos según el área, los recursos disponibles y el nivel del estudiante."
        }
    ],

    electronica: [
        {
            icono: "🚪",
            titulo: "Puerta automática",
            descripcion: "Utiliza Arduino, un sensor ultrasónico y un servomotor para abrir una puerta cuando detecte un objeto."
        },
        {
            icono: "🌱",
            titulo: "Riego inteligente",
            descripcion: "Crea un sistema con sensores que detecte la humedad del suelo y active una bomba de agua cuando sea necesario."
        },
        {
            icono: "📡",
            titulo: "Monitor de sensores",
            descripcion: "Desarrolla una interfaz web que muestre las lecturas de sensores electrónicos enviadas por un dispositivo."
        }
    ],

    datos: [
        {
            icono: "📊",
            titulo: "Analizador de notas",
            descripcion: "Crea un sistema para registrar calificaciones, calcular promedios y mostrar gráficos del rendimiento académico."
        },
        {
            icono: "📦",
            titulo: "Control de inventario",
            descripcion: "Construye un sistema que registre productos, existencias, entradas, salidas y alertas de inventario bajo."
        },
        {
            icono: "👥",
            titulo: "Registro de estudiantes",
            descripcion: "Desarrolla una aplicación conectada a una base de datos para administrar estudiantes, cursos y calificaciones."
        }
    ],

    educacion: [
        {
            icono: "🧮",
            titulo: "Tutor de matemáticas",
            descripcion: "Crea una herramienta educativa con ejercicios, pistas y explicaciones paso a paso."
        },
        {
            icono: "🔬",
            titulo: "Laboratorio virtual",
            descripcion: "Desarrolla simulaciones interactivas de fenómenos científicos para ayudar a comprender conceptos."
        },
        {
            icono: "🎯",
            titulo: "Cuestionarios educativos",
            descripcion: "Programa cuestionarios con preguntas, puntuaciones, retroalimentación y seguimiento de resultados."
        }
    ]

};

$("#formIdeas").addEventListener("submit", evento => {
    evento.preventDefault();

    const categoria = $("#categoriaIdea").value;
    const nivel = $("#nivelIdea").value;

    const nivelTexto = {
        facil: "Fácil",
        medio: "Intermedio",
        avanzado: "Avanzado"
    };

    const todasLasIdeas = ideas[categoria];

    const contenedor = $("#resultadoIdeas");

    contenedor.replaceChildren();

    // Selecciona tres propuestas distintas para la categoría.
    const propuestas = [...todasLasIdeas]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    propuestas.forEach(idea => {
        const tarjeta = document.createElement("article");

        tarjeta.className = "idea-card";

        const icono = document.createElement("div");
        icono.className = "idea-icono";
        icono.textContent = idea.icono;

        const titulo = document.createElement("h3");
        titulo.textContent = idea.titulo;

        const descripcion = document.createElement("p");
        descripcion.textContent = idea.descripcion;

        const nivelElemento = document.createElement("span");
        nivelElemento.className = "idea-nivel";
        nivelElemento.textContent =
            `Dificultad seleccionada: ${nivelTexto[nivel]}`;

        tarjeta.append(
            icono,
            titulo,
            descripcion,
            nivelElemento
        );

        contenedor.appendChild(tarjeta);
    });

    mostrarNotificacion("¡Se generaron tres ideas de proyectos!");
});


/* ==========================================
   INICIALIZACIÓN
========================================== */

renderizarTareas();
actualizarEstadisticas();
mostrarTareasRecientes();
actualizarBotonesFiltro();

$("#fechaTarea").min = fechaLocalActual();

console.log("StudyAI se ha iniciado correctamente.");

