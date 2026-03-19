{{ form(['action' : '#', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'fail2ban-settings-form']) }}
<style>
    #fail2ban-settings-form .ui.labeled.slider > .labels .label {
        font-size: 0.85em;
        color: #888;
    }
</style>

<div class="field disability">
    <label>{{ t._('f2b_SecurityPresetLabel') }}
        <i class="circle info icon field-info-icon" data-field="securityPreset"></i>
    </label>
    <div style="padding: 10px 25px 0;">
        <div class="ui bottom aligned ticked labeled slider" id="SecurityPresetSlider"></div>
    </div>
</div>

{{ form.render('maxretry') }}
{{ form.render('bantime') }}
{{ form.render('findtime') }}

<div class="field disability">
    <label>{{ t._('f2b_WhiteList') }}
        <i class="circle info icon field-info-icon" data-field="whitelist"></i>
    </label>
    <textarea name="whitelist" rows="2" cols="95"></textarea>
</div>

{{ form.render('PBXFirewallMaxReqSec') }}
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

    {{ partial("partials/submitbutton") }}
    <div class="ui clearing hidden divider"></div>
{{ close('form') }}
