# ES6+ Features Guide for MikoPBX

Comprehensive guide to modern JavaScript features used in MikoPBX project.

## Table of Contents

- [Variables: let and const](#variables-let-and-const)
- [Arrow Functions](#arrow-functions)
- [Template Literals](#template-literals)
- [Destructuring](#destructuring)
- [Spread and Rest Operators](#spread-and-rest-operators)
- [Object Enhancements](#object-enhancements)
- [Array Methods](#array-methods)
- [Promises and Async/Await](#promises-and-asyncawait)
- [Modules](#modules)
- [Classes](#classes)
- [Optional Chaining and Nullish Coalescing](#optional-chaining-and-nullish-coalescing)

## Variables: let and const

### Always use const for values that won't be reassigned

```javascript
// ✅ CORRECT
const timeOut = 10000;
const $element = $('#element');
const config = { retry: 3, delay: 1000 };

// ❌ WRONG
var timeOut = 10000;
var element = $('#element');
```

### Use let for values that will change

```javascript
// ✅ CORRECT
let counter = 0;
let currentIndex = -1;
let isProcessing = false;

for (let i = 0; i < items.length; i++) {
    // i is block-scoped
}

// ❌ WRONG
var counter = 0;
for (var i = 0; i < items.length; i++) {
    // var is function-scoped, can cause issues
}
```

### Block Scoping Benefits

```javascript
// ✅ CORRECT - Block scoped
if (condition) {
    const message = 'Success';
    console.log(message); // Works
}
// console.log(message); // Error: message not defined

// ❌ WRONG - Function scoped
if (condition) {
    var message = 'Success';
    console.log(message); // Works
}
console.log(message); // Works but unintended
```

## Arrow Functions

### Basic Syntax

```javascript
// ✅ CORRECT
const square = (x) => x * x;
const sum = (a, b) => a + b;
const greet = () => 'Hello';

// Multiple statements need braces
const processData = (data) => {
    const processed = data.map(item => item * 2);
    return processed.filter(item => item > 10);
};
```

### Implicit vs Explicit Return

```javascript
// Implicit return (no braces)
const double = (x) => x * 2;

// Explicit return (with braces)
const doubleExplicit = (x) => {
    return x * 2;
};

// Returning objects - wrap in parentheses
const createUser = (name, age) => ({
    name,
    age,
    created: Date.now()
});
```

### Context Preservation

```javascript
// ✅ CORRECT - Arrow function preserves context
const module = {
    timeout: 1000,

    initialize() {
        setTimeout(() => {
            console.log(this.timeout); // Works: 'this' refers to module
        }, 100);
    }
};

// ❌ WRONG - Regular function loses context
const moduleBad = {
    timeout: 1000,

    initialize() {
        setTimeout(function() {
            console.log(this.timeout); // undefined: 'this' is window/global
        }, 100);
    }
};
```

### Event Handlers

```javascript
// ✅ CORRECT
const handler = {
    $button: $('.button'),

    initialize() {
        this.$button.on('click', (e) => {
            e.preventDefault();
            this.handleClick($(e.currentTarget));
        });
    },

    handleClick($element) {
        // Can access handler properties
    }
};

// ❌ WRONG
const handlerBad = {
    $button: $('.button'),

    initialize() {
        this.$button.on('click', function(e) {
            // 'this' refers to the button element, not handler
            this.handleClick($(e.currentTarget)); // Error
        });
    }
};
```

## Template Literals

### String Interpolation

```javascript
// ✅ CORRECT
const extension = '100';
const action = 'created';
const message = `Extension ${extension} has been ${action}.`;

// ❌ WRONG
const messageBad = 'Extension ' + extension + ' has been ' + action + '.';
```

### Multi-line Strings

```javascript
// ✅ CORRECT
const html = `
    <div class="ui segment">
        <h3 class="header">${title}</h3>
        <p>${content}</p>
        <button class="ui button">${buttonText}</button>
    </div>
`;

// ❌ WRONG
const htmlBad = '<div class="ui segment">\n' +
    '  <h3 class="header">' + title + '</h3>\n' +
    '  <p>' + content + '</p>\n' +
    '</div>';
```

### Expression Evaluation

```javascript
const price = 100;
const tax = 0.1;

// Can include any valid expression
const total = `Total: $${(price * (1 + tax)).toFixed(2)}`;

// Conditional expressions
const status = `Status: ${isActive ? 'Active' : 'Inactive'}`;

// Function calls
const formatted = `Hello, ${getName().toUpperCase()}!`;
```

### Tagged Templates (Advanced)

```javascript
function sanitize(strings, ...values) {
    return strings.reduce((result, string, i) => {
        const value = values[i - 1];
        const sanitized = typeof value === 'string'
            ? value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : value;
        return result + sanitized + string;
    });
}

const userInput = '<script>alert("xss")</script>';
const safe = sanitize`User input: ${userInput}`;
// Result: "User input: &lt;script&gt;alert("xss")&lt;/script&gt;"
```

## Destructuring

### Object Destructuring

```javascript
// ✅ CORRECT
function processResponse(response) {
    const { result, data, messages } = response;

    if (result === true) {
        updateUI(data);
    } else {
        showError(messages);
    }
}

// ❌ WRONG
function processResponseBad(response) {
    const result = response.result;
    const data = response.data;
    const messages = response.messages;
}
```

### Nested Destructuring

```javascript
const user = {
    name: 'John',
    settings: {
        theme: 'dark',
        language: 'en'
    }
};

// Extract nested properties
const { name, settings: { theme, language } } = user;
console.log(theme); // 'dark'
```

### Default Values

```javascript
// ✅ CORRECT - With defaults
function processResponse({ result = false, data = {}, messages = [] } = {}) {
    // If properties missing, defaults are used
}

// Works with undefined/null
const { timeout = 1000, retries = 3 } = config || {};
```

### Renaming Variables

```javascript
const response = {
    success: true,
    payload: { items: [] }
};

// Rename while destructuring
const { success: isSuccess, payload: data } = response;
console.log(isSuccess); // true
console.log(data); // { items: [] }
```

### Array Destructuring

```javascript
// ✅ CORRECT
const [first, second, ...rest] = items;

// Skip elements
const [, , third] = items;

// Swapping values
let a = 1, b = 2;
[a, b] = [b, a];

// Function return values
const [error, result] = await asyncOperation();
```

### Function Parameters

```javascript
// ✅ CORRECT
function createUser({ name, email, age = 18 }) {
    return {
        name,
        email,
        age,
        created: Date.now()
    };
}

createUser({ name: 'John', email: 'john@example.com' });
```

## Spread and Rest Operators

### Spread in Arrays

```javascript
// ✅ CORRECT - Copy array
const original = [1, 2, 3];
const copy = [...original];

// Concatenate arrays
const combined = [...array1, ...array2, ...array3];

// Add elements
const extended = [...original, 4, 5, 6];
const prepended = [0, ...original];

// Convert NodeList/arguments to array
const elements = [...document.querySelectorAll('.item')];
```

### Spread in Objects

```javascript
// ✅ CORRECT - Copy object
const original = { a: 1, b: 2 };
const copy = { ...original };

// Merge objects
const merged = { ...defaults, ...options };

// Override properties
const updated = {
    ...user,
    age: 30,
    updated: Date.now()
};

// Conditional properties
const config = {
    ...baseConfig,
    ...(isDev && { debug: true }),
    ...(isProduction && { minify: true })
};
```

### Rest Parameters

```javascript
// ✅ CORRECT - Collect remaining arguments
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

sum(1, 2, 3, 4); // 10

// Combine with regular parameters
function logMessage(level, ...messages) {
    console.log(`[${level}]`, ...messages);
}

// Rest in destructuring
const { first, second, ...remaining } = object;
const [head, ...tail] = array;
```

## Object Enhancements

### Property Shorthand

```javascript
// ✅ CORRECT
const extension = '100';
const priority = 1;

const member = {
    extension,
    priority,
    enabled: true
};

// ❌ WRONG
const memberBad = {
    extension: extension,
    priority: priority,
    enabled: true
};
```

### Method Shorthand

```javascript
// ✅ CORRECT
const module = {
    initialize() {
        // code
    },

    handleClick(event) {
        // code
    }
};

// ❌ WRONG
const moduleBad = {
    initialize: function() {
        // code
    },

    handleClick: function(event) {
        // code
    }
};
```

### Computed Property Names

```javascript
// ✅ CORRECT
const fieldName = 'extension';
const errors = {
    [fieldName]: 'Invalid extension',
    [`${fieldName}_duplicate`]: 'Already exists'
};

// Dynamic keys
const key = 'dynamic';
const obj = {
    [key]: 'value',
    [`get${key.charAt(0).toUpperCase() + key.slice(1)}`]() {
        return this[key];
    }
};
```

## Array Methods

### map - Transform Elements

```javascript
// ✅ CORRECT
const numbers = [1, 2, 3, 4];
const doubled = numbers.map(n => n * 2);

// Extract properties
const names = users.map(user => user.name);

// Create objects
const members = extensions.map((ext, index) => ({
    extension: ext,
    priority: index
}));
```

### filter - Select Elements

```javascript
// ✅ CORRECT
const enabled = extensions.filter(ext => ext.enabled);
const adults = users.filter(user => user.age >= 18);

// Combine conditions
const active = users.filter(user =>
    user.enabled && user.lastLogin > cutoffDate
);
```

### reduce - Aggregate Data

```javascript
// ✅ CORRECT - Sum
const total = numbers.reduce((sum, n) => sum + n, 0);

// Group by property
const grouped = items.reduce((groups, item) => {
    const key = item.category;
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
}, {});

// Count occurrences
const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
}, {});
```

### find and findIndex

```javascript
// ✅ CORRECT
const user = users.find(u => u.id === userId);
const index = users.findIndex(u => u.email === email);

// With default
const user = users.find(u => u.id === userId) || defaultUser;
```

### some and every

```javascript
// ✅ CORRECT
const hasAdmin = users.some(u => u.role === 'admin');
const allEnabled = users.every(u => u.enabled);

// Validation
const isValid = fields.every(field =>
    field.value && field.value.length > 0
);
```

### forEach

```javascript
// ✅ CORRECT - Side effects only
users.forEach(user => {
    sendEmail(user.email);
});

// ❌ WRONG - Use map instead
const names = [];
users.forEach(user => {
    names.push(user.name); // Should use map
});
```

### includes

```javascript
// ✅ CORRECT
const validTypes = ['sip', 'iax', 'dahdi'];
if (validTypes.includes(type)) {
    // handle
}

// ❌ WRONG
if (validTypes.indexOf(type) !== -1) {
    // handle
}
```

## Promises and Async/Await

### Creating Promises

```javascript
function fetchData(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url,
            success: (data) => resolve(data),
            error: (error) => reject(error)
        });
    });
}
```

### Async/Await

```javascript
// ✅ CORRECT
const dataLoader = {
    async loadExtensions() {
        try {
            const response = await ApiWrapper.call('/extensions/list');
            this.extensions = response.data;
            return this.extensions;
        } catch (error) {
            console.error('Failed to load extensions:', error);
            UserMessage.showError(error.message);
            throw error;
        } finally {
            this.$loader.removeClass('loading');
        }
    },

    async saveExtension(data) {
        try {
            this.$saveButton.addClass('loading');
            const response = await ApiWrapper.call('/extensions/save', data);
            UserMessage.showSuccess('Saved successfully');
            return response.data;
        } catch (error) {
            UserMessage.showError(error.message);
        } finally {
            this.$saveButton.removeClass('loading');
        }
    }
};
```

### Promise.all

```javascript
// ✅ CORRECT - Parallel requests
async function loadAllData() {
    try {
        const [extensions, providers, settings] = await Promise.all([
            ApiWrapper.call('/extensions/list'),
            ApiWrapper.call('/providers/list'),
            ApiWrapper.call('/settings/get')
        ]);

        return { extensions, providers, settings };
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}
```

## Modules

### Export

```javascript
// Named exports
export const config = { timeout: 1000 };
export function helper() { }
export class Validator { }

// Default export
export default class Module {
    initialize() { }
}

// Export existing
const utils = { };
export { utils };
```

### Import

```javascript
// Named imports
import { config, helper } from './utils';

// Default import
import Module from './module';

// Rename
import { config as appConfig } from './utils';

// Import all
import * as Utils from './utils';

// Side effect only
import './init';
```

## Classes

### Basic Class

```javascript
class Extension {
    constructor(number, name) {
        this.number = number;
        this.name = name;
        this.enabled = true;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    get displayName() {
        return `${this.number} - ${this.name}`;
    }

    static create(data) {
        return new Extension(data.number, data.name);
    }
}
```

### Inheritance

```javascript
class SipExtension extends Extension {
    constructor(number, name, secret) {
        super(number, name);
        this.secret = secret;
        this.type = 'sip';
    }

    authenticate(password) {
        return password === this.secret;
    }
}
```

## Optional Chaining and Nullish Coalescing

### Optional Chaining (?.)

```javascript
// ✅ CORRECT - Safe property access
const email = user?.contact?.email;
const firstItem = array?.[0];
const result = obj?.method?.();

// Without optional chaining
const emailOld = user && user.contact && user.contact.email;
```

### Nullish Coalescing (??)

```javascript
// ✅ CORRECT - Default for null/undefined only
const timeout = config.timeout ?? 1000;
const name = user.name ?? 'Anonymous';

// Different from || which treats 0, '', false as falsy
const count = response.count ?? 10; // If count is 0, uses 0
const countWrong = response.count || 10; // If count is 0, uses 10
```

### Combining Both

```javascript
const displayName = user?.profile?.name ?? 'Guest User';
const notifications = settings?.notifications?.enabled ?? true;
```

## Best Practices Summary

1. **Use const by default** - Only use let when reassignment needed
2. **Arrow functions for callbacks** - Preserves context automatically
3. **Template literals for strings** - More readable and maintainable
4. **Destructure when extracting multiple properties** - Cleaner code
5. **Spread for copying** - Immutable operations
6. **Array methods over loops** - More functional, readable
7. **Async/await over callbacks** - Better error handling, readability
8. **Optional chaining for safety** - Prevent null/undefined errors
9. **Nullish coalescing for defaults** - More precise than ||
10. **Method shorthand in objects** - Consistent syntax
