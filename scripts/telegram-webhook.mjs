import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

function loadToken() {
	if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;

	const varsPath = resolve(process.cwd(), '.dev.vars');
	if (existsSync(varsPath)) {
		dotenv.config({ path: varsPath, override: false, quiet: true });
	}

	return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

function usage() {
	console.log(
		[
			'Uso:',
			'  pnpm tg:webhook:get',
			'  pnpm tg:webhook:set --url https://<tu-url-publica>',
			'  pnpm tg:webhook:delete',
			'',
			'Opcional: exporta TELEGRAM_BOT_TOKEN o define TELEGRAM_BOT_TOKEN en .dev.vars',
		].join('\n'),
	);
}

async function main() {
	const action = process.argv[2];
	const token = loadToken();

	if (!token) {
		console.error(
			'No encontré TELEGRAM_BOT_TOKEN. Defínelo en entorno o en .dev.vars',
		);
		process.exit(1);
	}

	if (!action || !['get', 'set', 'delete'].includes(action)) {
		usage();
		process.exit(1);
	}

	const apiBase = `https://api.telegram.org/bot${token}`;
	let url;
	let options = { method: 'GET' };

	if (action === 'get') {
		url = `${apiBase}/getWebhookInfo`;
	}

	if (action === 'delete') {
		url = `${apiBase}/deleteWebhook?drop_pending_updates=false`;
	}

	if (action === 'set') {
		const urlArg = process.argv.find((arg) => arg.startsWith('--url='));
		const urlValue = urlArg?.slice('--url='.length) ?? process.env.WEBHOOK_URL;
		if (!urlValue) {
			console.error(
				'Falta URL. Usa: pnpm tg:webhook:set --url https://<tu-url-publica>',
			);
			process.exit(1);
		}

		url = `${apiBase}/setWebhook`;
		options = {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				url: urlValue,
				drop_pending_updates: false,
			}),
		};
	}

	const response = await fetch(url, options);
	const data = await response.json().catch(() => null);

	if (!response.ok || !data?.ok) {
		console.error('Error Telegram API:', data ?? response.statusText);
		process.exit(1);
	}

	console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
	console.error('Error inesperado:', error);
	process.exit(1);
});
