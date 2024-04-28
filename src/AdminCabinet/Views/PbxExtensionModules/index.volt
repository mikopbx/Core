{{ partial("PbxExtensionModules/moduleDeleteModal")}}
{{ partial("PbxExtensionModules/moduleInstallModal")}}
{{ partial("PbxExtensionModules/moduleDetailsModal")}}

<div class="show-if-no-internet">
    <div class="ui negative message">
        <div class="header">
            {{ t._('lic_NoInetHeader') }}
        </div>
        <ul class="list">
            <li>{{ t._('lic_NoInet') }}</li>
            <li>{{ t._('lic_NoInetLicMiko') }}</li>
            <li>{{ t._('lic_NoInetNetSettings', ['url':'/admin-cabinet/network/modify/']) }}</li>
        </ul>
        <br>
        <b><a href='#' onclick='window.location.reload()'>{{ t._('lic_ReloadPage') }}</a></b>
    </div>
</div>

<div class="ui basic segment" id="upload-progress-bar-block">
    <div class="ui indicating progress" id="upload-progress-bar">
        <div class="bar">
            <div class="progress"></div>
        </div>
        <div class="label" id="upload-progress-bar-label"></div>
    </div>
</div>
<div class="ui pointing menu" id="pbx-extensions-tab-menu">
    <a class="item active" data-tab="installed">{{ t._('ext_InstalledModules') }}</a>
    <a class="item disable-if-no-internet" data-tab="marketplace">{{ t._('ext_Marketplace') }}</a>
    <a class="item disable-if-no-internet" data-tab="licensing">{{ t._('ext_Licensing') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui tab" data-tab="installed">
    {{ partial("PbxExtensionModules/indexTabs/installedTab")}}
</div>

<div class="ui tab disable-if-no-internet" data-tab="marketplace">
{{ partial("PbxExtensionModules/indexTabs/marketplaceTab")}}
</div>

<div class="ui tab segment disable-if-no-internet" data-tab="licensing">
{{ partial("PbxExtensionModules/indexTabs/licensingTab")}}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}