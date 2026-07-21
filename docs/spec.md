# AutoAssist Mini

## 1. Objetivo del proyecto

AutoAssist Mini es una aplicación web pequeña para practicar, en un único flujo funcional, varias tecnologías y conceptos que se utilizarán en el proyecto de FullGarantía.

La aplicación permite que:

1. Un propietario inicie sesión con Google.
2. Cree una solicitud de servicio para su vehículo.
3. Un operador autenticado vea las solicitudes creadas.
4. El operador asigne manualmente un taller.
5. El backend guarde el cambio en PostgreSQL.
6. El backend publique un evento en Google Cloud Pub/Sub.
7. Un worker consuma el evento y simule una notificación.
8. El propietario vea el taller asignado en su solicitud.

El objetivo principal no es construir un producto comercial completo, sino recorrer de punta a punta el siguiente flujo técnico:

```text
React
→ Firebase Auth
→ ID token
→ FastAPI
→ autorización por rol
→ SQLAlchemy
→ PostgreSQL
→ Pub/Sub
→ worker
```

---

## 2. Actores

La aplicación tiene dos tipos de usuario.

### 2.1 Propietario

Es la persona que tiene un vehículo y necesita solicitar asistencia.

Puede:

- Iniciar sesión con Google.
- Ver sus propias solicitudes.
- Crear una solicitud nueva.
- Consultar el estado de cada solicitud.
- Ver el taller asignado cuando la solicitud haya sido atendida por un operador.

### 2.2 Operador

Es un usuario interno de AutoAssist.

Puede:

- Iniciar sesión con Google.
- Ver todas las solicitudes.
- Consultar el detalle de una solicitud.
- Ver el listado de talleres disponibles.
- Asignar manualmente un taller a una solicitud pendiente.

---

## 3. Flujo funcional principal

### Paso 1: login del propietario

El propietario entra a la aplicación y selecciona:

```text
Continuar con Google
```

Firebase Auth autentica al usuario y React obtiene un ID token.

### Paso 2: creación de una solicitud

El propietario completa un formulario con:

- Vehículo.
- Tipo de problema.
- Descripción.

Ejemplo:

```text
Vehículo: Honda Civic 2013
Tipo de problema: Batería
Descripción: El auto no arranca
```

React envía la información a FastAPI junto con el token de Firebase.

FastAPI:

1. Verifica el token.
2. Identifica al usuario.
3. Comprueba que tenga rol `OWNER`.
4. Crea la solicitud.
5. Guarda la solicitud en PostgreSQL con estado `PENDING`.

### Paso 3: visualización por parte del operador

El operador inicia sesión.

React consulta el backend y muestra todas las solicitudes.

Ejemplo:

```text
Solicitud #15
Vehículo: Honda Civic 2013
Problema: Batería
Estado: Pendiente
```

### Paso 4: asignación de un taller

El operador abre una solicitud, selecciona un taller y confirma la asignación.

Ejemplo:

```text
Taller seleccionado: Baterías Palermo
```

FastAPI:

1. Verifica el token.
2. Comprueba que el usuario tenga rol `OPERATOR`.
3. Verifica que existan la solicitud y el taller.
4. Asigna el taller.
5. Cambia el estado a `ASSIGNED`.
6. Guarda la fecha de asignación.
7. Publica un evento en Pub/Sub.
8. Devuelve la solicitud actualizada.

### Paso 5: consumo del evento

Un worker separado escucha una suscripción de Pub/Sub.

Cuando recibe el evento, imprime una notificación simulada:

```text
[Notification Worker]
La solicitud #15 fue asignada a Baterías Palermo.
```

Luego confirma el procesamiento del mensaje con `ack`.

### Paso 6: consulta del propietario

El propietario vuelve a su listado de solicitudes y ve:

```text
Solicitud #15
Estado: Asignada
Taller: Baterías Palermo
```

---

## 4. Pantallas del frontend

El frontend debe ser simple y funcional.

### 4.1 Login

Ruta sugerida:

```text
/login
```

Contenido:

