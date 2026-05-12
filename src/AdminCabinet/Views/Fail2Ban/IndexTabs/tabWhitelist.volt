<style>
    /* The input above doubles as a live filter — hide DataTable's own search box. */
    #whitelist-table_wrapper .dataTables_filter { display: none !important; }
    #whitelist-input-hint { color: #888; font-size: 0.85em; margin-top: 4px; }
</style>

<div class="ui form" id="whitelist-form">
    <div class="field">
        <label>{{ t._('f2b_AddTrustedAddress') }}</label>
        <div class="ui action input" id="whitelist-add-row">
            <input type="text" id="whitelist-input"
                   placeholder="{{ t._('f2b_WhitelistInputPlaceholder') }}"
                   autocomplete="off"/>
            <button type="button" class="ui primary button" id="whitelist-add-btn">
                <i class="plus icon"></i> {{ t._('f2b_Add') }}
            </button>
        </div>
        <div id="whitelist-input-hint">{{ t._('f2b_WhitelistInputHint') }}</div>
        <div class="ui pointing red basic label" id="whitelist-input-error" style="display:none;"></div>
    </div>
</div>

<table class="ui very compact unstackable selectable table" id="whitelist-table">
    <thead>
    <tr>
        <th>{{ t._('f2b_Address') }}</th>
        <th>{{ t._('f2b_Source') }}</th>
        <th>{{ t._('f2b_Description') }}</th>
        <th></th>
    </tr>
    </thead>
    <tbody>
    </tbody>
</table>
