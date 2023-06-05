{{ partial("PbxExtensionModules/moduleDeleteModal")}}

<div class="ui top attached tabular menu" id="pbx-extensions-tab-menu">
    <a class="item active" data-tab="installed">{{ t._('ext_InstalledModules') }}</a>
    <a class="item" data-tab="marketplace">{{ t._('ext_Marketplace') }}</a>
    <a class="item" data-tab="licensing">{{ t._('ext_Licensing') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui bottom attached tab basic segment" data-tab="installed">
    {{ partial("PbxExtensionModules/installedTab")}}
</div>

<div class="ui bottom attached tab basic segment" data-tab="marketplace">
{{ partial("PbxExtensionModules/marketplaceTab")}}
</div>

<div class="ui bottom attached tab segment" data-tab="licensing">
{{ partial("PbxExtensionModules/licensingTab")}}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}