- Nombre de la aplicación.
- Texto introductorio breve.
- Botón `Continuar con Google`.
- Estado de carga durante el login.
- Mensaje visible si ocurre un error.

### 4.2 Mis solicitudes

Ruta sugerida:

```text
/requests
```

Contenido:

- Nombre del usuario autenticado.
- Botón para cerrar sesión.
- Botón `Nueva solicitud`.
- Listado de solicitudes propias.
- Estado de cada solicitud.
- Taller asignado cuando corresponda.
- Estado de carga.
- Estado vacío.
- Mensaje de error.

Ejemplo:

```text
Mis solicitudes

Honda Civic 2013
Tipo: Batería
Estado: Asignada
Taller: Baterías Palermo
```

### 4.3 Nueva solicitud

Ruta sugerida:

```text
/requests/new
```

Campos:

- Vehículo.
- Tipo de problema.
- Descripción.

Tipos de problema iniciales:

```text
BATTERY
TIRE
MECHANICAL
TOWING
OTHER
```

El formulario debe:

- Validar campos obligatorios.
- Deshabilitar el botón durante el envío.
- Mostrar errores del backend.
- Redirigir al listado después de crear correctamente la solicitud.

### 4.4 Panel del operador

Ruta sugerida:

```text
/operator
```

Contenido:

- Listado de solicitudes.
- Datos principales de cada solicitud.
- Estado.
- Propietario.
- Selector de taller.
- Botón `Asignar`.
- Estado de carga por operación.
- Mensajes de error.
- Actualización visual después de asignar.

---

## 5. Navegación según rol

Después del login, React debe consultar:

```http
GET /me
```

Según la respuesta:

```text
OWNER → /requests
OPERATOR → /operator
```

Las rutas deben estar protegidas.

Una persona sin sesión debe ser redirigida a:

```text
/login
```

Una persona con rol `OWNER` no debe poder acceder al panel del operador.

Una persona con rol `OPERATOR` no debe poder ejecutar acciones reservadas al propietario.

La autorización real debe estar implementada en FastAPI. El frontend solo adapta la interfaz.

---

## 6. Firebase Auth

### 6.1 Responsabilidad

Firebase Auth se utiliza para:

- Login con Google.
- Mantener la sesión.
- Obtener el ID token.
- Cerrar sesión.
- Detectar cambios de autenticación.

### 6.2 Flujo del token

```text
Usuario
→ Google Sign-In
→ Firebase Auth
→ ID token
→ React
→ Authorization header
→ FastAPI
```

React debe enviar el token en cada request autenticado:

```http
Authorization: Bearer <firebase-id-token>
```

### 6.3 Validación en FastAPI

FastAPI debe usar Firebase Admin SDK para:

- Verificar la firma.
- Verificar la expiración.
- Obtener el `uid`.
- Obtener el email.
- Obtener el nombre cuando esté disponible.

El token no debe ser confiado sin validación.

### 6.4 Usuario de aplicación

Firebase determina la identidad.

PostgreSQL determina el rol dentro de AutoAssist.

El backend debe buscar el `firebase_uid` en la tabla `users`.

Ejemplo:

```text
Firebase uid: abc123
Rol en PostgreSQL: OWNER
```

---

## 7. Roles y autorización

Roles:

```text
OWNER
OPERATOR
```

Reglas:

| Acción | OWNER | OPERATOR |
|---|---:|---:|
| Consultar `/me` | Sí | Sí |
| Crear solicitud | Sí | No |
| Ver solicitudes propias | Sí | No |
| Ver todas las solicitudes | No | Sí |
| Ver talleres | No | Sí |
| Asignar taller | No | Sí |

FastAPI debe responder `401 Unauthorized` cuando no haya un token válido.

FastAPI debe responder `403 Forbidden` cuando el usuario esté autenticado pero no tenga el rol requerido.

---

## 8. API FastAPI

Prefijo sugerido:

```text
/api
```

### 8.1 Health check

```http
GET /api/health
```

Respuesta:

```json
{
  "status": "ok"
}
```

### 8.2 Usuario actual

```http
GET /api/me
```

Respuesta:

