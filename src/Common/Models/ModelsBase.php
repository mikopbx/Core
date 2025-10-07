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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\Traits\RecordRepresentationTrait;
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\System;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Db\Adapter\AdapterInterface;
use Phalcon\Di\Di;
use Phalcon\Encryption\Security\Random;
use Phalcon\Events\Event;
use Phalcon\Events\Manager;
use Phalcon\Messages\Message;
use Phalcon\Messages\MessageInterface;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\Resultset;
use Phalcon\Mvc\Model\ResultsetInterface;
use Phalcon\Mvc\Model\Resultset\Simple;

/**
 * Class ModelsBase
 *
 * @method static mixed findFirstById(array|string|int $parameters = null)
 * @method static mixed findFirstByKey(string|null $parameters)
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @method static mixed findFirst(array|string|int $parameters = null)
 * @method static ResultsetInterface find(array|string|int $parameters = null)
 * @method static mixed count(array $parameters = null)
 * @method  bool create()
 * @method  bool delete()
 * @method  bool save()
 * @method  bool update()
 * @method  array|MessageInterface[] getMessages(mixed $filter = null)
 * @method static AdapterInterface getReadConnection()
 * @method  Simple|false getRelated(string $alias, $arguments = null)
 *
 * @property Model\Manager _modelsManager
 * @property Di di
 *
 * @package MikoPBX\Common\Models
 */
class ModelsBase extends Model
{
    use RecordRepresentationTrait;

    /**
     * All models with lover than this version in module.json won't be attached as children
     * We use this constant to disable old modules that may not be compatible with the current version of MikoPBX
     */
    public const string MIN_MODULE_MODEL_VER = '2020.2.468';

    /**
     * Returns Cache key for the models cache service
     *
     * @param string $modelClass
     * @param string $keyName
     *
     * @return string
     */
    public static function makeCacheKey(string $modelClass, string $keyName): string
    {
        $category = explode('\\', $modelClass)[3];
        return "$category:$keyName";
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        self::setup(['orm.events' => true]);
        self::setup(['orm.exception_on_failed_metadata_save' => false]);
        $this->keepSnapshots(true);
        $this->addExtensionModulesRelations();


        // Do not track changes if system is booting
        if (System::isBooting()) {
            return;
        }
        
        $eventsManager = new Manager();

        $eventsManager->attach(
            'model',
            function (Event $event, $record) {
                $type = $event->getType();
                switch ($type) {
                    case 'afterSave':
                    case 'afterDelete':
                        $record->processSettingsChanges($type);
                        self::clearCache(get_class($record));
                        break;
                    default:
                }
            }
        );

       
        $this->setEventsManager($eventsManager);      
    }

    /**
     * Attaches model's relationships from modules models classes
     */
    private function addExtensionModulesRelations(): void
    {
        $modules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($modules as $module) {
            $moduleDir = PbxExtensionUtils::getModuleDir($module['uniqid']);

            $moduleJson = "$moduleDir/module.json";
            if (!file_exists($moduleJson)) {
                continue;
            }
            $jsonString = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';
            if (version_compare($minPBXVersion, self::MIN_MODULE_MODEL_VER, '<')) {
                continue;
            }

            $moduleModelsDir = "$moduleDir/Models";
            $results = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
            foreach ($results as $file) {
                $className = pathinfo($file)['filename'];
                $moduleModelClass = "Modules\\{$module['uniqid']}\\Models\\$className";

                if (
                    class_exists($moduleModelClass)
                    && method_exists($moduleModelClass, 'getDynamicRelations')
                ) {
                    $moduleModelClass::getDynamicRelations($this);
                }
            }
        }
    }

    /**
     * Sends changed fields and settings to backend worker WorkerModelsEvents
     *
     * @param $action string may be afterSave or afterDelete
     */
    private function processSettingsChanges(string $action): void
    {
        $doNotTrackThisDB = [
            CDRDatabaseProvider::SERVICE_NAME,
        ];

        if (in_array($this->getReadConnectionService(), $doNotTrackThisDB)) {
            return;
        }

        if (!$this->hasSnapshotData()) {
            return;
        } // nothing changed

        $changedFields = $this->getUpdatedFields();
        if (empty($changedFields) && $action === 'afterSave') {
            return;
        }
        if ($action === 'afterDelete') {
            $deletedData = $this->getSnapshotData();

            $changedFields = [];
            if (get_class($this)===CustomFiles::class) {
                $changedFields['filepath'] = $deletedData['filepath'];
                $changedFields['mode'] = $deletedData['mode'];
            } else {
                $changedFields = array_keys($deletedData);
            }
        }

        // For PbxSettings, include old and new values in changedFields structure
        if ($this instanceof PbxSettings && $action === 'afterSave' && in_array('value', $changedFields)) {
            $snapshotData = $this->getSnapshotData();
            $changedFields = [
                'value' => [
                    'old' => $snapshotData['value'] ?? null,
                    'new' => $this->value
                ]
            ];
        }

        $this->sendChangesToBackend($action, $changedFields);
        $this->sendChangesToFrontend($action, $changedFields);
    }

