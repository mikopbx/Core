<?php

namespace MikoPBX\Core\Modules\Config;


interface AsteriskConfigInterface
{

    public function getSettings();

    public function generateConfig($general_settings): void;

    // Получаем строки include для секции internal.
    public function getIncludeInternal();

    // Получаем строки include для секции internal-transfer.
    public function getIncludeInternalTransfer();

    // Генератор extension для контекста internal.
    public function extensionGenInternal();

    // Генератор extension для контекста internal.
    public function extensionGenInternalTransfer();

    /**
     * Опираясь на ID учетной записи возвращает имя технологии SIP / IAX2.
     *
     * @param string $id
     *
     * @return string
     */
    public function getTechByID($id): string;

    // Генератор extension для контекста peers.
    public function extensionGenPeerContexts();

    // Генератор extensions, дополнительные контексты.
    public function extensionGenContexts();

    // Генератор хинтов для контекста internal-hints
    public function extensionGenHints();

    // Секция global для extensions.conf.
    public function extensionGlobals();

    // Секция featuremap для features.conf
    public function getFeatureMap();

    /**
     * Генерация контекста для публичных звонков.
     *
     * @return string
     */
    public function generatePublicContext(&$conf);


    /**
     * Генератор сеции пиров для sip.conf
     *
     * @return string
     */
    public function generatePeers($param);

    /**
     * Генератор сеции пиров для sip.conf
     *
     * @return string
     */
    public function generatePeersPj($param);

    /**
     * Генератор сеции пиров для manager.conf
     *
     * @return string
     */
    public function generateManager($param);

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
     * @param $peer
     *
     * @return string
     */
    public function generateOutRoutContext($rout): string;

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $peer
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext($rout): string;

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $peer
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext($id): string;

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $peer
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string;

}