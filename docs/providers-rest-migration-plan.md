# MikoPBX Providers REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX SIP and IAX provider management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface while improving status monitoring through EventBus WebSocket integration and Redis caching.

## Current State

### Existing Architecture

- **Models**: 
  - `src/Common/Models/Providers.php` - Main provider model
  - `src/Common/Models/Sip.php` - SIP provider configuration
  - `src/Common/Models/Iax.php` - IAX provider configuration  
  - `src/Common/Models/SipHosts.php` - Additional SIP hosts
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/ProvidersController.php`
- **SIP Form**: `src/AdminCabinet/Forms/SipProviderEditForm.php`
- **IAX Form**: `src/AdminCabinet/Forms/IaxProviderEditForm.php`
- **Views**: `src/AdminCabinet/Views/Providers/`
- **JavaScript**: Provider management and status monitoring scripts
- **Existing REST API**: Limited endpoints for status checking only

### Provider Models Structure

#### Providers Model Fields
```php
public $id;           // Primary key
public $uniqid;       // Unique identifier
public $type;         // Provider type ('SIP'|'IAX')
public $sipuid;       // Reference to SIP table
public $iaxuid;       // Reference to IAX table
public $note;         // Provider description
```

#### SIP Model Fields (Key Fields)
```php
public $uniqid;              // Unique identifier
public $extension;           // Extension number
public $type;                // peer/friend
public $username;            // SIP username
public $secret;              // SIP password
public $host;                // Host/IP address
public $port;                // SIP port
public $disabled;            // "1" if disabled
public $registration_type;   // outbound/inbound/none
public $transport;           // UDP/TCP/TLS
public $qualify;             // "1" if qualify enabled
public $qualifyfreq;         // Qualify frequency in seconds
public $description;         // Provider description
```

#### IAX Model Fields (Key Fields)
```php
public $uniqid;              // Unique identifier
public $username;            // IAX username
public $secret;              // IAX password
public $host;                // Host/IP address
public $qualify;             // "1" if qualify enabled
public $disabled;            // "1" if disabled
public $registration_type;   // outbound/inbound/none
public $description;         // Provider description
```

### Current Status Monitoring System

**Current Implementation**:
- **JavaScript Workers**: `providers-status-worker.js` polls every 3 seconds
- **REST Endpoints**: 
  - `/pbxcore/api/sip/getRegistry` - SIP provider statuses
  - `/pbxcore/api/iax/getRegistry` - IAX provider statuses
- **AMI Integration**: Direct Asterisk Manager Interface queries
- **Session Storage**: Status caching on client side
- **Visual Indicators**: Real-time status updates in provider table

**Status Types**:
- **SIP**: REGISTERED, UNREGISTERED, OFF, OK, UNKNOWN
- **IAX**: Registered, Error register, OFF, UNKNOWN, OK

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Providers

**File**: `src/PBXCoreREST/Lib/Providers/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting provider record
 * 
 * @api {get} /pbxcore/api/v2/providers/getRecord/:id Get provider record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * @apiParam {String} [type] Provider type (SIP/IAX) for new records
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.type Provider type (SIP/IAX)
 * @apiSuccess {String} data.description Provider description
 * @apiSuccess {Object} data.config Type-specific configuration
 */
class GetRecordAction
{
    /**
     * Get provider record
     * @param array $data - Request data with id and optional type
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $id = $data['id'] ?? null;
        $type = strtoupper($data['type'] ?? 'SIP');
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newProvider = new Providers();
            $newProvider->id = '';
            $newProvider->uniqid = self::generateUniqueID($type . '-TRUNK-');
            $newProvider->type = $type;
            $newProvider->note = '';
            
            if ($type === 'SIP') {
                $newProvider->sipuid = $newProvider->uniqid;
                $config = new Sip();
                $config->uniqid = $newProvider->uniqid;
                $config->type = 'friend';
                $config->port = 5060;
                $config->disabled = '0';
                $config->qualifyfreq = 60;
                $config->qualify = '1';
                $config->secret = '';
                $config->transport = 'UDP';
                $config->registration_type = 'outbound';
            } else {
                $newProvider->iaxuid = $newProvider->uniqid;
                $config = new Iax();
                $config->uniqid = $newProvider->uniqid;
                $config->disabled = '0';
                $config->qualify = '1';
                $config->secret = '';
                $config->registration_type = 'outbound';
            }
            
            $res->data = DataStructure::createFromModels($newProvider, $config);
            $res->success = true;
        } else {
            // Find existing record
            $provider = Providers::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if ($provider) {
                $configType = ucfirst(strtolower($provider->type));
                $config = $provider->$configType;
                
                if ($config) {
                    $res->data = DataStructure::createFromModels($provider, $config);
                    $res->success = true;
                } else {
                    $res->messages['error'][] = 'Provider configuration not found';
                }
            } else {
                $res->messages['error'][] = 'Provider not found';
            }
        }
        
        return $res;
    }
    
    /**
     * Generate unique ID for provider
     */
    protected static function generateUniqueID(string $prefix): string
    {
        return $prefix . strtoupper(substr(md5(uniqid()), 0, 8));
    }
}
```

**File**: `src/PBXCoreREST/Lib/Providers/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all providers
 * 
 * @api {get} /pbxcore/api/v2/providers/getList Get all providers
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup Providers
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of providers
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.type Provider type
 * @apiSuccess {String} data.description Provider description
 * @apiSuccess {String} data.username Username
 * @apiSuccess {String} data.hostname Host address
 * @apiSuccess {String} data.status Enabled/disabled status
 */
class GetListAction
{
    /**
     * Get list of all providers
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all providers with their configurations
            $providers = Providers::find([
                'order' => 'type ASC, note ASC, id ASC'
            ]);
            
            $data = [];
            foreach ($providers as $provider) {
                $configType = ucfirst(strtolower($provider->type));
                $config = $provider->$configType;
                
                if ($config) {
                    $data[] = DataStructure::createFromModels($provider, $config, true);
                }
            }
            
            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/Providers/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving provider record
 * 
 * @api {post} /pbxcore/api/v2/providers/saveRecord Create provider
 * @api {put} /pbxcore/api/v2/providers/saveRecord/:id Update provider
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} type Provider type (SIP/IAX)
 * @apiParam {String} description Provider description
 * @apiParam {Object} config Provider configuration object
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved provider data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save provider record
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Data sanitization
        $sanitizationRules = [
            'id' => 'int',
            'type' => 'string|upper|max:3',
            'description' => 'string|html_escape|max:255',
            'config' => 'array'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'type' => [
                ['type' => 'required', 'message' => 'Provider type is required'],
                ['type' => 'regex', 'pattern' => '/^(SIP|IAX)$/', 'message' => 'Invalid provider type']
            ],
            'description' => [
                ['type' => 'required', 'message' => 'Provider description is required']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $result = BaseActionHelper::executeInTransaction(function() use ($data) {
                return self::saveProviderInTransaction($data);
            });
            
            $res->data = DataStructure::createFromModels($result['provider'], $result['config']);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "providers/modify{$result['provider']->type}/" . $result['provider']->uniqid;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Save provider and configuration in transaction
     */
    private static function saveProviderInTransaction(array $data): array
    {
        // Get or create provider
        if (!empty($data['id'])) {
            $provider = Providers::findFirstById($data['id']);
            if (!$provider) {
                throw new \Exception('Provider not found');
            }
        } else {
            $provider = new Providers();
            $provider->uniqid = self::generateUniqueID($data['type'] . '-TRUNK-');
            $provider->type = $data['type'];
        }
        
        $provider->note = $data['description'];
        
        // Update type-specific configuration
        $configType = ucfirst(strtolower($data['type']));
        $configUidField = strtolower($data['type']) . 'uid';
        
        if ($data['type'] === 'SIP') {
            $config = $provider->Sip ?: new Sip();
            $config->uniqid = $provider->uniqid;
            $provider->sipuid = $provider->uniqid;
            
            self::updateSipConfig($config, $data['config'] ?? []);
        } else {
            $config = $provider->Iax ?: new Iax();
            $config->uniqid = $provider->uniqid;
            $provider->iaxuid = $provider->uniqid;
            
            self::updateIaxConfig($config, $data['config'] ?? []);
        }
        
        // Save provider first
        if (!$provider->save()) {
            throw new \Exception('Failed to save provider: ' . implode(', ', $provider->getMessages()));
        }
        
        // Save configuration
        if (!$config->save()) {
            throw new \Exception('Failed to save provider configuration: ' . implode(', ', $config->getMessages()));
        }
        
        // Handle SIP hosts if needed
        if ($data['type'] === 'SIP' && isset($data['config']['additional_hosts'])) {
            self::updateSipHosts($config->uniqid, $data['config']['additional_hosts']);
        }
        
        return ['provider' => $provider, 'config' => $config];
    }
    
