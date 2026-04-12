# Sistema de Generación Automática de Equipos Deportivos para Sublimación

**Documento de Requerimientos — v1.2 (FINAL)**
**Sublimania**

> Versión consolidada con hallazgos reales de la plantilla `.ai` y el archivo `EQUIPO.xlsx`.

---

## Historial de versiones

| Versión | Cambios |
|---|---|
| v1.0 | Versión inicial |
| v1.1 | Agrega restricción del plóter (130 cm) |
| v1.2 | Fuente de datos cambia de `.csv` a `.xlsx`. Confirma nombres reales de grupos en `.ai`. Mangas y frente con `DINAMICO` opcional. `MANGA_IZQ` confirmado (singular). |

---

## 1. Resumen del sistema

El script `GENERAR_EQUIPO.jsx` automatiza la creación de diseños de equipos deportivos en Adobe Illustrator. A partir de un archivo `.xlsx` con los datos del equipo y una plantilla `.ai` correctamente estructurada, el script genera las cuatro piezas de cada jugador (frente, espalda, manga izquierda y manga derecha), escaladas a la talla correspondiente, con nombre, número y logo aplicados según las reglas del pedido.

El sistema está diseñado para tolerar fallos: si un jugador tiene datos incorrectos, el script lo registra en el log y continúa con el siguiente sin detener el proceso completo.

---

## 2. Restricciones del plóter y documento de salida

| Parámetro | Valor |
|---|---|
| Ancho máximo del plóter | **130 cm** |
| Equivalencia en puntos | **3685 pt** (130 × 28.3464567) |
| Alto del documento | Crece dinámicamente hacia abajo |

**Reglas que aplica el script:**

- El ancho del artboard se fija en **3685 pt (130 cm)** al iniciar en documento nuevo.
- Las piezas se distribuyen en filas que no superan ese ancho. Cuando una pieza no cabe en la fila actual, el script salta a la siguiente fila automáticamente.
- El alto crece sin límite hacia abajo según la cantidad de jugadores y piezas.
- Si una pieza individual supera los 130 cm (caso extremo), el script registra `[ADVERTENCIA]` en el log pero la genera igual.

> **Nota Fase 2 — Nesting:** El nesting tomará 130 cm como ancho fijo de página para minimizar el desperdicio de rollo.

---

## 3. Fuente de datos — archivo `.xlsx`

### 3.1 Archivo de entrada

- **Formato:** Microsoft Excel `.xlsx`
- **Nombre recomendado:** `EQUIPO_NombreEquipo.xlsx`
- El script muestra un diálogo para seleccionarlo al ejecutarse.

### 3.2 Hojas del archivo

| Hoja | Uso | Quién la llena |
|---|---|---|
| `DATOS_CSV` | **Fuente principal.** El script lee los jugadores desde aquí. | Operador por pedido |
| `TALLAS` | Referencia de dimensiones por talla. **El script NO la lee.** | Definida una vez, no cambia |
| `EQUIPO` | Hoja auxiliar de trabajo. **El script NO la lee.** | Uso libre del operador |

> El script lee **únicamente la hoja `DATOS_CSV`**. Las otras hojas son de referencia para el operador.

