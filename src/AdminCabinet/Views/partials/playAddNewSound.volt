<div class="{{ fieldClass }}" id ='{{ fieldID }}'>
    <label> {{ label }}</label>
    <div class="fields">
        <div class="twelve wide field">
            {{ form.render(id) }}
        </div>
        <div class="field">
            <div class="ui buttons">
                <div class="ui icon basic button action-playback-button" data-value="{{ id }}"><i class="play icon"></i></div>
                {% if isAllowed('modify','sound-files') %}
                    <a href="/admin-cabinet/sound-files/modify/custom" class="ui icon basic button" target="_blank"><i class="add circle icon"></i></a>
                {% endif %}
            </div>
        </div>
    </div>
</div>