    /**
     * Update SIP configuration
     */
    private static function updateSipConfig(Sip $config, array $data): void
    {
        $allowedFields = [
            'description', 'username', 'secret', 'host', 'port', 'type',
            'transport', 'qualify', 'qualifyfreq', 'disabled', 'registration_type',
            'extension', 'networkfilterid', 'manualattributes'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $config->$field = $data[$field];
            }
        }
    }
    
    /**
     * Update IAX configuration
     */
    private static function updateIaxConfig(Iax $config, array $data): void
    {
        $allowedFields = [
            'description', 'username', 'secret', 'host', 'qualify',
            'disabled', 'registration_type', 'extension', 'manualattributes'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $config->$field = $data[$field];
            }
        }
    }
    
    /**
     * Update SIP additional hosts
     */
    private static function updateSipHosts(string $sipUniqid, array $hosts): void
    {
        // Delete existing hosts
        SipHosts::find([
            'conditions' => 'sipuid = :uid:',
            'bind' => ['uid' => $sipUniqid]
        ])->delete();
        
        // Add new hosts
        foreach ($hosts as $hostData) {
            if (!empty($hostData['host'])) {
                $sipHost = new SipHosts();
                $sipHost->sipuid = $sipUniqid;
                $sipHost->address = $hostData['host'];
                $sipHost->port = $hostData['port'] ?? 5060;
                $sipHost->save();
            }
        }
    }
    
    /**
     * Generate unique ID
     */
    private static function generateUniqueID(string $prefix): string
    {
        return $prefix . strtoupper(substr(md5(uniqid()), 0, 8));
    }
}
```

**File**: `src/PBXCoreREST/Lib/Providers/GetStatusAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Action for getting provider status
 * 
 * @api {get} /pbxcore/api/v2/providers/getStatus Get all provider statuses
 * @apiVersion 2.0.0
 * @apiName GetStatus
 * @apiGroup Providers
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider statuses
 * @apiSuccess {Object} data.sip SIP provider statuses
 * @apiSuccess {Object} data.iax IAX provider statuses
 */
class GetStatusAction
{
    private const CACHE_TTL = 5; // 5 seconds cache
    private const CACHE_KEY_PREFIX = 'provider_status_';
    
    /**
     * Get provider statuses with Redis caching
     * 
     * @param array $data - Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $di = Di::getDefault();
            $redis = $di->get('redis');
            
            // Try to get from cache first
            $cacheKey = self::CACHE_KEY_PREFIX . 'all';
            $cachedData = $redis->get($cacheKey);
            
            if ($cachedData !== false) {
                $res->data = json_decode($cachedData, true);
                $res->success = true;
                $res->cached = true;
                return $res;
            }
            
            // Get fresh status data
            $statusData = [
                'sip' => self::getSipStatuses(),
                'iax' => self::getIaxStatuses(),
                'timestamp' => time()
            ];
            
            // Cache for short period
            $redis->setex($cacheKey, self::CACHE_TTL, json_encode($statusData));
            
            $res->data = $statusData;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            
            // Return empty status data on error
            $res->data = [
                'sip' => [],
                'iax' => [],
                'timestamp' => time()
            ];
        }
        
        return $res;
    }
    
    /**
     * Get SIP provider statuses from Asterisk
     */
    private static function getSipStatuses(): array
    {
        $statuses = [];
        
        try {
            $manager = Util::getAstManager();
            if (!$manager) {
                return $statuses;
            }
            
            // Get SIP registry status
            $result = $manager->sendRequestTimeout('SIPshowregistry', []);
            if ($result && isset($result['data'])) {
                foreach ($result['data'] as $registryData) {
                    if (!isset($registryData['uri'])) continue;
                    
                    $uniqid = self::findProviderByHost($registryData['uri'], 'SIP');
                    if ($uniqid) {
                        $statuses[$uniqid] = [
                            'state' => $registryData['state'] ?? 'UNKNOWN',
                            'username' => $registryData['username'] ?? '',
                            'refresh' => $registryData['refresh'] ?? 0,
                            'host' => $registryData['uri'] ?? ''
                        ];
                    }
                }
            }
            
            // Get SIP peer status for non-registered providers
            $providers = Providers::find(['conditions' => 'type = "SIP"']);
            foreach ($providers as $provider) {
                if (!isset($statuses[$provider->uniqid]) && $provider->Sip) {
                    $sip = $provider->Sip;
                    if ($sip->disabled === '1') {
                        $statuses[$provider->uniqid] = [
                            'state' => 'OFF',
                            'username' => $sip->username ?? '',
                            'host' => $sip->host ?? ''
                        ];
                    } else {
                        $statuses[$provider->uniqid] = [
                            'state' => 'UNREGISTERED',
                            'username' => $sip->username ?? '',
                            'host' => $sip->host ?? ''
                        ];
                    }
                }
            }
            
        } catch (\Exception $e) {
            // Log error but don't fail completely
            SystemMessages::sysLogMsg(__METHOD__, "Error getting SIP statuses: " . $e->getMessage(), LOG_ERR);
        }
        
        return $statuses;
    }
    
    /**
     * Get IAX provider statuses from Asterisk
     */
    private static function getIaxStatuses(): array
    {
        $statuses = [];
        
        try {
            $manager = Util::getAstManager();
            if (!$manager) {
                return $statuses;
            }
            
            // Get IAX registry status
            $result = $manager->sendRequestTimeout('IAXregistry', []);
            if ($result && isset($result['data'])) {
                foreach ($result['data'] as $registryData) {
                    if (!isset($registryData['addr'])) continue;
                    
                    $uniqid = self::findProviderByHost($registryData['addr'], 'IAX');
                    if ($uniqid) {
                        $statuses[$uniqid] = [
                            'state' => $registryData['state'] ?? 'UNKNOWN',
                            'username' => $registryData['username'] ?? '',
                            'refresh' => $registryData['refresh'] ?? 0,
                            'host' => $registryData['addr'] ?? ''
                        ];
                    }
                }
            }
            
            // Get IAX peer status for non-registered providers
            $providers = Providers::find(['conditions' => 'type = "IAX"']);
            foreach ($providers as $provider) {
                if (!isset($statuses[$provider->uniqid]) && $provider->Iax) {
                    $iax = $provider->Iax;
                    if ($iax->disabled === '1') {
                        $statuses[$provider->uniqid] = [
                            'state' => 'OFF',
                            'username' => $iax->username ?? '',
                            'host' => $iax->host ?? ''
                        ];
                    } else {
                        $statuses[$provider->uniqid] = [
                            'state' => 'UNREGISTERED',
                            'username' => $iax->username ?? '',
                            'host' => $iax->host ?? ''
                        ];
                    }
                }
            }
            
        } catch (\Exception $e) {
            // Log error but don't fail completely
            SystemMessages::sysLogMsg(__METHOD__, "Error getting IAX statuses: " . $e->getMessage(), LOG_ERR);
        }
        
        return $statuses;
    }
    
    /**
     * Find provider by host address
     */
    private static function findProviderByHost(string $hostUri, string $type): ?string
    {
        $host = parse_url($hostUri, PHP_URL_HOST) ?: $hostUri;
        
        if ($type === 'SIP') {
            $config = \MikoPBX\Common\Models\Sip::findFirst([
                'conditions' => 'host = :host:',
                'bind' => ['host' => $host]
            ]);
        } else {
            $config = \MikoPBX\Common\Models\Iax::findFirst([
                'conditions' => 'host = :host:',
                'bind' => ['host' => $host]
            ]);
        }
        
        return $config ? $config->uniqid : null;
    }
}
```

**File**: `src/PBXCoreREST/Lib/Providers/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;

