<button class="ui blue button add-new" id="add-new-button"><i class="upload icon"></i> {{ t._('ext_AddNewExtension') }}
</button>
<a href="https://docs.mikopbx.com/mikopbx-development/" target="_blank" class="ui basic button add-new"><i
            class="plus icon"></i> {{ t._('ext_CreateNewExtension') }}</a>

{% for module in modulelist %}
    {% if loop.first %}
        <table class="ui selectable unstackable table" id="installed-modules-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('ext_TableColumnDescription') }}</th>
            <th>{{ t._('ext_TableColumnDeveloper') }}</th>
            <th>{{ t._('ext_TableColumnVersion') }}</th>
            <th colspan="2" class="ui right aligned"></th>
        </tr>
        </thead>
        <tbody>
    {% endif %}
    <tr class="module-row" data-id="{{ module['uniqid'] }}" data-version="{{ module['version'] }}">
        <td class="collapsing no-modify-columns">
            <div class="ui toggle checkbox" data-value="{{ module['uniqid'] }}">
                    <input type="checkbox" {% if module['status']!=='disabled' %}checked="checked" {% endif %} /> <label></label>
            </div>
            {% if module['disableReason']=='DisabledByException' %}
                <i class="bug red icon wide popup-on-click vertically-aligned"
                   data-html="<div class='header'>{{ t._('ext_DisableReasonHeader') }}</div><div class='content'>{{ t._('ext_ModuleExecutionProblem') }}:<br>{{ module['disableReasonText'] }}</div></div>"
                >
                </i>
            {% elseif module['disableReason']=='DisabledByLicense' %}
                <i class="ui icons vertically-aligned popup-on-click"
                   data-html="<div class='header'>{{ t._('ext_DisableReasonHeader') }}</div><div class='content'>{{ t._('ext_ModuleLicenseProblem') }}:<br>{{ module['disableReasonText'] }}</div></div>"
                >
                    <i class="big red dont icon"></i>
                    <i class="key icon"></i>
                </i>
            {% endif %}
        </td>
        <td class="{{ module['status'] }} disability show-details-on-click">{{ t._('Breadcrumb'~module['uniqid']) }} <i
                    class="status-icon"></i><br><span
                    class="features">{{ t._('SubHeader'~module['uniqid']) }}</span></td>
        <td class="{{ module['status'] }} disability show-details-on-click">{{ module['developer'] }}</td>
        <td class="{{ module['status'] }} disability version show-details-on-click">{{ module['version'] }}</td>
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

{% if modulelist == [] %}
    <div class="ui placeholder segment">
        <div class="ui icon header">
            <i class="puzzle piece icon"></i>
            {{ t._('ext_NoInstalledModules') }}
        </div>
        {% if PBXLicense=='' %}
            {{ link_to("pbx-extension-modules/index/#/licensing", '<i class="store icon"></i> '~t._('ext_GoToRegistration'), "class": "ui icon labeled blue button prevent-word-wrap") }}
        {% else %}
            {{ link_to("pbx-extension-modules/index/#/marketplace", '<i class="key icon"></i> '~t._('ext_GoToMarketplace'), "class": "ui icon labeled blue button prevent-word-wrap") }}
        {% endif %}
    </div>
{% endif %}