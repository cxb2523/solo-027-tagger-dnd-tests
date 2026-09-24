const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const dom = require('./setup');
const tagger = require('../tagger');
const h = require('./helpers');

const { document } = dom.window;

beforeEach(function() {
    document.body.innerHTML = '';
});

test('initializes tags from the input value', function() {
    const input = h.create_input('charles,louis,michel');
    const instance = tagger(input);

    assert.deepEqual(instance.tags(), ['charles', 'louis', 'michel']);
    assert.deepEqual(h.tag_labels(instance), ['charles', 'louis', 'michel']);
    assert.equal(input.value, 'charles,louis,michel');
});

test('splits on Enter key', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.type_text(instance, 'foo');
    h.keydown(h.new_input(instance), h.KEYS.enter);

    assert.deepEqual(instance.tags(), ['foo']);
    assert.equal(h.new_input(instance).value, '');

    h.type_text(instance, 'bar');
    h.keydown(h.new_input(instance), h.KEYS.enter);

    assert.deepEqual(instance.tags(), ['foo', 'bar']);
});

test('splits on comma key', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.type_text(instance, 'foo');
    h.keydown(h.new_input(instance), h.KEYS.comma);

    assert.deepEqual(instance.tags(), ['foo']);
    assert.equal(h.new_input(instance).value, '');
});

test('a typed value containing several delimiters commits as multiple tags', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.type_text(instance, 'foo,bar;baz');
    h.keydown(h.new_input(instance), h.KEYS.enter);

    assert.deepEqual(instance.tags(), ['foo', 'bar', 'baz']);
    assert.equal(h.new_input(instance).value, '');
});

test('pasting a delimited string creates multiple tags', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    const event = h.paste(instance, 'alpha,beta,gamma');

    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(instance.tags(), ['alpha', 'beta', 'gamma']);
});

test('pasting a multi-line string creates one tag per line', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.paste(instance, 'one\r\ntwo\nthree');

    assert.deepEqual(instance.tags(), ['one', 'two', 'three']);
});

test('pasting mixed separators and whitespace trims and splits', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.paste(instance, ' a ; b , c ,, d');

    assert.deepEqual(instance.tags(), ['a', 'b', 'c', 'd']);
});

test('pasting de-duplicates repeated tags within the clipboard', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.paste(instance, 'foo,bar,foo,bar,baz');

    assert.deepEqual(instance.tags(), ['foo', 'bar', 'baz']);
});

test('pasting de-duplicates against existing tags when duplicates disallowed', function() {
    const input = h.create_input('foo');
    const instance = tagger(input);

    h.paste(instance, 'foo,bar,foo');

    assert.deepEqual(instance.tags(), ['foo', 'bar']);
});

test('single token paste falls through to native behavior', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    const event = h.paste(instance, 'solo');

    assert.equal(event.defaultPrevented, false);
    assert.deepEqual(instance.tags(), []);
});

test('pasting combines the in-progress prefix with the clipboard tokens', function() {
    const input = h.create_input('');
    const instance = tagger(input);

    h.type_text(instance, 'first');
    h.paste(instance, 'second,third');

    assert.deepEqual(instance.tags(), ['first', 'second', 'third']);
});

test('backspace on empty input removes the previous tag', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input);

    h.new_input(instance).focus();
    h.keydown(h.new_input(instance), h.KEYS.backspace);

    assert.deepEqual(instance.tags(), ['a']);
    assert.equal(input.value, 'a');

    h.keydown(h.new_input(instance), h.KEYS.backspace);

    assert.deepEqual(instance.tags(), []);
    assert.equal(input.value, '');
});

test('backspace with typed text does not remove a tag', function() {
    const input = h.create_input('a');
    const instance = tagger(input);

    h.type_text(instance, 'x');
    const event = h.keydown(h.new_input(instance), h.KEYS.backspace);

    assert.equal(event.defaultPrevented, false);
    assert.deepEqual(instance.tags(), ['a']);
});

test('arrow keys move focus between tags and the input', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const editor = h.new_input(instance);
    const items = instance._tag_items();

    editor.focus();
    editor.selectionStart = 0;
    editor.selectionEnd = 0;

    h.keydown(editor, h.KEYS.left);
    assert.equal(document.activeElement, items[2], 'left from input focuses last tag');

    h.keydown(items[2], h.KEYS.left);
    assert.equal(document.activeElement, items[1]);

    h.keydown(items[1], h.KEYS.left);
    assert.equal(document.activeElement, items[0]);

    h.keydown(items[0], h.KEYS.left);
    assert.equal(document.activeElement, items[0], 'left on first tag stays put');

    h.keydown(items[0], h.KEYS.right);
    assert.equal(document.activeElement, items[1]);

    h.keydown(items[2], h.KEYS.right);
    assert.equal(document.activeElement, editor, 'right from last tag returns to input');
});

test('left arrow on empty input does nothing when there are no tags', function() {
    const input = h.create_input('');
    const instance = tagger(input);
    const editor = h.new_input(instance);

    editor.focus();
    editor.selectionStart = 0;
    editor.selectionEnd = 0;
    const event = h.keydown(editor, h.KEYS.left);

    assert.equal(event.defaultPrevented, false);
    assert.equal(document.activeElement, editor);
});

test('left arrow mid-text does not move focus', function() {
    const input = h.create_input('a');
    const instance = tagger(input);
    const editor = h.new_input(instance);

    editor.focus();
    editor.value = 'xy';
    editor.selectionStart = 1;
    editor.selectionEnd = 1;
    h.keydown(editor, h.KEYS.left);

    assert.equal(document.activeElement, editor);
});

test('two instances never share tag state', function() {
    const first_input = h.create_input('one', 'first');
    const second_input = h.create_input('two', 'second');
    const first = tagger(first_input);
    const second = tagger(second_input);

    first.add_tag('extra');

    assert.deepEqual(first.tags(), ['one', 'extra']);
    assert.deepEqual(second.tags(), ['two']);
    assert.equal(first_input.value, 'one,extra');
    assert.equal(second_input.value, 'two');

    h.type_text(second, 'beta');
    h.keydown(h.new_input(second), h.KEYS.enter);

    assert.deepEqual(first.tags(), ['one', 'extra']);
    assert.deepEqual(second.tags(), ['two', 'beta']);
});

test('rebuilding on a fresh element keeps ids and state isolated', function() {
    const input = h.create_input('a,b');
    const first = tagger(input);
    first.add_tag('c');

    const other = h.create_input('x,y');
    const rebuilt = tagger(other);

    assert.deepEqual(rebuilt.tags(), ['x', 'y']);
    assert.notEqual(first._id, rebuilt._id);
    assert.equal(first._ul, first._ul);
    assert.notEqual(first._ul, rebuilt._ul);
});

test('remove_tag updates both state and dom', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);

    instance.remove_tag('b');

    assert.deepEqual(instance.tags(), ['a', 'c']);
    assert.deepEqual(h.tag_labels(instance), ['a', 'c']);
    assert.equal(input.value, 'a,c');
});

test('close link removes the tag via click delegation', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input);

    const close = instance._ul.querySelectorAll('a.close')[0];
    close.dispatchEvent(new dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true
    }));

    assert.deepEqual(instance.tags(), ['b']);
});

test('tag_limit rejects new tags beyond the limit', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input, {tag_limit: 2});

    assert.equal(instance.add_tag('c'), false);
    assert.deepEqual(instance.tags(), ['a', 'b']);
});
