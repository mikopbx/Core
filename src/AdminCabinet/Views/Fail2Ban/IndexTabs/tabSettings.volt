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

<style>
    #preset-info-panel .ui.segment {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    #preset-info-panel .preset-label { color: #888; }
    #preset-info-panel .preset-value { font-size: 1.25em; font-weight: 700; }
</style>

<div class="ui segments" id="preset-info-panel" style="margin-top: 1.5em;">
    <div class="ui segment">
        <span class="preset-label">{{ t._('f2b_MaxRetry') }}</span>
        <span class="preset-value" id="preset-maxretry-value">--</span>
    </div>
    <div class="ui segment">
        <span class="preset-label">{{ t._('f2b_FindTime') }}</span>
        <span class="preset-value" id="preset-findtime-value">--</span>
    </div>
    <div class="ui segment">
        <span class="preset-label">{{ t._('f2b_BanTime') }}</span>
        <span class="preset-value" id="preset-bantime-value">--</span>
    </div>
    <div class="ui segment">
        <span class="preset-label">{{ t._('f2b_PBXFirewallMaxReqSec') }}</span>
        <span class="preset-value" id="preset-maxreqsec-value">--</span>
    </div>
</div>

{{ form.render('maxretry') }}
{{ form.render('bantime') }}
{{ form.render('findtime') }}

{{ form.render('PBXFirewallMaxReqSec') }}
{{ form.render('PBXSecurityMode') }}
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

    {{ partial("partials/submitbutton") }}
    <div class="ui clearing hidden divider"></div>
{{ close('form') }}
