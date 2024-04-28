<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di;

/**
 * LanguageController
 *
 * Responsible for change language of the application
 */
class LanguageController extends BaseController
{

    /**
     * Updates system settings for language
     *
     */
    public static function updateSystemLanguage(string $newLanguage): void
    {
        if (!isset($newLanguage)) {
            return;
        }
        $languageSettings = PbxSettings::findFirstByKey(PbxSettingsConstants::WEB_ADMIN_LANGUAGE);
        if ($languageSettings === null) {
            $languageSettings = new PbxSettings();
            $languageSettings->key = PbxSettingsConstants::WEB_ADMIN_LANGUAGE;
            $languageSettings->value = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::WEB_ADMIN_LANGUAGE];
        }
        if ($newLanguage !== $languageSettings->value) {
            $languageSettings->value = $newLanguage;
            $languageSettings->save();
        }
    }

    /**
     * Process language change
     */
    public function changeAction(): void
    {
        $newLanguage = $this->request->getPost('newLanguage', 'string');
        if (array_key_exists($newLanguage, self::getAvailableWebAdminLanguages())) {
            $this->session->set(PbxSettingsConstants::WEB_ADMIN_LANGUAGE, $newLanguage);
            if ($this->session->has(SessionController::SESSION_ID)) {
                self::updateSystemLanguage($newLanguage);
            }
            $this->view->success = true;
        } else {
            $this->view->success = false;
        }
    }

    /**
     * Prepares array of available WEB UI languages
     * @return array
     */
    public static function getAvailableWebAdminLanguages(): array
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        return [
            'en' => ['name' => $translation->_('ex_English'), 'flag' => 'united kingdom'],
            'ru' => ['name' => $translation->_('ex_Russian'), 'flag' => 'russia'],
            'de' => ['name' => $translation->_('ex_Deutsch'), 'flag' => 'germany'],
            'es' => ['name' => $translation->_('ex_Spanish'), 'flag' => 'spain'],
            'el' => ['name' => $translation->_('ex_Greek'), 'flag' => 'greece'],
            'fr' => ['name' => $translation->_('ex_French'), 'flag' => 'france'],
            'pt' => ['name' => $translation->_('ex_Portuguese'), 'flag' => 'portugal'],
            'pt_BR' => ['name' => $translation->_('ex_PortugueseBrazil'), 'flag' => 'brazil'],
            'uk' => ['name' => $translation->_('ex_Ukrainian'), 'flag' => 'ukraine'],
            'ka' => ['name' => $translation->_('ex_Georgian'), 'flag' => 'georgia'],
            'it' => ['name' => $translation->_('ex_Italian'), 'flag' => 'italy'],
            'da' => ['name' => $translation->_('ex_Danish'), 'flag' => 'denmark'],
            'nl' => ['name' => $translation->_('ex_Dutch'), 'flag' => 'netherlands'],
            'pl' => ['name' => $translation->_('ex_Polish'), 'flag' => 'poland'],
            'sv' => ['name' => $translation->_('ex_Swedish'), 'flag' => 'sweden'],
            'cs' => ['name' => $translation->_('ex_Czech'), 'flag' => 'czech republic'],
            'tr' => ['name' => $translation->_('ex_Turkish'), 'flag' => 'turkey'],
            'ja' => ['name' => $translation->_('ex_Japanese'), 'flag' => 'japan'],
            'vi' => ['name' => $translation->_('ex_Vietnamese'), 'flag' => 'vietnam'],
            'az' => ['name' => $translation->_('ex_Azerbaijan'), 'flag' => 'azerbaijan'],
            'ro' => ['name' => $translation->_('ex_Romanian'), 'flag' => 'romania'],
            'th' => ['name' => $translation->_('ex_Thai'), 'flag' => 'thailand'],
            'zh_Hans' => ['name' => $translation->_('ex_Chinese'), 'flag' => 'china'],
        ];
    }
}