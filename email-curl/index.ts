import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Result, type ResultError, type ResultOk } from '../utils/result';

const execAsync = promisify(execFile);
const rgxFetchUid = /\(UID (\d+?)/;

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
	const cmd = async (serverCommand: string) => {
		try {
			const result = await execAsync('curl', [
				'-v',
				'-sS',
				`-u`,
				`${p.user}:${p.password}`,
				`imaps://${p.server}/${p.mailbox}`,
				`-X`,
				serverCommand,
			]);
			return Result.ok(result.stdout);
		} catch (err: any) {
			return Result.error(
				(err?.stderr as string | undefined)?.trim() ??
					'Failed to run curl command. Unexpected error.',
			);
		}
	};

	const readOldest = async (): Promise<
		| ResultOk<{ uid: string; content: string } | null> // null if nothing is found
		| ResultError<string>
	> => {
		const mailRes = await cmd(`FETCH 1 (UID BODY[])`);
		if (!mailRes.ok) {
			return mailRes;
		}
		const uid = rgxFetchUid.exec(mailRes.value)?.[1];
		if (!uid) {
			return Result.ok(null);
		}
		return Result.ok({
			uid,
			content: mailRes.value.replaceAll('\r\n', '\n').slice(mailRes.value.indexOf('\n')).trim(),
		});
	};

	// readNewest -> SELECT ${p.mailbox} -> * 5 EXISTS -> extract number -> FETCH ${idx} UID

	const move = async (p2: { uid: string; targetFolder: string }) => {
		return cmd(`UID MOVE ${p2.uid} ${p2.targetFolder}`);
	};

	const deleteOlderThanDays = async (days: number) => {
		const listRes = await cmd(`UID SEARCH BEFORE $(date +'%d-%b-%Y' --date='${days} days ago')`);

		if (!listRes.ok) {
			return listRes;
		}

		const text = listRes.value;

		return Result.try(async () => {
			if (!text.startsWith('* SEARCH')) {
				throw `Unexpected response "${text}"`;
			}

			const uids = text.split(' ').slice(2);

			if (uids.length > 0) {
				for (const uid of uids) {
					await cmd(`UID STORE ${uid} +FLAGS (\\Deleted)`);
				}
				await cmd(`EXPUNGE`);
			}
		});
	};

	return {
		readOldest,
		move,
		deleteOlderThanDays,
	};
}
