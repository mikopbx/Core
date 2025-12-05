<div class="ui grid">
    <div class="ui row">
        <div class="ui five wide column">
            <div class="ui fluid input">
                <input type="text" id="date-range-selector" class="form-control">
            </div>
        </div>
        <div class="ui eleven wide column">
            <div class="ui search right action left icon fluid input" id="search-cdr-input">
                <i class="search link icon" id="search-icon"></i>
                <input type="search" id="globalsearch" name="globalsearch" placeholder="{{ t._('cdr_EnterSearchPhrase') }}"
                       aria-controls="cdr-table" class="prompt" autocomplete="off">
                <div class="results"></div>
                <div class="ui basic floating search dropdown button" id="page-length-select">
                    <div class="text">{{ t._('cdr_CalculateAutomatically') }}</div>
                    <i class="dropdown icon"></i>
                    <div class="menu">
                        <div class="item" data-value="auto">{{ t._('cdr_CalculateAutomatically') }}</div>
                        <div class="item" data-value="25">{{ t._('cdr_ShowOnlyRows', {'rows':25}) }}</div>
                        <div class="item" data-value="50">{{ t._('cdr_ShowOnlyRows', {'rows':50}) }}</div>
                        <div class="item" data-value="100">{{ t._('cdr_ShowOnlyRows', {'rows':100}) }}</div>
                        <div class="item" data-value="500">{{ t._('cdr_ShowOnlyRows', {'rows':500}) }}</div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
<div class="ui hidden divider"></div>
<div id="cdr-empty-database-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'history',
        'title': t._('cdr_EmptyDatabaseTitle'),
        'description': t._('cdr_EmptyDatabaseDescription'),
        'showButton': false,
        'documentationLink': 'https://wiki.mikopbx.com/call-detail-records'
    ]) }}
</div>

<table id="cdr-table" class="ui small very compact single line unstackable table ">
    <thead>
    <tr>
        <th class="one wide"></th>
        <th class="two wide">{{ t._('cdr_ColumnDate') }}</th>
        <th class="">{{ t._('cdr_ColumnFrom') }}</th>
        <th class="">{{ t._('cdr_ColumnTo') }}</th>
        <th class="one wide">{{ t._('cdr_ColumnDuration') }}</th>
        {% if isAllowed('save') %}
        <th class="one wide"></th>
        {% endif %}
    </tr>
    </thead>
    <tbody>
    <tr>
        <td colspan="6" class="dataTables_empty">{{ t._('dt_TableIsEmpty') }}</td>
    </tr>
    </tbody>
</table>