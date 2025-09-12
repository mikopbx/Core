{{ form(['action' : 'api-keys/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'save-api-key-form']) }}
{{ form.render('id') }}
<input type="hidden" id="key_display" name="key_display">

<div class="field max-width-800 required">
    <label>{{ t._('ak_Description') }}</label>
    {{ form.render('description') }}
</div>

{% if not apiKeyId %}
<!-- Hidden field for storing generated API key -->
{{ form.render('api_key') }}
<div class="field max-width-800">
    <label>{{ t._('ak_ApiKey') }}
        <i class="small info circle icon field-info-icon" data-field="api_key_usage"></i>
    </label>
    <div class="ui input action">
        <input type="text" id="api-key-display" readonly autocomplete="new-password" data-no-password-manager="true">
        <button type="button" class="ui basic icon button regenerate-api-key" data-content="{{ t._('ak_RegenerateApiKey') }}">
            <i class="sync icon"></i>
        </button>
        <button type="button" class="ui basic icon button copy-api-key" data-content="{{ t._('ak_CopyApiKey') }}">
            <i class="icons">
                <i class="icon copy"></i>
                <i class="corner key icon"></i>
            </i>
        </button>
    </div>
    <div class="ui warning message">
        <i class="warning icon"></i>
        {{ t._('ak_ApiKeyWarning') }}
    </div>
</div>
{% else %}
<!-- For existing keys, show key representation in header -->
<!-- Hidden field for storing regenerated API key -->
<input type="hidden" id="api_key" name="api_key">
<div class="field max-width-800">
    <label>{{ t._('ak_ApiKey') }} <span class="api-key-suffix" style="display: none;"></span>
        <i class="small info circle icon field-info-icon" data-field="api_key_usage"></i>
    </label>
    <div class="ui input action">
        <input type="text" id="api-key-display" readonly value="{{ t._('ak_KeyHidden') }}" placeholder="{{ t._('ak_ExistingApiKeyInfo') }}">
        <button type="button" class="ui basic icon button regenerate-api-key" data-content="{{ t._('ak_RegenerateApiKey') }}">
            <i class="sync icon"></i>
        </button>
        <button type="button" class="ui basic icon button copy-api-key" data-content="{{ t._('ak_CopyApiKey') }}" style="display: none;">
            <i class="icons">
                <i class="icon copy"></i>
                <i class="corner key icon"></i>
            </i>
        </button>
    </div>
</div>
{% endif %}

<div class="max-width-800 field">
    <label>{{ t._('ak_NetworkFilter') }}</label>
    {{ form.render('networkfilterid') }}
</div>

<!-- Permissions Section -->

    <!-- Toggle for full permissions mode -->
    <div class="field" style="margin-bottom: 1.5em;">
        <div class="ui toggle checkbox" id="full-permissions-toggle">
            <input type="checkbox" name="full_permissions" checked>
            <label>{{ t._('ak_FullPermissions') }}</label>
        </div>
    </div>
    
    <!-- Full permissions warning (shown when full permissions enabled) -->
    <div id="full-permissions-warning" class="ui icon message">
        <i class="warning icon"></i>
        <div class="content">
            <div class="header">{{ t._('ak_FullPermissionsWarningTitle') }}</div>
            <p>{{ t._('ak_FullPermissionsWarningText') }}</p>
        </div>
    </div>
    
    <!-- Selective permissions section (hidden by default) -->
    <div id="selective-permissions-section" style="display: none;">
        <!-- Permissions DataTable -->
        <table class="ui selectable compact unstackable table" id="api-permissions-table" >
            <thead>
            </thead>
            <tbody>
                <!-- Controllers will be loaded dynamically via JavaScript -->
            </tbody>
        </table>
    </div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'api-keys/index']) }}

{{ close('form') }}