/**
 * Data structure for providers
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class DataStructure
{
    /**
     * Create data array from Provider and config models
     * @param Providers $provider
     * @param Sip|Iax $config
     * @param bool $listMode - If true, return abbreviated data for lists
     * @return array
     */
    public static function createFromModels($provider, $config, bool $listMode = false): array
    {
        $result = [
            'id' => (string)$provider->id,
            'uniqid' => $provider->uniqid,
            'type' => $provider->type,
            'description' => $config->description ?? $provider->note ?? '',
            'username' => $config->username ?? '',
            'hostname' => $config->host ?? '',
            'status' => $config->disabled === '1' ? 'disabled' : 'enabled',
            'existLinks' => self::hasRoutingLinks($provider)
        ];
        
        if (!$listMode) {
            // Full data for edit forms
            $result['config'] = self::getConfigData($config, $provider->type);
        }
        
        return $result;
    }
    
    /**
     * Get configuration data based on provider type
     */
    private static function getConfigData($config, string $type): array
    {
        if ($type === 'SIP') {
            return self::getSipConfigData($config);
        } else {
            return self::getIaxConfigData($config);
        }
    }
    
    /**
     * Get SIP configuration data
     */
    private static function getSipConfigData(Sip $sip): array
    {
        $data = [
            'id' => (string)$sip->id,
            'uniqid' => $sip->uniqid,
            'extension' => $sip->extension ?? '',
            'type' => $sip->type ?? 'friend',
            'username' => $sip->username ?? '',
            'secret' => $sip->secret ?? '',
            'host' => $sip->host ?? '',
            'port' => (int)($sip->port ?? 5060),
            'transport' => $sip->transport ?? 'UDP',
            'qualify' => $sip->qualify ?? '1',
            'qualifyfreq' => (int)($sip->qualifyfreq ?? 60),
            'disabled' => $sip->disabled ?? '0',
            'registration_type' => $sip->registration_type ?? 'outbound',
            'networkfilterid' => $sip->networkfilterid ?? '',
            'manualattributes' => $sip->manualattributes ?? '',
            'description' => $sip->description ?? ''
        ];
        
        // Add additional hosts
        if ($sip->SipHosts) {
            $data['additional_hosts'] = [];
            foreach ($sip->SipHosts as $host) {
                $data['additional_hosts'][] = [
                    'host' => $host->address,
                    'port' => (int)$host->port
                ];
            }
        }
        
        return $data;
    }
    
    /**
     * Get IAX configuration data
     */
    private static function getIaxConfigData(Iax $iax): array
    {
        return [
            'id' => (string)$iax->id,
            'uniqid' => $iax->uniqid,
            'extension' => $iax->extension ?? '',
            'username' => $iax->username ?? '',
            'secret' => $iax->secret ?? '',
            'host' => $iax->host ?? '',
            'qualify' => $iax->qualify ?? '1',
            'disabled' => $iax->disabled ?? '0',
            'registration_type' => $iax->registration_type ?? 'outbound',
            'manualattributes' => $iax->manualattributes ?? '',
            'description' => $iax->description ?? ''
        ];
    }
    
    /**
     * Check if provider has routing links
     */
    private static function hasRoutingLinks(Providers $provider): string
    {
        return $provider->OutgoingRouting->count() > 0 ? 'true' : 'false';
    }
}
```

**File**: `src/PBXCoreREST/Lib/Providers/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting provider record
 * 
 * @api {delete} /pbxcore/api/v2/providers/deleteRecord/:id Delete provider
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction
{
    /**
     * Delete provider record
     * 
     * @param string $id - Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            return $res;
        }
        
        try {
            // Find record by uniqid or id
            $provider = Providers::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$provider) {
                $res->messages['error'][] = 'Provider not found';
                return $res;
            }
            
            // Check if provider has routing links
            if ($provider->OutgoingRouting->count() > 0 || $provider->IncomingRouting->count() > 0) {
                $res->messages['error'][] = 'Cannot delete provider with existing routing rules';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($provider) {
                // Delete related configuration and hosts
                if ($provider->type === 'SIP' && $provider->Sip) {
                    // Delete SIP hosts first
                    SipHosts::find([
                        'conditions' => 'sipuid = :uid:',
                        'bind' => ['uid' => $provider->Sip->uniqid]
                    ])->delete();
                    
                    // Delete SIP configuration
                    if (!$provider->Sip->delete()) {
                        throw new \Exception('Failed to delete SIP configuration: ' . implode(', ', $provider->Sip->getMessages()));
                    }
                } elseif ($provider->type === 'IAX' && $provider->Iax) {
                    // Delete IAX configuration
                    if (!$provider->Iax->delete()) {
                        throw new \Exception('Failed to delete IAX configuration: ' . implode(', ', $provider->Iax->getMessages()));
                    }
                }
                
                // Delete provider itself
                if (!$provider->delete()) {
                    throw new \Exception('Failed to delete provider: ' . implode(', ', $provider->getMessages()));
                }
                
                return true;
            });
            
            $res->success = true;
            $res->data = ['deleted_id' => $id];
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

#### 1.3 REST API Controllers

**File**: `src/PBXCoreREST/Controllers/Providers/GetController.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * GET controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/providers/getRecord/SIP-TRUNK-ABC123
 * curl http://127.0.0.1/pbxcore/api/v2/providers/getRecord/new?type=SIP
 * curl http://127.0.0.1/pbxcore/api/v2/providers/getList
 * curl http://127.0.0.1/pbxcore/api/v2/providers/getStatus
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Providers
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get provider record by ID, if ID is 'new' returns structure for new provider
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all providers
     * @Get("/getList")
     * 
     * Get all provider statuses
     * @Get("/getStatus")
     * 
     * @param string $actionName
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)){
            $requestData['id'] = $id;
        }
        
        // Send request to Worker
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/Providers/PostController.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * POST controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/providers/saveRecord \
 *   -d "type=SIP&description=Test Provider&config[username]=testuser"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Providers
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates provider record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/Providers/PutController.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * PUT controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/providers/saveRecord/SIP-TRUNK-ABC123 \
 *   -d "description=Updated Provider&config[host]=new.example.com"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Providers
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Provider ID for update operations
     * 
     * Updates existing provider record
     * @Put("/saveRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }

        $putData = self::sanitizeData($this->request->getPut(), $this->filter);
        $putData['id'] = $id;
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/Providers/DeleteController.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * DELETE controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/providers/deleteRecord/SIP-TRUNK-ABC123
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Providers
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Provider ID to delete
     * 
     * Deletes provider record
     * @Delete("/deleteRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }
        
        $deleteData = ['id' => $id];
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

#### 1.4 Update Processor

**New file**: `src/PBXCoreREST/Lib/ProvidersManagementProcessor.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\Providers\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    GetStatusAction
};
use Phalcon\Di\Injectable;

/**
 * Providers management processor
 *
 * Handles all provider management operations including:
 * - getRecord: Get single provider by ID or create new structure
 * - getList: Get list of all providers
 * - saveRecord: Create or update provider
 * - deleteRecord: Delete provider
 * - getStatus: Get provider statuses
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ProvidersManagementProcessor extends Injectable
{
    /**
     * Processes provider management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'getRecord':
                $res = GetRecordAction::main($data);
                break;
                
            case 'getList':
                $res = GetListAction::main($data);
                break;
                
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
                
            case 'deleteRecord':
                if (!empty($data['id'])) {
                    $res = DeleteRecordAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty ID in request data';
                }
                break;
                
            case 'getStatus':
                $res = GetStatusAction::main($data);
                break;
                
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;
        return $res;
    }
}
```

### Stage 2: Enhanced Status Monitoring System Based on UnifiedModulesEvents Pattern

**⚠️ IMPORTANT**: The provider status monitoring system requires significant architectural improvements. See **[Provider Status Monitoring System Design](provider-status-monitoring-system.md)** for detailed analysis and improved implementation.

**Key Issues with Initial Approach:**
- Missing proper worker lifecycle management and signal handling
- Fixed polling intervals regardless of user activity
- No integration with MikoPBX worker management system
- Resource usage not optimized for production environments

**Recommended Approach:**
- Implement adaptive monitoring based on user activity
- Proper WorkerBase inheritance with signal handling
- Redis-based subscriber tracking for EventBus optimization
- Memory management and health monitoring integration

#### 2.1 Provider Status Events Publisher (Similar to UnifiedModulesEvents)

**File**: `src/Core/System/UnifiedProviderStatusEvents.php`
```php
<?php
namespace MikoPBX\Core\System;

use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di;

/**
 * Provider status events publisher based on UnifiedModulesEvents pattern
 * 
 * This class follows the same architecture as UnifiedModulesEvents and SystemMaintenanceEvents
 * for consistency with the existing MikoPBX EventBus system.
 */
class UnifiedProviderStatusEvents
{
    // Event stages similar to UnifiedModulesEvents
    public const string PROVIDER_STATUS_STAGE_CHECK = 'ProviderStatus_Stage_Check';
    public const string PROVIDER_STATUS_STAGE_UPDATE = 'ProviderStatus_Stage_Update';
    public const string PROVIDER_STATUS_STAGE_COMPLETE = 'ProviderStatus_Stage_Complete';
    
    private string $asyncChannelId;
    private ?string $providerId;
    
    /**
     * Constructor following UnifiedModulesEvents pattern
     * 
     * @param string $asyncChannelId - Channel ID for EventBus
     * @param string|null $providerId - Specific provider ID or null for all providers
     */
    public function __construct(string $asyncChannelId, ?string $providerId = null)
    {
        $this->asyncChannelId = $asyncChannelId;
        $this->providerId = $providerId;
    }
    
    /**
     * Push message to browser via EventBus (same pattern as UnifiedModulesEvents)
     * 
     * @param string $stage - Status check stage
     * @param array $data - Status data to send
     */
    public function pushMessageToBrowser(string $stage, array $data): void
    {
        $message = [
            'stage' => $stage,
            'providerId' => $this->providerId,
            'stageDetails' => $data,
            'pid' => posix_getpid()
        ];
        
        try {
            $di = Di::getDefault();
            $eventBusPublisher = $di->get('eventBusPublisher');
            $eventBusPublisher->publish($this->asyncChannelId, $message);
            
            SystemMessages::sysLogMsg(__CLASS__, 
                "Published provider status event: {$stage} for provider: {$this->providerId}", 
                LOG_DEBUG
            );
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 
                "Failed to publish provider status event: " . $e->getMessage(), 
                LOG_ERR
            );
        }
    }
}
```

#### 2.2 Background Worker for Status Monitoring

**File**: `src/Core/Workers/WorkerProviderStatusMonitor.php`
```php
<?php
namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Core\System\{SystemMessages, UnifiedProviderStatusEvents};
use MikoPBX\PBXCoreREST\Lib\Providers\GetStatusAction;
use Phalcon\Di;

