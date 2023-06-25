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


use MikoPBX\AdminCabinet\Providers\AssetProvider;
use MikoPBX\Common\Providers\ConfigProvider;
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
            AssetProvider::HEADER_SENTRY_JS,
            AssetProvider::HEADER_PBX_JS,
            AssetProvider::HEADER_JS
        ];

        $needCombineJS = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.combineJS')??false;
        if (!$needCombineJS){
            $resultTags = '';
            foreach ($headerJSCollections as $collectionName){
                $resultTags .= $this->outputJS($collectionName).PHP_EOL;
            }
            return $resultTags;
        }

        // Need to combine and minify all JS files in one and save it as cached file
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
            AssetProvider::SEMANTIC_UI_JS,
            AssetProvider::FOOTER_ACE,
            AssetProvider::FOOTER_LOC,
            AssetProvider::FOOTER_PBX_JS
        ];

        $needCombineJS = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.combineJS')??false;
        if (!$needCombineJS){
            $resultTags = '';
            foreach ($headerJSCollections as $collectionName){
                $resultTags .= $this->outputJS($collectionName).PHP_EOL;
            }
            return $resultTags;
        }

        // Need to combine and minify all JS files in one and save it as cached file
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
            AssetProvider::SEMANTIC_UI_CSS,
            AssetProvider::HEADER_CSS,
        ];

        $needCombineCSS = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.combineCSS')??false;
        if (!$needCombineCSS){
            $resultTags = '';
            foreach ($headerJSCollections as $collectionName){
                $resultTags .= $this->outputCss($collectionName).PHP_EOL;
            }
            return $resultTags;
        }

        // Need to combine and minify all CSS files in one and save it as cached file
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
                        [   '../themes/default/assets',],
                        [
                            './../../vendor/themes/default/assets',
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