const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/'
});

global.window = dom.window;
global.document = dom.window.document;
global.Event = dom.window.Event;
global.KeyboardEvent = dom.window.KeyboardEvent;

const tagger = require('../tagger.js');

function setup(value = '', options = {}) {
    const input = document.createElement('input');
    input.value = value;
    document.body.appendChild(input);
    const instance = tagger(input, options);
    const editor = document.querySelector('.tagger-new input');
    return { input, instance, editor };
}

function keydown(target, keyCode, init = {}) {
    const event = new window.KeyboardEvent('keydown', Object.assign({
        bubbles: true,
        cancelable: true
    }, init));
    Object.defineProperty(event, 'keyCode', { get: () => keyCode });
    target.dispatchEvent(event);
    return event;
}

function paste(target, text) {
    const event = new window.Event('paste', { bubbles: true, cancelable: true });
    event.clipboardData = { getData: () => text };
    target.dispatchEvent(event);
    return event;
}

function tag_lis() {
    return Array.from(document.querySelectorAll('.tagger > ul > li:not(.tagger-new)'));
}

function tag_labels() {
    return tag_lis().map(li => li.querySelector('.label').textContent);
}

beforeEach(() => {
    document.body.innerHTML = '';
});

test('enter adds a tag and clears the editor', () => {
    const { input, editor } = setup();
    editor.value = 'foo';
    keydown(editor, 13);
    assert.deepEqual(tag_labels(), ['foo']);
    assert.equal(editor.value, '');
    assert.equal(input.value, 'foo');
});

test('comma adds a tag and clears the editor', () => {
    const { input, editor } = setup();
    editor.value = 'bar';
    keydown(editor, 188);
    assert.deepEqual(tag_labels(), ['bar']);
    assert.equal(editor.value, '');
    assert.equal(input.value, 'bar');
});

test('enter and comma split a sequence into multiple tags', () => {
    const { input, editor } = setup();
    ['foo', 'bar', 'baz'].forEach((name, index) => {
        editor.value = name;
        keydown(editor, index % 2 === 0 ? 13 : 188);
    });
    assert.deepEqual(tag_labels(), ['foo', 'bar', 'baz']);
    assert.equal(input.value, 'foo,bar,baz');
});

test('duplicates are rejected by default', () => {
    const { input, editor } = setup('foo');
    editor.value = 'foo';
    keydown(editor, 13);
    assert.deepEqual(tag_labels(), ['foo']);
    assert.equal(input.value, 'foo');
});

test('pasting a separated string creates multiple tags', () => {
    const { input, editor } = setup();
    const event = paste(editor, 'foo,bar,baz');
    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(tag_labels(), ['foo', 'bar', 'baz']);
    assert.equal(input.value, 'foo,bar,baz');
});

test('paste import splits on newlines and semicolons', () => {
    const { input, editor } = setup();
    paste(editor, 'foo\nbar;baz\r\nqux');
    assert.deepEqual(tag_labels(), ['foo', 'bar', 'baz', 'qux']);
    assert.equal(input.value, 'foo,bar,baz,qux');
});

test('paste import de-duplicates within the batch and against existing tags', () => {
    const { input, editor } = setup('foo,bar');
    paste(editor, 'bar,baz,baz,qux');
    assert.deepEqual(tag_labels(), ['foo', 'bar', 'baz', 'qux']);
    assert.equal(input.value, 'foo,bar,baz,qux');
});

test('pasting plain text without separators is left to the browser', () => {
    const { editor } = setup();
    const event = paste(editor, 'single');
    assert.equal(event.defaultPrevented, false);
    assert.deepEqual(tag_labels(), []);
});

test('backspace on empty editor removes the previous tag', () => {
    const { input, editor } = setup('foo,bar,baz');
    keydown(editor, 8);
    assert.deepEqual(tag_labels(), ['foo', 'bar']);
    assert.equal(input.value, 'foo,bar');
});

test('backspace with text in the editor keeps the tags', () => {
    const { input, editor } = setup('foo,bar');
    editor.value = 'b';
    keydown(editor, 8);
    assert.deepEqual(tag_labels(), ['foo', 'bar']);
    assert.equal(input.value, 'foo,bar');
});

test('arrow keys move focus between tags', () => {
    const { editor } = setup('foo,bar,baz');
    const [first, second, third] = tag_lis();
    first.focus();
    keydown(first, 39); // right
    assert.equal(document.activeElement, second);
    keydown(second, 39); // right
    assert.equal(document.activeElement, third);
    keydown(third, 37); // left
    assert.equal(document.activeElement, second);
    keydown(third, 39); // right past the last tag focuses the editor
    assert.equal(document.activeElement, editor);
});

