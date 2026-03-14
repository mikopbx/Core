{{ form(['action' : '#', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'fail2ban-settings-form']) }}
<style>
    #fail2ban-settings-form .ui.labeled.slider > .labels .label {
        font-size: 0.85em;
        color: #888;
    }
</style>

<h4 class="ui dividing header">{{ t._('f2b_BlockingRulesHeader') }}</h4>
<div class="field disability">
    <label>{{ t._('f2b_MaxRetry') }}
        <i class="circle info icon field-info-icon" data-field="maxretry"></i>
    </label>
    {{ form.render('maxretry') }}
</div>
<div class="field disability">
    <label>{{ t._('f2b_FindTime') }}
        <i class="circle info icon field-info-icon" data-field="findtime"></i>
    </label>
    <div style="padding: 10px 25px 0;">
        <div class="ui bottom aligned ticked labeled slider" id="FindTimeSlider"></div>
        {{ form.render('findtime') }}
    </div>
</div>
<div class="field disability">
    <label>{{ t._('f2b_BanTime') }}
        <i class="circle info icon field-info-icon" data-field="bantime"></i>
    </label>
    <div style="padding: 10px 25px 0;">
        <div class="ui bottom aligned ticked labeled slider" id="BanTimeSlider"></div>
        {{ form.render('bantime') }}
    </div>
</div>

<h4 class="ui dividing header">{{ t._('f2b_AdditionalSettingsHeader') }}</h4>
<div class="field disability">
    <label>{{ t._('f2b_WhiteList') }}
        <i class="circle info icon field-info-icon" data-field="whitelist"></i>
    </label>
    <textarea name="whitelist" rows="4" cols="95"></textarea>
</div>

{% if not isDocker %}
<div class="field">
    <label>{{ t._('f2b_PBXFirewallMaxReqSec') }}
        <i class="circle info icon field-info-icon" data-field="PBXFirewallMaxReqSec"></i>
    </label>
    <div style="padding: 10px 25px 0;">
        <div class="ui bottom aligned ticked labeled slider" id="PBXFirewallMaxReqSec"></div>
        {{ form.render('PBXFirewallMaxReqSec') }}
    </div>
</div>
{% endif %}
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

    {{ partial("partials/submitbutton") }}
    <div class="ui clearing hidden divider"></div>
{{ close('form') }}
