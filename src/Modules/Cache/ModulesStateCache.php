<?php

namespace MikoPBX\Modules\Cache;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Cache\Adapter\Redis;
use Phalcon\Di\Injectable;

/**
 * Manages caching of modules state to determine when worker restart is needed
 */
class ModulesStateCache extends Injectable
{
    private const string CACHE_KEY = 'modules:state:hash';
    private const int CACHE_TTL = 86400; // 24 hours
    
    private Redis $cache;
    
    public function __construct()
    {
        $this->cache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
    }
    
    /**
     * Calculate current modules state hash
     *
     * @return string
     */
    public function calculateCurrentStateHash(): string
    {
        $modules = PbxExtensionModules::find();
        $stateData = [];
        
        foreach ($modules as $module) {
            $stateData[] = [
                'uniqid' => $module->uniqid,
                'version' => $module->version,
                'disabled' => $module->disabled,
                'developer' => $module->developer,
            ];
        }
        
        // Sort by uniqid to ensure consistent hash
        usort($stateData, function($a, $b) {
            return strcmp($a['uniqid'], $b['uniqid']);
        });
        
        return md5(json_encode($stateData));
    }
    
    /**
     * Get cached modules state hash
     *
     * @return string|null
     */
    public function getCachedStateHash(): ?string
    {
        return $this->cache->get(self::CACHE_KEY);
    }
    
    /**
     * Update cached state with current state
     *
     * @return void
     */
    public function updateCachedState(): void
    {
        $currentHash = $this->calculateCurrentStateHash();
        $this->cache->set(self::CACHE_KEY, $currentHash, self::CACHE_TTL);
    }
}