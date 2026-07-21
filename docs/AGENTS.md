# AutoAssist Mini — instrucciones para agentes

## Documentos y alcance

- `docs/spec.md` es la fuente de verdad funcional y técnica.
- `docs/implementation.md` define el orden, estado y puertas de salida de las fases.
- Consultar solo las secciones relevantes de la especificación antes de implementar.
- Mantener el alcance Mini y la separación `frontend/`, `backend/` y `worker/`.

## Forma de trabajo

- Trabajar una fase por vez; proponer su plan y esperar aprobación antes de cambios grandes.
- No avanzar a Firebase hasta estabilizar API/Swagger, ni a Pub/Sub hasta completar HTTP/PostgreSQL.
- Agregar tests con cada funcionalidad y ejecutar las verificaciones pertinentes.
- Al cerrar una fase, actualizar `README.md` y `docs/implementation.md`; resumir archivos, decisiones, tests y comandos.
- Usar tipado explícito en TypeScript y Python, soluciones simples y dependencias mínimas.
- Mantener Swagger/OpenAPI y `.env.example` actualizados.

## Seguridad y datos

- No versionar secretos, credenciales, tokens ni archivos `.env`.
- Firebase establece identidad; PostgreSQL establece el rol.
- Validar ID tokens con Firebase Admin SDK y autorizar realmente en FastAPI.
- Obtener el propietario desde el usuario autenticado, nunca desde un ID enviado por el frontend.
- Usar Alembic para todo cambio de esquema.
- Mantener el worker independiente y hacer `ack` solo tras procesamiento correcto.
