import { CommandHandler } from './command-handler';
import type { TelegramRequest } from './interfaces/telegram';

export default {
	async fetch(request, env, ctx) {
		if (request.method !== 'POST') return new Response('Ok');

		let payload: TelegramRequest;
		try {
			payload = (await request.json()) as TelegramRequest;
		} catch (error) {
			return new Response('OK');
		}

		const msg = payload.message;
		const text = msg?.text;
		if (!msg || !text?.startsWith('/')) return new Response('Ok');

		const command = text.slice(1).split(/\s+/)[0];

		console.log('tg_command', {
			command,
			chat: msg.chat.id,
			from: msg.from?.id,
		});

		ctx.waitUntil(
			(async () => {
				const handler = new CommandHandler(
					env.TELEGRAM_BOT_TOKEN,
					env.DB,
					env.GROQ_API_KEY,
				);

				switch (command) {
					case 'start':
						await handler.startCommand(msg);
						break;
					case '8ball':
						await handler.eigthBallCommand(msg);
						break;
					default:
						// opcional: responder "comando no reconocido"

						break;
				}
			})(),
		);

		return new Response('Ok');
	},
} satisfies ExportedHandler<Env>;
