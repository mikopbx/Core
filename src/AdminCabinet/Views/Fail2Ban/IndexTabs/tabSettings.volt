{{ form(['action' : '#', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'fail2ban-settings-form']) }}
<div class="three fields disability">
    <div class="field ">
        <label>{{ t._('f2b_MaxRetry') }}
            <i class="circle info icon field-info-icon" data-field="maxretry"></i>
        </label>
        {{ form.render('maxretry') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_FindTime') }}
            <i class="circle info icon field-info-icon" data-field="findtime"></i>
        </label>
        {{ form.render('findtime') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_BanTime') }}
            <i class="circle info icon field-info-icon" data-field="bantime"></i>
        </label>
        {{ form.render('bantime') }}
    </div>
</div>
<div class="field disability">
    <label>{{ t._('f2b_WhiteList') }}
        <i class="circle info icon field-info-icon" data-field="whitelist"></i>
    </label>
    <textarea name="whitelist" rows="4" cols="95"></textarea>
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