### 3.3 Campos de la hoja `DATOS_CSV`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `NOMBRE` | Texto | ✅ | Nombre real del jugador (para log y carpetas) |
| `NOMBRE_CAMISETA` | Texto | — | Texto exacto a imprimir. Si vacío → usa `NOMBRE` en MAYÚSCULAS automáticamente |
| `NUMERO` | Número | — | Número en la camiseta. Vacío = sin número |
| `TIENE_NUMERO` | SI/NO | ✅ | Declara si lleva número. `NO` = docentes, cuerpo técnico, etc. |
| `TALLA` | Código | ✅ | Número + género. Ejemplos: `38H`, `32M`, `24H` |
| `ALTO` | Decimal | ✅ | Alto del cuerpo de la camiseta en cm |
| `ANCHO` | Decimal | ✅ | Ancho del cuerpo de la camiseta en cm |
| `MANGA_ALTO` | Decimal | ✅ | Alto de la manga en cm |
| `MANGA_ANCHO` | Decimal | ✅ | Ancho de la manga en cm |
| `LOGO_ANCHO` | Decimal | ✅ | Ancho del logo en cm (regla independiente — ver sección 3.5) |
| `EQUIPO` | Texto | ✅ | Nombre del equipo (para carpetas y log) |
| `LLEVA_NOMBRE_F` | SI/NO | ✅ | El `FRENTE` lleva nombre impreso |
| `LLEVA_NOMBRE_E` | SI/NO | ✅ | La `ESPALDA` lleva nombre impreso |
| `LLEVA_NUMERO_F` | SI/NO | ✅ | El `FRENTE` lleva número impreso |
| `LLEVA_NUMERO_E` | SI/NO | ✅ | La `ESPALDA` lleva número impreso |
| `LLEVA_NUMERO_M` | SI/NO | ✅ | Las `MANGAS` llevan número impreso |
| `NOTAS` | Texto | — | Observaciones libres que van al log |

### 3.4 Ejemplo de filas reales

**Jugador regular:**
```
Juan Perez | JUAN | 10 | SI | 24H | 47 | 34.5 | 16.5 | 28.5 | 7 | Atlas FC | NO | SI | NO | SI | NO |
```

**Docente sin número:**
```
Maria Lopez | PROFE MARIA | | NO | 24M | 45 | 34.5 | 15 | 26 | 7 | Atlas FC | NO | SI | NO | NO | NO | docente
```

**Jugador con `NOMBRE_CAMISETA` vacío** → el script imprime `LUIS MENDOZA`:
```
Luis Mendoza | | 15 | SI | 32H | 64.5 | 44.5 | 22 | 37 | 7 | Atlas FC | NO | SI | NO | SI | NO |
```

### 3.5 Campo `LOGO_ANCHO` — regla independiente de escala

El logo **NO** escala automáticamente con la camiseta. Tiene su propio tamaño definido en el CSV por jugador/talla.

**Regla de escala del logo (Interpretación C):**

1. El script lee `LOGO_ANCHO` en cm desde `DATOS_CSV`.
2. Calcula el factor de escala para que el grupo `LOGO` alcance ese ancho exacto.
3. Aplica la escala **desde el centro del grupo** (punto de anclaje fijo).
4. La posición del logo en el diseño se respeta. Solo cambia su tamaño.

> `LOGO_ANCHO` está actualmente en `7.0` para todas las tallas. Queda **pendiente** diferenciar por talla cuando se defina la tabla definitiva.

### 3.6 Lógica de campos condicionales

| Condición en `DATOS_CSV` | Comportamiento del script |
|---|---|
| `TIENE_NUMERO=SI` y `NUMERO` tiene valor | Reemplaza texto del item `NUMERO` |
| `TIENE_NUMERO=NO` | Oculta item `NUMERO` (`hidden=true`). Diseño no se deforma |
| `TIENE_NUMERO=SI` pero `NUMERO` vacío | `[ERROR]` en log. Jugador omitido |
| `LLEVA_NOMBRE_F=NO` | Oculta `NOMBRE` en `FRENTE` |
| `LLEVA_NOMBRE_E=NO` | Oculta `NOMBRE` en `ESPALDA` |
| `LLEVA_NUMERO_F=NO` | Oculta `NUMERO` en `FRENTE` |
| `LLEVA_NUMERO_E=NO` | Oculta `NUMERO` en `ESPALDA` |
| `LLEVA_NUMERO_M=NO` | Oculta `NUMERO` en `MANGA_IZQ` y `MANGA_DER` |
| `LOGO_ANCHO` tiene valor | Reescala grupo `LOGO` desde su centro |
| `NOMBRE_CAMISETA` vacío | Usa `NOMBRE` convertido a MAYÚSCULAS |

---

## 4. Estructura de la plantilla de Illustrator (.ai)

### 4.1 Principio fundamental: zona estática vs zona dinámica

El script **solo modifica** elementos dentro del grupo `DINAMICO`. Todo lo que esté en `ESTATICO` es **invisible para el script** y jamás será tocado.

