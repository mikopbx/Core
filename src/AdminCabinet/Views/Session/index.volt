<div class="ui middle aligned grid">
    <div class="column">
        <div class="ui text container">
            {% if remainAttempts>0 %}
                {{ partial("Session/loginForm")}}
            {% else %}
                <div class="ui error message segment">
                    {{ t._('auth_TooManyLoginAttempts', ['interval':loginAttemptsInterval]) }}
                </div>
            {% endif %}
        </div>
    </div>
</div>
<div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
{{ content() }}