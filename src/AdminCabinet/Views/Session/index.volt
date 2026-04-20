<div class="ui middle aligned grid">
    <div class="column">
        <div class="ui text container">
            {{ partial("Session/loginForm")}}
        </div>
    </div>
</div>
<div id="pbx-version">{{ PBXName }}</div>
{{ content() }}