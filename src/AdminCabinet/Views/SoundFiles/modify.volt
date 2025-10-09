<form class="ui form large" id="sound-file-form">
<input type="hidden" name="id" id="id" value="{{ recordId }}"/>
<input type="hidden" name="category" id="category" value="{{ category }}"/>
<input type="hidden" name="sound-file-url" id="sound-file-url"/>

{# Source Selection Section #}
<div class="ui segment">
   
    <div class="two fields">
        <div class="field">
            <label><i class="cloud upload icon"></i> {{ t._('sf_UploadNewSoundFile') }}</label>
            <button class="ui fluid large button" id="upload-sound-file">
                <i class="cloud upload alternate icon"></i>
                {{ t._('sf_UploadSoundFileButton') }}
            </button>
        </div>
        <div class="field" id="only-https-field">
            <label><i class="microphone icon"></i> {{ t._('sf_RecordNewSoundFile') }}</label>
            <div class="ui fluid large buttons">
                <button class="ui button" id="start-record-button">
                    <i class="circle icon red" id="record-label"></i>
                    {{ t._('sf_StartRecordSoundFileButton') }}
                </button>
                <div class="ui floating dropdown icon button disabled" id="select-audio-button">
                    <i class="dropdown icon"></i>
                    <div class="menu" id="audio-input-select"></div>
                </div>
                <button class="ui button" id="stop-record-button">
                    <i class="stop icon"></i>
                    {{ t._('sf_StopRecordSoundFileButton') }}
                </button>
            </div>
        </div>
    </div>
</div>

{# Preview Player Section #}
<div class="ui segment" id="audio-player-segment" style="display: none;">
  
    <audio id="audio-player" preload="none">
        <source src="" type="audio/mp3">
    </audio>
    <table class="ui very basic table" style="margin-top: 0;">
        <tr id="sound-file-player-row">
            <td class="one wide center aligned">
                <button class="ui large basic icon button play-button">
                    <i class="ui icon play"></i>
                </button>
            </td>
            <td>
                <div class="ui range cdr-player"></div>
            </td>
            <td class="two wide center aligned">
                <span class="cdr-duration" style="font-size: 1.1em;">00:00</span>
            </td>
            <td class="one wide center aligned">
                <button class="ui large basic icon button download-button" id="download-button">
                    <i class="ui icon download"></i>
                </button>
            </td>
        </tr>
    </table>
</div>

{# File Information Section #}
<div class="ui segment">
   

    <div class="field">
        <label>{{ t._('sf_Filename') }}</label>
        <input type="text" name="name" id="name" placeholder="{{ t._('sf_FilenamePlaceholder') }}" />
    </div>

    <div class="field disabled">
        <label>{{ t._('cf_Path') }}</label>
        <input type="text" name="path" id="path" readonly />
    </div>

    <div class="field">
        <label>{{ t._('sf_Description') }}</label>
        <textarea name="description" id="description" rows="3" placeholder="{{ t._('sf_DescriptionPlaceholder') }}"></textarea>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",[
    'indexurl':'sound-files/index#'~category
]) }}
</form>

