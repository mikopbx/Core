<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("asterisk-rest-users/modify", '<i class="add circle icon"></i> '~t._('ari_AddNewUser'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="asterisk-rest-users-table-container">
    <table class="ui selectable compact unstackable table" id="asterisk-rest-users-table">
        <thead>
            <tr>
                <th>{{ t._('ari_Username') }}</th>
                <th class="hide-on-mobile">{{ t._('ari_Applications') }}</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate this -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'code branch',
        'title': t._('ari_EmptyTableTitle'),
        'description': t._('ari_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('ari_AddNewUser'),
        'addButtonLink': 'asterisk-rest-users/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/asterisk-rest-interface'
    ]) }}
</div>