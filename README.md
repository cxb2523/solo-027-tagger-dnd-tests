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
* `tags(): string[]` returns a copy of the currently stored tag names

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
* **validate** `function(name): boolean|string` optional callback used to reject a tag. Return `true`/`undefined` to accept, return `false` to reject with a generic message, or return a non-empty string to reject with a custom error. Rejected tags are rendered with a `tagger-invalid` class and an inline `.tagger-error` message (using `role="alert"`), but they are **not** saved to the original input value nor included in `tags()`. Tags that throw inside the callback are treated as rejected with the exception message.

### Reordering tags

Every valid tag can be reordered:

* **Mouse** — drag a tag (HTML5 Drag & Drop) and drop it before/after another tag or at the end of the row.
* **Keyboard / assistive tech** — focus a tag (Tab to it, or use ← / → arrows from the text input) and use the WAI-ARIA move commands: <kbd>Space</kbd> or <kbd>Enter</kbd> grabs/drops the tag, arrow keys move it while grabbed, and <kbd>Esc</kbd> cancels. <kbd>Backspace</kbd>/<kbd>Delete</kbd> removes the focused tag. Invalid tags are focusable and removable but can't be dragged.

### Bulk paste

Pasting multiple values into the input splits the clipboard text on commas, semicolons, vertical bars, CJK punctuation (`，、；`) and line breaks, trims whitespace around each piece and de-duplicates the results (case-insensitive within the pasted batch; existing tags are also respected unless `allow_duplicates` is enabled). Typing `a,b,c` and pressing Enter uses the same splitting. A single token paste keeps the native browser behavior.

## Testing

The test suite uses only the built-in [node:test](https://nodejs.org/api/test.html) runner and [jsdom](https://github.com/jsdom/jsdom) — no heavy framework:

```
npm install
npm test
```

Tests live in [test/](test/) and cover Enter/comma splitting, delimited & multi-line paste with de-duplication, Backspace removal, arrow-key focus movement, per-instance state isolation, mouse and keyboard reordering, and the `validate` callback.

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
