{{ form(['action' : 'fail2-ban/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'fail2ban-settings-form']) }}
        {{ form.render('id') }}
<div class="three fields disability">
    <div class="field ">
        <label>{{ t._('f2b_MaxRetry') }}</label>
        {{ form.render('maxretry') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_FindTime') }}</label>
        {{ form.render('findtime') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_BanTime') }}</label>
        {{ form.render('bantime') }}
    </div>
</div>
<div class="field disability">
    <label>{{ t._('f2b_WhiteList') }}</label>
    {{ form.render('whitelist') }}
</div>

{% if not isDocker %}
<div class="field">
    <label>{{ t._('f2b_PBXFirewallMaxReqSec') }}</label>
    <div class="ui">
        <div class="ui segment slider" id="pbx-firewall-max-req-slider" style="padding-left: 35px;padding-right: 35px;margin-top: 5px;">
            <div class="ui bottom aligned ticked labeled slider" id="PBXFirewallMaxReqSec"></div>
            {{ form.render('PBXFirewallMaxReqSec') }}
        </div>
    </div>
</div>
{% endif %}
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

    {{ partial("partials/submitbutton") }}
    <div class="ui clearing hidden divider"></div>
{{ close('form') }}