```json
{
  "id": 1,
  "firebase_uid": "abc123",
  "email": "felipe@example.com",
  "name": "Felipe",
  "role": "OWNER"
}
```

### 8.3 Crear solicitud

```http
POST /api/service-requests
```

Rol requerido:

```text
OWNER
```

Body:

```json
{
  "vehicle": "Honda Civic 2013",
  "problem_type": "BATTERY",
  "description": "El auto no arranca"
}
```

Respuesta esperada:

```json
{
  "id": 15,
  "vehicle": "Honda Civic 2013",
  "problem_type": "BATTERY",
  "description": "El auto no arranca",
  "status": "PENDING",
  "assigned_workshop": null,
  "created_at": "2026-07-21T14:00:00Z",
  "assigned_at": null
}
```

El `owner_id` debe obtenerse del usuario autenticado.

### 8.4 Ver solicitudes propias

```http
GET /api/service-requests/me
```

Rol requerido:

```text
OWNER
```

Debe devolver solamente solicitudes cuyo `owner_id` coincida con el usuario autenticado.

### 8.5 Ver todas las solicitudes

```http
GET /api/operator/service-requests
```

Rol requerido:

```text
OPERATOR
```

Debe incluir:

- Datos de la solicitud.
- Información básica del propietario.
- Taller asignado.
- Fecha de creación.
- Fecha de asignación.

### 8.6 Ver talleres

```http
GET /api/workshops
```

Rol requerido:

```text
OPERATOR
```

Debe devolver talleres activos.

Respuesta:

```json
[
  {
    "id": 1,
    "name": "Baterías Palermo",
    "specialty": "BATTERY",
    "active": true
  }
]
```

### 8.7 Asignar taller

```http
POST /api/operator/service-requests/{request_id}/assign
```

Rol requerido:

```text
OPERATOR
```

Body:

```json
{
  "workshop_id": 1
}
```

Comportamiento:

1. Buscar la solicitud.
2. Buscar el taller.
3. Validar que el taller esté activo.
4. Actualizar `assigned_workshop_id`.
5. Actualizar `status` a `ASSIGNED`.
6. Guardar `assigned_at`.
7. Confirmar la transacción.
8. Publicar el evento.
9. Devolver la solicitud actualizada.

---

## 9. Modelo de datos

### 9.1 Tabla `users`

Campos:

```text
id
firebase_uid
email
name
role
created_at
```

Restricciones:

- `id`: primary key.
- `firebase_uid`: único y obligatorio.
- `email`: obligatorio.
- `role`: enum `OWNER | OPERATOR`.

### 9.2 Tabla `workshops`

Campos:

```text
id
name
specialty
active
created_at
```

Restricciones:

- `id`: primary key.
- `name`: obligatorio.
- `specialty`: obligatorio.
- `active`: boolean, por defecto `true`.

### 9.3 Tabla `service_requests`

Campos:

```text
id
owner_id
vehicle
problem_type
description
status
assigned_workshop_id
created_at
assigned_at
```

Relaciones:

```text
owner_id → users.id
assigned_workshop_id → workshops.id
```

Enums:

```text
ProblemType:
BATTERY
TIRE
MECHANICAL
TOWING
OTHER
```

```text
ServiceRequestStatus:
PENDING
ASSIGNED
```

Reglas:

- Una solicitud nueva comienza en `PENDING`.
- `assigned_workshop_id` comienza en `null`.
- `assigned_at` comienza en `null`.
- Después de asignar:
  - `status = ASSIGNED`
  - `assigned_workshop_id` contiene el taller.
  - `assigned_at` contiene la fecha de asignación.

---

## 10. SQLAlchemy y Alembic

### SQLAlchemy

Debe utilizarse para:

- Definir modelos.
- Crear sesiones.
- Ejecutar consultas.
- Gestionar relaciones.
- Confirmar o revertir transacciones.

### Alembic

Debe utilizarse para:

- Crear las tablas iniciales.
- Versionar el esquema.
- Ejecutar migraciones de forma reproducible.

La primera migración debe crear:

