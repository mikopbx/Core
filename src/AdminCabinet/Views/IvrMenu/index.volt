{% if isAllowed('save') %}
    {{ link_to("ivr-menu/modify", '<i class="add circle icon"></i> '~t._('iv_AddNewIvrMenu'), "class": "ui blue button", 'id':'add-new-button', 'style':'display:none') }}
{% endif %}

<div id="ivr-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="ivr-menu-table">
        <thead>
        <tr>
            <th class="centered collapsing">{{ t._('iv_Extension') }}</th>
            <th class="collapsing">{{ t._('iv_Name') }}</th>
            <th class="collapsing">{{ t._('iv_Actions') }}</th>
            <th class="hide-on-mobile collapsing">{{ t._('iv_TimeoutExtension') }}</th>
            <th class="hide-on-mobile">{{ t._('iv_Note') }}</th>
            <th class="right aligned collapsing"></th>
        </tr>
        </thead>
        <tbody>
        {# Hidden template row for DataTable #}
        <tr class="menu-row hidden" id="template-row" style="display:none">
            <td class="centered"></td>
            <td class="collapsing"></td>
            <td class="collapsing">
                <small></small>
            </td>
            <td class="hide-on-mobile collapsing">
                <small></small>
            </td>
            <td class="hide-on-mobile"></td>
            <td></td>
        </tr>
        {# Data will be loaded via AJAX using DataTable #}
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display:none">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'sitemap',
        'title': t._('iv_EmptyTableTitle'),
        'description': t._('iv_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('iv_AddNewIvrMenu'),
        'addButtonLink': 'ivr-menu/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/ivr-menu'
    ]) }}
</div>
