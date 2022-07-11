<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('providers/save/sip', 'role': 'form', 'class': 'ui large form', 'id':'save-provider-form') }}

{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
{{ form.render('providerType') }}
<input type="hidden" name="dirrty" id="dirrty"/>
<div class="ten wide required field">
    <label>{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>
<div class="six wide field">
    <label>{{ t._('sip_registration_type') }}</label>
    {{ form.render('registration_type') }}
</div>
<div id='elHost' class="five wide field required">
    <label>{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>

<div id='elUsername' class="ten wide field">
    <label>{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div id='elSecret' class="ten wide field">
    <label>{{ t._('pr_ProviderPassword') }}</label>
    {{ form.render('secret') }}
</div>

<div class="five wide field">
    <label>{{ t._('pr_DTMFMode') }}</label>
    {{ form.render('dtmfmode') }}
</div>

<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class=" content field">
        <h3 class="ui dividing header ">{{ t._("ConnectionSettings") }}</h3>

        <div class="two fields">
            <div id="elAdditionalHosts" class="six wide field">
                <label>{{ t._('pr_EnterHostOrIp') }}</label>
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="five wide field">
            <label for="port">{{ t._('pr_SIPPort') }}</label>
            {{ form.render('port') }}
        </div>
        <div class="five wide field">
            <label>{{ t._('ex_Transport') }}</label>
            {{ form.render('transport') }}
        </div>
        <div class="five wide field">
            <label>{{ t._('ex_OutboundProxy') }}</label>
            {{ form.render('outbound_proxy') }}
        </div>
        {{ partial("partials/natqualify") }}

        <div class="ui segment">
            <div class="field">
                <label>{{ t._('pr_RedefinitionFromUser') }}</label>
                <div class="ui toggle checkbox" id="disablefromuser">
                    {{ form.render('disablefromuser') }}
                    <label>{{ t._('pr_DisableFromUser') }}</label>
                </div>
            </div>
            <div class="field">
                <div class="two fields">
                    <div id="divFromUser" class="four wide field">
                        <label for="fromuser">{{ t._('pr_FromUser') }}:</label>
                        {{ form.render('fromuser') }}
                    </div>
                    <div class="four wide field">
                        <label for="fromdomain">{{ t._('pr_FromDomain') }}:</label>
                        {{ form.render('fromdomain') }}
                    </div>
                </div>
            </div>
            <label>{{ t._('pr_CustomFieldsDescriptions') }}</label>
        </div>

        <h3 class="ui dividing header ">{{ t._("pr_ManualAdditionalAtributes") }}</h3>
        <div class="field">
            {{ form.render('manualattributes') }}
        </div>

    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
</form>