/**
 * Worker for monitoring provider statuses and publishing via EventBus
 * 
 * Follows the same pattern as other MikoPBX workers but uses the 
 * UnifiedProviderStatusEvents class for consistent event publishing.
 */
class WorkerProviderStatusMonitor extends WorkerBase
{
    public const CACHE_KEY = 'provider_status_monitor';
    public const EVENT_CHANNEL = 'provider-status'; // Fixed channel like 'install-module'
    private const POLL_INTERVAL = 10; // 10 seconds
    
    private UnifiedProviderStatusEvents $statusEvents;
    
    /**
     * Main worker function
     */
    public function start($argv): void
    {
        $this->di = Di::getDefault();
        $redis = $this->di->get('redis');
        
        // Initialize status events publisher
        $this->statusEvents = new UnifiedProviderStatusEvents(self::EVENT_CHANNEL);
        
        $lastStatuses = [];
        
        while (true) {
            try {
                // Stage 1: Begin status check
                $this->statusEvents->pushMessageToBrowser(
                    UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_CHECK,
                    ['message' => 'Checking provider statuses...']
                );
                
                // Get current statuses using existing action
                $result = GetStatusAction::main([]);
                
                if ($result->success && isset($result->data)) {
                    $currentStatuses = $result->data;
                    
                    // Check for status changes
                    $changes = $this->detectStatusChanges($lastStatuses, $currentStatuses);
                    
                    if (!empty($changes)) {
                        // Stage 2: Status update
                        $this->statusEvents->pushMessageToBrowser(
                            UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_UPDATE,
                            [
                                'changes' => $changes,
                                'timestamp' => time()
                            ]
                        );
                        
                        SystemMessages::sysLogMsg(__CLASS__, 
                            "Provider status changes detected: " . json_encode($changes), 
                            LOG_INFO
                        );
                    }
                    
                    // Stage 3: Complete
                    $this->statusEvents->pushMessageToBrowser(
                        UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_COMPLETE,
                        [
                            'full_status' => $currentStatuses,
                            'changes_count' => count($changes),
                            'timestamp' => time()
                        ]
                    );
                    
                    $lastStatuses = $currentStatuses;
                    
                    // Store monitoring status in Redis (same as before)
                    $redis->setex(self::CACHE_KEY, 60, json_encode([
                        'last_update' => time(),
                        'status' => 'active',
                        'providers_count' => [
                            'sip' => count($currentStatuses['sip'] ?? []),
                            'iax' => count($currentStatuses['iax'] ?? [])
                        ]
                    ]));
                }
                
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg(__CLASS__, 
                    "Error monitoring provider status: " . $e->getMessage(), 
                    LOG_ERR
                );
                
                // Publish error stage (similar to module installation errors)
                $this->statusEvents->pushMessageToBrowser(
                    UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_COMPLETE,
                    [
                        'error' => true,
                        'message' => $e->getMessage(),
                        'timestamp' => time()
                    ]
                );
                
                // Store error status
                $redis->setex(self::CACHE_KEY, 60, json_encode([
                    'last_update' => time(),
                    'status' => 'error',
                    'error' => $e->getMessage()
                ]));
            }
            
            sleep(self::POLL_INTERVAL);
        }
    }
    
    /**
     * Detect status changes between old and new status data
     */
    private function detectStatusChanges(array $lastStatuses, array $currentStatuses): array
    {
        $changes = [];
        
        foreach (['sip', 'iax'] as $type) {
            $lastType = $lastStatuses[$type] ?? [];
            $currentType = $currentStatuses[$type] ?? [];
            
            foreach ($currentType as $providerId => $status) {
                $lastStatus = $lastType[$providerId] ?? null;
                
                if (!$lastStatus || $lastStatus['state'] !== $status['state']) {
                    $changes[] = [
                        'provider_id' => $providerId,
                        'type' => $type,
                        'old_state' => $lastStatus ? $lastStatus['state'] : 'UNKNOWN',
                        'new_state' => $status['state'],
                        'username' => $status['username'],
                        'host' => $status['host']
                    ];
                }
            }
        }
        
        return $changes;
    }
}
```

#### 2.3 Enhanced JavaScript Following EventBus Pattern

**File**: `sites/admin-cabinet/assets/js/src/Providers/providers-status-monitor.js`
```javascript
/* global globalRootUrl, Config, ProvidersAPI, EventBus */

/**
 * Provider status monitoring using EventBus pattern (similar to module installation)
 * 
 * This follows the same pattern as pbx-extension-module-install-status-worker.js
 * and general-settings-delete-all.js for consistency with MikoPBX architecture.
 */
