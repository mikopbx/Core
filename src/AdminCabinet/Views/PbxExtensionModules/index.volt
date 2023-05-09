<div class="ui modal" id="delete-modal-form">
    <div class="header">
        {{ t._('ext_DeleteTitle') }}
    </div>
    <div class="image content">
        <div class="image">
            <i class="icon attention"></i>
        </div>
        <div class="description">
            {{ t._('ext_DeleteDescription') }}
        </div>

    </div>
    <div class="actions">
        <div class="ui checkbox" id="keepModuleSettings">
            <input type="checkbox" checked="checked"> <label>{{ t._('ext_KeepModuleSettings') }}</label>
        </div>
        <div class="ui cancel button">{{ t._('ext_Cancel') }}</div>
        <div class="ui red approve button">{{ t._('ext_Delete') }}</div>
    </div>
</div>
<button class="ui blue button add-new" id="add-new-button"><i class="upload icon"></i> {{ t._('ext_AddNewExtension') }}
</button>
<a href="https://docs.mikopbx.com/mikopbx-development/" target="_blank" class="ui basic button add-new"><i
            class="plus icon"></i> {{ t._('ext_CreateNewExtension') }}</a>

<div>
    <input type="file" name="update-file" accept=".zip" style="display: none!important;"/>
    <div class="ui indicating progress" id="upload-progress-bar">
        <div class="bar">
            <div class="progress"></div>
        </div>
        <div class="label"></div>
    </div>
</div>

{% for module in modulelist %}
    {% if loop.first %}
        <table class="ui selectable table" id="modules-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('ext_TableColumnDescription') }}</th>
            <th>{{ t._('ext_TableColumnDeveloper') }}</th>
            <th>{{ t._('ext_TableColumnVersion') }}</th>
            <th colspan="2"></th>
        </tr>
        </thead>
        <tbody>
    {% endif %}
    <tr class="module-row" id="{{ module['uniqid'] }}">
        <td class="collapsing no-modify-columns">
            <div class="ui toggle checkbox" data-value="{{ module['uniqid'] }}">
                <input type="checkbox" {% if module['status']!=='disabled' %} checked {% endif %}/> <label></label>
            </div>
        </td>
        <td class="{{ module['status'] }} disability">{{ t._('Breadcrumb'~module['uniqid']) }} <i class="status-icon"></i><br><span
                    class="features">{{ t._('SubHeader'~module['uniqid']) }}</span></td>
        <td class="{{ module['status'] }} disability">{{ module['developer'] }}</td>
        <td class="{{ module['status'] }} disability version">{{ module['version'] }}</td>
        {{ partial("partials/tablesbuttons",
            [
                'id': '',
                'edit' : module['classname']~'//'~module['classname']~'//index',
                'delete': 'pbx-extension-modules/delete/'
            ]) }}
    </tr>
    {% if loop.last %}
        </tbody>
        </table>
    {% endif %}
{% endfor %}
<div class="ui hidden divider"></div>
<div id="online-updates-block" style="display: none">
    <h3 class="ui header">{{ t._('ext_AvailableModules') }}</h3>
    <table class="ui celled table" id="new-modules-table">
        <thead>
        <tr>
            <th>{{ t._('ext_TableColumnDescription') }}</th>
            <th class="collapsing">{{ t._('ext_TableColumnDeveloper') }}</th>
            <th class="collapsing center aligned column">{{ t._('ext_TableColumnVersion') }}</th>
            <th class="collapsing column"></th>
        </tr>
        </thead>
        <tbody>

        </tbody>
    </table>
</div>
<input type="hidden" name="license-key" id="license-key" value="{{ licenseKey }}"/>