    /**
     * Sends changed fields and class to WorkerModelsEvents
     *
     * @param string $action
     * @param $changedFields
     */
    private function sendChangesToBackend(string $action, $changedFields): void
    {
        // Add changed fields set to Beanstalkd queue
        $queue = $this->di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
        if ($queue === null) {
            return;
        }
        if ($this instanceof PbxSettings) {
            $idProperty = 'key';
        } else {
            $idProperty = 'id';
        }
        $id = $this->$idProperty;
        $jobData = json_encode(
            [
                'source' => BeanstalkConnectionModelsProvider::SOURCE_MODELS_CHANGED,
                'model' => get_class($this),
                'recordId' => $id,
                'action' => $action,
                'changedFields' => $changedFields,
            ]
        );
        $queue->publish($jobData);
    }


    /**
     * Sends changed fields and class to Fronted event bus
     *
     * @param string $action
     * @param $changedFields
     */
    private function sendChangesToFrontend(string $action, $changedFields): void
    {
        if ($this instanceof PbxSettings) {
            $idProperty = 'key';
        } else {
            $idProperty = 'id';
        }
        $this->di->getShared(EventBusProvider::SERVICE_NAME)->publish('models-changed',
            [
                'model' => get_class($this),
                'recordId' => $this->$idProperty,
                'action' => $action,
                'changedFields' => $changedFields,
            ]
        );
    }