const ProvidersStatusMonitor = {
    // Channel ID for EventBus subscription (same as WorkerProviderStatusMonitor::EVENT_CHANNEL)
    channelId: 'provider-status',
    
    // Fallback polling timer
    pollTimer: null,
    
    // Current status cache
    currentStatuses: {},
    
    // Configuration
    config: {
        fallbackPollInterval: 15000, // 15 seconds fallback when EventBus unavailable
        enableNotifications: true,
        debugMode: false
    },
    
    /**
     * Initialize status monitoring (similar to other EventBus subscribers)
     */
    initialize() {
        console.log('Initializing Providers Status Monitor with EventBus');
        
        // Subscribe to EventBus for real-time updates (same pattern as modules)
        if (typeof EventBus !== 'undefined') {
            EventBus.subscribe(this.channelId, (data) => {
                this.handleEventBusMessage(data);
            });
            console.log(`Subscribed to EventBus channel: ${this.channelId}`);
        } else {
            console.warn('EventBus not available, using polling fallback');
        }
        
        // Always start with polling fallback as backup
        this.startPollingFallback();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handlePageVisible();
            }
        });
        
        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Get initial status
        this.fetchInitialStatus();
    },
    
    /**
     * Handle EventBus messages (same pattern as module installation)
     */
    handleEventBusMessage(response) {
        if (this.config.debugMode) {
            console.log('EventBus message received:', response);
        }
        
        // Handle different stages (similar to UnifiedModulesEvents)
        switch(response.stage) {
            case 'ProviderStatus_Stage_Check':
                this.handleStatusCheckStage(response);
                break;
                
            case 'ProviderStatus_Stage_Update':
                this.handleStatusUpdateStage(response);
                break;
                
            case 'ProviderStatus_Stage_Complete':
                this.handleStatusCompleteStage(response);
                break;
                
            default:
                console.log('Unknown provider status stage:', response.stage);
        }
    },
    
    /**
     * Handle status check stage
     */
    handleStatusCheckStage(response) {
        if (this.config.debugMode) {
            console.log('Provider status check started');
        }
        // Could show loading indicators here if needed
    },
    
    /**
     * Handle status update stage (when changes detected)
     */
    handleStatusUpdateStage(response) {
        if (response.stageDetails && response.stageDetails.changes) {
            const changes = response.stageDetails.changes;
            
            console.log(`Processing ${changes.length} provider status changes`);
            
            // Update UI for each changed provider
            changes.forEach(change => {
                this.updateProviderStatus(change.provider_id, change.type, {
                    state: change.new_state,
                    username: change.username,
                    host: change.host
                });
                
                // Show notification for important changes
                if (this.config.enableNotifications && 
                    this.isImportantChange(change.old_state, change.new_state)) {
                    this.showStatusChangeNotification(change);
                }
            });
        }
    },
    
    /**
     * Handle status complete stage
     */
    handleStatusCompleteStage(response) {
        if (response.stageDetails) {
            const details = response.stageDetails;
            
            // Handle errors
            if (details.error) {
                console.error('Provider status monitoring error:', details.message);
                // Could show error indicator in UI
                return;
            }
            
            // Update full status if provided
            if (details.full_status) {
                this.currentStatuses = details.full_status;
                
                // Since we got EventBus update, we can reduce polling frequency
                this.optimizePollingFrequency();
            }
            
            if (this.config.debugMode && details.changes_count !== undefined) {
                console.log(`Status check complete. Changes: ${details.changes_count}`);
            }
        }
    },
    
    /**
     * Optimize polling frequency when EventBus is working
     */
    optimizePollingFrequency() {
        // If EventBus is working, reduce polling frequency
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = setInterval(() => {
                this.fetchProviderStatuses();
            }, this.config.fallbackPollInterval * 2); // Less frequent polling
        }
    },
    
    /**
     * Start polling fallback mechanism
     */
    startPollingFallback() {
        this.stopPollingFallback();
        
        // Start regular polling as backup
        this.pollTimer = setInterval(() => {
            this.fetchProviderStatuses();
        }, this.config.fallbackPollInterval);
    },
    
    /**
     * Stop polling fallback
     */
    stopPollingFallback() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },
    
    /**
     * Fetch initial status
     */
    fetchInitialStatus() {
        ProvidersAPI.getStatus((response) => {
            if (response.result && response.data) {
                this.currentStatuses = response.data;
                this.updateAllProviderStatuses(response.data);
            }
        });
    },
    
    /**
     * Fetch provider statuses via API (polling fallback)
     */
    fetchProviderStatuses() {
        ProvidersAPI.getStatus((response) => {
            if (response.result && response.data) {
                const changes = this.detectStatusChanges(this.currentStatuses, response.data);
                
                if (changes.length > 0) {
                    // Simulate EventBus update for consistency
                    this.handleStatusUpdateStage({
                        stageDetails: {
                            changes: changes,
                            timestamp: Date.now()
                        }
                    });
                }
                
                this.currentStatuses = response.data;
            }
        });
    },
    
    /**
     * Update all provider statuses in UI
     */
    updateAllProviderStatuses(statusData) {
        // Update SIP providers
        if (statusData.sip) {
            Object.keys(statusData.sip).forEach(providerId => {
                this.updateProviderStatus(providerId, 'sip', statusData.sip[providerId]);
            });
        }
        
        // Update IAX providers
        if (statusData.iax) {
            Object.keys(statusData.iax).forEach(providerId => {
                this.updateProviderStatus(providerId, 'iax', statusData.iax[providerId]);
            });
        }
    },
    
    /**
     * Update single provider status in UI
     */
    updateProviderStatus(providerId, type, status) {
        const $providerRow = $(`#${providerId}`);
        if ($providerRow.length === 0) return;
        
        const $statusIcon = $providerRow.find('.provider-status-icon');
        const $statusText = $providerRow.find('.provider-status-text');
        
        // Remove all status classes
        $statusIcon.removeClass('green red orange grey loading');
        
        // Add appropriate status class and icon
        switch (status.state) {
            case 'REGISTERED':
            case 'Registered':
                $statusIcon.addClass('green').html('<i class="circle icon"></i>');
                $statusText.text('Registered');
                break;
                
            case 'UNREGISTERED':
            case 'Error register':
                $statusIcon.addClass('red').html('<i class="circle outline icon"></i>');
                $statusText.text('Unregistered');
                break;
                
            case 'OFF':
                $statusIcon.addClass('grey').html('<i class="ban icon"></i>');
                $statusText.text('Disabled');
                break;
                
            case 'OK':
                $statusIcon.addClass('green').html('<i class="check circle icon"></i>');
                $statusText.text('OK');
                break;
                
            default:
                $statusIcon.addClass('orange').html('<i class="question circle icon"></i>');
                $statusText.text('Unknown');
        }
        
        // Update tooltip
        const tooltipText = `${status.username}@${status.host} - ${status.state}`;
        $statusIcon.attr('data-content', tooltipText);
    },
    
    /**
     * Detect status changes between old and new data
     */
    detectStatusChanges(oldStatuses, newStatuses) {
        const changes = [];
        
        ['sip', 'iax'].forEach(type => {
            const oldType = oldStatuses[type] || {};
            const newType = newStatuses[type] || {};
            
            Object.keys(newType).forEach(providerId => {
                const oldStatus = oldType[providerId];
                const newStatus = newType[providerId];
                
                if (!oldStatus || oldStatus.state !== newStatus.state) {
                    changes.push({
                        provider_id: providerId,
                        type: type,
                        old_state: oldStatus ? oldStatus.state : 'UNKNOWN',
                        new_state: newStatus.state,
                        username: newStatus.username,
                        host: newStatus.host
                    });
                }
            });
        });
        
        return changes;
    },
    
    /**
     * Check if status change is important enough for notification
     */
    isImportantChange(oldState, newState) {
        // Notify on registration/unregistration changes
        const importantStates = ['REGISTERED', 'UNREGISTERED', 'Registered', 'Error register'];
        return importantStates.includes(oldState) || importantStates.includes(newState);
    },
    
    /**
     * Show status change notification
     */
    showStatusChangeNotification(change) {
        const providerName = `${change.username}@${change.host}`;
        const message = `Provider ${providerName} changed from ${change.old_state} to ${change.new_state}`;
        
        // Use MikoPBX's UserMessage system
        if (typeof UserMessage !== 'undefined') {
            if (change.new_state === 'REGISTERED' || change.new_state === 'Registered') {
                UserMessage.showSuccess(message);
            } else if (change.new_state === 'UNREGISTERED' || change.new_state === 'Error register') {
                UserMessage.showWarning(message);
            }
        }
    },
    
    /**
     * Handle page becoming visible
     */
    handlePageVisible() {
        console.log('Page visible, resuming status monitoring');
        
        if (!this.isWebSocketConnected() && !this.pollTimer) {
            this.initialize();
        }
        
        // Fetch fresh status
        this.fetchProviderStatuses();
    },
    
    /**
     * Handle page becoming hidden
     */
    handlePageHidden() {
        console.log('Page hidden, reducing status monitoring');
        // Keep connections active but could reduce frequency in future
    },
    
    /**
     * Cleanup connections
     */
    cleanup() {
        if (this.eventBusSocket) {
            this.eventBusSocket.close();
        }
        this.stopPollingFallback();
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    // Only initialize on providers page
    if (window.location.pathname.includes('providers')) {
        ProvidersStatusMonitor.initialize();
    }
});

// Export for external use
window.ProvidersStatusMonitor = ProvidersStatusMonitor;
```

### Stage 3: Update JavaScript Client

#### 3.1 Enhanced API Methods

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/providersAPI.js`
```javascript
//<Copyright>

/* global Config, PbxApi */

/**
 * ProvidersAPI - REST API for provider management
 * 
 * Uses unified approach with centralized endpoint definitions.
 */
const ProvidersAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/providers/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/providers/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/providers/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/providers/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/providers/deleteRecord`,
        getStatus: `${Config.pbxUrl}/pbxcore/api/v2/providers/getStatus`
    },
    
    /**
     * Get record by ID
     * @param {string} id - Record ID or empty string for new
     * @param {string} type - Provider type (SIP/IAX) for new records
     * @param {function} callback - Callback function
     */
    getRecord(id, type, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        let url = `${this.endpoints.getRecord}/${recordId}`;
        
        if (recordId === 'new' && type) {
            url += `?type=${type}`;
        }
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Get list of all records
     * @param {function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Get provider statuses
     * @param {function} callback - Callback function
     */
    getStatus(callback) {
        $.api({
            url: this.endpoints.getStatus,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: {sip: {}, iax: {}, timestamp: Date.now()}});
            }
        });
    },
    
    /**
     * Save record
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? 
            `${this.endpoints.saveRecord}/${data.id}` : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Delete record
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    }
};
```

#### 3.2 Enhanced Providers Index

**File**: `sites/admin-cabinet/assets/js/src/Providers/providers-index.js`
```javascript
//<Copyright>

/* global globalRootUrl, ProvidersAPI, ProvidersStatusMonitor, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Providers table management module with DataTable and status monitoring
 */