Esta separación garantiza que formas, efectos, degradados, patrones y costuras **nunca se deforman** sin importar la talla.

### 4.2 Jerarquía completa

```
Archivo .ai
└── Capa: TEMPLATE
      │
      ├── Grupo: FRENTE
      │     ├── Grupo: ESTATICO     ← diseño base, el script NUNCA toca esto
      │     └── Grupo: DINAMICO     ← el script busca aquí (opcional si no hay elementos dinámicos)
      │           ├── Grupo:    LOGO      — presente si el diseño lleva logo
      │           ├── TextItem: NOMBRE   — presente si el diseño lleva nombre
      │           └── TextItem: NUMERO   — presente si el diseño lleva número
      │
      ├── Grupo: ESPALDA
      │     ├── Grupo: ESTATICO
      │     └── Grupo: DINAMICO
      │           ├── Grupo:    LOGO
      │           ├── TextItem: NOMBRE
      │           └── TextItem: NUMERO
      │
      ├── Grupo: MANGA_IZQ                          ← singular, sin S
      │     ├── Grupo: ESTATICO
      │     └── Grupo: DINAMICO                     ← solo si el diseño lleva nombre/número
      │           ├── TextItem: NOMBRE   — opcional
      │           └── TextItem: NUMERO   — opcional
      │
      └── Grupo: MANGA_DER
            ├── Grupo: ESTATICO
            └── Grupo: DINAMICO                     ← solo si el diseño lleva nombre/número
                  ├── TextItem: NOMBRE   — opcional
                  └── TextItem: NUMERO   — opcional
```

### 4.3 Tabla de elementos

| Nombre exacto | Tipo | Descripción | Presencia |
|---|---|---|---|
| `TEMPLATE` | Capa | Capa raíz. Nunca mover ni eliminar. | Obligatoria |
| `FRENTE` | Grupo | Elementos del frente de la camiseta. | Obligatorio |
| `ESPALDA` | Grupo | Elementos de la espalda. | Obligatorio |
| `MANGA_IZQ` | Grupo | Manga izquierda. **Singular, sin S.** | Obligatorio |
| `MANGA_DER` | Grupo | Manga derecha. | Obligatorio |
| `ESTATICO` | Subgrupo | Dentro de cada pieza. El script lo ignora completamente. | Obligatorio en cada pieza |
| `DINAMICO` | Subgrupo | Dentro de cada pieza. El script busca aquí. | Obligatorio si hay elementos dinámicos |
| `NOMBRE` | TextItem | Dentro de `DINAMICO`. Texto reemplazable. | Según diseño del equipo |
| `NUMERO` | TextItem | Dentro de `DINAMICO`. Se oculta si `TIENE_NUMERO=NO`. | Según diseño del equipo |
| `LOGO` | Grupo | Dentro de `DINAMICO`. Se reescala según `LOGO_ANCHO`. | Según diseño del equipo |

### 4.4 Comportamiento cuando `DINAMICO` no existe

Si una pieza no tiene grupo `DINAMICO` (por ejemplo, una manga puramente estática):

- El script **escala la pieza** correctamente según las dimensiones del CSV.
- Registra `[INFO]` en el log: `MANGA_IZQ sin DINAMICO — solo escalado`.
- **No es un error.** El proceso continúa normalmente.

### 4.5 Reglas de nomenclatura

- **MAYÚSCULAS** sin tildes ni caracteres especiales.
- **Sin espacios.** `MANGA_IZQ` ✅ — `Manga Izquierda` ❌
- **Sensible a mayúsculas.** `FRENTE` ✅ — `Frente` ❌
- **Sin duplicados** dentro del mismo grupo padre. Si el script detecta dos grupos con el mismo nombre dentro de la misma pieza, registra `[FATAL]` y detiene el proceso antes de modificar nada.
- `LOGO` puede estar **vacío** si el diseño no usa logo. El script lo omite sin error.
- `NOMBRE` y `NUMERO` deben tener **texto de relleno** en la plantilla. Ejemplo: `NOMBRE` y `00`.

### 4.6 Grupos anidados dentro de `ESTATICO` y `DINAMICO`

