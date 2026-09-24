```
  _____
 |_   _|___ ___ ___ ___ ___
   | | | .'| . | . | -_|  _|
   |_| |__,|_  |_  |___|_|
           |___|___|   version 0.6.2
```
# [Tagger: Zero dependency, Vanilla JavaScript Tag Editor](https://github.com/jcubic/tagger)

[![npm](https://img.shields.io/badge/npm-0.6.2-blue.svg)](https://www.npmjs.com/package/@jcubic/tagger)

![Tag Editor widget in JavaScript](https://raw.githubusercontent.com/jcubic/tagger/master/screenshot.png)

Tagger was inspired by StackOverflow tag editor. It supposed to be a part of similar QA website that was never created.

[Online Demo](https://codepen.io/jcubic/pen/YbYpqO)

## Installation

```
npm install @jcubic/tagger
```

or

```
yarn add @jcubic/tagger
```

## Usage

```
tagger(document.querySelector('[name="tags"]'), {allow_spaces: false});
```

Multiple inputs can be created by passing a NodeList or array of elements (eg. document.querySelectorAll()). If only one element is contained in the list then tagger will return the tagger instance, an array of tagger instances will be returned if the number of elements is greater than 1.

## Features

### Reordering tags

Tags can be reordered by dragging them with the mouse. Keyboard users can focus a tag
(arrow keys move focus between tags, `Left` at the start of the input focuses the last tag)
and move it with `Ctrl+Left`/`Ctrl+Right` (`Cmd` on macOS). `Backspace`/`Delete` on a
focused tag removes it.

### Paste import

Pasting text that contains separators (comma, semicolon, tab) or newlines into the tag
input imports every item as its own tag. Duplicates within the pasted text and tags that
already exist are skipped.

### Validation

The optional `validate` callback is called with the tag name before a tag is committed.
Return `true` (or nothing) to accept the tag. Return `false` or a string to reject it:
the tag is not stored in the underlying input value and the error is attached to the
rendered tag (`.tagger-error` class, `data-error` attribute and a visible
`.tagger-error-message` element). A returned string is used as the error message.

```javascript
tagger(document.querySelector('[name="tags"]'), {
    validate: function(name) {
        return name.length >= 3 || 'tag is too short';
    }
});
```

## Running tests

Tests use the built-in `node:test` runner together with [jsdom](https://github.com/jsdom/jsdom)
(the only dev dependency, the library itself stays zero dependency).

```
npm install
npm test
```

## Usage with React

Tagger can easily be used with ReactJS.

```javascript
import { useRef, useState, useEffect } from 'react'
import tagger from '@jcubic/tagger'

const App = () => {
    const [tags, setTags] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        const taggerOptions = {
            allow_spaces: true,
        };
        tagger(inputRef.current, taggerOptions);
        onChange();
    }, [inputRef]);

    const onChange = () => {
        setTags(tags_array(inputRef.current.value));
    };

    return (
        <div className="app">
            <input type="text" ref={inputRef} onChange={onChange} defaultValue="charles, louis, michel" />
            <br/>
            <ul>
                {tags.map((tag, index) => <li key={`${tag}-${index}`}>{tag}</li>)}
            </ul>
        </div>
    )
}

function tags_array(str) {
    return str.split(/\s*,\s*/).filter(Boolean);
}

export default App
```

See demo in action on [CodePen](https://codepen.io/jcubic/pen/YzRdbmp?editors=0010).

## API

### methods:

* `add_tag(string): boolean`
* `remove_tag(string): booelan`
* `complete(string): void`

### Options:

* **wrap** (default false) allow tags to wrap onto new lines instead of overflow scroll
* **allow_duplicates** (default false)
* **allow_spaces** (default true)
* **add_on_blur** (default false)
* **completion** `{list: string[] | function(): Promise(string[])|string[], delay: miliseconds, min_length: number}`
* **link** `function(name): string|false` it should return what should be in href attribute or false
* **tag_limit** `number` (default -1) limit number of tags, when set to -1 there are no limits
* **placeholder** `string` (default unset) If set in options or on the initial input, this placeholder value will be shown in the tag entry input
* **filter** `function(name): string` it should return the tag name after applying any filters (eg String.toUpperCase()), empty string to filter out tag and prevent creation.
* **validate** `function(name): boolean|string` (default unset) return `true`/`undefined` to accept the tag, or `false`/an error message string to reject it; rejected tags are not stored and show the error on the tag itself

**NOTE:** if you're familiar with TypeScript you can check the API by looking at
TypeScript definition file:

[tagger.d.ts](https://github.com/jcubic/tagger/blob/master/tagger.d.ts)

## Press
* JavaScript Weekly
  * [Issue #527](https://javascriptweekly.com/issues/527)
  * [Issue #652](https://javascriptweekly.com/issues/652)
* [Web Tools Weekly](https://webtoolsweekly.com/archives/issue-396/)
* [Minimal Tagging Input In Pure JavaScript – Tagger](https://www.cssscript.com/tagging-input-tagger/)
* [Frontend Focus #657](https://frontendfoc.us/issues/657)

## License

Copyright (c) 2018-2024 [Jakub T. Jankiewicz](https://jcubic.pl/me)<br/>
Released under the MIT license
