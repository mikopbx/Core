<div class="sixteen wide column">
    {{ content() }}


    <div class="ui warning message">
        <i class="close icon"></i>
        <div class="header">
            {{ t._('er_Unauthorized') }}
        </div>
        {{ t._("er_UnauthorizedDescription") }}
    </div>

    {{ link_to('index', t._('er_Home'), 'class': 'ui button') }}

</div>