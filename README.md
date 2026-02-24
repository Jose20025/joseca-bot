# Joseca Telegram Bot

Bot de Telegram desplegado en Cloudflare Workers con almacenamiento en D1 y respuestas de IA usando Groq.

[¡Habla con el bot!](https://t.me/jose20025_bot)

## Comandos disponibles

- `/start`: registra al usuario en D1 (si no existe) y envía mensaje de bienvenida.
- `/8ball <pregunta>`: responde como “bola 8 mágica” usando `llama-3.1-8b-instant` vía Groq.

## Stack

- Cloudflare Workers (`wrangler`)
- Cloudflare D1
- TypeScript
- `groq-sdk`
- Vitest

## Requisitos

- Node.js 20+
- pnpm
- Cuenta/configuración de Cloudflare
- Bot token de Telegram
- API key de Groq

## Instalación

```bash
pnpm install
```

## Configuración de variables

Este proyecto usa los bindings/variables:

- `DB` (D1 binding, configurado en `wrangler.jsonc`)
- `TELEGRAM_BOT_TOKEN`
- `GROQ_API_KEY`

Para desarrollo local, puedes usar `.dev.vars`:

```env
TELEGRAM_BOT_TOKEN=tu_token
GROQ_API_KEY=tu_api_key
```

Para producción, configura secretos con Wrangler:

```bash
pnpm wrangler secret put TELEGRAM_BOT_TOKEN
pnpm wrangler secret put GROQ_API_KEY
```

## Base de datos (D1)

El bot espera una tabla `users` con las columnas:

- `id`
- `first_name`
- `username`
- `created_at`

SQL sugerido:

```sql
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	first_name TEXT,
	username TEXT,
	created_at TEXT
);
```

Ejemplo para ejecutar contra D1:

```bash
pnpm wrangler d1 execute <DB_NAME> --command "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, first_name TEXT, username TEXT, created_at TEXT);"
```

## Scripts

- `pnpm dev`: levanta el worker en local
- `pnpm dev:remote`: levanta el worker con URL pública temporal (ideal para webhook)
- `pnpm start`: alias de `pnpm dev`
- `pnpm tg:webhook:get`: consulta webhook actual del bot
- `pnpm tg:webhook:set --url=https://<url_publica>`: actualiza webhook del bot
- `pnpm tg:webhook:delete`: elimina webhook del bot
- `pnpm test`: ejecuta pruebas
- `pnpm deploy`: despliega a Cloudflare
- `pnpm cf-typegen`: regenera tipos de bindings

## Desarrollo sin afectar producción

Si usas el mismo bot de Telegram para desarrollo y producción, solo puede existir **un webhook activo** y se pisarán entre sí.

Flujo recomendado:

1. Crea un segundo bot en `@BotFather` (bot de desarrollo).
2. Guarda su token en `.dev.vars` como `TELEGRAM_BOT_TOKEN`.
3. Ejecuta `pnpm dev:remote` y copia la URL HTTPS temporal.
4. Ejecuta `pnpm tg:webhook:set --url=https://<url_temporal>`.
5. Prueba únicamente contra el bot de desarrollo.

De esta forma, el bot de producción nunca cambia de webhook y no afecta a otros usuarios.

## Estructura principal

```
src/
	index.ts
	command-handler.ts
	interfaces/
		telegram.d.ts
test/
	index.spec.ts
```
