<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form(['action' : 'providers/save/iax', 'method': 'post', 'role': 'form', 'class': 'ui large form ', 'id':'save-provider-form']) }}
{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
{{ form.render('providerType') }}


<div class="required field max-width-500">
    <label for="description">{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>

<div class="field max-width-500">
    <label for="registration_type">{{ t._('iax_registration_type') }}</label>
    {{ form.render('registration_type') }}
</div>
<div id='elHost' class="field required max-width-500">
    <label for="host">{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>
<div id='elPort' class="field max-width-200">
    <label for="port">{{ t._('pr_IAXPort') }}</label>
    {{ form.render('port') }}
</div>

<div id='elUsername' class="field max-width-500">
    <label for="username">{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div id='elSecret' class="field max-width-500">
    <label for="secret">{{ t._('pr_ProviderPassword') }}</label>
    <div class="ui action input">
        {{ form.render('secret') }}
        <div class="ui tiny basic icon left attached buttons ">
            <button class="ui button popuped" id="show-hide-password" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipShowPassword') }}">
                <i class="eye icon"></i>
            </button>
            <button class="ui button popuped" id="generate-new-password" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipGeneratePassword') }}" style="display: none;">
                <i class="refresh icon"></i>
            </button>
            <button class="ui button popuped clipboard" data-clipboard-text="{{ form.getValue('secret') }}" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipCopyPassword') }}" style="display: none;">
                <i class="copy icon"></i>
            </button>
        </div>
    </div>
</div>
<div class="field max-width-800">
    <label for="note">{{ t._('pr_Note') }}</label>
    {{ form.render('note') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class="content field">
        <h3 class="ui dividing header ">{{ t._("pr_RegistrationSettings") }}</h3>
        
        <div id='elReceiveCalls' class="field max-width-400">
            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox" id="receive_calls_without_auth">
                        {{ form.render('receive_calls_without_auth') }}
                        <label>{{ t._('pr_ReceiveCallsWithoutAuth') }}</label>
                    </div>
                </div>
            </div>
        </div>
        <div class='ui icon warning message hidden'>
            <i class="exclamation triangle icon"></i>
            <div class="content">
                <div class="header">{{ t._('pr_SecurityWarning') }}</div>
                <p>{{ t._('pr_ReceiveCallsWithoutAuthWarning') }}</p>
            </div>
        </div>
        
        {# Network filter field is hidden, will be set to default value #}
        {{ form.render('networkfilterid') }}

        {{ form.render('noregister') }}

        <h4 class="ui dividing header ">{{ t._("pr_ManualAdditionalAtributes") }}</h4>
        <div class="field">
            {{ form.render('manualattributes') }}
        </div>

        {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('AdvancedFields')]) }}
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
{{ close('form') }}