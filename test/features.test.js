const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const dom = require('./setup');
const tagger = require('../tagger');
const h = require('./helpers');

const { document } = dom.window;

beforeEach(function() {
    document.body.innerHTML = '';
});

function rect(left, top, width, height) {
    return {
        left: left,
        right: left + width,
        top: top,
        bottom: top + height,
        width: width,
        height: height
    };
}

function stub_rects(instance, boxes) {
    const items = instance._tag_items();
    items.forEach(function(li, index) {
        li.getBoundingClientRect = function() {
            return boxes[index];
        };
    });
}

test('mouse drag drops a tag before the target at the left half', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const items = instance._tag_items();
    stub_rects(instance, [
        rect(0, 0, 30, 20),
        rect(30, 0, 30, 20),
        rect(60, 0, 30, 20)
    ]);

    h.drag_dispatch(instance, items[2], 'dragstart', {});
    h.drag_dispatch(instance, items[1], 'dragover', {clientX: 35});
    h.drag_dispatch(instance, items[1], 'drop', {clientX: 35});

    assert.deepEqual(instance.tags(), ['a', 'c', 'b']);
    assert.equal(input.value, 'a,c,b');
});

test('mouse drag drops a tag after the target at the right half', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const items = instance._tag_items();
    stub_rects(instance, [
        rect(0, 0, 30, 20),
        rect(30, 0, 30, 20),
        rect(60, 0, 30, 20)
    ]);

    h.drag_dispatch(instance, items[0], 'dragstart', {});
    h.drag_dispatch(instance, items[2], 'dragover', {clientX: 85});
    h.drag_dispatch(instance, items[2], 'drop', {clientX: 85});

    assert.deepEqual(instance.tags(), ['b', 'c', 'a']);
});

test('mouse drag on empty area appends the tag at the end', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const items = instance._tag_items();

    h.drag_dispatch(instance, items[0], 'dragstart', {});
    h.drag_dispatch(instance, instance._ul, 'drop', {});

    assert.deepEqual(instance.tags(), ['b', 'c', 'a']);
});

test('dragover marks a visual drop indicator and is removed after drop', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input);
    const items = instance._tag_items();
    stub_rects(instance, [rect(0, 0, 30, 20), rect(30, 0, 30, 20)]);

    h.drag_dispatch(instance, items[0], 'dragstart', {});
    h.drag_dispatch(instance, items[1], 'dragover', {clientX: 55});

    assert.equal(items[1].classList.contains('tagger-drop-after'), true);

    h.drag_dispatch(instance, items[1], 'drop', {clientX: 55});

    assert.equal(items[1].classList.contains('tagger-drop-after'), false);
    assert.equal(instance._dragging, null);
});

test('keyboard grab / arrows / drop reorders tags', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const items = instance._tag_items();

    items[0].focus();
    h.keydown(items[0], h.KEYS.space);

    assert.equal(instance._keyboard_dragging, items[0]);
    assert.equal(items[0].classList.contains('tagger-dragging'), true);
    assert.equal(items[0].getAttribute('aria-grabbed'), 'true');

    h.keydown(items[0], h.KEYS.right);
    assert.deepEqual(h.tag_labels(instance), ['b', 'a', 'c']);

    h.keydown(items[0], h.KEYS.right);
    assert.deepEqual(h.tag_labels(instance), ['b', 'c', 'a']);

    h.keydown(items[0], h.KEYS.left);
    assert.deepEqual(h.tag_labels(instance), ['b', 'a', 'c']);

    h.keydown(items[0], h.KEYS.space);

    assert.equal(instance._keyboard_dragging, null);
    assert.equal(items[0].classList.contains('tagger-dragging'), false);
    assert.deepEqual(instance.tags(), ['b', 'a', 'c']);
    assert.equal(input.value, 'b,a,c');
    assert.equal(document.activeElement, items[0]);
});

test('keyboard escape cancels the reorder and restores position', function() {
    const input = h.create_input('a,b,c');
    const instance = tagger(input);
    const items = instance._tag_items();

    items[0].focus();
    h.keydown(items[0], h.KEYS.space);
    h.keydown(items[0], h.KEYS.right);
    h.keydown(items[0], h.KEYS.right);
    assert.deepEqual(h.tag_labels(instance), ['b', 'c', 'a']);

    h.keydown(items[0], h.KEYS.escape);

    assert.deepEqual(instance.tags(), ['a', 'b', 'c']);
    assert.equal(input.value, 'a,b,c');
    assert.equal(instance._keyboard_dragging, null);
});