```text
users
workshops
service_requests
```

También debe existir un script de seed para cargar:

- Un usuario propietario.
- Un usuario operador.
- Tres talleres.

Ejemplo:

```text
Baterías Palermo
Taller Norte
Grúas Express
```

Los usuarios deben asociarse a `firebase_uid` reales utilizados durante las pruebas.

---

## 11. Google Cloud Pub/Sub

### 11.1 Evento

Se debe publicar un único tipo de evento:

```text
service_request.assigned
```

Payload sugerido:

```json
{
  "event_type": "service_request.assigned",
  "request_id": 15,
  "owner_id": 1,
  "workshop_id": 1,
  "workshop_name": "Baterías Palermo",
  "occurred_at": "2026-07-21T14:30:00Z"
}
```

### 11.2 Topic

Nombre sugerido:

```text
service-request-events
```

### 11.3 Subscription

Nombre sugerido:

```text
notification-worker-subscription
```

### 11.4 Publisher

El publisher vive en el backend FastAPI.

Debe:

1. Serializar el evento como JSON.
2. Publicarlo en el topic configurado.
3. Registrar en logs el ID del mensaje.
4. Manejar errores de publicación de forma explícita.

### 11.5 Worker

El worker es un proceso Python independiente.

Debe:

1. Conectarse a la subscription.
2. Recibir mensajes.
3. Decodificar JSON.
4. Verificar `event_type`.
5. Imprimir una notificación simulada.
6. Ejecutar `ack` al terminar correctamente.
7. Registrar errores si el mensaje no puede procesarse.

Ejemplo de salida:

```text
[Notification Worker]
event_type=service_request.assigned
request_id=15
message="La solicitud #15 fue asignada a Baterías Palermo."
```

---

## 12. Arquitectura

```text
┌─────────────────────┐
│ React               │
│                     │
│ Login               │
│ Owner pages         │
│ Operator page       │
└──────────┬──────────┘
           │ HTTP + Bearer token
           ▼
┌─────────────────────┐
│ FastAPI             │
│                     │
│ Firebase validation │
│ Role authorization  │
│ Business logic      │
│ OpenAPI             │
└───────┬─────────────┘
        │
        ├──────────────► PostgreSQL
        │                Users
        │                Workshops
        │                Requests
        │
        └──────────────► Pub/Sub topic
                           │
                           ▼
                  Notification worker
```

---

## 13. Estructura sugerida del repositorio

```text
autoassist-mini/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OwnerRequestsPage.tsx
│   │   │   ├── NewRequestPage.tsx
│   │   │   └── OperatorPage.tsx
│   │   ├── App.tsx
│   │   ├── firebase.ts
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── firebase.py
│   │   │   └── dependencies.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   │   ├── me.py
│   │   │   ├── service_requests.py
│   │   │   ├── operator.py
│   │   │   └── workshops.py
│   │   ├── services/
│   │   │   └── pubsub.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── main.py
│   ├── migrations/
│   ├── scripts/
│   │   └── seed.py
│   ├── tests/
│   └── pyproject.toml
│
├── worker/
│   ├── app/
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
│
├── docker-compose.yml
├── .env.example
├── README.md
└── docs/
    └── implementation.md
```

---

## 14. Configuración

### Frontend

