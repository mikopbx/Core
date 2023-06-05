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