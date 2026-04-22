import { Glob, type S3Client } from 'bun';
import path from 'node:path';
import { Result, type ResultError, type ResultOk } from '../utils/result';
import { rm } from 'node:fs/promises';

type Props =
	| {
			localFs: true;
			localBasePath: string;
	  }
	| {
			localFs: false;
			s3: S3Client;
			s3BasePath: string;
	  };

const listGlob = new Glob('**/*');

export function S3WrapperCreate(props: Props) {
	return {
		file(source: string): ResultOk<Bun.S3File | Bun.BunFile> | ResultError<string> {
			try {
				if (props.localFs) {
					return Result.ok(Bun.file(path.join(props.localBasePath, source)));
				} else {
					return Result.ok(props.s3.file(path.join(props.s3BasePath, source)));
				}
			} catch (err) {
				return Result.error(String(err));
			}
		},
		async write(
			destination: string,
			content: Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BunFile | Bun.Archive,
		): Promise<ResultOk<number> | ResultError<string>> {
			try {
				if (props.localFs) {
					const res = await Bun.write(path.join(props.localBasePath, destination), content);
					return Result.ok(res);
				} else {
					const res = await props.s3.write(path.join(props.s3BasePath, destination), content);
					return Result.ok(res);
				}
			} catch (err) {
				return Result.error(String(err));
			}
		},
		async list(dirPath: string): Promise<ResultOk<string[]> | ResultError<string>> {
			try {
				if (props.localFs) {
					const res = await Array.fromAsync(listGlob.scan(path.join(props.localBasePath, dirPath)));
					return Result.ok(res);
				} else {
					const fullPath = path.join(props.s3BasePath, dirPath);
					const res = await props.s3.list({ prefix: fullPath });
					if (!res.contents) {
						return Result.ok([]);
					}
					return Result.ok(res.contents.map((it) => it.key.replace(fullPath + '/', '')));
				}
			} catch (err) {
				return Result.error(String(err));
			}
		},
		async deleteFile(filePath: string): Promise<ResultOk<void> | ResultError<string>> {
			try {
				if (props.localFs) {
					await Bun.file(filePath).delete();
					return Result.ok();
				} else {
					const fullPath = path.join(props.s3BasePath, filePath);
					await props.s3.delete(fullPath);
					return Result.ok();
				}
			} catch (err) {
				return Result.error(String(err));
			}
		},
		async deleteDir(dirPath: string): Promise<ResultOk<void> | ResultError<string>> {
			try {
				if (props.localFs) {
					await rm(dirPath, { recursive: true });
					return Result.ok();
				} else {
					const fullPath = path.join(props.s3BasePath, dirPath);
					let res: Bun.S3ListObjectsResponse;
					let count = 0;
					do {
						res = await props.s3.list({ prefix: fullPath });

						if (!res.contents) {
							return Result.ok();
						}

						for (const listResult of res.contents) {
							await props.s3.delete(listResult.key);
						}

						count += 1;
						if (count >= 20) {
							console.trace('deleteDir loop ran for too long, exited');
							return Result.error('Too many files or some other unknown Problem.');
						}
					} while (res.isTruncated);

					return Result.ok();
				}
			} catch (err) {
				return Result.error(String(err));
			}
		},
	};
}