Dentro de `ESTATICO` y `DINAMICO` pueden existir **grupos anidados a cualquier profundidad**. El script usa búsqueda recursiva para encontrar `NOMBRE`, `NUMERO` y `LOGO` sin importar el nivel de anidación.

**Única restricción:** los nombres `NOMBRE`, `NUMERO` y `LOGO` deben ser **únicos dentro de su pieza**. No puede haber dos items llamados `NOMBRE` dentro del mismo `FRENTE`, por ejemplo.

### 4.7 Dimensiones base de la plantilla

| Pieza | Dimensión base actual |
|---|---|
| `FRENTE` / `ESPALDA` | **42 cm ancho × 59 cm alto** |
| `MANGA_IZQ` / `MANGA_DER` | Pendiente confirmar con el diseñador |

> ⚠️ Si cambias el tamaño de la plantilla base, debes actualizar `TEMPLATE_BASE` en el script. Es el **único valor hardcodeado** en el código.

### 4.8 Relación con el plóter (130 cm)

| Talla | Ancho cuerpo | Ancho manga | ¿Cabe en 130 cm? |
|---|---|---|:---:|
| 44H | 65.0 cm | 52.0 cm | ✅ |
| 44M | 62.0 cm | 48.5 cm | ✅ |

En la práctica, **dos piezas medianas caben en la misma fila** dentro de los 130 cm. El layout automático respeta este límite.

---

## 5. Lógica de procesamiento del script

### 5.1 Flujo general

1. Pregunta si generar en **documento nuevo** o en el activo.
2. Si documento nuevo: fija el artboard en **130 cm de ancho** (3685 pt).
3. Muestra diálogo para seleccionar el archivo **`.xlsx`**.
4. Lee la hoja **`DATOS_CSV`** del `.xlsx`. Filtra filas vacías y con `#N/A`.
5. Muestra diálogo para seleccionar la **carpeta del log**.
6. **Validación de plantilla:** verifica capa `TEMPLATE`, grupos de piezas y detecta duplicados. Si hay `[FATAL]` detiene aquí.
7. Para cada pieza disponible, procesa **todos los jugadores en lote**.
8. Por jugador: duplica grupo, escala, aplica nombre/número/logo según reglas del CSV.
9. Si `DINAMICO` no existe en una pieza → solo escala, registra `[INFO]`.
10. Posiciona piezas en filas respetando los **130 cm**.
11. Genera reporte `.txt` y muestra resumen en pantalla.

### 5.2 Validación de plantilla antes de procesar

El script valida la plantilla **antes de tocar cualquier cosa**:

| Validación | Resultado si falla |
|---|---|
| Existe capa `TEMPLATE` | `[FATAL]` — detiene el script |
| Existe al menos un grupo de pieza | `[FATAL]` — detiene el script |
| Nombres duplicados dentro de una pieza | `[FATAL]` — detiene el script |
| `DINAMICO` no existe en una pieza | `[INFO]` — continúa, solo escala |
| `LOGO` / `NOMBRE` / `NUMERO` no encontrado | `[INFO]` — continúa sin ese elemento |

### 5.3 Manejo de errores — diseño orientado a fallos

| Prefijo | Significado | Acción requerida |
|---|---|---|
| `[OK]` | Pieza generada correctamente | Ninguna |
| `[INFO]` | Omisión esperada: capa sin `DINAMICO`, campo opcional vacío, docente sin número | Ninguna |
| `[ERROR]` | Dato inválido. Jugador omitido del lote | Corregir CSV y reprocesar ese jugador |
| `[FATAL]` | Condición irrecuperable: no existe `TEMPLATE`, duplicados en plantilla, `.xlsx` no encontrado | Corregir antes de volver a ejecutar |

> Un `[ERROR]` en un jugador **no detiene el proceso**. El script continúa siempre.
> Un `[FATAL]` detiene el script **antes de modificar cualquier cosa** en el documento.

---

## 6. Archivo de log

- **Nombre:** `log_equipo_YYYYMMDD_HHMMSS.txt`
- **Ubicación:** carpeta seleccionada al inicio

