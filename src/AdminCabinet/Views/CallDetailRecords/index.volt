<div class="ui grid">
    <div class="ui row">
        <div class="ui five wide column">
            <div class="ui fluid input">
                <input type="text" id="date-range-selector" class="form-control">
            </div>
        </div>
        <div class="ui eleven wide column">
            <div class="ui icon fluid input">
                <input type="search" id="globalsearch" placeholder="{{ t._('Enter search') }}"
                       aria-controls="KeysTable">
                <i class="icon search"></i>
            </div>
        </div>

    </div>
</div>
<div class="ui hidden divider"></div>
<table id="cdr-table" class="ui small very compact single line unstackable table ">
    <thead>
    <tr>
        <th class="one wide"></th>
        <th class="two wide">{{ t._('cdr_ColumnDate') }}</th>
        <th class="">{{ t._('cdr_ColumnFrom') }}</th>
        <th class="">{{ t._('cdr_ColumnTo') }}</th>
        <th class="one wide">{{ t._('cdr_ColumnDuration') }}</th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td colspan="5" class="dataTables_empty">{{ t._('dt_TableIsEmpty') }}</td>
    </tr>
    </tbody>
</table>