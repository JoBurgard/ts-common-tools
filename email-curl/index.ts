import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Result } from '../utils/result';

const execAsync = promisify(exec);

/**
 * Creates a system for interacting with an IMAP-Server.
 * Basically useful helper functions that interact with IMAP via the curl cli.
 */
export function imapClientCreate(p: {
	mailbox: string;
	server: string; // mail.example.tld:993
	user: string;
	password: string;
}) {
	const cmd = async (urlEnd: string, serverCommand?: string) => {
		let cmdString = `curl -u ${p.user}:${p.password} "imaps://${p.server}/${p.mailbox}${urlEnd}"`;
		if (serverCommand) {
			cmdString += ` -X "${serverCommand}"`;
		}
		return await execAsync(cmdString);
	};

	const readOldest = async () => {
		return Result.try(async () => await cmd(`;MAILINDEX=1`));
	};

	const move = async (p2: { uid: string; targetFolder: string }) => {
		return Result.try(async () => await cmd(``, `UID MOVE ${p2.uid} ${p2.targetFolder}`));
	};

	const deleteOlderThanDays = async (days: number) => {
		const listRes = await Result.try(
			async () => await cmd(``, `SEARCH BEFORE $(date +'%d-%b-%Y' --date='${days} days ago)'`),
		);

		if (!listRes.ok) {
			return listRes;
		}

		const text = listRes.value.stdout;

		return Result.try(async () => {
			if (!text.startsWith('* SEARCH')) {
				throw `Unexpected response "${text}"`;
			}

			const uids = text.split(' ').slice(2);

			if (uids.length > 0) {
				for (const uid of uids) {
					await cmd(``, `STORE ${uid} +FLAGS (\\Deleted)`);
				}
				await cmd(``, `EXPUNGE`);
			}
		});
	};

	return {
		readOldest,
		move,
		deleteOlderThanDays,
	};
}
