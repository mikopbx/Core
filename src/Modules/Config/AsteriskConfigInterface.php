<?php

namespace MikoPBX\Modules\Config;


interface AsteriskConfigInterface
{

    /**
     * @return mixed
     */
    public function getSettings(): void;

    /**
     *
     */
    public function generateConfig(): void;

    /**
     * Получаем строки include для секции internal
     * @return string
     */
    public function getIncludeInternal(): string;

    /**
     * Получаем строки include для секции internal-transfer.
     * @return string
     */
    public function getIncludeInternalTransfer(): string;


    /**
     * Генератор extension для контекста internal
     * @return string
     */
    public function extensionGenInternal(): string;

    /**
     * Генератор extension для контекста internal-transfer
     *
     * @return string
     */
    public function extensionGenInternalTransfer(): string;

    /**
     * Опираясь на ID учетной записи возвращает имя технологии SIP / IAX2.
     *
     * @param string $id
     *
     * @return string
     */
    public function getTechByID($id): string;

    /**
     * Генератор extension для контекста peers
     *
     * @return mixed
     */
    public function extensionGenPeerContexts();


    /**
     * Генератор extensions, дополнительные контексты.
     *
     * @return string
     */
    public function extensionGenContexts(): string;

    /**
     * Генератор хинтов для контекста internal-hints
     *
     * @return string
     */
    public function extensionGenHints(): string;


    /**
     * Секция global для extensions.conf
     * @return mixed
     */
    public function extensionGlobals();

    /**
     * Секция featuremap для features.conf
     *
     * @return mixed
     */
    public function getFeatureMap();

    /**
     * Генерация контекста для публичных звонков.
     *
     * @param $conf
     *
     * @return void
     */
    public function generatePublicContext(&$conf): void;


    /**
     * Генератор сеции пиров для sip.conf
     *
     *
     * @return string
     */
    public function generatePeers(): string;

    /**
     * Генератор сеции пиров для sip.conf
     *
     *
     * @return string
     */
    public function generatePeersPj():string;

    /**
     * Генератор сеции пиров для manager.conf
     *
     * @return string
     */
    public function generateManagerConf():string;

    /**
     * Генератор modules.conf
     *
     * @return string
     */
    public function generateModulesConf():string;

    /**
     * Дополнительные параметры для
     *
     * @param $peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions($peer): string;

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutContext($rout): string;

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext($rout): string;

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $id
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext($id): string;

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string;

}