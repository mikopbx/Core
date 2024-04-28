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

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

/**
 * Class IncomingRoutingTable
 *
 * @package MikoPBX\Common\Models
 */
class IncomingRoutingTable extends ModelsBase
{
    public const ACTION_EXTENSION = 'extension';
    public const ACTION_HANGUP    = 'hangup';
    public const ACTION_BUSY      = 'busy';
    public const ACTION_DID       = 'did2user';
    public const ACTION_VOICEMAIL = 'voicemail';
    public const ACTION_PLAYBACK  = 'playback';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Name of the routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $rulename = '';

    /**
     * DID (Direct Inward Dialing) of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $number = '';

    /**
     * Extension to which the call will be forwarded if this rule is triggered
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Provider associated with the routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $provider = '';

    /**
     * Priority level of the routing rule
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * Timeout, in seconds, during which the system will attempt to reach the internal extension.
     * After the timeout expires, the call will be redirected to a rule with a higher priority or to the default rule
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout = '30';

    /**
     * Action to be taken for the routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $action = '';

    /**
     * Additional note or description for the routing rule
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $note = '';

    /**
     *  ID of the audio greeting message record.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $audio_message_id = '';

    /**
     * Resets default rule to busy action
     */
    public static function resetDefaultRoute(): IncomingRoutingTable
    {
        $defaultRule = self::find('priority=9999');
        foreach ($defaultRule as $rule) {
            $rule->delete();
        }
        $defaultRule = self::findFirstById(1);
        if ($defaultRule === null) {
            $defaultRule = new self();
            $defaultRule->id = 1;
        }
        $defaultRule->action = self::ACTION_BUSY;
        $defaultRule->priority = 9999;
        $defaultRule->rulename = 'default action';
        $defaultRule->save();
        return $defaultRule;
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_IncomingRoutingTable');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'provider',
            Providers::class,
            'uniqid',
            [
                'alias' => 'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        $this->hasOne(
            'id',
            OutWorkTimesRouts::class,
            'routId',
            [
                'alias' => 'OutWorkTimesRouts',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    /**
     * Returns the maximum priority value of +1
     * @return int
     */
    public static function getMaxNewPriority():int
    {
        $parameters = [
            'column' => 'priority',
            'conditions'=>'id!=1'
        ];
        return (int)IncomingRoutingTable::maximum($parameters)+1;
    }

}

