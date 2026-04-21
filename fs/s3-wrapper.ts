import { Glob, type S3Client } from 'bun';
import path from 'node:path';

type Props =
	| {
			localFS: true;
			localBasePath: string;
	  }
	| {
			localFS: false;
			s3: S3Client;
			s3BasePath: string;
	  };

const listGlob = new Glob('**/*');

export function S3WrapperCreate(props: Props) {
	return {
		file(source: string): Bun.S3File | Bun.BunFile {
			if (props.localFS) {
				return Bun.file(path.join(props.localBasePath, source));
			}
			return props.s3.file(path.join(props.s3BasePath, source));
		},
		async write(
			destination: string,
			content: Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BunFile | Bun.Archive,
		): Promise<number> {
			if (props.localFS) {
				return Bun.write(path.join(props.localBasePath, destination), content);
			}
			return props.s3.write(path.join(props.s3BasePath, destination), content);
		},
		async list(dirPath: string): Promise<string[]> {
			if (props.localFS) {
				return Array.fromAsync(listGlob.scan(path.join(props.localBasePath, dirPath)));
			}
			const fullPath = path.join(props.s3BasePath, dirPath);
			const res = await props.s3.list({ prefix: fullPath });
			if (!res.contents) {
				return [];
			}
			return res.contents.map((it) => it.key.replace(fullPath + '/', ''));
		},
	};
}
