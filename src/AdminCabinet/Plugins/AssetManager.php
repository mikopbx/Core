<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Plugins;


use Phalcon\Assets\Manager;
use function MikoPBX\Common\Config\appPath;

class AssetManager extends Manager
{
    private string $version;

    /**
     * Sets asset versions
     *
     * @param string $version
     */
    public function setVersion(string $version)
    {
        $this->version = $version;
    }

    /**
     * Prints the HTML for CSS assets
     *
     * @param string|null $collectionName
     *
     * @return string
     */
    public function outputCss(string $collectionName = null): string
    {
        if ($collectionName !== null) {
            foreach ($this->collection($collectionName) as $resource) {
                $resource->setVersion($this->version);
            }
        }

        return parent::outputCss($collectionName);
    }

    /**
     * Prints the HTML for JS assets
     *
     * @param string|null $collectionName
     *
     * @return string
     */
    public function outputJs(string $collectionName = null): string
    {
        if ($collectionName !== null) {
            foreach ($this->collection($collectionName) as $resource) {
                $resource->setVersion($this->version);
            }
        }

        return parent::outputJs($collectionName);
    }

    public function outputCombinedHeaderJs(string $controller, string $action){

        $jsCachePath = appPath('sites/admin-cabinet/assets/js/cache').'/'.$this->version;
        if (!is_dir($jsCachePath)){
            mkdir($jsCachePath, 0755, true);
        }

        $headerJSCollections = [
            'headerSentryJS',
            'headerPBXJS',
            'headerJS'
        ];

        $combinedJsFilePath = "{$jsCachePath}/{$controller}-{$action}-header.js";
        if (!file_exists($combinedJsFilePath)){
            file_put_contents($combinedJsFilePath, '', LOCK_EX);
            foreach ($headerJSCollections as $collectionName){
                file_put_contents($combinedJsFilePath, '// Data collection '.$collectionName.PHP_EOL, FILE_APPEND | LOCK_EX);
                foreach ($this->collection($collectionName) as $resource) {
                    file_put_contents($combinedJsFilePath, '// JS file '.$resource->getPath().PHP_EOL, FILE_APPEND | LOCK_EX);
                    $sourceJsPath = appPath('sites/admin-cabinet/assets/').$resource->getPath();
                    file_put_contents($combinedJsFilePath, file_get_contents($sourceJsPath),FILE_APPEND | LOCK_EX);
                    file_put_contents($combinedJsFilePath, PHP_EOL, FILE_APPEND | LOCK_EX);
                }
            }
        }

        return "<script src='/admin-cabinet/assets/js/cache/{$this->version}/{$controller}-{$action}-header.js?ver=".$this->version."'></script>";

    }

    public function outputCombinedFooterJs(string $controller, string $action){

        $jsCachePath = appPath('sites/admin-cabinet/assets/js/cache').'/'.$this->version;
        if (!is_dir($jsCachePath)){
            mkdir($jsCachePath, 0755, true);
        }

        $headerJSCollections = [
            'SemanticUIJS',
            'footerACE',
            'footerLoc',
            'footerPBXJS'
        ];

        $combinedJsFilePath = "{$jsCachePath}/{$controller}-{$action}-footer.js";
        if (!file_exists($combinedJsFilePath)){
            file_put_contents($combinedJsFilePath, '', LOCK_EX);
            foreach ($headerJSCollections as $collectionName){
                file_put_contents($combinedJsFilePath, '// Data collection '.$collectionName.PHP_EOL, FILE_APPEND | LOCK_EX);
                foreach ($this->collection($collectionName) as $resource) {
                    file_put_contents($combinedJsFilePath, '// JS file '.$resource->getPath().PHP_EOL, FILE_APPEND | LOCK_EX);
                    $sourceJsPath = appPath('sites/admin-cabinet/assets/').$resource->getPath();
                    file_put_contents($combinedJsFilePath, file_get_contents($sourceJsPath),FILE_APPEND | LOCK_EX);
                    file_put_contents($combinedJsFilePath, PHP_EOL, FILE_APPEND | LOCK_EX);
                }
            }
        }

        return "<script src='/admin-cabinet/assets/js/cache/{$this->version}/{$controller}-{$action}-footer.js?ver=".$this->version."'></script>";

    }

    public function outputCombinedHeaderCSS(string $controller, string $action){

        $CSSCachePath = appPath('sites/admin-cabinet/assets/css/cache').'/'.$this->version;
        if (!is_dir($CSSCachePath)){
            mkdir($CSSCachePath, 0755, true);
        }

        $headerJSCollections = [
            'SemanticUICSS',
            'headerCSS'
        ];

        $combinedCSSFilePath = "{$CSSCachePath}/{$controller}-{$action}.css";
        if (!file_exists($combinedCSSFilePath)){
            file_put_contents($combinedCSSFilePath, '', LOCK_EX);
            foreach ($headerJSCollections as $collectionName){
                file_put_contents($combinedCSSFilePath, '/* Data collection '.$collectionName.'*/'.PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
                foreach ($this->collection($collectionName) as $resource) {
                    file_put_contents($combinedCSSFilePath, '/* CSS file '.$resource->getPath().'*/'.PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
                    $sourceCSSPath = appPath('sites/admin-cabinet/assets/').$resource->getPath();
                    $sourceCSSContent = file_get_contents($sourceCSSPath);
                    $sourceCSSContent = str_replace(
                        [   './themes/default/assets/fonts/',
                            'url(icons.woff)',
                            'url(icons.woff2)',
                            'url(outline-icons.woff2)',
                            'url(outline-icons.woff)',
                            'url(brand-icons.woff2)',
                            'url(brand-icons.woff)',
                            'url(../themes/default/assets/images/flags.png)',
                            'font/lato-v15-latin',
                            'font/lato-v14-latin',
                        ],
                        [
                            './../vendor/themes/default/assets/fonts/',
                            'url("./../vendor/themes/default/assets/fonts/icons.woff")',
                            'url("./../vendor/themes/default/assets/fonts/icons.woff2")',
                            'url("./../vendor/themes/default/assets/fonts/outline-icons.woff2")',
                            'url("./../vendor/themes/default/assets/fonts/outline-icons.woff")',
                            'url("./../vendor/themes/default/assets/fonts/brand-icons.woff2")',
                            'url("./../vendor/themes/default/assets/fonts/brand-icons.woff")',
                            'url(./../../vendor/themes/default/assets/images/flags.png)',
                            './../../vendor/semantic/font/lato-v15-latin',
                            './../../vendor/semantic/font/lato-v14-latin'
                        ],
                        $sourceCSSContent
                    );
                    file_put_contents($combinedCSSFilePath, $sourceCSSContent,FILE_APPEND | LOCK_EX);
                    file_put_contents($combinedCSSFilePath, PHP_EOL.PHP_EOL, FILE_APPEND | LOCK_EX);
                }
            }
        }

        return "<link rel='stylesheet' type='text/css' href='/admin-cabinet/assets/css/cache/{$this->version}/{$controller}-{$action}.css?ver=".$this->version."'>";

    }
}