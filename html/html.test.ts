import { describe, expect, test } from 'bun:test';
import { component } from './html-builder';

const Button = component<{ Props: { class: string } }>()(({ props, children }, { h }) => {
	h`<button class="${props.class}" type="button">${children}</button>`;
});

const Card = component<{ Slots: 'title' | 'description' }>()(({ children, slots }, { h, c }) => {
	h`<div>`;
	if (slots.title) {
		c(slots.title);
	}
	if (slots.description) {
		c(slots.description);
	}
	h`${children}`;
	h`</div>`;
});

describe('Component', () => {
	test('Simple', () => {
		const output = Button({ class: 'btn' }, ({ chld }) => {
			chld.html`Click me`;
		});
		expect(output).toBe(`<button class="btn" type="button">Click me</button>`);
	});
	test('With Slots', () => {
		const output = Card({}, ({ chld, slots }) => {
			slots('title').h`<h2>Title</h2>`;
			slots('description').h`<p>Description</p>`;
			chld.h`<section><p>Main Content</p></section>`;
		});
		expect(output).toBe(`<button class="btn" type="button">Click me</button>`);
	});
});
