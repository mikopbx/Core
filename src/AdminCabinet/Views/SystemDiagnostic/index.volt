<div class="ui tabular menu" id="system-diagnostic-menu">
    <a class="item active" data-tab="show-log">{{ t._('sd_ShowLog') }}</a>
    <a class="item" data-tab="show-sysinfo">{{ t._('sd_SystemInformation') }}</a>
    <a class="item" data-tab="capture-log">{{ t._('sd_CapturePcap') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui tab" data-tab="show-log">
    {{ partial("SystemDiagnostic/show-log-tab") }}
</div>
<div class="ui tab" data-tab="show-sysinfo">
    {{ partial("SystemDiagnostic/show-sysinfo-tab") }}
</div>
<div class="ui tab" data-tab="capture-log">
    {{ partial("SystemDiagnostic/capture-log-tab") }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}