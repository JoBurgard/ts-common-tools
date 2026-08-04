import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Result } from '../utils/result';

const execAsync = promisify(exec);
/**
 * Creates a system for interacting with an IMAP-Server.
 */
export function imapClientCreate(p: {
	server: string; // mail.example.tld:993
	user: string;
	password: string;
	mailbox: string;
}) {
	const command = (urlEnd: string, serverCommand?: string) => {
		let cmd = `curl -u ${p.user}:${p.password} "imaps://${p.server}${urlEnd}/${p.mailbox}"`;
		if (serverCommand) {
			cmd += ` -X "${serverCommand}"`;
		}
		return cmd;
	};

	const readOldest = async () => {
		return Result.try(async () => await execAsync(command(`;MAILINDEX=1`)));
	};

	const move = async (p2: { uid: string; targetMailbox: string }) => {
		return Result.try(
			async () => await execAsync(command(``, `UID MOVE ${p2.uid} ${p2.targetMailbox}`)),
		);
	};

	return {
		readOldest,
		move,
	};
}
