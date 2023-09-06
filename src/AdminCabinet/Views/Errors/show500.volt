<div class="sixteen wide column">
    {{ content() }}
    <div class="ui warning message">
        <i class="close icon"></i>
        <div class="header">
            {{ t._('er_InternalServerError') }}
        </div>
        {{ t._('er_InternalServerErrorDescription') }}
    </div>
    {{ link_to('index', t._('er_Home'), 'class': 'ui button') }}
</div>