    /**
     * Invalidates cached records contains model name in cache key value
     *
     * @param      $calledClass string full model class name
     *
     */
    public static function clearCache(string $calledClass): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        if ($di->has(ManagedCacheProvider::SERVICE_NAME)) {
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $category = explode('\\', $calledClass)[3] . '*';
            $keys = $managedCache->getAdapter()->keys($category);
            $prefix = $managedCache->getPrefix();
            // Delete all items from the managed cache
            foreach ($keys as $key) {
                $managedCache->delete($key);
                $cacheKey = str_ireplace($prefix, '', $key);
                $managedCache->delete($cacheKey);
            }
        }
    }

    /**
     * Error handler for validation failures.
     * This function is called when a model fails to save or delete correctly,
     * or when the dependencies between models are not properly configured.
     * It generates a list of links to the objects that we are trying to delete.
     */
    public function onValidationFails(): void
    {
        $errorMessages = $this->getMessages();
        $dependencyGroups = [];
        $otherErrors = [];
        $constraintViolationMessages = [];
        
        // First pass: collect all constraint violations and group dependencies
        foreach ($errorMessages as $index => $errorMessage) {
            if ($errorMessage->getType() === 'ConstraintViolation') {
                // Store the original message for later processing
                $constraintViolationMessages[] = $errorMessage;
                
                // Extract the related model name from the error message
                $arrMessageParts = explode('Common\\Models\\', $errorMessage->getMessage());
                if (count($arrMessageParts) === 2) {
                    $relatedModelClass = 'MikoPBX\\Common\\Models\\' . $arrMessageParts[1];
                } else {
                    $relatedModelClass = $errorMessage->getMessage();
                }

                // Find all relations to this model class (there can be multiple with different aliases)
                $relations = $this->_modelsManager->getRelations(get_class($this));
                $foundRelations = false;

                foreach ($relations as $relation) {
                    // Check if this relation points to the related model class
                    if ($relation->getReferencedModel() === $relatedModelClass) {
                        $foundRelations = true;
                        $alias = $relation->getOptions()['alias'] ?? null;

                        if ($alias) {
                            // Get the related records using the alias
                            $relatedRecords = $this->getRelated($alias);

                            if ($relatedRecords !== false) {
                                // Store dependencies grouped by model class
                                if (!isset($dependencyGroups[$relatedModelClass])) {
                                    $dependencyGroups[$relatedModelClass] = [];
                                }

                                if ($relatedRecords instanceof Resultset) {
                                    // If there are multiple related records, iterate through them
                                    foreach ($relatedRecords as $item) {
                                        if ($item instanceof ModelsBase) {
                                            $dependencyGroups[$relatedModelClass][] = $item;
                                        }
                                    }
                                } elseif ($relatedRecords instanceof ModelsBase) {
                                    // If there is a single related record, add it
                                    $dependencyGroups[$relatedModelClass][] = $relatedRecords;
                                }
                            }
                        }
                    }
                }

                if (!$foundRelations) {
                    // Throw an exception if there is an error in the model relationship
                    throw new Model\Exception('Error on models relationship ' . $errorMessage);
                }
            }
        }
        
        // If we have constraint violations, create a single comprehensive message
        if (!empty($dependencyGroups)) {
            // Build comprehensive HTML message with all dependencies
            $htmlMessage = '<div class="ui header">' . $this->t('ConstraintViolation') . '</div>';
            $htmlMessage .= "<ul class='list'>";
            
            // Add all dependencies from all groups
            foreach ($dependencyGroups as $relatedModel => $records) {
                foreach ($records as $record) {
                    $htmlMessage .= '<li>' . $record->getRepresent(true) . '</li>';
                }
            }
            
            $htmlMessage .= '</ul>';
            
            // Update only the first constraint violation message with all dependencies
            // and remove the rest to avoid duplicates
            $firstConstraintMessage = null;
            foreach ($constraintViolationMessages as $msg) {
                if ($firstConstraintMessage === null) {
                    $firstConstraintMessage = $msg;
                    $msg->setMessage($htmlMessage);
                } else {
                    // Remove duplicate constraint violation messages
                    // by setting empty message that will be filtered out by the framework
                    $msg->setMessage('');
                }
            }
        }
    }

    /**
     * Function to access the translation array from models.
     * It is used for messages in a user-friendly language.
     *
     * @param string $message
     * @param ?array $parameters
     *
     * @return string
     */
    public function t(string $message, ?array $parameters = []): string
    {
        return $this->getDI()->getShared(TranslationProvider::SERVICE_NAME)->t($message, $parameters);
    }

    /**
     * Fill default values from annotations
     */
    public function beforeValidationOnCreate(): void
    {
        $metaData = $this->di->get(ModelsMetadataProvider::SERVICE_NAME);
        $defaultValues = $metaData->getDefaultValues($this);
        foreach ($defaultValues as $field => $value) {
            if (!isset($this->{$field})) {
                $this->{$field} = $value;
            }
        }
    }

    /**
     * Checks if there are any dependencies that prevent the deletion of the current entity.
     * It displays a list of related entities with links that hinder the deletion.
     *
     * @return bool
     */
    public function beforeDelete(): bool
    {
        return $this->checkRelationsSatisfaction($this, $this);
    }

    /**
     * Check whether this object has unsatisfied relations or not.
     *
     * @param object $theFirstDeleteRecord The first delete record.
     * @param object $currentDeleteRecord  The current delete record.
     *
     * @return bool True if all relations are satisfied, false otherwise.
     */
    private function checkRelationsSatisfaction(object $theFirstDeleteRecord, object $currentDeleteRecord): bool
    {
        $result = true;
        $relations = $currentDeleteRecord->_modelsManager->getRelations(get_class($currentDeleteRecord));
        foreach ($relations as $relation) {
            $foreignKey = $relation->getOption('foreignKey') ?? [];
            if (!array_key_exists('action', $foreignKey)) {
                continue;
            }
            // Check if there are some record which restrict delete current record
            $relatedModel = $relation->getReferencedModel();
            $mappedFields = $relation->getFields();
            $mappedFields = is_array($mappedFields)
                ? $mappedFields : [$mappedFields];
            $referencedFields = $relation->getReferencedFields();
            $referencedFields = is_array($referencedFields)
                ? $referencedFields : [$referencedFields];
            $parameters['conditions'] = '';
            $parameters['bind'] = [];
            foreach ($referencedFields as $index => $referencedField) {
                $parameters['conditions'] .= $index > 0
                    ? ' OR ' : '';
                $parameters['conditions'] .= $referencedField
                    . '= :field'
                    . $index . ':';
                $bindField
                    = $mappedFields[$index];
                $parameters['bind']['field' . $index] = $currentDeleteRecord->$bindField;
            }
            $relatedRecords = $relatedModel::find($parameters);
            switch ($foreignKey['action']) {
                case Relation::ACTION_RESTRICT:
                    // Restrict deletion and add message about unsatisfied undeleted links
                    foreach ($relatedRecords as $relatedRecord) {
                        if (
                            serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue;
                            // It is the checked object
                        }
                        $message = new Message(
                            $theFirstDeleteRecord->t(
                                'mo_BeforeDeleteFirst',
                                [
                                    'represent' => $relatedRecord->getRepresent(true),
                                ]
                            )
                        );
                        $theFirstDeleteRecord->appendMessage($message);
                        $result = false;
                    }
                    break;
                case Relation::ACTION_CASCADE:
                    // Delete all related records
                    foreach ($relatedRecords as $relatedRecord) {
                        if (
                            serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue;
                            // It is the checked object
                        }
                        $result = $result && $relatedRecord->checkRelationsSatisfaction(
                            $theFirstDeleteRecord,
                            $relatedRecord
                        );
                        if ($result) {
                            $result = $relatedRecord->delete();
                        }
                        if ($result === false) {
                            $messages = $relatedRecord->getMessages();
                            foreach ($messages as $message) {
                                $theFirstDeleteRecord->appendMessage($message);
                            }
                        }
                    }
                    break;
                case Relation::NO_ACTION:
                    // Clear all refs
                    break;
                default:
                    break;
            }
        }

        return $result;
    }

    /**
     * Returns Identity field name for current model
     *
     * @return string
     */
    public function getIdentityFieldName(): string
    {
        $metaData = $this->di->get(ModelsMetadataProvider::SERVICE_NAME);

        return $metaData->getIdentityField($this);
    }

    /**
     * Generates a random unique id.
     *
     * @return string The generated unique id.
     */
    public static function generateUniqueID(string $alias = ''): string
    {
        $random = new Random();
        $hashLength = 4;
        try {
            $hash = $random->hex($hashLength);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $hash = md5(microtime());
        }
        return $alias . strtoupper($hash);
    }
}
