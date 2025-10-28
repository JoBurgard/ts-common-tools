import { dstar } from '../sse.ts';

export function Toaster() {
	return <div id="toaster" class="toast toast-center toast-bottom"></div>;
}

const typeMap = {
	success: 'alert-success',
	warning: 'alert-warning',
	info: 'alert-info',
	error: 'alert-error',
};

type ToastProps = {
	type?: 'success' | 'warning' | 'info' | 'error';
	title?: string;
	message: string;
	durationSeconds?: number;
	id?: string;
};

export function Toast(props: ToastProps) {
	let type = 'alert-info';
	const durationSeconds = props?.durationSeconds ?? 4;

	if (props.type) {
		type = typeMap[props.type];
	}

	return (
		<div
			class={['alert', type]}
			{...{ ['data-on-interval__duration.' + durationSeconds + 's']: 'el.remove()' }}
		>
			<span safe>{props.message}</span>
		</div>
	);
}

export function sendToast(props: ToastProps) {
	return dstar.patchElements((<Toast {...props}></Toast>) as string, {
		selector: '#toaster',
		mode: 'append',
	});
}