test('movement is blocked at the ends while grabbing', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input);
    const items = instance._tag_items();

    items[0].focus();
    h.keydown(items[0], h.KEYS.space);
    h.keydown(items[0], h.KEYS.left);
    assert.deepEqual(h.tag_labels(instance), ['a', 'b']);

    h.keydown(items[0], h.KEYS.escape);
    items[1].focus();
    h.keydown(items[1], h.KEYS.space);
    h.keydown(items[1], h.KEYS.right);
    assert.deepEqual(h.tag_labels(instance), ['a', 'b']);
});

test('tags are focusable and marked draggable', function() {
    const input = h.create_input('a');
    const instance = tagger(input);
    const item = instance._tag_items()[0];

    assert.equal(item.getAttribute('tabindex'), '0');
    assert.equal(item.draggable, true);
    assert.ok(item.getAttribute('aria-label').indexOf('a tag') === 0);
});

test('validate returning a string keeps the value out of the store with an error', function() {
    const input = h.create_input('');
    const calls = [];
    const instance = tagger(input, {
        validate: function(name) {
            calls.push(name);
            if (name === 'bad') {
                return 'no bad words';
            }
            return true;
        }
    });

    const result = instance.add_tag('bad');

    assert.equal(result, false);
    assert.deepEqual(calls, ['bad']);
    assert.deepEqual(instance.tags(), []);
    assert.equal(input.value, '');

    const invalid = instance._ul.querySelector('li.tagger-invalid');
    assert.ok(invalid, 'an invalid chip is rendered');
    assert.equal(invalid.getAttribute('aria-invalid'), 'true');
    assert.equal(invalid.querySelector('.label').textContent, 'bad');
    assert.equal(invalid.querySelector('.tagger-error').textContent, 'no bad words');
});

test('validate returning false rejects with a default error message', function() {
    const input = h.create_input('');
    const instance = tagger(input, {
        validate: function() {
            return false;
        }
    });

    instance.add_tag('nope');

    const invalid = instance._ul.querySelector('li.tagger-invalid');
    assert.ok(invalid);
    assert.equal(invalid.querySelector('.tagger-error').textContent, 'Invalid tag');
    assert.deepEqual(instance.tags(), []);
});

test('validate accepting a tag stores it normally', function() {
    const input = h.create_input('');
    const instance = tagger(input, {
        validate: function(name) {
            return name.length >= 3;
        }
    });

    assert.equal(instance.add_tag('abc'), true);
    assert.equal(instance.add_tag('xy'), false);

    assert.deepEqual(instance.tags(), ['abc']);
    assert.equal(input.value, 'abc');
});

test('a thrown validator is treated like a failed validation', function() {
    const input = h.create_input('');
    const instance = tagger(input, {
        validate: function() {
            throw new Error('boom');
        }
    });

    assert.equal(instance.add_tag('x'), false);
    assert.deepEqual(instance.tags(), []);
    assert.equal(instance._ul.querySelector('.tagger-error').textContent, 'boom');
});

test('invalid chips do not participate in the stored tag order', function() {
    const input = h.create_input('a,b');
    const instance = tagger(input, {
        validate: function(name) {
            return /^[a-z]+$/.test(name);
        }
    });

    h.type_text(instance, 'C');
    h.keydown(h.new_input(instance), h.KEYS.enter);

    assert.deepEqual(instance.tags(), ['a', 'b']);
    assert.deepEqual(h.tag_labels(instance), ['a', 'b', 'C']);

    instance.remove_tag('a');
    assert.deepEqual(instance.tags(), ['b']);
    assert.deepEqual(h.tag_labels(instance), ['b', 'C']);
});

test('invalid chips can be removed with the close control', function() {
    const input = h.create_input('');
    const instance = tagger(input, {
        validate: function() {
            return false;
        }
    });

    instance.add_tag('bad');
    const close = instance._ul.querySelector('li.tagger-invalid a.close');
    close.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));

    assert.equal(instance._ul.querySelector('li.tagger-invalid'), null);
    assert.deepEqual(instance.tags(), []);
});

test('batch paste validates every token and mixes kept and rejected tags', function() {
    const input = h.create_input('');
    const instance = tagger(input, {
        validate: function(name) {
            return name.length > 2 ? true : 'too short';
        }
    });

    h.paste(instance, 'long,ok,no,also-long');

    assert.deepEqual(instance.tags(), ['long', 'also-long']);
    assert.deepEqual(
        Array.from(instance._ul.querySelectorAll('li.tagger-invalid .label'))
            .map(function(node) { return node.textContent; }),
        ['ok', 'no']
    );
});
