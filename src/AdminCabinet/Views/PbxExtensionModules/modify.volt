{{ form('pbx-extension-modules/save-module-settings', 'role': 'form', 'class': 'ui large form','id':'pbx-extension-modify-form') }}
<div class="ui header">{{ title }}</div>
{{ form.render('key') }}
{{ form.render('href') }}
{{ form.render('iconClass') }}
{{ form.render('uniqid') }}

<div class="field">
    <div class="ui toggle checkbox">
        {{ form.render('show-at-sidebar') }}
        <label>{{ t._('ext_ShowModuleItemAtMainMenu') }}</label>
    </div>
</div>

<div class="field">
    <label>{{ t._('ext_SelectMenuGroup') }}</label>
    {{ form.render('menu-group') }}
</div>
<div class="field">
    <label>{{ t._('ext_Caption') }}</label>
    {{ form.render('caption') }}
</div>

{{ partial("partials/submitbutton",['indexurl':indexUrl]) }}
{{ end_form() }}
