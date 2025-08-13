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
{{ form(['action' : 'providers/save/sip', 'method': 'post', 'role': 'form', 'class': 'ui large form', 'id':'save-provider-form']) }}

{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
<input type="hidden" id="providerType" value="SIP" />
<div class="required field max-width-500">
    <label for="description">{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>
<div class="field max-width-500">
    <label for="registration_type">
        {{ t._('sip_registration_type') }}
        <i class="small info circle icon field-info-icon" 
           data-field="registration_type"></i>
    </label>
    {{ form.render('registration_type') }}
</div>
<div id='elHost' class="field required max-width-500">
    <label for="host" id="hostLabel">
        <span id="hostLabelText">{{ t._('pr_ProviderHostOrIPAddress') }}</span>
        <i class="small info circle icon field-info-icon" 
           data-field="provider_host"></i>
    </label>
    {{ form.render('host') }}
</div>

<div id='elUsername' class="field max-width-500">
    <label for="username">{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div id='elSecret' class="field max-width-500">
    <label for="secret">
        {{ t._('pr_ProviderPassword') }}
        <i class="small info circle icon field-info-icon password-tooltip-icon" 
           data-field="provider_password" style="display: none;"></i>
    </label>
    <div class="ui action input">
        {{ form.render('secret') }}
        <div class="ui tiny basic icon left attached buttons">
            <button class="ui button popuped" id="show-hide-password" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipShowPassword') }}">
                <i class="eye icon"></i>
            </button>
            <button class="ui button popuped" id="generate-new-password" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipGeneratePassword') }}">
                <i class="refresh icon"></i>
            </button>
            <button class="ui button popuped clipboard" data-clipboard-text="{{ form.getValue('secret') }}" type="button" tabindex="-1" data-content="{{ t._('bt_ToolTipCopyPassword') }}">
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
        <b>{{ t._('AdvancedOptions') }}</b>
    </div>

    <div class="content field">
        
        <!-- Group: Network settings -->
        <h4 class="ui dividing header ">{{ t._('pr_NetworkSettings') }}</h4>
        
        <div class="field max-width-500">
            <div id="elAdditionalHosts" class="field">
                <label>
                    {{ t._('pr_EnterHostOrIp') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="additional_hosts"></i>
                </label>
                <div class="ui input" id="additional-host">
                    <input type="text" name="additional-host" placeholder="{{ t._('pr_EnterHostOrIpPlaceholder') }}" />
                </div>
                <div class="ui basic compact segment">
                    <table class="ui small very compact table" id="additional-hosts-table">
                        <tbody>
                        {% for address in hostsTable %}
                            <tr class="host-row" data-value="{{ address }}">
                                <td class="address">{{ address }}</td>
                                <td class="right aligned collapsing">
                                    <div class="ui icon small button delete-row-button"><i class="icon trash red"></i></div>
                                </td>
                            </tr>
                        {% endfor %}
                        <tr class="host-row-tpl" style="display: none">
                            <td class="address"></td>
                            <td class="right aligned collapsing">
                                <div class="ui icon small button delete-row-button"><i class="icon trash red"></i></div>
                            </td>
                        </tr>
                        <tr class="dummy" style="display: none">
                            <td colspan="2" class="center aligned">
                                {{ t._('pr_NoAnyAdditionalHosts')}}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="field" id="elPort">
            <label for="port">
                {{ t._('pr_SIPPort') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="sip_port"></i>
            </label>
            <div class="field max-width-200">
                {{ form.render('port') }}
            </div>
        </div>
        
        <div class="field">
            <label for="transport">
                {{ t._('ex_Transport') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="transport_protocol"></i>
            </label>
            <div class="field max-width-200">
                {{ form.render('transport') }}
            </div>
        </div>
        
        <div class="field">
            <label for="outbound_proxy">
                {{ t._('ex_OutboundProxy') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="outbound_proxy"></i>
            </label>
            <div class="field max-width-500">
                {{ form.render('outbound_proxy') }}
            </div>
        </div>

        <!-- Group: NAT and connection -->
        <h4 class="ui dividing header ">{{ t._('pr_NATConnection') }}</h4>
        {{ partial("partials/natqualify") }}

        <!-- Group: Security settings -->
        <h4 class="ui dividing header ">{{ t._('pr_SecuritySettings') }}</h4>
        
        <div id='elReceiveCalls' class="field">
            <div class="ui toggle checkbox" id="receive_calls_without_auth">
                {{ form.render('receive_calls_without_auth') }}
                <label for="receive_calls_without_auth">
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

        <!-- Group: SIP headers -->
        <h4 class="ui dividing header ">
            {{ t._('pr_SIPHeaders') }}
            <i class="small info circle icon field-info-icon" 
               data-field="from_redefinition"></i>
        </h4>
        <div class="field">
            <div class="ui toggle checkbox" id="disablefromuser">
                {{ form.render('disablefromuser') }}
                <label for="disablefromuser">{{ t._('pr_DisableFromUser') }}</label>
            </div>
        </div>
        <div class="field">
            <div class="two fields ">
                <div id="divFromUser" class="field max-width-400">
                    <label for="fromuser">{{ t._('pr_FromUser_v2') }}:</label>
                    {{ form.render('fromuser') }}
                </div>
                <div class="field max-width-400">
                    <label for="fromdomain">{{ t._('pr_FromDomain_v2') }}:</label>
                    {{ form.render('fromdomain') }}
                </div>
            </div>
        </div>

        <!-- Group: Additional parameters -->
        <h4 class="ui dividing header ">{{ t._('pr_AdditionalParameters') }}</h4>
        
        <div class="field">
            <label for="dtmfmode">
                {{ t._('pr_DTMFMode') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="dtmf_mode"></i>
            </label>
            <div class="field max-width-200">
                {{ form.render('dtmfmode') }}
            </div>
        </div>
        
        <div class="field">
            <label>
                {{ t._('pr_ManualAdditionalAtributes') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="manual_attributes"></i>
            </label>
            {{ form.render('manualattributes') }}
        </div>
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
// Create global instance of ProviderSIP
let providerSIP;

$(document).ready(function() {
    providerSIP = new ProviderSIP();
    providerSIP.initialize();
});
</script>
