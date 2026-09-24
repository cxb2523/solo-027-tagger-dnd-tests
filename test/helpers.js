const dom = require('./setup');

const { document, KeyboardEvent } = dom.window;

function create_input(value, name) {
    const input = document.createElement('input');
    input.type = 'text';
    if (value !== undefined) {
        input.value = value;
    }
    if (name) {
        input.setAttribute('name', name);
    }
    document.body.appendChild(input);
    return input;
}

function new_input(instance) {
    return instance._new_input_tag;
}

function tag_labels(instance) {
    return instance._tag_items().map(function(li) {
        return li.querySelector('.label').textContent;
    });
}

function valid_labels(instance) {
    return instance.tags();
}

// Dispatch a keydown; keyCode is forced on the event instance because
// some jsdom versions ignore legacy keyCode in the init dict.
function keydown(target, init) {
    const event = new KeyboardEvent('keydown', Object.assign({
        bubbles: true,
        cancelable: true
    }, init));
    if (init.keyCode !== undefined && event.keyCode !== init.keyCode) {
        Object.defineProperty(event, 'keyCode', {value: init.keyCode});
    }
    target.dispatchEvent(event);
    return event;
}

function type_text(instance, text) {
    const input = new_input(instance);
    input.value = text;
    input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
}

function paste(instance, text) {
    const event = new dom.window.Event('paste', {
        bubbles: true,
        cancelable: true
    });
    event.clipboardData = {
        getData: function() {
            return text;
        }
    };
    new_input(instance).dispatchEvent(event);
    return event;
}

function drag_event(type, init) {
    const event = new dom.window.Event(type, {
        bubbles: true,
        cancelable: true
    });
    Object.assign(event, init);
    event.dataTransfer = Object.assign({
        effectAllowed: '',
        dropEffect: '',
        setData: function() {}
    }, init.dataTransfer || {});
    return event;
}

function drag_dispatch(instance, source, type, init) {
    const event = drag_event(type, init);
    (source || instance._ul).dispatchEvent(event);
    return event;
}

const KEYS = {
    enter: {key: 'Enter', keyCode: 13},
    comma: {key: ',', keyCode: 188},
    backspace: {key: 'Backspace', keyCode: 8},
    left: {key: 'ArrowLeft', keyCode: 37},
    right: {key: 'ArrowRight', keyCode: 39},
    up: {key: 'ArrowUp', keyCode: 38},
    down: {key: 'ArrowDown', keyCode: 40},
    space: {key: ' ', keyCode: 32},
    escape: {key: 'Escape', keyCode: 27}
};

module.exports = {
    create_input,
    new_input,
    tag_labels,
    valid_labels,
    keydown,
    type_text,
    paste,
    drag_dispatch,
    KEYS
};
