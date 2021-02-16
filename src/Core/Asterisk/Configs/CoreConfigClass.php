<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config;
use Phalcon\Di\Injectable;

abstract class CoreConfigClass extends Injectable
{

    /**
     * Config file name i.e. extensions.conf
     */
    protected string $description;

    /**
     * Easy way to get or set the PbxSettings values
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * Access to the /etc/inc/mikopbx-settings.json values
     * @var \Phalcon\Config
     */
    protected Config $config;

    /**
     * Shows if it is boot process now or usual work
     * @var bool
     */
    protected bool $booting;

    /**
     * Error and notice messages
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values
     */
    protected array $generalSettings;


    /**
     * ConfigClass constructor.
     */
    public function __construct()
    {
        $this->config          = $this->getDI()->getShared('config');
        $this->booting         = $this->getDI()->getShared('registry')->booting === true;
        $this->mikoPBXConfig   = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->messages = [];
    }

    /**
     * Prepares settings dataset for a PBX module
     */
    public function getSettings(): void
    {
    }


    /**
     * Generates core modules config files with cli messages before and after generation
     */
    public function generateConfig(): void
    {
        $this->echoGenerateConfig();
        $this->getSettings();
        $this->generateConfigProtected();
        $this->echoDone();
    }

    /**
     * Shows boot message which module was started
     */
    protected function echoGenerateConfig(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "   |- generate config {$this->description}... ";
        }
    }

    /**
     * Generates core modules config files
     */
    protected function generateConfigProtected(): void
    {
    }

    /**
     * Shows boot message which module generator was finished
     */
    protected function echoDone(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "\033[32;1mdone\033[0m \n";
        }
    }

    /**
     * Prepares additional rules for [internal] context section in the extensions.conf file
     * @return string
     */
    public function getIncludeInternal(): string
    {
        return '';
    }

    // Генератор extension для контекста internal.
    /**
     * TODO::Спросить не дубль ли это getIncludeInternal, может оставить одну?
     * Prepares additional rules for [internal] context section in the extensions.conf file
     * @return string
     */
    public function extensionGenInternal(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    /**
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        return '';
    }

    // Генератор extension для контекста internal.
    /**
     * TODO::Спросить не дубль ли это getIncludeInternalTransfer, может оставить одну?
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }


    // Генератор extension для контекста peers.
    public function extensionGenPeerContexts()
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    // Генератор extensions, дополнительные контексты.
    public function extensionGenContexts(): string
    {
        return '';
    }

    // Генератор хинтов для контекста internal-hints
    public function extensionGenHints(): string
    {
        // Генерация хинтов.
        return '';
    }

    // Секция global для extensions.conf.
    public function extensionGlobals(): string
    {
        // Генерация хинтов.
        return '';
    }

    // Секция featuremap для features.conf
    public function getFeatureMap(): string
    {
        // Возвращает старкоды.
        return '';
    }

    /**
     * Генерация контекста для публичных звонков.
     *
     * @param $conf
     *
     * @return void
     */
    public function generatePublicContext(&$conf): void
    {
    }


    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void
    {
    }

    /**
     * Добавление задач в crond.
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void
    {
    }


    /**
     * Генератор сеции пиров для sip.conf
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        return '';
    }

    /**
     * Генератор сеции пиров для manager.conf
     *
     */
    public function generateManagerConf(): string
    {
        return '';
    }

    /**
     * Дополнительные параметры для
     *
     * @param $peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions($peer): string
    {
        return '';
    }

    /**
     * Переопределение опций Endpoint в pjsip.conf
     *
     * @param string $id
     * @param array  $options
     *
     * @return array
     */
    public function overridePJSIPOptions(/** @scrutinizer ignore-unused */ string $id, array $options): array
    {
        return $options;
    }

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutContext($rout): string
    {
        return '';
    }

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext($rout): string
    {
        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $id
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext($id): string
    {
        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string
    {
        return '';
    }


    /**
     * Returns the messages variable
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Returns models list of models which affect the current module settings
     *
     * @return array
     */
    public function dependenceModels(): array
    {
        return [];
    }

    /**
     * Makes pretty module text block into config file
     *
     * @param string $addition
     *
     * @return string
     */
    protected function confBlockWithComments(string $addition): string
    {
        return $addition;
    }

}