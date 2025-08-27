<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
 * Class ApiKeys
 * 
 * Represents API keys for REST API authentication
 * 
 * @package MikoPBX\Common\Models
 */
class ApiKeys extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;
    
    /**
     * Description of the key purpose (formerly name field)
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';
    
    /**
     * Hashed API key value (using bcrypt)
     * 
     * @Column(type="string", nullable=false)
     */
    public string $key_hash = '';
    
    /**
     * Last 4 characters of the key for identification
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $key_suffix = '';
    
    /**
     * Display representation of the key (first 5 + ... + last 5 chars)
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $key_display = '';
    
    /**
     * Network filter ID for IP restrictions
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $networkfilterid = '';
    
    /**
     * JSON array of allowed controller paths from @RoutePrefix
     * Empty = all controllers allowed
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $allowed_paths = '';
    
    /**
     * Full permissions flag (1 = all permissions, 0 = selective permissions)
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $full_permissions = '1';
    
    /**
     * Timestamp when the key was created
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $created_at = '';
    
    /**
     * Timestamp of last usage (cached in Redis, periodically synced)
     * 
     * @Column(type="string", nullable=true)
     */
    public ?string $last_used_at = '';
    
    
    /**
     * Initialize model
     */
    public function initialize(): void
    {
        $this->setSource('m_ApiKeys');
        parent::initialize();
        
        // Relation to NetworkFilters for IP restrictions
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias' => 'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }
    
    /**
     * Set default values before validation
     */
    public function beforeValidation(): void
    {
        if (empty($this->created_at)) {
            $this->created_at = date('Y-m-d H:i:s');
        }
    }
    
}