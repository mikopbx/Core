<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Library;

use Phalcon\Di\Injectable;

class LanguageSelector extends Injectable
{
    private array $language = [];

    public function __construct()
    {
        if (($list = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE']))) {
            if (preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9.]+))?/', $list, $list)) {
                $language = array_combine($list[1], $list[2]);
                if (is_array($language)){
                    foreach ($language as $n => $v) {
                        $this->language[$n] = $v ? $v : 1;
                    }
                    arsort($this->language, SORT_NUMERIC);
                }
            }
        }
    }

    /**
     * Returns the best matched language by User's web browser settings
     *
     * @return string
     */
    public function getBestMatch(): string
    {
        $languages = [
            'en' => 'en',
            'ru' => 'ru',
            'de' => 'de',
            'es' => 'es',
            'fr' => 'fr',
            'pt' => 'pt',
            'uk' => 'uk',
            'it' => 'it',
            'da' => 'da',
            'pl' => 'pl',
            'sv' => 'sv',
            'cs' => 'cs',
            'tr' => 'tr',
            'ja' => 'ja',
            'vi' => 'vi',
            'zh' => 'zh_Hans',
        ];

        foreach ($this->language as $l => $v) {
            $s = strtok($l, '-'); // убираем то что идет после тире в языках вида "en-us, ru-ru"
            if (isset($languages[$s])) {
                return $languages[$s];
            }
        }

        return 'en'; // Default
    }
}