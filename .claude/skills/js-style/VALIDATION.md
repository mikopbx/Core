# Form Validation Patterns for MikoPBX

Complete guide to form validation using Fomantic-UI form validation in MikoPBX.

## Table of Contents

- [Basic Validation Setup](#basic-validation-setup)
- [Built-in Validation Rules](#built-in-validation-rules)
- [Custom Validation Rules](#custom-validation-rules)
- [Complex Validation Scenarios](#complex-validation-scenarios)
- [Error Messages](#error-messages)
- [Validation Helpers](#validation-helpers)
- [Real-World Examples](#real-world-examples)

## Basic Validation Setup

### Standard Form Validation Pattern

```javascript
const formHandler = {
    $formObj: $('#module-form'),

    initialize() {
        // Configure Form object
        Form.$formObj = formHandler.$formObj;
        Form.url = `${globalRootUrl}module/save`;
        Form.validateRules = formHandler.validateRules;
        Form.cbBeforeSendForm = formHandler.cbBeforeSendForm;
        Form.cbAfterSendForm = formHandler.cbAfterSendForm;
        Form.initialize();
    },

    validateRules: {
        fieldName: {
            identifier: 'field-name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.mod_ValidateFieldEmpty,
                },
            ],
        },
    },

    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = formHandler.$formObj.form('get values');
        return result;
    },

    cbAfterSendForm(response) {
        if (response.success === true) {
            UserMessage.showInformation(globalTranslate.mod_SuccessfullySaved);
        }
    }
};
```

### Direct Form Validation

```javascript
const directForm = {
    $formObj: $('#my-form'),

    initialize() {
        directForm.$formObj.form({
            fields: directForm.validateRules,
            inline: true,
            on: 'blur',
            onSuccess(event, fields) {
                event.preventDefault();
                directForm.handleSubmit(fields);
            },
            onFailure() {
                UserMessage.showError(globalTranslate.form_ValidationError);
            }
        });
    },

    validateRules: {
        // Validation rules
    }
};
```

## Built-in Validation Rules

### Empty Validation

```javascript
validateRules: {
    name: {
        identifier: 'name',
        rules: [
            {
                type: 'empty',
                prompt: globalTranslate.mod_ValidateNameEmpty,
            },
        ],
    }
}
```

### Number Validation

```javascript
validateRules: {
    extension: {
        identifier: 'extension',
        rules: [
            {
                type: 'number',
                prompt: globalTranslate.mod_ValidateExtensionNumber,
            },
            {
                type: 'empty',
                prompt: globalTranslate.mod_ValidateExtensionEmpty,
            },
        ],
    },
    port: {
        identifier: 'port',
        rules: [
            {
                type: 'integer[1..65535]',
                prompt: 'Port must be between 1 and 65535',
            },
        ],
    }
}
```

### Email Validation

```javascript
validateRules: {
    email: {
        identifier: 'email',
        rules: [
            {
                type: 'empty',
                prompt: globalTranslate.mod_ValidateEmailEmpty,
            },
            {
                type: 'email',
                prompt: globalTranslate.mod_ValidateEmailInvalid,
            },
        ],
    }
}
```

### Length Validation

```javascript
validateRules: {
    username: {
        identifier: 'username',
        rules: [
            {
                type: 'empty',
                prompt: 'Username is required',
            },
            {
                type: 'minLength[3]',
                prompt: 'Username must be at least 3 characters',
            },
            {
                type: 'maxLength[20]',
                prompt: 'Username must be no more than 20 characters',
            },
        ],
    },
    password: {
        identifier: 'password',
        rules: [
            {
                type: 'minLength[8]',
                prompt: 'Password must be at least 8 characters',
            },
        ],
    }
}
```

### RegExp Validation

```javascript
validateRules: {
    phoneNumber: {
        identifier: 'phone',
        rules: [
            {
                type: 'regExp[/^[0-9\\-\\+\\(\\)\\s]+$/]',
                prompt: 'Please enter a valid phone number',
            },
        ],
    },
    extension: {
        identifier: 'extension',
        rules: [
            {
                type: 'regExp[/^[0-9]+$/]',
                prompt: globalTranslate.mod_ValidateExtensionFormat,
            },
        ],
    }
}
```

### Match Validation

```javascript
validateRules: {
    password: {
        identifier: 'password',
        rules: [
            {
                type: 'empty',
                prompt: 'Password is required',
            },
        ],
    },
    passwordConfirm: {
        identifier: 'password-confirm',
        rules: [
            {
                type: 'match[password]',
                prompt: 'Passwords must match',
            },
        ],
    }
}
```

### URL Validation

```javascript
validateRules: {
    website: {
        identifier: 'website',
        rules: [
            {
                type: 'url',
                prompt: 'Please enter a valid URL',
            },
        ],
    }
}
```

## Custom Validation Rules

### Adding Custom Rules

```javascript
// Add custom validation rules at module level
const customValidation = {
    initialize() {
        // Phone number validation
        $.fn.form.settings.rules.phone = (value) => {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
        };

        // IP address validation
        $.fn.form.settings.rules.ipAddress = (value) => {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(value)) return false;

            const parts = value.split('.');
            return parts.every(part => parseInt(part, 10) <= 255);
        };

        // Strong password validation
        $.fn.form.settings.rules.strongPassword = (value) => {
            const hasLower = /[a-z]/.test(value);
            const hasUpper = /[A-Z]/.test(value);
            const hasNumber = /\d/.test(value);
            const hasSpecial = /[@$!%*?&]/.test(value);
            return value.length >= 8 && hasLower && hasUpper && hasNumber && hasSpecial;
        };

        // Extension exists check
        $.fn.form.settings.rules.extensionExists = (value, identifier) => {
            let result = true;
            $.api({
                url: `${globalRootUrl}extensions/check/${value}`,
                async: false,
                onSuccess(response) {
                    result = response.available === true;
                }
            });
            return result;
        };

        // Unique value check
        $.fn.form.settings.rules.unique = (value, identifier) => {
            const existingValues = $(`.${identifier}`).not(`[value="${value}"]`)
                .map((i, el) => $(el).val())
                .get();
            return !existingValues.includes(value);
        };
    }
};
```

### Using Custom Rules

```javascript
validateRules: {
    phoneNumber: {
        identifier: 'phone',
        rules: [
            {
                type: 'empty',
                prompt: 'Phone number is required',
            },
            {
                type: 'phone',
                prompt: 'Please enter a valid phone number',
            },
        ],
    },
    ipAddress: {
        identifier: 'ip',
        rules: [
            {
                type: 'ipAddress',
                prompt: 'Please enter a valid IP address (e.g., 192.168.1.1)',
            },
        ],
    },
    password: {
        identifier: 'password',
        rules: [
            {
                type: 'strongPassword',
                prompt: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
            },
        ],
    }
}
```

## Complex Validation Scenarios

### Conditional Validation

```javascript
const conditionalValidation = {
    initialize() {
        // Rule that depends on another field
        $.fn.form.settings.rules.requiredIfEnabled = function(value, identifier) {
            const $enabledField = $(`#${identifier}`);
            const isEnabled = $enabledField.checkbox('is checked');

            if (isEnabled) {
                return value !== '';
            }
            return true;
        };
    }
};

// Usage
validateRules: {
    emailNotifications: {
        identifier: 'email',
        rules: [
            {
                type: 'requiredIfEnabled[enable-notifications]',
                prompt: 'Email is required when notifications are enabled',
            },
            {
                type: 'email',
                prompt: 'Please enter a valid email',
            },
        ],
    }
}
```

### Cross-field Validation

```javascript
const formValidator = {
    validateRules: {
        startDate: {
            identifier: 'start-date',
            rules: [
                {
                    type: 'empty',
                    prompt: 'Start date is required',
                },
            ],
        },
        endDate: {
            identifier: 'end-date',
            rules: [
                {
                    type: 'empty',
                    prompt: 'End date is required',
                },
            ],
        },
    },

    initialize() {
        formValidator.$formObj.form({
            fields: formValidator.validateRules,
            inline: true,
            onSuccess(event, fields) {
                event.preventDefault();

                // Additional cross-field validation
                const startDate = new Date(fields.startDate);
                const endDate = new Date(fields.endDate);

                if (endDate < startDate) {
                    UserMessage.showError('End date must be after start date');
                    return false;
                }

                formValidator.handleSubmit(fields);
            }
        });
    }
};
```

### Dynamic Validation

```javascript
const dynamicForm = {
    updateValidation(fieldType) {
        let rules = [];

        switch (fieldType) {
            case 'email':
                rules = [
                    { type: 'empty', prompt: 'Email is required' },
                    { type: 'email', prompt: 'Invalid email' }
                ];
                break;
            case 'phone':
                rules = [
                    { type: 'empty', prompt: 'Phone is required' },
                    { type: 'phone', prompt: 'Invalid phone' }
                ];
                break;
        }

        // Update validation rules
        dynamicForm.$formObj.form('remove rule', 'contact-field');
        dynamicForm.$formObj.form('add rule', 'contact-field', rules);
    }
};
```

## Error Messages

### Custom Error Display

```javascript
const errorHandler = {
    $errorMessages: $('#form-error-messages'),

    showErrors(errors) {
        errorHandler.$errorMessages.empty();

        const html = `
            <div class="ui error message">
                <i class="close icon"></i>
                <div class="header">Validation Errors</div>
                <ul class="list">
                    ${errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
            </div>
        `;

        errorHandler.$errorMessages.html(html);
        errorHandler.$errorMessages.find('.close').on('click', () => {
            errorHandler.$errorMessages.empty();
        });
    },

    clearErrors() {
        errorHandler.$errorMessages.empty();
    }
};
```

### Inline Error Messages

```javascript
// Form settings with inline errors
$formObj.form({
    fields: validateRules,
    inline: true, // Show errors inline
    on: 'blur',   // Validate on blur
    transition: 'fade down'
});
```

## Validation Helpers

### Manual Validation Trigger

```javascript
const validationHelpers = {
    /**
     * Validate single field
     * @param {string} identifier - Field identifier
     * @returns {boolean} Is valid
     */
    validateField(identifier) {
        return formHandler.$formObj.form('validate field', identifier);
    },

    /**
     * Validate entire form
     * @returns {boolean} Is valid
     */
    validateForm() {
        return formHandler.$formObj.form('validate form');
    },

    /**
     * Check if form is valid without showing errors
     * @returns {boolean} Is valid
     */
    isValid() {
        return formHandler.$formObj.form('is valid');
    },

    /**
     * Get validation errors
     * @returns {Array} Array of error messages
     */
    getErrors() {
        const errors = [];
        formHandler.$formObj.form('get validation');
        formHandler.$formObj.find('.field.error').each((i, field) => {
            const $field = $(field);
            const label = $field.find('label').text();
            const error = $field.find('.prompt').text();
            errors.push(`${label}: ${error}`);
        });
        return errors;
    },

    /**
     * Clear all validation errors
     */
    clearErrors() {
        formHandler.$formObj.form('clear');
    }
};
```

### Validation State Management

```javascript
const validationState = {
    /**
     * Add validation rule dynamically
     * @param {string} identifier - Field identifier
     * @param {Array} rules - Validation rules
     */
    addRule(identifier, rules) {
        formHandler.$formObj.form('add rule', identifier, rules);
    },

    /**
     * Remove validation rule
     * @param {string} identifier - Field identifier
     */
    removeRule(identifier) {
        formHandler.$formObj.form('remove rule', identifier);
    },

    /**
     * Enable/disable field validation
     * @param {string} identifier - Field identifier
     * @param {boolean} enable - Enable or disable
     */
    toggleValidation(identifier, enable) {
        if (enable) {
            formHandler.$formObj.form('add rule', identifier, validationState.rules[identifier]);
        } else {
            formHandler.$formObj.form('remove rule', identifier);
        }
    }
};
```

## Real-World Examples

### Call Queue Form Validation

```javascript
const callQueue = {
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateNameEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.cq_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateExtensionEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cq_ValidateExtensionDouble,
                },
            ],
        },
    },

    cbBeforeSendForm(settings) {
        let result = settings;
        result.data = callQueue.$formObj.form('get values');

        const arrMembers = [];
        $(callQueue.memberRow).each((index, obj) => {
            if ($(obj).attr('id')) {
                arrMembers.push({
                    number: $(obj).attr('id'),
                    priority: index,
                });
            }
        });

        if (arrMembers.length === 0) {
            result = false;
            callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
            callQueue.$formObj.addClass('error');
        } else {
            result.data.members = JSON.stringify(arrMembers);
        }

        return result;
    }
};
```

### Extension Form Validation

```javascript
const extensionForm = {
    validateRules: {
        number: {
            identifier: 'number',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateNumberEmpty,
                },
                {
                    type: 'regExp[/^[0-9]+$/]',
                    prompt: globalTranslate.ex_ValidateNumberFormat,
                },
            ],
        },
        mobile_number: {
            identifier: 'mobile_number',
            optional: true,
            rules: [
                {
                    type: 'regExp[/^[0-9\\-\\+\\(\\)\\s]+$/]',
                    prompt: globalTranslate.ex_ValidateMobileFormat,
                },
            ],
        },
        user_username: {
            identifier: 'user_username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateUsernameEmpty,
                },
            ],
        },
        sip_secret: {
            identifier: 'sip_secret',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateSecretEmpty,
                },
                {
                    type: 'minLength[6]',
                    prompt: globalTranslate.ex_ValidateSecretWeak,
                },
            ],
        },
    }
};
```

### Provider Form Validation

```javascript
const providerForm = {
    validateRules: {
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateNameEmpty,
                },
            ],
        },
        host: {
            identifier: 'host',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateHostEmpty,
                },
            ],
        },
        username: {
            identifier: 'username',
            optional: true,
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateUsernameEmpty,
                },
            ],
        },
        port: {
            identifier: 'port',
            optional: true,
            rules: [
                {
                    type: 'integer[1..65535]',
                    prompt: globalTranslate.pr_ValidatePortRange,
                },
            ],
        },
    }
};
```

## Best Practices

1. **Always provide clear error messages** - Use translation keys for consistency
2. **Validate on appropriate events** - `blur` for individual fields, `submit` for final check
3. **Use inline validation** - Shows errors next to fields for better UX
4. **Handle async validation properly** - Use callbacks and loading states
5. **Clean up error messages** - Clear on successful submit or form reset
6. **Combine multiple rules** - Check empty first, then format/range
7. **Use optional flag** - For fields that are not always required
8. **Custom validation for complex logic** - Don't force complex rules into regex
9. **Test validation extensively** - Edge cases and boundary values
10. **Provide helpful feedback** - Error messages should guide users to correct input

## Summary

- Use Fomantic-UI form validation for consistency
- Leverage built-in rules when possible
- Create custom rules for business logic
- Handle errors gracefully with clear messages
- Validate both client-side and server-side
- Test thoroughly with various inputs
