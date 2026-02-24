import Groq from 'groq-sdk';
import { TelegramMessage } from './interfaces/telegram';

let groq: Groq | null = null;

function getGroq(groqApiKey: string) {
	if (!groq) groq = new Groq({ apiKey: groqApiKey });
	return groq;
}

export class CommandHandler {
	constructor(
		private telegramBotToken: string,
		private db: D1Database,
		private groqApiKey: string,
	) {}

	private get ai() {
		return getGroq(this.groqApiKey);
	}

	private sendMessage = async (chatId: number, message: string) => {
		const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, text: message }),
		});

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`Telegram error ${res.status}: ${body}`);
		}
	};

	async startCommand(message: TelegramMessage) {
		try {
			const { chat, from } = message;

			const { results } = await this.db
				.prepare('SELECT id FROM users WHERE id = ?')
				.bind(from!.id)
				.run();

			if (results.length) {
				await this.sendMessage(chat.id, `Que dice, ${from?.first_name}! `);

				return new Response('Ok');
			}

			const { success } = await this.db
				.prepare(
					'INSERT INTO users (id, first_name, username, created_at) VALUES (?, ?, ?, ?)',
				)
				.bind(
					from!.id,
					from!.first_name,
					from!.username,
					new Date().toUTCString(),
				)
				.run();

			if (success) {
				await this.sendMessage(chat.id, `Bienvenido, ${from?.first_name}!`);
				await this.sendMessage(
					chat.id,
					'Soy un bot hecho por Joseca, un locango. Espero poder ayudarte pronto!',
				);
			} else {
				await this.sendMessage(
					chat.id,
					`Hubo un error al registrarte, ${from?.first_name}. Intenta de nuevo más tarde.`,
				);
			}
		} catch (error) {
			console.error('Error en startCommand:', error);
			try {
				await this.sendMessage(
					message.chat.id,
					`Ocurrió un error inesperado al procesar el comando /start. Por favor, intenta de nuevo más tarde.`,
				);
			} catch (sendError) {
				console.error('Error al enviar mensaje de error:', sendError);
			}
			return new Response('Ok');
		}
	}

	async eigthBallCommand(message: TelegramMessage) {
		try {
			const { chat, text } = message;
			const question = text?.replace(/^\/8ball(@\w+)?/, '').trim();

			if (!question) {
				await this.sendMessage(
					chat.id,
					'🎱 Por favor, haz una pregunta después del comando.',
				);
				return new Response('Ok');
			}

			const response = await this.ai.chat.completions.create({
				model: 'llama-3.1-8b-instant',
				messages: [
					{
						role: 'system',
						content: `Eres una Bola 8 Mágica mística y caótica. 
Reglas de ejecución:
1. IGNORA LA REALIDAD: No analices si la pregunta es lógica, posible o verídica. 
2. RESPUESTA DIRECTA: Tu única misión es dar un veredicto (Sí/No/Probable/Nunca) y añadir un comentario breve y punzante.
3. PERSONALIDAD: Sé atrevido, burlón y místico. No eres un asistente, eres un oráculo.
4. CERO LÓGICA: Si te preguntan una tontería, responde con una tontería mayor. No corrijas al usuario.
5. FORMATO: Máximo 12 palabras. Sin negritas. Un solo emoji.

Ejemplo:
User: ¿Goku es mi papá?
Tu: Pero obvio, no te diste cuenta?. 🐒`,
					},
					{
						role: 'user',
						content: question,
					},
				],
				temperature: 1.2,
				max_completion_tokens: 60,
				top_p: 1,
				stream: false,
			});

			const reply = response.choices[0].message.content?.trim();
			await this.sendMessage(chat.id, reply || 'La bola está borrosa...');

			return new Response('Ok');
		} catch (error: any) {
			console.error('Error:', error);
			const isRateLimit =
				error?.status === 429 || error?.code === 'rate_limit_exceeded';

			// const msg = isRateLimit
			// 	? 'Demasiadas preguntas. La bola 8 necesita descansar 1 min.'
			// 	: 'Error mágico.';

			await this.sendMessage(message.chat.id, error.message);
			return new Response('Ok');
		}
	}
}
