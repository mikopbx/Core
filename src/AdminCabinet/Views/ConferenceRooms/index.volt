<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("conference-rooms/modify", '<i class="add circle icon"></i> '~t._('cr_AddNewConferenceRoom'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="conference-table-container">
    <table class="ui selectable compact unstackable table" id="conference-rooms-table">
        <thead>
            <tr>
                <th>{{ t._('mm_ConferenceRooms') }}</th>
                <th class="hide-on-mobile">{{ t._('cr_ColumnPinCode') }}</th>
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
        'icon': 'phone volume',
        'title': t._('cr_EmptyTableTitle'),
        'description': t._('cr_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('cr_AddNewConferenceRoom'),
        'addButtonLink': 'conference-rooms/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/conference-rooms'
    ]) }}
</div>

