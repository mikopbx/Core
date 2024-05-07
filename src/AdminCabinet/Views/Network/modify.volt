{{ form('network/save', 'role': 'form', 'class': 'ui form large', 'id':'network-form') }}

<input type="hidden" name="is-docker" value="{{ isDocker }}">

<div class=" field">
    <label for="hostname">{{ t._('nw_Hostname') }}</label>
    <div class="field max-width-400">
        {{ form.render('hostname') }}
    </div>
</div>

<div class="do-not-show-if-docker">
    {{ partial("Network/partials/interfaces") }}
</div>

{{ partial("Network/partials/nat") }}

{{ partial("partials/submitbutton",['indexurl':'']) }}

<div class="ui clearing hidden divider"></div>
{{ end_form() }}
