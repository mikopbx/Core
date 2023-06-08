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
        <div class="label" id="upload-progress-bar-label"></div>
    </div>
</div>

{% for module in modulelist %}
    {% if loop.first %}
        <table class="ui selectable unstackable table" id="installed-modules-table">
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