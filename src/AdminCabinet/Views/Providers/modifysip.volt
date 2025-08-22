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
{{ form(['action' : 'providers/save/sip', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'save-provider-form']) }}

{{ form.render('id') }}
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
            <div class="ui toggle checkbox">
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
            <div class="ui toggle checkbox">
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
        
        <!-- DID Source -->
        <div class="field max-width-400">
            <label for="did_source">
                {{ t._('pr_DidSource') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="did_source"></i>
            </label>
            {{ form.render('did_source') }}
        </div>
        
        <!-- DID Custom Settings (показывается только при did_source=custom) -->
        <div id="did-custom-settings" style="display: none; margin-left: 20px; padding: 15px; border-left: 3px solid #e0e1e2;">
            <div class="field max-width-400">
                <label for="did_custom_header">
                    {{ t._('pr_CustomHeaderName') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="did_custom_header"></i>
                </label>
                {{ form.render('did_custom_header') }}
            </div>
            
            <div class="two fields">
                <div class="field max-width-200">
                    <label for="did_parser_start">
                        {{ t._('pr_ParserStartDelimiter') }}
                    </label>
                    {{ form.render('did_parser_start') }}
                </div>
                <div class="field max-width-200">
                    <label for="did_parser_end">
                        {{ t._('pr_ParserEndDelimiter') }}
                    </label>
                    {{ form.render('did_parser_end') }}
                </div>
            </div>
            
            <div class="field max-width-400">
                <label for="did_parser_regex">
                    {{ t._('pr_ParserRegex') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="did_parser_regex"></i>
                </label>
                {{ form.render('did_parser_regex') }}
            </div>
        </div>
        
        <!-- CallerID Source -->
        <div class="field max-width-400">
            <label for="cid_source">
                {{ t._('pr_CallerIdSource') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="callerid_source"></i>
            </label>
            {{ form.render('cid_source') }}
        </div>
        
        <!-- CallerID Custom Settings (показывается только при cid_source=custom) -->
        <div id="callerid-custom-settings" style="display: none; margin-left: 20px; padding: 15px; border-left: 3px solid #e0e1e2;">
            <div class="field max-width-400">
                <label for="cid_custom_header">
                    {{ t._('pr_CustomHeaderName') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="cid_custom_header"></i>
                </label>
                {{ form.render('cid_custom_header') }}
            </div>
            
            <div class="two fields">
                <div class="field max-width-200">
                    <label for="cid_parser_start">
                        {{ t._('pr_ParserStartDelimiter') }}
                    </label>
                    {{ form.render('cid_parser_start') }}
                </div>
                <div class="field max-width-200">
                    <label for="cid_parser_end">
                        {{ t._('pr_ParserEndDelimiter') }}
                    </label>
                    {{ form.render('cid_parser_end') }}
                </div>
            </div>
            
            <div class="field max-width-400">
                <label for="cid_parser_regex">
                    {{ t._('pr_ParserRegex') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="cid_parser_regex"></i>
                </label>
                {{ form.render('cid_parser_regex') }}
            </div>
        </div>
        
        <!-- Debug Mode for CallerID/DID -->
        <div class="field">
            <div class="ui toggle checkbox">
                {{ form.render('cid_did_debug') }}
                <label for="cid_did_debug">
                    {{ t._('pr_EnableCallerIdDidDebug') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="callerid_did_debug"></i>
                </label>
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