test('left arrow at the start of the editor focuses the last tag', () => {
    const { editor } = setup('foo,bar');
    editor.focus();
    keydown(editor, 37);
    const lis = tag_lis();
    assert.equal(document.activeElement, lis[lis.length - 1]);
});

test('ctrl+arrow moves the focused tag and keeps state in sync', () => {
    const { input } = setup('foo,bar,baz');
    const [first] = tag_lis();
    first.focus();
    keydown(first, 39, { ctrlKey: true });
    assert.deepEqual(tag_labels(), ['bar', 'foo', 'baz']);
    assert.equal(input.value, 'bar,foo,baz');
    assert.equal(document.activeElement, tag_lis()[1]);
    keydown(tag_lis()[1], 37, { ctrlKey: true });
    assert.deepEqual(tag_labels(), ['foo', 'bar', 'baz']);
    assert.equal(input.value, 'foo,bar,baz');
});

test('ctrl+arrow at the edges does nothing', () => {
    const { input } = setup('foo,bar');
    const lis = tag_lis();
    keydown(lis[0], 37, { ctrlKey: true });
    keydown(lis[1], 39, { ctrlKey: true });
    assert.deepEqual(tag_labels(), ['foo', 'bar']);
    assert.equal(input.value, 'foo,bar');
});

test('drag and drop reorders tags', () => {
    const { input } = setup('foo,bar,baz');
    const [first, , third] = tag_lis();
    const dragstart = new window.Event('dragstart', { bubbles: true, cancelable: true });
    first.dispatchEvent(dragstart);
    const dragover = new window.Event('dragover', { bubbles: true, cancelable: true });
    dragover.clientX = 100; // past the (zero-width in jsdom) midpoint => drop after
    third.dispatchEvent(dragover);
    const drop = new window.Event('drop', { bubbles: true, cancelable: true });
    third.dispatchEvent(drop);
    first.dispatchEvent(new window.Event('dragend', { bubbles: true }));
    assert.deepEqual(tag_labels(), ['bar', 'baz', 'foo']);
    assert.equal(input.value, 'bar,baz,foo');
});

test('validate rejects invalid tags and attaches the error to the tag', () => {
    const { input, editor } = setup('', {
        validate: name => name.length >= 3 || 'too short'
    });
    editor.value = 'ab';
    keydown(editor, 13);
    assert.equal(input.value, '');
    const li = tag_lis()[0];
    assert.ok(li.classList.contains('tagger-error'));
    assert.equal(li.getAttribute('data-error'), 'too short');
    assert.equal(li.querySelector('.tagger-error-message').textContent, 'too short');
    editor.value = 'abc';
    keydown(editor, 13);
    assert.equal(input.value, 'abc');
    assert.deepEqual(tag_labels(), ['ab', 'abc']);
});

test('validate returning false uses a default message and keeps tags out of the input', () => {
    const { input, editor } = setup('', { validate: () => false });
    editor.value = 'nope';
    keydown(editor, 13);
    assert.equal(input.value, '');
    assert.equal(tag_lis()[0].classList.contains('tagger-error'), true);
});

test('invalid tags are skipped when syncing state after reorder', () => {
    const { input, editor } = setup('foo,bar', { validate: () => false });
    editor.value = 'bad';
    keydown(editor, 13);
    keydown(tag_lis()[0], 39, { ctrlKey: true });
    assert.equal(input.value, 'bar,foo');
});

test('backspace removes an invalid tag without touching valid state', () => {
    const { input, editor } = setup('foo', { validate: () => false });
    editor.value = 'bad';
    keydown(editor, 13);
    assert.deepEqual(tag_labels(), ['foo', 'bad']);
    keydown(editor, 8);
    assert.deepEqual(tag_labels(), ['foo']);
    assert.equal(input.value, 'foo');
});

test('separate instances do not share state', () => {
    const first = setup('foo,bar');
    const second = setup('baz');
    first.editor.value = 'qux';
    keydown(first.editor, 13);
    assert.equal(first.input.value, 'foo,bar,qux');
    assert.equal(second.input.value, 'baz');
    const counts = Array.from(document.querySelectorAll('.tagger'))
        .map(root => root.querySelectorAll('li:not(.tagger-new)').length);
    assert.deepEqual(counts, [3, 1]);
});

test('re-creating an instance does not leak state from a previous one', () => {
    const first = setup('foo,bar');
    first.editor.value = 'baz';
    keydown(first.editor, 13);
    document.body.innerHTML = '';
    const second = setup('foo,bar');
    assert.equal(second.input.value, 'foo,bar');
    assert.deepEqual(tag_labels(), ['foo', 'bar']);
    second.editor.value = 'baz';
    keydown(second.editor, 13);
    assert.equal(second.input.value, 'foo,bar,baz');
});
