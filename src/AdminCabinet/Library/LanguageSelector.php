<?php

namespace MikoPBX\AdminCabinet\Library;

use MikoPBX\Providers\TranslationProvider;
use Phalcon\Di\Injectable;

/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
class LanguageSelector extends Injectable
{
    private $language = null;

    public function __construct()
    {
        if (($list = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE']))) {
            if (preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9.]+))?/', $list, $list)) {
                $this->language = array_combine($list[1], $list[2]);
                foreach ($this->language as $n => $v) {
                    $this->language[$n] = $v ? $v : 1;
                }
                arsort($this->language, SORT_NUMERIC);
            }
        } else {
            $this->language = [];
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