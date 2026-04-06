<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class GetAvailableLanguagesAction
 *
 * Returns list of available web interface languages
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class GetAvailableLanguagesAction
{
    /**
     * Get list of available languages for web interface
     *
     * @param array $data Request data (not used)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Use LanguageProvider directly (single source of truth)
            $availableLanguages = LanguageProvider::AVAILABLE_LANGUAGES;

            // Transform to REST API format
            $languages = [];
            foreach ($availableLanguages as $code => $info) {
                $languages[] = [
                    'code' => $code,
                    'name' => $info['name'],
                    'flag' => $info['flag'],
                ];
            }

            $res->success = true;
            $res->data = $languages;
        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to retrieve available languages: ' . $e->getMessage();
        }

        return $res;
    }
}