| Sección | Contenido |
|---|---|
| Encabezado | Fecha, hora, archivo `.xlsx` usado, nombre del documento `.ai` |
| Cuerpo | Una línea por operación con prefijo `[OK]`, `[INFO]`, `[ERROR]` o `[FATAL]` |
| Resumen | Totales de cada categoría |
| Detalle | Lista completa de omisiones y errores al final |

---

## 7. Limitaciones de la versión 1.0

| Limitación | Detalle |
|---|---|
| Sin nesting | Layout en filas simples respetando 130 cm. Optimización de rollo es **Fase 2**. |
| Un equipo por `.xlsx` | No se soportan múltiples equipos en un mismo archivo. |
| Texto con estilos mixtos | Si `NOMBRE` tiene estilos distintos por carácter, el script reemplaza todo con el estilo del primer carácter. |
| Logo debe ser vector | `LOGO` debe contener vectores. PNG/JPG pueden perder calidad al reescalar. |
| Sin exportación a PDF | El script genera las piezas en Illustrator. Exportación manual o en Fase 2. |
| `LOGO_ANCHO` uniforme por ahora | Actualmente `7.0` para todas las tallas. Pendiente diferenciar por talla. |

---

## 8. Checklist antes de ejecutar el script

### En el archivo `.ai`

- [ ] La capa se llama exactamente `TEMPLATE`
- [ ] Los grupos de piezas se llaman `FRENTE`, `ESPALDA`, `MANGA_IZQ`, `MANGA_DER`
- [ ] Cada pieza tiene `ESTATICO` y `DINAMICO` (o solo `ESTATICO` si no tiene elementos dinámicos)
- [ ] Dentro de `DINAMICO`: `NOMBRE`, `NUMERO` y `LOGO` con esos nombres exactos
- [ ] `NOMBRE` tiene texto de relleno (ej: `NOMBRE`)
- [ ] `NUMERO` tiene texto de relleno (ej: `00`)
- [ ] No hay nombres duplicados dentro de la misma pieza
- [ ] `MANGA_IZQ` en singular (sin S)

### En el archivo `.xlsx`

- [ ] La hoja se llama exactamente `DATOS_CSV`
- [ ] La primera fila tiene las cabeceras en MAYÚSCULAS
- [ ] `TIENE_NUMERO` tiene valor `SI` o `NO` para cada jugador
- [ ] Los jugadores sin número tienen `TIENE_NUMERO=NO` y `NUMERO` vacío
- [ ] `ALTO`, `ANCHO`, `MANGA_ALTO`, `MANGA_ANCHO` tienen valores numéricos (no `#N/A`)
- [ ] `LOGO_ANCHO` tiene valor numérico para cada jugador

---

## 9. Glosario

| Término | Definición |
|---|---|
| **Plantilla (.ai)** | Archivo de Illustrator con los diseños base de la camiseta. |
| **Pieza** | Una de las cuatro partes: `FRENTE`, `ESPALDA`, `MANGA_IZQ`, `MANGA_DER`. |
| **Zona estática** | Grupo `ESTATICO`. Elementos que el script nunca toca. |
| **Zona dinámica** | Grupo `DINAMICO`. Elementos que el script modifica. |
| **Talla base** | Dimensiones del grupo en la plantilla (42×59 cm). Referencia para calcular escala. |
| **Factor de escala** | Porcentaje al que se redimensiona el grupo para llegar a las dimensiones del jugador. |
| **Nesting** | Proceso de organizar piezas en páginas para minimizar desperdicio de rollo. Fase 2. |
| **`LOGO_ANCHO`** | Ancho en cm al que debe quedar el logo. Se define en `DATOS_CSV` por jugador. |
| **Plóter** | Impresora de sublimación. Ancho máximo: **130 cm**. Define el ancho del artboard. |
| **Interpretación C** | El logo crece desde su centro con posición anclada. Solo cambia el tamaño. |
| **`DATOS_CSV`** | Hoja del `.xlsx` que el script lee. Contiene un jugador por fila. |
| **Búsqueda recursiva** | El script desciende por todos los niveles de grupos para encontrar items por nombre. |

---

*Próxima fase: Nesting automático (Fase 2)*
*Versión del documento: v1.2 — FINAL*
