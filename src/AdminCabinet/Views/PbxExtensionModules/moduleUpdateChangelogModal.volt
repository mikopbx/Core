<div class="ui large scrolling modal" id="update-changelog-modal">
    <div class="header">
        <span class="action"></span> <span class="module-name"></span>
    </div>
    <div class="content">
        <div class="ui basic segment changelog-loader">
            <div class="ui active inline loader"></div>
            <span>{{ t._('ext_LoadingChangelog') }}</span>
        </div>
        <div class="ui info message changelog-intro" style="display:none;"></div>
        <div class="changelog-body" style="display:none;"></div>
        <div class="ui negative message changelog-error" style="display:none;">
            {{ t._('ext_FailedToLoadChangelog') }}
        </div>
    </div>
    <div class="actions">
        <div class="ui cancel button">{{ t._('ext_Cancel') }}</div>
        <div class="ui blue approve button disabled">{{ t._('ext_ConfirmUpdate') }}</div>
    </div>
</div>
