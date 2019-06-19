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
            <div class="ui  toggle checkbox">
                <input type="checkbox" {% if module['status']!='disabled' %} checked {% endif %}> <label></label>
            </div>
        </td>
        <td class="{{ module['status'] }} disability">{{ t._('Breadcrumb'~module['uniqid']) }}<br><span
                    class="features">{{ t._('SubHeader'~module['uniqid']) }}</span></td>
        <td class="{{ module['status'] }} disability">{{ module['developer'] }}</td>
        <td class="{{ module['status'] }} disability version">{{ module['version'] }}</td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': '',
                    'edit' : module['name'],
                    'delete': 'pbx-extension-modules/delete/'
                ]) }}
    </tr>
    {% if loop.last %}
        </tbody>
        </table>
    {% endif %}
{% endfor %}

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