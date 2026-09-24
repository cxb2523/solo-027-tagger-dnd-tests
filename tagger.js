/**@license
 *  _____
 * |_   _|___ ___ ___ ___ ___
 *   | | | .'| . | . | -_|  _|
 *   |_| |__,|_  |_  |___|_|
 *           |___|___|   version 0.6.2
 *
 * Tagger - Zero dependency, Vanilla JavaScript Tag Editor
 *
 * Copyright (c) 2018-2024 Jakub T. Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 */
/* global define, module, global */
(function(root, factory, undefined) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.tagger = factory();
    }
})(typeof window !== 'undefined' ? window : global, function(undefined) {
    // ------------------------------------------------------------------------------------------
    var get_text = (function() {
        var div = document.createElement('div');
        var text = ('innerText' in div) ? 'innerText' : 'textContent';
        return function(element) {
            return element[text];
        };
    })();
    // ------------------------------------------------------------------------------------------
    function tagger(input, options) {
        if (input.length === 0) {
            return;
        } else if (input.length === 1) {
            input = Array.from(input).pop();
        }
        if (input.length) {
            return Array.from(input).map(function(input) {
                return new tagger(input, options);
            });
        }
        if (!(this instanceof tagger)) {
            return new tagger(input, options);
        }
        var settings = merge({}, tagger.defaults, options);
        this.init(input, settings);
    }
    // ------------------------------------------------------------------------------------------
    function merge() {
        if (arguments.length < 2) {
            return arguments[0];
        }
        var target = arguments[0];
        [].slice.call(arguments).reduce(function(acc, obj) {
            if (is_object(obj)) {
                Object.keys(obj).forEach(function(key) {
                    if (is_object(obj[key])) {
                        if (is_object(acc[key])) {
                            acc[key] = merge({}, acc[key], obj[key]);
                            return;
                        }
                    }
                    acc[key] = obj[key];
                });
            }
            return acc;
        });
        return target;
    }
    // ------------------------------------------------------------------------------------------
    function is_object(arg) {
        if (typeof arg !== 'object' || arg === null) {
            return false;
        }
        return Object.prototype.toString.call(arg) === '[object Object]';
    }
    // ------------------------------------------------------------------------------------------
    function create(tag, attrs, children) {
        tag = document.createElement(tag);
        Object.keys(attrs).forEach(function(name) {
            if (name === 'style') {
                Object.keys(attrs.style).forEach(function(name) {
                    tag.style[name] = attrs.style[name];
                });
            } else {
                tag.setAttribute(name, attrs[name]);
            }
        });
        if (children !== undefined) {
            children.forEach(function(child) {
                var node;
                if (typeof child === 'string') {
                    node = document.createTextNode(child);
                } else {
                    node = create.apply(null, child);
                }
                tag.appendChild(node);
            });
        }
        return tag;
    }
    // ------------------------------------------------------------------------------------------
    function escape_regex(str) {
        var special = /([-\\^$[\]()+{}?*.|])/g;
        return str.replace(special, '\\$1');
    }
    var id = 0;
    // ------------------------------------------------------------------------------------------
    tagger.defaults = {
        allow_duplicates: false,
        allow_spaces: true,
        completion: {
            list: [],
            delay: 400,
            min_length: 2
        },
        tag_limit: -1,
        add_on_blur: false,
        link: function(name) {
            return '/tag/' + name;
        },
        filter: (name) => name,
        validate: null
    };
    // ------------------------------------------------------------------------------------------
    tagger.fn = tagger.prototype = {
        init: function(input, settings) {
            this._id = ++id;
            this._settings = settings || {};
            this._ul = document.createElement('ul');
            this._input = input;
            var wrapper = document.createElement('div');
            if (settings.wrap) {
                wrapper.className = 'tagger wrap';
            } else {
                wrapper.className = 'tagger';
            }
            if (!settings.placeholder && this._input.hasAttribute('placeholder')) {
                settings.placeholder = this._input.placeholder;
            }
            this._input.setAttribute('hidden', 'hidden');
            var li = document.createElement('li');
            li.className = 'tagger-new';
            this._new_input_tag = document.createElement('input');
            this.tags_from_input();
            if (settings.placeholder) {
                this._new_input_tag.setAttribute('placeholder', settings.placeholder);
            }
            li.appendChild(this._new_input_tag);
            this._completion = document.createElement('div');
            this._completion.className = 'tagger-completion';
            this._ul.appendChild(li);
            input.parentNode.replaceChild(wrapper, input);
            wrapper.appendChild(input);
            wrapper.appendChild(this._ul);
            li.appendChild(this._completion);
            this._add_events();
            this._toggle_completion(false);
            if (this._settings.completion.list instanceof Array) {
                this._build_completion(this._settings.completion.list);
            }
            this._update_a11y();
            this._live = create('div', {
                'class': 'tagger-live',
                'aria-live': 'polite'
            }, []);
            this._dnd_instructions = create('div', {
                id: 'tagger-dnd-' + this._id,
                'class': 'tagger-sr-only'
            }, ['Press space to pick up this tag, use arrow keys to move it, ' +
                  'space to drop, or escape to cancel.']);
            wrapper.appendChild(this._live);
            wrapper.appendChild(this._dnd_instructions);
        },
        _update_input: function () {
          // ReactJS overwrite value setting on inputs, this is a workaround
          // ref: https://stackoverflow.com/a/46012210/387194
          var inputProto = window.HTMLInputElement.prototype;
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(inputProto, 'value').set;
          nativeInputValueSetter.call(this._input, this._tags.join(','));
          this._input.dispatchEvent(new Event('input', { bubbles: true }));
        },
        // --------------------------------------------------------------------------------------
        _add_events: function() {
            var self = this;
            this._ul.addEventListener('click', function(event) {
                if (event.target.className &&
                    String(event.target.className).match(/close/)) {
                    self._remove_tag(event.target);
                    event.preventDefault();
                } else if (event.target.tagName === 'UL') { //Focus new input when clicking in the whitespace of the Tagger instance
                    self._new_input_tag.focus();
                } else {
                    var clicked_li = self._li_from_event(event);
                    if (clicked_li && (clicked_li.classList.contains('tagger-tag') ||
                        clicked_li.classList.contains('tagger-invalid')) &&
                        event.target.tagName !== 'A') {
                        clicked_li.focus();
                    }
                }
            });
            if (this._settings.add_on_blur) {
                this._new_input_tag.addEventListener('blur', function(event) {
                    if (self._commit_input()) {
                        self._new_input_tag.value = '';
                    }
                });
            }
            // ----------------------------------------------------------------------------------
            this._new_input_tag.addEventListener('keydown', function(event) {
                if (event.keyCode === 37) { // left arrow - move focus to last tag
                    var caret_at_start = self._new_input_tag.selectionStart === 0 &&
                        self._new_input_tag.selectionEnd === 0;
                    if (caret_at_start && self._tag_items().length) {
                        self._focus_tag_at(self._tag_items().length - 1);
                        event.preventDefault();
                    }
                } else if (event.keyCode === 13 || event.keyCode === 188 ||
                    (event.keyCode === 32 && !self._settings.allow_spaces)) { // enter || comma || space
                    self._commit_input();
                    event.preventDefault();
                } else if (event.keyCode === 8 && !self._new_input_tag.value) { // backspace
                    if (self._tag_items().length > 0) {
                        var items = self._tag_items();
                        var li = items[items.length - 1];
                        self._remove_tag_li(li);
                    }
                    event.preventDefault();
                } else if (event.keyCode === 32 && (event.ctrlKey || event.metaKey)) {
                    if (typeof self._settings.completion.list === 'function') {
                        self.complete(self._new_input_tag.value);
                    }
                    self._toggle_completion(true);
                    event.preventDefault();
                } else if (self._tag_limit() && event.keyCode !== 9) { // tab
                    event.preventDefault();
                }
            });
            // ----------------------------------------------------------------------------------
            this._new_input_tag.addEventListener('paste', function(event) {
                var clipboard = event.clipboardData;
                if (!clipboard) {
                    return;
                }
                var text = clipboard.getData('text/plain');
                var pieces = self._split_paste(text);
                if (pieces.length <= 1) {
                    return;
                }
                event.preventDefault();
                var prefix = self._new_input_tag.value;
                if (prefix) {
                    pieces.unshift(prefix);
                }
                self._commit_names(pieces);
                self._new_input_tag.value = '';
            });
            // ----------------------------------------------------------------------------------
            this._ul.addEventListener('keydown', function(event) {
                self._tag_keydown(event);
            });
            // ----------------------------------------------------------------------------------
            this._ul.addEventListener('dragstart', function(event) {
                var li = self._li_from_event(event);
                if (li && li.classList.contains('tagger-tag') && li.draggable) {
                    self._drag_start(li, event);
                }
            });
            this._ul.addEventListener('dragend', function(event) {
                if (self._dragging) {
                    self._drag_cleanup();
                }
            });
            this._ul.addEventListener('dragover', function(event) {
                if (self._dragging) {
                    self._drag_over(event);
                }
            });
            this._ul.addEventListener('drop', function(event) {
                if (self._dragging) {
                    event.preventDefault();
                    self._drag_drop(event);
                    self._drag_cleanup();
                }
            });
            // ----------------------------------------------------------------------------------
            this._new_input_tag.addEventListener('input', function(event) {
                var value = self._new_input_tag.value;
                if (self._tag_selected(value)) {
                    if (self.add_tag(value)) {
                        self._toggle_completion(false);
                        self._new_input_tag.value = '';
                    }
                } else {
                    var min = self._settings.completion.min_length;
                    if (typeof self._settings.completion.list === 'function' && value.length >= min) {
                        self.complete(value);
                    }
                    self._toggle_completion(value.length >= min);
                }
            });
            // ----------------------------------------------------------------------------------
            this._completion.addEventListener('click', function(event) {
                if (event.target.tagName.toLowerCase() === 'a') {
                    self.add_tag(get_text(event.target));
                    self._new_input_tag.value = '';
                    self._completion.innerHTML = '';
                }
            });
        },
        // --------------------------------------------------------------------------------------
        _tag_selected: function(tag) {
            if (this._last_completion) {
                if (this._last_completion.includes(tag)) {
                    var re = new RegExp('^' + escape_regex(tag));
                    return this._last_completion.filter(function(test_tag) {
                        return re.test(test_tag);
                    }).length === 1;
                }
            }
            return false;
        },
        // --------------------------------------------------------------------------------------
        _toggle_completion: function(toggle) {
            if (toggle) {
                this._new_input_tag.setAttribute('list', 'tagger-completion-' + this._id);
            } else {
                this._new_input_tag.setAttribute('list', 'tagger-completion-disabled-' + this._id);
            }
        },
        // --------------------------------------------------------------------------------------
        _build_completion: function(list) {
            this._completion.innerHTML = '';
            this._last_completion = list;
            if (list.length) {
                var id = 'tagger-completion-' + this._id;
                if (!this._settings.allow_duplicates) {
                    list = list.filter(x => !this._tags.includes(x));
                }
                var datalist = create('datalist', {id: id}, list.map(function(tag) {
                    return ['option', {}, [tag]];
                }));
                this._completion.appendChild(datalist);
            }
        },
        // --------------------------------------------------------------------------------------
        complete: function(value) {
            if (this._settings.completion) {
                var list = this._settings.completion.list;
                if (typeof list === 'function') {
                    var ret = list(value);
                    if (ret && typeof ret.then === 'function') {
                        ret.then(this._build_completion.bind(this));
                    } else if (ret instanceof Array) {
                        this._build_completion(ret);
                    }
                } else {
                    this._build_completion(list);
                }
            }
        },
        // --------------------------------------------------------------------------------------
        tags_from_input: function() {
            this._tags = this._input.value.split(/\s*,\s*/).filter(Boolean);
            this._tags.forEach(function(name) {
                this._new_tag(name);
            }.bind(this));
        },
        // --------------------------------------------------------------------------------------
        _new_tag: function(name, invalid) {
            var close = ['a', {href: '#', 'class': 'close'}, ['\u00D7']];
            var label = ['span', {'class': 'label'}, [name]];
            var href = this._settings.link(name);
            var li;
            if (invalid) {
                var error_msg = invalid === true ? 'Invalid tag' : invalid;
                var error = ['span', {'class': 'tagger-error', role: 'alert'}, [error_msg]];
                li = create('li', {
                    'class': 'tagger-invalid',
                    tabindex: '0',
                    'aria-invalid': 'true',
                    title: error_msg
                }, [['span', {'class': 'tagger-chip'}, [label, close]], error]);
            } else if (href === false) {
                li = create('li', {
                    'class': 'tagger-tag',
                    tabindex: '0',
                    draggable: 'true'
                }, [['span', {'class': 'tagger-chip'}, [label, close]]]);
            } else {
                var a_atts = {href: href, target: '_black'};
                li = create('li', {
                    'class': 'tagger-tag',
                    tabindex: '0',
                    draggable: 'true'
                }, [['a', a_atts, [label, close]]]);
            }
            this._ul.insertBefore(li, this._new_input_tag.parentNode);
            return li;
        },
        // --------------------------------------------------------------------------------------
        _tag_limit: function() {
            return this._settings.tag_limit > 0 && this._tags.length >= this._settings.tag_limit;
        },
        // --------------------------------------------------------------------------------------
        tags: function() {
            return this._tags.slice();
        },
        // --------------------------------------------------------------------------------------
        _split_paste: function(text) {
            var raw = String(text || '').split(/[\r\n,;;，、|]+/);
            var pieces = [];
            var seen = {};
            raw.forEach(function(piece) {
                var piece_name = piece.trim();
                if (!piece_name || seen[piece_name.toLowerCase()]) {
                    return;
                }
                seen[piece_name.toLowerCase()] = true;
                pieces.push(piece_name);
            });
            return pieces;
        },
        // --------------------------------------------------------------------------------------
        _commit_input: function() {
            var value = this._new_input_tag.value.trim();
            var delimiters = /[\r\n,;;，、|]/;
            if (delimiters.test(value)) {
                var names = this._split_paste(value);
                this._commit_names(names);
                this._new_input_tag.value = '';
                return names.length > 0;
            }
            var created = this.add_tag(value);
            if (created || value === '') {
                this._new_input_tag.value = '';
            }
            return created;
        },
        // --------------------------------------------------------------------------------------
        _commit_names: function(names) {
            names.forEach(function(name) {
                this.add_tag(name);
            }.bind(this));
        },
        // --------------------------------------------------------------------------------------
        _validate: function(name) {
            var validate = this._settings.validate;
            if (typeof validate !== 'function') {
                return null;
            }
            var result;
            try {
                result = validate(name);
            } catch (e) {
                return e && e.message ? e.message : true;
            }
            if (result === true || result === null || result === undefined) {
                return null;
            }
            if (result === false) {
                return true;
            }
            return String(result);
        },
        // --------------------------------------------------------------------------------------
        add_tag: function(name) {
            if (this._tag_limit()) {
                return false;
            }
            name = this._settings.filter(name);
            if (this.is_empty(name)) {
                return false;
            }
            if (!this._settings.allow_duplicates && this._tags.indexOf(name) !== -1) {
                return false;
            }
            var invalid = this._validate(name);
            if (invalid) {
                this._new_tag(name, invalid);
                this._update_a11y();
                return false;
            }
            this._new_tag(name);
            this._tags.push(name);
            this._update_input();
            this._update_a11y();
            if (this._live) {
                this._live.textContent = name + ' added, ' + this._tags.length +
                    (this._tags.length === 1 ? ' tag' : ' tags') + ' total';
            }
            return true;
        },
        // --------------------------------------------------------------------------------------
        is_empty: function(value) {
            switch(value) {
                case '':
                case '""':
                case "''":
                case '``':
                case undefined:
                case null:
                    return true;
                default:
                    return false;
            }
        },
        // --------------------------------------------------------------------------------------
        remove_tag: function(name, remove_dom = true) {
            var was_tracked = this._tags.indexOf(name) !== -1;
            this._tags = this._tags.filter(function(tag) {
                return name !== tag;
            });
            if (was_tracked) {
                this._update_input();
            }
            if (remove_dom) {
                var tags = Array.from(this._ul.querySelectorAll('.label'));
                var re = new RegExp('^\s*' + escape_regex(name) + '\s*$');
                var span = tags.find(function(node) {
                    return (node.textContent || '').match(re);
                });
                if (!span) {
                    return false;
                }
                this._remove_tag_li(span.closest('li'), false);
                return true;
            }
        },
        // --------------------------------------------------------------------------------------
        _remove_tag: function(close) {
            var li = close.closest('li');
            this._remove_tag_li(li);
        },
        // --------------------------------------------------------------------------------------
        _remove_tag_li: function(li, update_a11y) {
            if (!li || !this._ul.contains(li)) {
                return;
            }
            var was_tracked = li.classList.contains('tagger-tag');
            var name = li.querySelector('.label').textContent;
            if (this._keyboard_dragging && this._keyboard_dragging === li) {
                this._keyboard_cancel();
            }
            this._ul.removeChild(li);
            if (was_tracked) {
                this.remove_tag(name, false);
            }
            if (update_a11y !== false) {
                this._update_a11y();
            }
        },
        // --------------------------------------------------------------------------------------
        _tag_items: function() {
            return Array.prototype.slice.call(this._ul.children).filter(function(li) {
                return li.classList.contains('tagger-tag') ||
                    li.classList.contains('tagger-invalid');
            });
        },
        // --------------------------------------------------------------------------------------
        _focus_tag_at: function(index) {
            var items = this._tag_items();
            if (index < 0 || index >= items.length) {
                this._new_input_tag.focus();
                return null;
            }
            items[index].focus();
            return items[index];
        },
        // --------------------------------------------------------------------------------------
        _li_from_event: function(event) {
            var node = event.target;
            while (node && node !== this._ul) {
                if (node.nodeType === 1 && node.tagName === 'LI') {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },
        // --------------------------------------------------------------------------------------
        _tag_keydown: function(event) {
            var li = this._li_from_event(event);
            if (!li || li.classList.contains('tagger-new')) {
                return;
            }
            var index = this._tag_items().indexOf(li);
            var key = event.keyCode;
            if (key === 37) { // left arrow
                if (this._keyboard_dragging) {
                    this._keyboard_move(li, -1);
                } else if (index > 0) {
                    this._focus_tag_at(index - 1);
                }
                event.preventDefault();
            } else if (key === 39) { // right arrow
                if (this._keyboard_dragging) {
                    this._keyboard_move(li, 1);
                } else if (index < this._tag_items().length - 1) {
                    this._focus_tag_at(index + 1);
                } else {
                    this._new_input_tag.focus();
                }
                event.preventDefault();
            } else if ((key === 32 || key === 13) && event.target === li) {
                // space or enter - accessible grab / drop move command
                if (li.classList.contains('tagger-tag')) {
                    if (this._keyboard_dragging) {
                        this._keyboard_drop();
                    } else {
                        this._keyboard_grab(li);
                    }
                    event.preventDefault();
                }
            } else if (key === 27 && this._keyboard_dragging) { // escape
                this._keyboard_cancel();
                event.preventDefault();
            } else if ((key === 8 || key === 46) && event.target === li) {
                // backspace / delete removes the focused tag
                this._remove_tag_li(li);
                var items = this._tag_items();
                if (items.length) {
                    this._focus_tag_at(Math.min(index, items.length - 1));
                } else {
                    this._new_input_tag.focus();
                }
                event.preventDefault();
            }
        },
        // --------------------------------------------------------------------------------------
        _announce: function(message) {
            if (this._live) {
                this._live.textContent = '';
                var self = this;
                setTimeout(function() {
                    self._live.textContent = message;
                }, 30);
            }
        },
        // --------------------------------------------------------------------------------------
        _update_a11y: function() {
            var items = this._tag_items();
            items.forEach(function(li, position) {
                var name = li.querySelector('.label').textContent;
                if (li.classList.contains('tagger-invalid')) {
                    li.setAttribute('aria-label', name + ' invalid tag, ' + (position + 1) +
                        ' of ' + items.length + '. Press backspace to remove.');
                } else {
                    li.setAttribute('aria-label', name + ' tag ' + (position + 1) + ' of ' +
                        items.length + '. Press space to reorder.');
                }
            });
        },
        // --------------------------------------------------------------------------------------
        _keyboard_grab: function(li) {
            this._keyboard_dragging = li;
            this._keyboard_origin = 0;
            var children = li.parentNode.children;
            for (var i = 0; i < children.length; i++) {
                if (li.parentNode.children[i] === li) {
                    this._keyboard_origin = i;
                    break;
                }
            }
            li.classList.add('tagger-dragging');
            li.setAttribute('aria-dropeffect', 'move');
            li.setAttribute('aria-grabbed', 'true');
            li.setAttribute('aria-describedby', 'tagger-dnd-' + this._id);
            this._announce('Picked up tag at position ' + (this._keyboard_origin + 1) +
                '. Use arrow keys to move, space to drop, escape to cancel.');
        },
        // --------------------------------------------------------------------------------------
        _keyboard_drop: function() {
            var li = this._keyboard_dragging;
            if (li) {
                li.classList.remove('tagger-dragging');
                li.removeAttribute('aria-dropeffect');
                li.removeAttribute('aria-grabbed');
                li.removeAttribute('aria-describedby');
                li.focus();
            }
            this._keyboard_dragging = null;
            this._keyboard_origin = null;
            this._sync_tags();
        },
        // --------------------------------------------------------------------------------------
        _keyboard_cancel: function() {
            var li = this._keyboard_dragging;
            if (li) {
                var children = Array.prototype.slice.call(this._ul.children);
                var new_li = children[this._keyboard_origin];
                if (new_li !== li) {
                    this._ul.insertBefore(li, new_li);
                }
                li.classList.remove('tagger-dragging');
                li.removeAttribute('aria-dropeffect');
                li.removeAttribute('aria-grabbed');
                li.removeAttribute('aria-describedby');
                li.focus();
            }
            this._keyboard_dragging = null;
            this._keyboard_origin = null;
            this._update_a11y();
        },
        // --------------------------------------------------------------------------------------
        _keyboard_move: function(li, direction) {
            var items = this._tag_items();
            var index = items.indexOf(li);
            var target = items[index + direction];
            if (!target) {
                return;
            }
            if (direction < 0) {
                this._ul.insertBefore(li, target);
            } else {
                var following = items[index + 2];
                this._ul.insertBefore(li, following ? following :
                                      this._new_input_tag.parentNode);
            }
            this._update_a11y();
            var new_position = this._tag_items().indexOf(li) + 1;
            this._announce('Moved to position ' + new_position + ' of ' +
                this._tag_items().length + '.');
        },
        // --------------------------------------------------------------------------------------
        _sync_tags: function() {
            this._tags = this._tag_items().filter(function(li) {
                return li.classList.contains('tagger-tag');
            }).map(function(li) {
                return li.querySelector('.label').textContent;
            });
            this._update_input();
            this._update_a11y();
        },
        // --------------------------------------------------------------------------------------
        _drag_start: function(li, event) {
            var data = event.dataTransfer;
            this._dragging = li;
            li.classList.add('tagger-dragging');
            if (data) {
                try {
                    data.effectAllowed = 'move';
                    data.setData('text/plain', li.querySelector('.label').textContent);
                } catch (e) {}
            }
        },
        // --------------------------------------------------------------------------------------
        _drag_cleanup: function() {
            var previous = this._ul.querySelector('.tagger-drop-before') ||
                this._ul.querySelector('.tagger-drop-after');
            if (previous) {
                previous.classList.remove('tagger-drop-before', 'tagger-drop-after');
            }
            if (this._dragging) {
                this._dragging.classList.remove('tagger-dragging');
            }
            this._dragging = null;
        },
        // --------------------------------------------------------------------------------------
        _drag_over: function(event) {
            var target = this._li_from_event(event);
            var marker = this._ul.querySelector('.tagger-drop-before') ||
                this._ul.querySelector('.tagger-drop-after');
            if (marker) {
                marker.classList.remove('tagger-drop-before', 'tagger-drop-after');
            }
            if (target && target !== this._dragging &&
                (target.classList.contains('tagger-tag') ||
                 target.classList.contains('tagger-invalid'))) {
                var rect = target.getBoundingClientRect();
                var before;
                if (event.clientY !== 0 &&
                    (event.clientY < rect.top - 5 || event.clientY > rect.bottom + 5)) {
                    before = event.clientY < rect.top;
                } else {
                    before = event.clientX < rect.left + rect.width / 2;
                }
                target.classList.add(before ? 'tagger-drop-before' : 'tagger-drop-after');
                event.preventDefault();
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move';
                }
            } else if (event.target === this._ul ||
                       (event.target.classList &&
                        event.target.classList.contains('tagger-new'))) {
                event.preventDefault();
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move';
                }
            }
        },
        // --------------------------------------------------------------------------------------
        _drag_drop: function(event) {
            var target = this._li_from_event(event);
            var moved = false;
            if (target && target !== this._dragging) {
                var rect = target.getBoundingClientRect();
                var before;
                if (event.clientY !== 0 &&
                    (event.clientY < rect.top - 5 || event.clientY > rect.bottom + 5)) {
                    before = event.clientY < rect.top;
                } else {
                    before = event.clientX < rect.left + rect.width / 2;
                }
                if (before) {
                    this._ul.insertBefore(this._dragging, target);
                } else {
                    var items = this._tag_items();
                    var next = items[items.indexOf(target) + 1];
                    if (next) {
                        this._ul.insertBefore(this._dragging, next);
                    } else {
                        this._ul.insertBefore(this._dragging, this._new_input_tag.parentNode);
                    }
                }
                moved = true;
            } else if (!target) {
                this._ul.insertBefore(this._dragging, this._new_input_tag.parentNode);
                moved = true;
            }
            if (moved) {
                this._sync_tags();
            }
        }
    };
    // ------------------------------------------------------------------------------------------
    return tagger;
});
