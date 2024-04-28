<div class="ui top attached tabular menu" id="fail2ban-tab-menu">
    <a class="item active" data-tab="settings">{{ t._('f2b_SettingsTabHeader')}}</a>
    <a class="item" data-tab="banned">{{ t._('f2b_BannedIpTabHeader')}}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui bottom attached tab segment active" data-tab="settings">
    {{ partial("Fail2Ban/IndexTabs/tabSettings") }}
</div>
<div class="ui bottom attached tab segment" data-tab="banned">
    {{ partial("Fail2Ban/IndexTabs/tabBanned") }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}