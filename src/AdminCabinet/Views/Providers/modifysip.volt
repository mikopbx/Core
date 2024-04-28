<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('providers/save/sip', 'role': 'form', 'class': 'ui large form', 'id':'save-provider-form') }}

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
    <label for="registration_type">{{ t._('sip_registration_type') }}</label>
    {{ form.render('registration_type') }}
</div>
<div id='elHost' class="field required max-width-500">
    <label for="host">{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>

<div id='elUsername' class="field max-width-500">
    <label for="username">{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div id='elSecret' class="field max-width-500">
    <label for="secret">{{ t._('pr_ProviderPassword') }}</label>
    <div class="ui action input">
        {{ form.render('secret') }}
        <div class="ui icon button" id="generate-new-password">
            <i class="refresh icon "></i>
        </div>
        <a class="ui button clipboard" data-clipboard-text="{{ secret }}" data-variation="basic" data-content="{{ t._('bt_ToolTipCopyPassword') }}">
            <i class="icons">
                <i class="icon copy "></i>
            </i>
        </a>
    </div>
</div>

<div class="field">
    <label for="dtmfmode">{{ t._('pr_DTMFMode') }}</label>
    <div class="field max-width-200">
        {{ form.render('dtmfmode') }}
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
        <div class="field max-width-500">
            <div id="elAdditionalHosts" class="field">
                <h4 class="ui dividing header ">{{ t._('pr_EnterHostOrIp') }}</h4>
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
        <div class="field">
            <label for="port">{{ t._('pr_SIPPort') }}</label>
            <div class="field max-width-200">
                {{ form.render('port') }}
            </div>
        </div>
        <div class="field">
            <label for="transport">{{ t._('ex_Transport') }}</label>
            <div class="field max-width-200">
                {{ form.render('transport') }}
            </div>
        </div>
        <div class="field">
            <label for="outbound_proxy">{{ t._('ex_OutboundProxy') }}</label>
            <div class="field max-width-500">
                {{ form.render('outbound_proxy') }}
            </div>
        </div>
        {{ partial("partials/natqualify") }}


        <h4 class="ui dividing header ">{{ t._('pr_RedefinitionFromUser') }}</h4>
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
            <div class='ui info message'>{{ t._('pr_CustomFieldsDescriptions') }}</div>
        </div>

        <h4 class="ui dividing header ">{{ t._("pr_ManualAdditionalAtributes") }}</h4>
        <div class="field">
            {{ form.render('manualattributes') }}
        </div>
        {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('AdvancedFields')]) }}
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
{{ end_form() }}
