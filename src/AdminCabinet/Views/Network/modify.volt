{{ form(['action' : 'network/save','method': 'post', 'role': 'form', 'class': 'ui form', 'id':'network-form']) }}

<input type="hidden" name="is-docker" value="{{ isDocker }}">

{{ partial("Network/partials/interfaces") }}

{{ partial("Network/partials/nat") }}

<div class="do-not-show-if-docker">
    {{ partial("Network/partials/static-routes") }}
</div>

{{ partial("partials/submitbutton",['indexurl':'']) }}

<div class="ui clearing hidden divider"></div>
{{ close('form') }}
