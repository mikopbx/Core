<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026270
 *
 * Normalizes WEB_ADMIN_LANGUAGE if it points to a code that is no longer in
 * LanguageProvider::AVAILABLE_LANGUAGES (e.g. legacy 'en_GB' removed in this
 * release). Direct PbxSettings consumers — login/refresh JWT issuance,
 * marketplace and update-server requests, SSL e-mail templates — would
 * otherwise keep sending the obsolete code indefinitely.
 *
 * Idempotent: skips work when the stored value is already a known code.
 */
class UpdateConfigsUpToVer2026270 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.2.70';

    public function processUpdate(): void
    {
        $current = (string)PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
        if ($current === '' || array_key_exists($current, LanguageProvider::AVAILABLE_LANGUAGES)) {
            return;
        }

        PbxSettings::setValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE, 'en');
        echo "Migrated WEB_ADMIN_LANGUAGE from '{$current}' to 'en' (removed from AVAILABLE_LANGUAGES)\n";
    }
}