```text
VITE_API_BASE_URL
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

### Backend

```text
DATABASE_URL
FIREBASE_PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS
GCP_PROJECT_ID
PUBSUB_TOPIC_ID
CORS_ORIGINS
```

### Worker

```text
GOOGLE_APPLICATION_CREDENTIALS
GCP_PROJECT_ID
PUBSUB_SUBSCRIPTION_ID
```

Debe existir `.env.example` con nombres de variables y valores de ejemplo no sensibles.

---

## 15. Manejo de errores

La API debe devolver errores consistentes.

Ejemplo:

```json
{
  "detail": "Workshop not found"
}
```

Casos mínimos:

- Token ausente.
- Token inválido.
- Usuario no registrado en PostgreSQL.
- Rol incorrecto.
- Solicitud inexistente.
- Taller inexistente.
- Taller inactivo.
- Body inválido.
- Error de base de datos.
- Error al publicar el evento.

React debe mostrar mensajes legibles para el usuario y no únicamente errores en consola.

---

## 16. OpenAPI

FastAPI debe exponer documentación automática en:

```text
/docs
```

Los endpoints deben incluir:

- Tipos de request.
- Tipos de response.
- Status codes.
- Descripciones breves.
- Modelos Pydantic.

La API debe poder probarse desde Swagger UI.

---

## 17. Tests mínimos

### Backend

Probar:

- Health check.
- Acceso sin token.
- Acceso con rol incorrecto.
- Creación de solicitud por un propietario.
- Un propietario solo ve sus solicitudes.
- Un operador ve todas las solicitudes.
- Asignación correcta.
- Solicitud inexistente.
- Taller inexistente.
- Cambio de estado a `ASSIGNED`.
- Publicación del evento después de asignar.

Las dependencias de Firebase y Pub/Sub deben poder reemplazarse por mocks en tests.

### Frontend

Probar al menos:

- Render del login.
- Redirección según rol.
- Envío del formulario.
- Visualización del listado.
- Asignación desde el panel del operador.
- Estados de loading y error.

### Worker

Probar:

- Decodificación del mensaje.
- Manejo de `service_request.assigned`.
- Registro de payload inválido.
- `ack` después de procesar correctamente.

---

## 18. Orden de implementación

El orden de las fases, su estado y sus puertas de salida se mantienen en
[`docs/implementation.md`](docs/implementation.md).

---

## 19. Criterios de aceptación

El proyecto está terminado cuando se puede demostrar lo siguiente:

- **AC-01:** Un propietario inicia sesión con Google.
- **AC-02:** El backend valida su token.
- **AC-03:** El propietario crea una solicitud.
- **AC-04:** La solicitud se guarda en PostgreSQL.
- **AC-05:** El propietario ve su solicitud como `PENDING`.
- **AC-06:** Un operador inicia sesión con Google.
- **AC-07:** El backend reconoce el rol `OPERATOR`.
- **AC-08:** El operador ve todas las solicitudes.
- **AC-09:** El operador obtiene el listado de talleres.
- **AC-10:** El operador asigna un taller.
- **AC-11:** La solicitud cambia a `ASSIGNED`.
- **AC-12:** PostgreSQL guarda el taller y la fecha.
- **AC-13:** FastAPI publica `service_request.assigned`.
- **AC-14:** El worker recibe el mensaje.
- **AC-15:** El worker imprime la notificación simulada.
- **AC-16:** El worker confirma el mensaje con `ack`.
- **AC-17:** El propietario vuelve a consultar sus solicitudes.
- **AC-18:** El propietario ve el taller asignado.
- **AC-19:** Un `OWNER` no puede utilizar endpoints de operador.
- **AC-20:** Un request sin token válido recibe `401`.

---

## 20. Objetivos técnicos obligatorios

### React

- Componentes.
- Estado.
- Formularios.
- Routing.
- Rutas protegidas.
- Requests HTTP.
- Manejo de loading, error y éxito.
- Integración con Firebase.

### Firebase Auth

- Login con Google.
- Sesión.
- ID tokens.
- Firebase Admin SDK.
- Validación backend.
- Diferencia entre identidad y rol de aplicación.

### FastAPI

- Routers.
- Dependencias.
- Pydantic.
- OpenAPI.
- Autenticación.
- Autorización.
- Errores HTTP.
- Servicios.
- Tests.

### PostgreSQL

- Modelado relacional.
- Foreign keys.
- Enums.
- Consultas.
- Transacciones.
- Persistencia.

### SQLAlchemy

- Modelos.
- Sesiones.
- Relaciones.
- Queries.
- Commit y rollback.

### Alembic

- Migración inicial.
- Versionado del esquema.
- Upgrade de base de datos.

### Pub/Sub

- Topic.
- Subscription.
- Publisher.
- Subscriber.
- Mensajes JSON.
- Procesamiento asíncrono.
- `ack`.
- Manejo de errores.

