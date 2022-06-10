/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const checkPasswordWorker = {
    initialize() {
        $(window).on('SecurityWarning', checkPasswordWorker.onWarning);
    },
    onWarning(event, data) {
        let needShow = false;
        $("#updatePasswordWindow div.miko-settings-container").hide();
        $.each(data.needUpdate, (key, value) => {
            $(`#updatePasswordWindow #${value}-container`).show();
            needShow = true;
        });
        if(needShow){
            $('#updatePasswordWindow #savePassword').on('click', checkPasswordWorker.cbOnClickSavePassword);
            let modalWindow = $('#updatePasswordWindow');
            modalWindow.on('keyup', () => {
                PasswordScore.checkPassStrength({
                    pass: $(`#updatePasswordWindow #WebAdminPassword`).val(),
                    bar: $('.WebAdminPassword-score'),
                    section: modalWindow,
                });
                PasswordScore.checkPassStrength({
                    pass: $(`#updatePasswordWindow #SSHPassword`).val(),
                    bar: $('.SSHPassword'),
                    section: modalWindow,
                });
            });
            modalWindow.modal({ closable : false, }).modal('show')
        }
    },

    /**
     * Отправка формы обновления паролей SSH и Web.
     */
    cbOnClickSavePassword(){
        $('#updatePasswordWindowResult').hide();
        let errors = '';
        let params = {};
        $.each(['WebAdminPassword', 'SSHPassword'], (key, value) => {
            if(!$(`#updatePasswordWindow #${value}`).is(":visible")){
                return;
            }
            let pass 	= $(`#updatePasswordWindow #${value}`).val();
            let passRep 	= $(`#updatePasswordWindow #${value}Repeat`).val();
            if( pass !== passRep){
                errors+='<li>'+globalTranslate[`pass_Check${value}DontMatch`]+'</li>';
            }else if(pass.trim() === ''){
                errors+='<li>'+globalTranslate[`pass_Check${value}Empty`]+'</li>';
            }else if(PasswordScore.scorePassword(pass) < 50){
                errors+=`<li>${globalTranslate['pass_Check${value}Simple']}</li>`;
            }else{
                params[value] = pass;
            }
        });
        if(errors.trim() !== ''){
            errors = `<ul class="ui list">${errors}</ul>`;
            checkPasswordWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
        }else{
            checkPasswordWorker.savePasswords(params);
        }
    },
    savePasswords(params){
        $.post('/admin-cabinet/general-settings/save', params, function( data ) {
            if(data.success === false){
                let errors = '';
                if(typeof data.passwordCheckFail !== 'undefined'){
                    $.each(data.passwordCheckFail, (key, value) => {
                        errors+='<li>'+globalTranslate[`pass_Check${value}Simple`]+'</li>';
                    });
                }else{
                    errors+='<li>'+globalTranslate['er_InternalServerError']+'</li>';
                }
                if(errors.trim() !== ''){
                    checkPasswordWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
                }
            }else{
                $('#updatePasswordWindow').modal({ closable : false, }).modal('hide')
                let event = document.createEvent('Event');
                event.initEvent('ConfigDataChanged', false, true);
                window.dispatchEvent(event);
            }
        });
    },
    showPasswordError(header, body){
        $('#updatePasswordWindowResult div').html(header);
        $('#updatePasswordWindowResult p').html(body);
        $('#updatePasswordWindowResult').show();
    },
};


$(document).ready(() => {
    checkPasswordWorker.initialize();
});