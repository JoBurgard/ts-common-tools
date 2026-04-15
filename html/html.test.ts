import { describe, expect, test } from 'bun:test';
import { component } from './html-builder';

const Button = component<{ Props: { class: string } }>()(({ props, children }, { h }) => {
	h`<button class="${props.class}" type="button">${h.raw(children.value)}</button>`;
});

const Icon = component<{ Props: { icon: `i-[mdi--${string}]` } }>()(({ props }, { h }) => {
	h`<span class="${props.icon}"></span>`;
});

const Card = component<{ Slots: 'title' | 'description' }>()(({ children, slots }, { h, c }) => {
	h`<div>`;
	if (slots.title) {
		h`<heading>`;
		{
			slots.title();
		}
		h`</heading>`;
	}
	if (slots.description) {
		c(slots.description.value);
	}
	children();
	h`</div>`;
});

describe('Component', () => {
	test('Simple', () => {
		const output = Button({ class: 'btn' }, ({ chld }) => {
			chld.h`Click me`;
		});

		Button({ class: 'btn' }, ({ chld }) => {
			chld.h`Click me`;
		});

		expect(output).toBe(`<button class="btn" type="button">Click me</button>`);
	});
	test('With inner Component', () => {
		const output = Button({ class: 'btn' }, ({ chld: { h, c } }) => {
			c(Icon({ icon: 'i-[mdi--plus]' }));
			h`Create`;
		});
		expect(output).toBe(
			`<button class="btn" type="button"><span class="i-[mdi--plus]"></span>Create</button>`,
		);
	});
	test('With Slots', () => {
		const output = Card({}, ({ chld, slots }) => {
			slots('title').h`<h2>Title</h2>`;
			slots('description').h`<p>Description</p>`;
			chld.h`<section><p>Main Content</p></section>`;
		});
		expect(output).toBe(
			`<div><heading><h2>Title</h2></heading><p>Description</p><section><p>Main Content</p></section></div>`,
		);
	});
});
