{{ form('sound-files/save', 'role': 'form', 'class': 'ui form large', 'id':'sound-file-form') }}
{{ form.render('id') }}
{{ form.render('category') }}
<input type="file" name="sound-file" accept=".wav,.mp3" style="display: none!important;" id="file"/>
<input type="hidden" name="sound-file-url" id="sound-file-url"/>
<div class="two fields">
    <div class="field">
        <div class="ui segment">
            <h3 class="ui header">{{ t._('sf_UploadNewSoundFile') }}</h3>
            <button class="ui large button" id="upload-sound-file"><i
                        class="cloud upload alternate icon"></i>{{ t._('sf_UploadSoundFileButton') }}</button>
        </div>

    </div>
    <div class="field" id="only-https-field">
        <div class="ui segment">
            <h3 class="ui header">{{ t._('sf_RecordNewSoundFile') }}</h3>
            <div class="field">
                <div id="buttons">
                    <i class="circle icon" id="record-label"></i>
                    <div class="ui buttons">
                        <button class="ui large button"
                                id="start-record-button"> {{ t._('sf_StartRecordSoundFileButton') }}</button>
                        <div class="ui floating dropdown icon button disabled" id="select-audio-button">
                            <i class="dropdown icon"></i>
                            <div class="menu" id="audio-input-select">

                            </div>
                        </div>
                    </div>
                    <button class="ui large button"
                            id="stop-record-button">{{ t._('sf_StopRecordSoundFileButton') }}</button>
                </div>
            </div>
        </div>

    </div>

</div>
<div class="field">
    <label>{{ t._('sf_Filename') }}</label>
    {{ form.render('name') }}
</div>
<div class="field disabled">
    <label>{{ t._('cf_Path') }}</label>
    {{ form.render('path') }}
</div>
<div class="field" id="audio-player-segment">
    <audio id="audio-player" preload="auto">
        <source src="{{ audioPath }}" type="audio/mp3">
    </audio>
    <div class="ui basic segment">
        <div class="fields">
            <div class="one wide field">
                <button class="ui icon button" id="play-button"><i class="icon play"></i></button>
            </div>
            <div class="fourteen wide field">
                <div class="ui range" id="play-slider"></div>
            </div>
        </div>

    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",[
    'indexurl':'sound-files/index/#/'~category
]) }}
{{ end_form() }}

