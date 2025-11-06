export type Columns<Row> = {
	title: string;
	css?: string;
	getValue: (it: Row) => string;
	component?: (props: { value: string; row: Row }) => JSX.Element;
}[];

export default function <T extends Record<string, unknown>>(props: {
	data: T[];
	columns: Columns<T>;
	// CSS-Classes
	css?: {
		table?: string;
		thead?: string;
		tbody?: string;
		tr?: string;
		th?: string;
		td?: string;
	};
}) {
	return (
		<table class={['table', props?.css?.table]}>
			<thead class={props?.css?.thead}>
				<tr>
					{props.columns.map((it) => (
						<th safe>{it.title}</th>
					))}
				</tr>
			</thead>
			<tbody class={props?.css?.tbody}>
				{props.data.map((row) => (
					<tr class={props?.css?.tr}>
						{props.columns.map((col) => (
							<>
								{col.component ? (
									<td class={col.css}>
										<col.component value={col.getValue(row)} row={row}></col.component>
									</td>
								) : (
									<td class={col.css} safe>
										{col.getValue(row)}
									</td>
								)}
							</>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