const providersTable = {
    $providersTable: $('#providers-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        providersTable.toggleEmptyPlaceholder(true);
        
        providersTable.initializeDataTable();
        
        // Initialize status monitoring after table is loaded
        setTimeout(() => {
            if (typeof ProvidersStatusMonitor !== 'undefined') {
                ProvidersStatusMonitor.initialize();
            }
        }, 1000);
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        providersTable.dataTable = providersTable.$providersTable.DataTable({
            ajax: {
                url: ProvidersAPI.endpoints.getList,
                dataSrc: function(json) {                    
                    // Manage empty state
                    providersTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'description',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'type',
                    className: 'center aligned'
                },
                {
                    data: 'hostname',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2
                },
                {
                    data: 'username',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 3
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'center aligned status-column',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        return `<div class="provider-status-icon loading" data-content="Loading...">
                            <i class="circle notched loading icon"></i>
                        </div>
                        <div class="provider-status-text">Loading...</div>`;
                    }
                },
                {
                    data: 'status',
                    className: 'center aligned',
                    render: function(data, type, row) {
                        const checked = data === 'enabled' ? 'checked' : '';
                        const disabled = row.existLinks === 'true' ? 'disabled' : '';
                        
                        return `<div class="ui checkbox provider-enable-toggle ${disabled}" 
                                     data-value="${row.uniqid}">
                            <input type="checkbox" ${checked} ${disabled}>
                            <label></label>
                        </div>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        const editUrl = row.type === 'SIP' ? 'modifysip' : 'modifyiax';
                        const copyUrl = `${editUrl}/?copy-source=${row.uniqid}`;
                        
                        return `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}providers/${editUrl}/${row.uniqid}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="${globalRootUrl}providers/${copyUrl}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipCopy}">
                                <i class="copy icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.uniqid}" 
                               class="ui button delete two-steps-delete popuped ${row.existLinks === 'true' ? 'disabled' : ''}" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash red icon"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            responsive: true,
            searching: true,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                console.log('DataTable drawCallback triggered');
                
                // Initialize Semantic UI elements
                providersTable.$providersTable.find('.popuped').popup();
                providersTable.$providersTable.find('.checkbox').checkbox();
                
                // Set row IDs for status updates
                providersTable.$providersTable.find('tbody tr').each(function() {
                    const rowData = providersTable.dataTable.row(this).data();
                    if (rowData && rowData.uniqid) {
                        $(this).attr('id', rowData.uniqid);
                    }
                });
                
                // Initialize event handlers
                providersTable.initializeDoubleClickEdit();
                providersTable.initializeToggleHandlers();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        providersTable.$providersTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const providerId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            ProvidersAPI.deleteRecord(providerId, providersTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Initialize enable/disable toggle handlers
     */
    initializeToggleHandlers() {
        providersTable.$providersTable.find('.provider-enable-toggle').on('change', function() {
            const $checkbox = $(this);
            const providerId = $checkbox.attr('data-value');
            const isEnabled = $checkbox.checkbox('is checked');
            
            // Add loading state
            $checkbox.addClass('loading');
            
            // In a full implementation, this would call an enable/disable API
            // For now, we'll simulate the action
            setTimeout(() => {
                $checkbox.removeClass('loading');
                UserMessage.showSuccess(
                    isEnabled ? 'Provider enabled' : 'Provider disabled'
                );
            }, 1000);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            providersTable.dataTable.ajax.reload();
            
            UserMessage.showSuccess(globalTranslate.pr_ProviderDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.pr_ImpossibleToDeleteProvider
            );
        }
        
        // Remove loading indicator and restore button to initial state
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#providers-table-container').hide();
            $('#add-new-buttons').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-buttons').show();
            $('#providers-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        providersTable.$providersTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = providersTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                const editAction = data.type === 'SIP' ? 'modifysip' : 'modifyiax';
                window.location = `${globalRootUrl}providers/${editAction}/${data.uniqid}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    providersTable.initialize();
});
```

### Stage 4: AdminCabinet Controller Adaptation

**File**: `src/AdminCabinet/Controllers/ProvidersController.php` (Updated methods)
```php
<?php
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\{IaxProviderEditForm, SipProviderEditForm};
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class ProvidersController extends BaseController
{
    /**
     * Build the list of providers.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX via REST API
        // No need to fetch data here anymore
    }

    /**
     * Edit SIP provider details.
     *
     * @param string|null $uniqid The unique identifier of the provider.
     */
    public function modifysipAction(string $uniqid = null): void
    {
        $this->modifyProviderAction($uniqid, 'SIP');
    }
    
    /**
     * Edit IAX provider details.
     *
     * @param string|null $uniqid The unique identifier of the provider.
     */
    public function modifyiaxAction(string $uniqid = null): void
    {
        $this->modifyProviderAction($uniqid, 'IAX');
    }
    
    /**
     * Common method for editing providers
     */
    private function modifyProviderAction(?string $uniqid, string $type): void
    {
        // Check for copy operation
        $copySource = $this->request->get('copy-source', Filter::FILTER_STRING, '');
        if (!empty($copySource)) {
            $uniqid = $copySource;
        }
        
        // Get data via REST API
        $queryParams = ['id' => $uniqid];
        if (empty($uniqid)) {
            $queryParams['type'] = $type;
        }
        
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/providers/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            $queryParams
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'providers',
                'action' => 'index'
            ]);
            return;
        }
        
        $recordStructure = (object)$restAnswer->data;
        
        // Handle copy operation
        if (!empty($copySource)) {
            $recordStructure->id = '';
            $recordStructure->uniqid = '';
            $recordStructure->config->id = '';
            $recordStructure->config->uniqid = '';
            $recordStructure->description = '';
        }
        
        // Create form based on API data structure
        if ($type === 'SIP') {
            $this->view->form = new SipProviderEditForm($recordStructure);
        } else {
            $this->view->form = new IaxProviderEditForm($recordStructure);
        }
        
        $this->view->represent = $recordStructure->description ?: '';
        $this->view->uniqid = $recordStructure->uniqid ?: '';
        $this->view->type = $type;
    }
}
```

### Stage 5: Update Views

#### 5.1 Index View with DataTable

**File**: `src/AdminCabinet/Views/Providers/index.volt` (Updated)
```volt
<div id="add-new-buttons">
    {% if isAllowed('save') %}
        {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddNewSipProvider'), "class": "ui blue button") }}
        {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddNewIaxProvider'), "class": "ui green button") }}
    {% endif %}
</div>

<div id="providers-table-container">
    <table class="ui selectable compact unstackable table" id="providers-table">
        <thead>
            <tr>
                <th>{{ t._('pr_ColumnDescription') }}</th>
                <th>{{ t._('pr_ColumnType') }}</th>
                <th class="hide-on-mobile">{{ t._('pr_ColumnHostname') }}</th>
                <th class="hide-on-mobile">{{ t._('pr_ColumnUsername') }}</th>
                <th>{{ t._('pr_ColumnStatus') }}</th>
                <th>{{ t._('pr_ColumnEnabled') }}</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate this -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'phone volume',
        'title': t._('pr_EmptyTableTitle'),
        'description': t._('pr_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('pr_AddNewProvider'),
        'addButtonLink': '#',
        'showButton': false,
        'documentationLink': 'https://wiki.mikopbx.com/providers'
    ]) }}
    
    {% if isAllowed('save') %}
    <div class="ui buttons">
        {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddNewSipProvider'), "class": "ui blue button") }}
        {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddNewIaxProvider'), "class": "ui green button") }}
    </div>
    {% endif %}
</div>
```

### Stage 6: Form Modifications for REST API

#### 6.1 Enhanced Form JavaScript

**File**: `sites/admin-cabinet/assets/js/src/Providers/provider-sip-modify.js` (Updated for REST API)
```javascript
//<Copyright>

/* global globalRootUrl, ProvidersAPI, Form, globalTranslate, UserMessage */

/**
 * SIP provider edit form management module
 */
const sipProviderModify = {
    $formObj: $('#sip-provider-form'),
    
    /**
     * Form validation rules
     */
    validateRules: {
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateDescriptionIsEmpty
                }
            ]
        },
        host: {
            identifier: 'config[host]',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateHostIsEmpty
                }
            ]
        },
        username: {
            identifier: 'config[username]',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidateUsernameIsEmpty
                }
            ]
        }
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Configure Form.js for REST API
        Form.$formObj = sipProviderModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = sipProviderModify.validateRules;
        Form.cbBeforeSendForm = sipProviderModify.cbBeforeSendForm;
        Form.cbAfterSendForm = sipProviderModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = ProvidersAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}providers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}providers/modifysip/`;
        
        // Initialize Form with all standard features
        Form.initialize();
        
        // Load form data
        sipProviderModify.initializeForm();
        
        // Initialize additional features
        sipProviderModify.initializeAdditionalHosts();
        sipProviderModify.initializePasswordGeneration();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = sipProviderModify.getRecordId();
        
        ProvidersAPI.getRecord(recordId, 'SIP', (response) => {
            if (response.result) {
                sipProviderModify.populateForm(response.data);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load provider data');
            }
        });
    },
    
    /**
     * Get record ID from URL
     */
    getRecordId() {
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modifysip');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        return '';
    },
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const formData = sipProviderModify.$formObj.form('get values');
        
        // Structure data for REST API
        const apiData = {
            id: formData.id,
            type: 'SIP',
            description: formData.description,
            config: {}
        };
        
        // Map form fields to config object
        Object.keys(formData).forEach(key => {
            if (key.startsWith('config[') && key.endsWith(']')) {
                const configKey = key.slice(7, -1); // Remove 'config[' and ']'
                apiData.config[configKey] = formData[key];
            }
        });
        
        // Handle additional hosts
        const additionalHosts = [];
        $('.additional-host-row').each(function() {
            const host = $(this).find('input[name*="[host]"]').val();
            const port = $(this).find('input[name*="[port]"]').val();
            if (host) {
                additionalHosts.push({ host: host, port: port || 5060 });
            }
        });
        if (additionalHosts.length > 0) {
            apiData.config.additional_hosts = additionalHosts;
        }
        
        settings.data = apiData;
        return settings;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                sipProviderModify.populateForm(response.data);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                const newUrl = window.location.href.replace(/modifysip\/?$/, `modifysip/${response.data.uniqid}`);
                window.history.pushState(null, '', newUrl);
            }
        }
    },
    
    /**
     * Populate form with data
     */
    populateForm(data) {
        // Set main provider data
        Form.$formObj.form('set value', 'id', data.id);
        Form.$formObj.form('set value', 'uniqid', data.uniqid);
        Form.$formObj.form('set value', 'description', data.description);
        
        // Set config data
        if (data.config) {
            Object.keys(data.config).forEach(key => {
                if (key !== 'additional_hosts') {
                    Form.$formObj.form('set value', `config[${key}]`, data.config[key]);
                }
            });
            
            // Handle additional hosts
            if (data.config.additional_hosts) {
                sipProviderModify.populateAdditionalHosts(data.config.additional_hosts);
            }
        }
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
    /**
     * Initialize additional hosts management
     */
    initializeAdditionalHosts() {
        // Add host button
        $('#add-host-button').on('click', function() {
            sipProviderModify.addHostRow();
        });
        
        // Remove host buttons (event delegation)
        $(document).on('click', '.remove-host-button', function() {
            $(this).closest('.additional-host-row').remove();
        });
    },
    
    /**
     * Add new host row
     */
    addHostRow(host = '', port = 5060) {
        const index = $('.additional-host-row').length;
        const html = `
            <div class="additional-host-row ui segment">
                <div class="two fields">
                    <div class="field">
                        <label>Host</label>
                        <input type="text" name="additional_hosts[${index}][host]" value="${host}">
                    </div>
                    <div class="field">
                        <label>Port</label>
                        <input type="number" name="additional_hosts[${index}][port]" value="${port}" min="1" max="65535">
                    </div>
                </div>
                <button type="button" class="ui red button remove-host-button">
                    <i class="trash icon"></i> Remove
                </button>
            </div>`;
        
        $('#additional-hosts-container').append(html);
    },
    
    /**
     * Populate additional hosts
     */
    populateAdditionalHosts(hosts) {
        $('#additional-hosts-container').empty();
        hosts.forEach(host => {
            sipProviderModify.addHostRow(host.host, host.port);
        });
    },
    
    /**
     * Initialize password generation
     */
    initializePasswordGeneration() {
        $('#generate-password-button').on('click', function() {
            const password = sipProviderModify.generateRandomPassword(16);
            Form.$formObj.form('set value', 'config[secret]', password);
        });
    },
    
    /**
     * Generate random password
     */
    generateRandomPassword(length) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    sipProviderModify.initialize();
});
```

### Stage 7: Asset Provider Updates

**File**: `src/AdminCabinet/Providers/AssetProvider.php` (Add method)
```php
private function makeProvidersAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for provider list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page modules
        $this->footerCollectionJS     
            ->addJs('js/pbx/PbxAPI/providersAPI.js', true)
            ->addJs('js/pbx/Providers/providers-index.js', true)
            ->addJs('js/pbx/Providers/providers-status-monitor.js', true);
    } elseif (in_array($action, ['modifysip', 'modifyiax'])) {
        $this->footerCollectionJS
            // Edit modules
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/providersAPI.js', true);
            
        if ($action === 'modifysip') {
            $this->footerCollectionJS
                ->addJs('js/pbx/Providers/provider-sip-modify.js', true);
        } else {
            $this->footerCollectionJS
                ->addJs('js/pbx/Providers/provider-iax-modify.js', true);
        }
    }
}
```

### Stage 8: Translations

**Add to file**: `src/Common/Messages/ru.php`
```php
'pr_ValidateDescriptionIsEmpty' => 'Описание провайдера обязательно',
'pr_ValidateHostIsEmpty' => 'Адрес хоста обязателен',
'pr_ValidateUsernameIsEmpty' => 'Имя пользователя обязательно',
'pr_ProviderSaved' => 'Провайдер успешно сохранен',
'pr_ProviderDeleted' => 'Провайдер успешно удален',
'pr_ImpossibleToDeleteProvider' => 'Невозможно удалить провайдера',
'pr_EmptyTableTitle' => 'Провайдеры не настроены',
'pr_EmptyTableDescription' => 'Добавьте SIP или IAX провайдеров для подключения к телефонным сетям',
'pr_AddNewProvider' => 'Добавить провайдера',
'pr_AddNewSipProvider' => 'Добавить SIP провайдера',
'pr_AddNewIaxProvider' => 'Добавить IAX провайдера',
'pr_ColumnDescription' => 'Описание',
'pr_ColumnType' => 'Тип',
'pr_ColumnHostname' => 'Хост',
'pr_ColumnUsername' => 'Пользователь',
'pr_ColumnStatus' => 'Статус',
'pr_ColumnEnabled' => 'Включен',
```

## Current System Analysis (via Playwright)

### Current Provider Management Interface
**Page URL**: `/admin-cabinet/providers/index/`

**Current UI Structure**:
- DataTable with columns: Status, Provider Name, Type, Host, Login, Actions
- Status indicators: Visual badges showing "REJECTED" or checkboxes for enable/disable
- Action buttons: Edit (pencil icon), Delete (trash icon)
- Provider types: SIP, IAX displayed in separate sections

### Current Network Behavior
**Status Monitoring Pattern**:
- Polling interval: Every 3 seconds
- API endpoints:
  - `/pbxcore/api/sip/getRegistry` - for SIP provider status
  - `/pbxcore/api/iax/getRegistry` - for IAX provider status
- Response format: JSON with provider registration status
- Visual updates: Status column updates with registration state

### Current JavaScript Files
- `providers-index.js` - Main page logic and DataTable management
- `providers-status-worker.js` - Background polling worker for status updates

### Provider Edit Form Analysis
**Form URL Pattern**: `/admin-cabinet/providers/modifysip/{providerId}`
**Current Form Structure**:
- Provider configuration fields (host, username, secret, etc.)
- Enable/disable checkbox
- Advanced settings sections
- Save/Cancel buttons

### Current User Experience Flow
1. User navigates to providers page
2. Table loads with current provider list
3. Status polling starts automatically (3-second intervals)
4. Visual status indicators update in real-time
5. User can edit providers via dedicated forms
6. Changes are saved and reflected in the main table

### EventBus Infrastructure Analysis
**JavaScript EventBus System** (`event-bus.js`):
- WebSocket connection to `/pbxcore/api/nchan/sub/event-bus`
- Automatic reconnection on connection loss
- Subscription-based message handling
- Authentication error handling (3 consecutive 403s trigger page reload)

**PHP EventBusProvider** (`EventBusProvider.php`):
- Publishes events via REST API to nchan pub/sub channels
- Channel ID: `event-bus` 
- JSON message format: `{'type': eventType, 'data': eventData}`

**General Settings EventBus Example** (`general-settings-delete-all.js`):
- Uses unique async channel IDs (`delete-all-${Date.now()}`)
- Subscribes to EventBus with custom channel
- Processes stage-based progress updates
- Real-time UI updates without polling

### Migration Compatibility Requirements
**UI Consistency Requirements**:
1. **DataTable Structure**: Must maintain exact same columns and layout
2. **Status Indicators**: Same visual badges and states ("REJECTED", checkboxes)
3. **Action Buttons**: Same edit/delete functionality and icons
4. **Provider Forms**: Same form fields and behavior
5. **Real-time Updates**: Status changes must appear immediately (no 3-second delay)

**API Compatibility Requirements**:
1. **Existing Endpoints**: Legacy endpoints must continue working during transition
2. **Response Format**: Same JSON structure for backward compatibility
3. **Error Handling**: Same error messages and handling patterns

## EventBus Architecture Summary

### Key Design Decisions Based on MikoPBX Patterns

**Following UnifiedModulesEvents Pattern:**
- **Stage-based messaging**: Uses predefined stages (`ProviderStatus_Stage_Check`, `ProviderStatus_Stage_Update`, `ProviderStatus_Stage_Complete`)
- **Consistent message structure**: Same format as UnifiedModulesEvents with `stage`, `providerId`, `stageDetails`, and `pid`
- **EventBus integration**: Uses existing EventBusProvider and EventBus JavaScript for reliable WebSocket communication
- **Channel-based subscription**: Fixed channel ID (`provider-status`) like module installation system

**Following SystemMaintenanceEvents Pattern:**
- **System-wide scope**: Monitors all providers simultaneously rather than individual modules
- **Background worker**: Dedicated worker for continuous monitoring similar to system maintenance
- **Redis caching**: Efficient status caching to reduce Asterisk AMI queries
- **Error handling**: Comprehensive error reporting through EventBus stages

**Advantages of This Approach:**
1. **Consistency**: Uses established MikoPBX patterns that developers are familiar with
2. **Reliability**: Leverages proven EventBus WebSocket infrastructure with automatic reconnection
3. **Performance**: Redis caching reduces AMI overhead, EventBus eliminates polling overhead
4. **Scalability**: Background worker handles monitoring without blocking UI operations
5. **Maintainability**: Stage-based architecture makes debugging and extending functionality easier
6. **Integration**: Seamlessly works with existing MikoPBX JavaScript and PHP infrastructure

**Event Flow:**
```
WorkerProviderStatusMonitor → UnifiedProviderStatusEvents → EventBusProvider → 
nchan pub/sub → WebSocket → EventBus.js → ProvidersStatusMonitor → UI Updates
```

This architecture ensures real-time provider status updates while maintaining consistency with the existing MikoPBX event system, providing a robust and maintainable solution for provider monitoring.

## New Files to Create

### Core REST API Files
1. `src/PBXCoreREST/Lib/Providers/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/Providers/GetListAction.php`
3. `src/PBXCoreREST/Lib/Providers/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/Providers/GetStatusAction.php`
5. `src/PBXCoreREST/Lib/Providers/DeleteRecordAction.php`
6. `src/PBXCoreREST/Lib/Providers/DataStructure.php`
7. `src/PBXCoreREST/Controllers/Providers/GetController.php`
8. `src/PBXCoreREST/Controllers/Providers/PostController.php`
9. `src/PBXCoreREST/Controllers/Providers/PutController.php`
10. `src/PBXCoreREST/Controllers/Providers/DeleteController.php`
11. `src/PBXCoreREST/Lib/ProvidersManagementProcessor.php`

### Status Monitoring System (See [provider-status-monitoring-system.md](provider-status-monitoring-system.md))
12. `src/Core/System/UnifiedProviderStatusEvents.php` - **NEW: EventBus publisher**
13. `src/Core/Workers/WorkerProviderStatusMonitor.php` - **UPDATED: Adaptive monitoring worker**
14. `src/Common/Providers/UserActivityProvider.php` - **NEW: User activity tracking**
15. `sites/admin-cabinet/assets/js/src/Providers/providers-status-monitor.js` - **UPDATED: EventBus subscriber**

## Files to Modify

1. `src/PBXCoreREST/Providers/RouterProvider.php` - Add new routes
2. `sites/admin-cabinet/assets/js/src/PbxAPI/providersAPI.js` - Enhanced API methods
3. `sites/admin-cabinet/assets/js/src/Providers/providers-index.js` - DataTable integration
4. `sites/admin-cabinet/assets/js/src/Providers/provider-sip-modify.js` - REST API integration
5. `sites/admin-cabinet/assets/js/src/Providers/provider-iax-modify.js` - REST API integration
6. `src/AdminCabinet/Controllers/ProvidersController.php` - Use REST API
7. `src/AdminCabinet/Views/Providers/index.volt` - DataTable template
8. `src/Common/Messages/ru.php` - Add translations
9. `src/AdminCabinet/Providers/AssetProvider.php` - Add asset management

## Key Improvements Over Current System

### 1. Enhanced Status Monitoring
- **WebSocket Integration**: Real-time status updates via EventBus
- **Redis Caching**: Efficient status caching with 5-second TTL
- **Background Worker**: Dedicated worker for status monitoring
- **Change Detection**: Only updates UI when status actually changes
- **Fallback Mechanism**: Graceful degradation to polling if WebSocket fails

### 2. Better User Experience
- **Real-time Updates**: No page refresh needed for status changes
- **Smart Notifications**: Show important status changes
- **Loading States**: Clear visual feedback during operations
- **Offline Handling**: Graceful handling of connection issues

### 3. Improved Architecture
- **Unified REST API**: Consistent API patterns across all operations
- **DataTable Integration**: Modern, responsive table with search/sort
- **Form Validation**: Client and server-side validation
- **Transaction Safety**: Database operations in transactions
- **Error Handling**: Comprehensive error handling at all levels

### 4. Scalability
- **Caching Strategy**: Reduces AMI queries through intelligent caching
- **Event-Driven**: Reduces polling overhead with push updates
- **Background Processing**: Status monitoring doesn't block UI
- **Connection Pooling**: Efficient WebSocket connection management

## Testing Scenarios for UI Consistency

### Pre-Migration Testing (Current System)
**Baseline Functionality Tests**:
1. **Provider List Page**:
   - Load `/admin-cabinet/providers/index/` and verify DataTable structure
   - Confirm columns: Status, Provider Name, Type, Host, Login, Actions
   - Verify status polling occurs every 3 seconds via network monitoring
   - Check visual status indicators show correct states ("REJECTED", enabled/disabled)

2. **Real-time Status Updates**:
   - Monitor network requests to `/pbxcore/api/sip/getRegistry` and `/pbxcore/api/iax/getRegistry`
   - Verify status changes appear in UI within 3 seconds
   - Test with provider registration state changes

3. **Provider Edit Forms**:
   - Access provider edit form via pencil icon
   - Verify form URL pattern: `/admin-cabinet/providers/modifysip/{providerId}`
   - Test form field functionality and save operations

### Post-Migration Testing (EventBus System)  
**UI Consistency Verification**:
1. **Identical Visual Appearance**:
   - Compare side-by-side screenshots of provider list page
   - Verify DataTable columns, layout, and styling remain unchanged
   - Confirm status indicators use same visual elements and colors

2. **Improved Real-time Performance**:
   - Verify status updates appear instantly (no 3-second delay)
   - Monitor WebSocket connection to `/pbxcore/api/nchan/sub/event-bus`
   - Confirm no polling requests to legacy endpoints

3. **Form Functionality Preservation**:
   - Test all provider edit forms work identically to before
   - Verify save/cancel behavior unchanged
   - Confirm form validation and error handling work the same

### EventBus Integration Testing
**EventBus Message Flow**:
1. **WebSocket Connection**:
   - Verify EventBus connects to correct channel
   - Test automatic reconnection on connection loss
   - Confirm authentication error handling (403 response management)

2. **Stage-based Message Processing**:
   - Monitor EventBus messages for correct stage progression
   - Verify message structure matches UnifiedModulesEvents pattern
   - Test error handling and message parsing

3. **Provider Status Events**:
   - Confirm provider status changes trigger EventBus messages
   - Verify message contains correct provider ID and status data
   - Test multiple simultaneous provider status changes

### Regression Testing  
**Legacy API Compatibility**:
1. **Backward Compatibility**:
   - Ensure legacy endpoints still function during transition period
   - Test API response format remains consistent
   - Verify existing integrations continue working

2. **Performance Comparison**:
   - Compare server load before/after migration
   - Measure response times for status updates
   - Monitor WebSocket connection overhead vs polling overhead

### Browser Testing
**Cross-browser Compatibility**:
1. **Modern Browsers**: Chrome, Firefox, Safari, Edge
2. **WebSocket Support**: Verify EventBus works across all supported browsers
3. **Connection Handling**: Test reconnection logic in various network conditions

### Load Testing
**Multi-user Scenarios**:
1. **Concurrent Users**: Test multiple admin users viewing provider status
2. **Provider Scale**: Verify performance with large numbers of providers
3. **Status Change Load**: Test rapid provider status changes under load

### Error Handling Testing
**Edge Cases**:
1. **Network Interruptions**: Test WebSocket reconnection behavior
2. **AMI Failures**: Verify graceful handling of Asterisk connection issues  
3. **Invalid Data**: Test response to malformed provider status data

### Acceptance Criteria
**Migration Success Metrics**:
- ✅ UI appearance identical to pre-migration screenshots
- ✅ Status updates appear instantly (< 1 second vs 3 second polling)
- ✅ No broken functionality in provider management forms
- ✅ WebSocket connection stable with automatic reconnection
- ✅ EventBus messages follow established MikoPBX patterns
- ✅ Legacy API endpoints remain functional during transition
- ✅ Server load reduced due to elimination of polling requests
- ✅ All browser compatibility maintained

## Testing Scenarios

### REST API Endpoints
- GET `/pbxcore/api/v2/providers/getList` - Provider list
- GET `/pbxcore/api/v2/providers/getRecord/new?type=SIP` - New SIP provider structure  
- GET `/pbxcore/api/v2/providers/getRecord/{id}` - Specific provider
- POST `/pbxcore/api/v2/providers/saveRecord` - Create provider
- PUT `/pbxcore/api/v2/providers/saveRecord/{id}` - Update provider
- DELETE `/pbxcore/api/v2/providers/deleteRecord/{id}` - Delete provider
- GET `/pbxcore/api/v2/providers/getStatus` - All provider statuses

### Status Monitoring Tests
1. **WebSocket Connection**: Verify real-time updates
2. **Fallback Mechanism**: Test polling when WebSocket unavailable
3. **Status Changes**: Verify UI updates on status changes
4. **Cache Efficiency**: Verify Redis caching reduces AMI queries
5. **Error Recovery**: Test reconnection after connection loss

### UI/UX Tests
1. Create new SIP/IAX provider
2. Edit existing provider
3. Copy provider configuration
4. Delete provider with/without routing rules
5. Enable/disable provider toggle
6. Real-time status monitoring
7. Empty table welcome page
8. Form validation and error handling

## Expected Results

After implementing this plan, the provider management system will have:

- ✅ Unified REST API architecture for all operations
- ✅ Real-time status monitoring with WebSocket integration
- ✅ Efficient Redis caching for status data
- ✅ Modern DataTable interface with responsive design
- ✅ Enhanced form handling with REST API integration
- ✅ Background worker for status monitoring
- ✅ Graceful fallback mechanisms for connectivity issues
- ✅ Comprehensive error handling and user feedback
- ✅ Welcome page for empty provider list
- ✅ Support for both SIP and IAX providers
- ✅ Ready for external integrations
- ✅ Compliance with MikoPBX architectural principles

The enhanced status monitoring system will provide administrators with real-time visibility into provider status without the overhead of constant polling, improving both performance and user experience.