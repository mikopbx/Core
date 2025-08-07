<div class="{{ fieldClass }}" id='{{ fieldID }}'>
    {% if label != '' %}
        <label for="{{ id }}">{{ label }}
            {% if id == 'audio_message_id' %}
                <i class="small info circle icon field-info-icon" 
                   data-field="audio_message_id"></i>
            {% endif %}
        </label>
    {% endif %}
    <div class="unstackable fields">
        <div class="twelve wide field">
            {{ form.render(id) }}
            <div class="ui selection dropdown search {{ id }}-select">
                <i class="dropdown icon"></i>
                <div class="default text">{{ t._('sf_SelectAudioFile') }}</div>
                <div class="menu"></div>
            </div>
        </div>
        <div class="field">
            <div class="ui buttons">
                <div class="ui icon basic button action-playback-button" data-value="{{ id }}"><i class="play icon"></i></div>
                {% if isAllowed('modify','MikoPBX\AdminCabinet\Controllers\SoundFilesController') %}
                    <a href="{{ url('sound-files/modify/custom') }}" class="ui icon basic button" target="_blank"><i class="add circle icon"></i></a>
                {% endif %}
            </div>
        </div>
    </div>
</div>