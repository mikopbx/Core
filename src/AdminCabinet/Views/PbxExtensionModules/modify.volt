{{ form('pbx-extension-modules/save', 'role': 'form', 'class': 'ui large form','id':'pbx-extension-modify-form') }}
<div class="ui header">{{ title }}</div>
{{ form.render('key') }}
{{ form.render('href') }}
{{ form.render('iconClass') }}
{{ form.render('uniqid') }}

<div class="field">
    <div class="ui segment field max-width-400">
    <div class="ui toggle checkbox">
        {{ form.render('show-at-sidebar') }}
        <label for="show-at-sidebar">{{ t._('ext_ShowModuleItemAtMainMenu') }}</label>
    </div>
    </div>
</div>

<div class="field">
    <label for="menu-group">{{ t._('ext_SelectMenuGroup') }}</label>
    <div class="field max-width-400">
        {{ form.render('menu-group') }}
    </div>
</div>
<div class="field">
    <label for="caption">{{ t._('ext_Caption') }}</label>
    <div class="field max-width-400">
        {{ form.render('caption') }}
    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':indexUrl]) }}
{{ end_form() }}
