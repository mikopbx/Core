<div class="ui icon message">
    <i class="hand paper outline icon"></i>
    <div class="content">
        <div class="ui header">{{ t._('gs_RestoreAllSettingsHeader')}}</div>
        <p>{{ t._('gs_RestoreAllSettingsMessage')}} <br> <br> {{ t._('gs_EnterDeleteAllPhrasePreText') }} &nbsp&nbsp<b>{{ t._('gs_EnterDeleteAllPhrase') }}</b></p>
    </div>
</div>
<div class="field">
    <label for="deleteAllInput"></label>
    <input type="text" name="deleteAllInput" value=""/>
</div>

<!-- Modal for delete confirmation -->
<div class="ui modal" id="delete-all-modal">
    <div class="header">
        <i class="trash alternate icon red"></i>
        {{ t._('gs_DeleteAllModalHeader')}}
    </div>
    <div class="content">
        <p class="modal-description">{{ t._('gs_DeleteAllModalDescription')}}</p>
        
        <div class="ui segments" id="delete-statistics-content">
            <div class="ui segment">
                <div class="ui active centered inline loader"></div>
                <p class="center aligned">{{ t._('gs_LoadingStatistics')}}</p>
            </div>
        </div>
        
        <div class="ui negative message">
            <div class="header">{{ t._('gs_DeleteAllModalWarning')}}</div>
            <p>{{ t._('gs_DeleteAllModalWarningDescription')}}</p>
        </div>
    </div>
    <div class="actions">
        <div class="ui cancel green button">
            <i class="remove icon"></i>
            {{ t._('gs_Cancel')}}
        </div>
        <div class="ui ok red button" id="confirm-delete-all">
            <i class="trash icon"></i>
            {{ t._('gs_ConfirmDeleteAll')}}
        </div>
    </div>
</div>