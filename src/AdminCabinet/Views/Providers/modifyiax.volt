<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>

<!-- Tab menu -->
<div class="ui top attached tabular menu" id="provider-tabs-menu">
    <a class="item active" data-tab="settings">
        <i class="settings icon"></i> {{ t._('pr_Settings') }}
    </a>
    <a class="item" data-tab="diagnostics">
        <i class="heartbeat icon"></i> {{ t._('pr_Diagnostics') }}
    </a>
</div>

<!-- Settings tab -->
<div class="ui bottom attached tab segment active" data-tab="settings">
{{ form(['action' : 'providers/save/iax', 'method': 'post', 'role': 'form', 'class': 'ui form ', 'id':'save-provider-form']) }}
{{ form.render('id') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
<input type="hidden" id="providerType" value="IAX" />


<div class="required field max-width-500">
    <label for="description">{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>

<div class="field max-width-500">
    <label for="registration_type">
        {{ t._('iax_registration_type') }}
        <i class="small info circle icon field-info-icon" 
           data-field="registration_type"></i>
    </label>
    {{ form.render('registration_type') }}
</div>
<div id='elHost' class="field required max-width-500">
    <label for="host">
        <span id="hostLabelText">{{ t._('pr_ProviderHostOrIPAddress') }}</span>
        <i class="small info circle icon field-info-icon" 
           data-field="provider_host"></i>
    </label>
    {{ form.render('host') }}
</div>

<div id='elUsername' class="field max-width-500">
    <label for="username"><span id="usernameLabelText">{{ t._('pr_ProviderLogin') }}</span></label>
    {{ form.render('username') }}
</div>

<div id='elSecret' class="field max-width-500">
    <label for="secret">
        <span id="secretLabelText">{{ t._('pr_ProviderPassword') }}</span>
        <i class="small info circle icon field-info-icon password-tooltip-icon" 
           data-field="provider_password" style="display: none;"></i>
    </label>
    <div class="ui input">
        {{ form.render('secret') }}
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
        
        <!-- Группа: Сетевые настройки -->
        <h4 class="ui dividing header ">{{ t._('pr_NetworkSettings') }}</h4>
        
        <div id='elPort' class="field">
            <label for="port">
                <span id="portLabelText">{{ t._('pr_IAXPort') }}</span>
                <i class="small info circle icon field-info-icon" 
                   data-field="iax_port"></i>
            </label>
            <div class="field max-width-200">
                {{ form.render('port') }}
            </div>
        </div>
        
        <!-- Группа: Настройки безопасности -->
        <h4 class="ui dividing header ">{{ t._('pr_SecuritySettings') }}</h4>
        
        <div id='elReceiveCalls' class="field">
            <div class="ui toggle checkbox">
                {{ form.render('receive_calls_without_auth') }}
                <label>
                    {{ t._('pr_ReceiveCallsWithoutAuth') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="receive_calls_without_auth"></i>
                </label>
            </div>
        </div>
        
        <div id="elNetworkFilter" class="field">
            <label>
                {{ t._('pr_NetworkFilter') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="network_filter"></i>
            </label>
            <div class="ten wide field">
                {{ form.render('networkfilterid') }}
            </div>
        </div>

        <!-- Группа: Дополнительные параметры -->
        <h4 class="ui dividing header ">{{ t._('pr_AdditionalParameters') }}</h4>
        
        <div class="field">
            <label>
                {{ t._("pr_ManualAdditionalIAXAtributes") }}
                <i class="small info circle icon field-info-icon" 
                   data-field="manual_attributes"></i>
            </label>
            {{ form.render('manualattributes') }}
        </div>

        {{ form.render('noregister') }}

        {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('AdvancedFields')]) }}
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
{{ close('form') }}
</div>

<!-- Diagnostics tab -->
<div class="ui bottom attached tab segment" data-tab="diagnostics">
    {{ partial("Providers/partials/diagnostics-tab") }}
</div>

<script type="text/javascript">
// Create global instance of ProviderIAX
let providerIAX;

$(document).ready(function() {
    providerIAX = new ProviderIAX();
    providerIAX.initialize();
});
</script>