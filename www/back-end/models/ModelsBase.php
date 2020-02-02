<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace Models;

use Exception;
use Phalcon\Db\RawValue;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Message;
use Phalcon\Mvc\Model\Relation;

class ModelsBase extends Model
{

    public function initialize(): void
    {
        $this->setup(['orm.events' => true]);
        $this->keepSnapshots(true);

        // Пройдемся по модулям и подключим их отношения к текущей модели, если они описаны
        $parameters['conditions'] = 'disabled=0';
        // if ($this->getDI()->has('modelsCache')) {
        //     $category            = explode('\\', static::class)[1];
        //     $parameters['cache'] = [
        //         'key'      => $category,
        //         'lifetime' => 10,
        //     ];
        // }
        if ($this->getDI()->get('db')->tableExists('m_PbxExtensionModules')) {
            $modules = PbxExtensionModules::find($parameters);
            foreach ($modules as $module) {
                $moduleModelsDir = $this->di->getConfig()->application->modulesDir . $module->uniqid . '/Models';
                $results         = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
                foreach ($results as $file) {
                    $className        = pathinfo($file)['filename'];
                    $moduleModelClass = "\\Modules\\{$module->uniqid}\\Models\\{$className}";
                    if (class_exists($moduleModelClass) && method_exists($moduleModelClass, 'getDynamicRelations')) {
                        $relations = $moduleModelClass::getDynamicRelations(static::class);
                        foreach ($relations as $relation => $rule) {
                            $this->$relation(...$rule);
                        }
                    }
                }
            }
        }
    }

    /**
     * Обработчик ошибок валидации, обычно сюда попадаем если неправильно
     * сохраняются или удаляютмя модели или неправильно настроены зависимости между ними.
     * Эта функция формирует список ссылок на объект который мы пытаемся удалить
     *
     * При описании отношений необходимо в foreignKey секцию добавлять атрибут
     * message в котором указывать алиас посе слова Models,
     * например Models\IvrMenuTimeout, иначе метод getRelated не сможет найти зависимые
     * записи в моделях
     */
    public function onValidationFails(): void
    {
        $errorMessages = $this->getMessages();
        foreach ($errorMessages as $errorMessage) {
            switch ($errorMessage->getType()) {
                case 'ConstraintViolation':
                    $relatedModel    = explode('\\', $errorMessage->getMessage())[1];
                    $relatedRecords  = $this->getRelated($relatedModel);
                    $newErrorMessage = $this->t('ConstraintViolation');
                    $newErrorMessage .= "<ul class='list'>";
                    if ($relatedRecords === false) {
                        throw new Exception('Error on models relationship ' . $errorMessage);
                    }
                    if (is_a($relatedRecords, "Phalcon\Mvc\Model\Resultset")) {
                        foreach ($relatedRecords as $item) {
                            $newErrorMessage .= '<li>' . $item->getRepresent(true) . '</li>';
                        }
                    } else {
                        $newErrorMessage .= '<li>' . $relatedRecords->getRepresent(true) . '</li>';
                    }
                    $newErrorMessage .= '</ul>';
                    $errorMessage->setMessage($newErrorMessage);
                    break;
                default:
            }
        }

    }

    /**
     * Функция для доступа к массиву переводов из моделей, используется для
     * сообщений на понятном пользователю языке
     *
     * @param       $message
     * @param array $parameters
     *
     * @return mixed
     */
    public function t($message, $parameters = [])
    {
        if (php_sapi_name() !== 'cli') {
            return $this->getDI()->getTranslation()->t($message, $parameters);
        } else {
            return $message;
        }
    }

    /**
     * Fill default values from annotations
     */
    public function beforeValidationOnCreate(): void
    {
        $metaData      = $metaData = $this->di->get('modelsMetadata');
        $defaultValues = $metaData->getDefaultValues($this);
        foreach ($defaultValues as $field => $value) {
            if ( ! isset($this->{$field}) || $this->{$field} === null) {
                $this->{$field} = new RawValue($value);
            }
        }
    }

    /**
     * Функция позволяет вывести список зависимостей с сылками,
     * которые мешают удалению текущей сущности
     *
     * @return bool
     */
    public function beforeDelete(): bool
    {
        $result = true;
        $relations
                = $this->_modelsManager->getRelations(get_called_class());
        foreach ($relations as $relation) {
            $foreignKey = $relation->getOption('foreignKey');
            if (array_key_exists('action', $foreignKey)) {
                // Проверим есть ли записи в таблице которая запрещает удаление текущих данных
                $relatedModel             = $relation->getReferencedModel();
                $mappedFields             = $relation->getFields();
                $mappedFields             = is_array($mappedFields)
                    ? $mappedFields : [$mappedFields];
                $referencedFields         = $relation->getReferencedFields();
                $referencedFields         = is_array($referencedFields)
                    ? $referencedFields : [$referencedFields];
                $parameters['conditions'] = '';
                $parameters['bind']       = [];
                foreach ($referencedFields as $index => $referencedField) {
                    $parameters['conditions']             .= $index > 0
                        ? ' OR ' : '';
                    $parameters['conditions']             .= $referencedField
                        . '= :field'
                        . $index . ':';
                    $bindField
                                                          = $mappedFields[$index];
                    $parameters['bind']['field' . $index] = $this->$bindField;
                }
                $relatedRecords = $relatedModel::find($parameters);
                switch ($foreignKey['action']) {
                    case Relation::ACTION_RESTRICT: // Запретим удаление и выведем информацию о том какие записи запретили удалять этот элемент
                        foreach ($relatedRecords as $relatedRecord) {
                            $message = new Message(
                                $this->t(
                                    'mo_BeforeDeleteFirst',
                                    [
                                        'represent' => $relatedRecord->getRepresent(),
                                    ]
                                )
                            );
                            $this->appendMessage($message);
                            $result = false;
                        }
                        break;
                    case Relation::ACTION_CASCADE: // Удалим все зависимые записи
                        if ($relatedRecords->delete() === false) {
                            $errors = $relatedRecords->getMessages();
                            $this->appendMessage(
                                new Message(implode('<br>', $errors))
                            );
                            $result = false;
                        }

                        break;
                    case Relation::NO_ACTION: // Очистим ссылки на записи в таблицах зависимых
                        break;
                    default:
                        break;
                }
            }
        }

        return $result;
    }

    /**
     * После сохранения данных любой модели
     */
    public function afterSave(): void
    {
        $this->processSettingsChanges('afterSave');
        $this->clearCache(static::class);
    }

    /**
     * Готовит массив действий для перезапуска модулей ядра системы
     * и Asterisk
     *
     * @param $action string  быть afterSave или afterDelete
     */
    private function processSettingsChanges(string $action): void
    {

        if (php_sapi_name() !== 'cli') {

            if ( ! $this->hasSnapshotData()) {
                return;
            } // нечего менять

            $changedFields = $this->getUpdatedFields();
            if (empty($changedFields) && $action === 'afterSave') {
                return;
            }

            // Запишем информацию о изменениях в очередь
            $queue = $this->getDI()->getQueueModelsEvents();

            if ($this instanceof PbxSettings) {
                $id = $this->key;
            } else {
                $id = $this->id;
            }

            $queue->put(
                [
                    'model'         => get_class($this),
                    'recordId'      => $id,
                    'action'        => $action,
                    'changedFields' => $changedFields,
                ]
            );

        }
    }

    /**
     * Очистка кешей при сохранении данных в базу
     *
     * @param $calledClass string модель, с чей кеш будем чистить в полном формате
     */
    public function clearCache($calledClass): void
    {
        $cache    = $this->getDI()->getManagedCache();
        $category = explode('\\', $calledClass)[1];
        $keys     = $cache->queryKeys($category);
        foreach ($keys as $key) {
            $cache->delete($key);
        }

        if ($this->getDI()->has('modelsCache')) {
            $this->getDI()->get('modelsCache')->delete($category);
        }

    }

    /**
     * После удаления данных любой модели
     */
    public function afterDelete(): void
    {
        $this->processSettingsChanges('afterDelete');
        $this->clearCache(static::class);
    }

    /**
     * Возвращает предстваление элемента базы данных
     *  для сообщения об ошибках с ссылкой на элемент или для выбора в списках
     *  строкой
     *
     * @param bool $needLink - предстваление с ссылкой
     *
     * @return string
     */
    public function getRepresent($needLink = false): string
    {
        if ($this->id === null) {
            return $this->t('mo_NewElement');
        }

        $url      = $this->getDI()->getUrl();
        $link     = '#';
        $category = explode('\\', static::class)[1];
        switch ($category) {
            case 'AsteriskManagerUsers':
                $link = $url->get('asterisk-managers/modify/' . $this->id);
                $name = $this->username;
                break;
            case 'CallQueueMembers':
                $link = $url->get('call-queues/modify/'
                    . $this->CallQueues->uniqid);
                $name = $this->Extensions->getRepresent();
                break;
            case 'CallQueues':
                $link = $url->get('call-queues/modify/' . $this->uniqid);
                $name = '<i class="users icon"></i> '
                    . $this->t('mo_CallQueueShort4Dropdown') . ': '
                    . $this->name;
                break;
            case 'ConferenceRooms':
                $link = $url->get('conference-rooms/modify/' . $this->uniqid);
                $name = '<i class="phone volume icon"></i> '
                    . $this->t('mo_ConferenceRoomsShort4Dropdown') . ': '
                    . $this->name;
                break;
            case 'CustomFiles':
                $link = $url->get('custom-files/modify/' . $this->id);
                $name = '<pre>{$this->filepath}</pre>';
                break;
            case 'DialplanApplications':
                $link = $url->get('dialplan-applications/modify/'
                    . $this->uniqid);
                $name = '<i class="php icon"></i> '
                    . $this->t('mo_ApplicationShort4Dropdown') . ': '
                    . $this->name;
                break;
            case 'ExtensionForwardingRights':
                $link = $url->get('extensions/modify/'
                    . $this->Extensions->id);
                $name = $this->Extensions->getRepresent();
                break;
            case 'Extensions':
                $link = $url->get('extensions/modify/' . $this->id);
                // Для внутреннего номера бывают разные представления
                if ($this->userid > 0) {
                    if ($this->type === 'EXTERNAL') {
                        $icon = '<i class="icons"><i class="user outline icon"></i><i class="top right corner alternate mobile icon"></i></i>';
                    } else {
                        $icon = '<i class="icons"><i class="user outline icon"></i></i>';
                    }
                    $name = $this->trimName($this->Users->username);
                    $name = "{$icon} {$name} <{$this->number}>";
                } else {

                    switch (strtoupper($this->type)) {
                        case 'CONFERENCE':
                            $name = $this->ConferenceRooms->getRepresent();
                            break;
                        case 'QUEUE':
                            $name = $this->CallQueues->getRepresent();
                            break;
                        case 'DIALPLAN APPLICATION':
                            $name = $this->DialplanApplications->getRepresent();
                            break;
                        case 'IVR MENU':
                            $name = $this->IvrMenu->getRepresent();
                            break;
                        case 'MODULES':
                            $name = '<i class="puzzle piece icon"></i> '
                                . $this->t('mo_ModuleShort4Dropdown')
                                . ': '
                                . $this->callerid;
                            break;
                        case 'EXTERNAL':
                        case 'SIP':
                        default:
                            $name = "{$this->callerid} <{$this->number}>";
                    }
                }
                break;
            case 'ExternalPhones':
                if ($this->Extensions->is_general_user_number == 1) {
                    $parameters    = [
                        'conditions' => 'is_general_user_number=1 AND type="EXTERNAL" AND userid=:userid:',
                        'bind'       => [
                            'userid' => $this->Extensions->userid,
                        ],
                    ];
                    $needExtension = Extensions::findFirst($parameters);
                    $link          = $url->get('extensions/modify/'
                        . $needExtension->id);
                } else {
                    $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                }
                $name = $this->Extensions->getRepresent();
                break;
            case 'Fail2BanRules':
                $link = '#';//TODO сделать если будет fail2ban
                $name = '';
                break;
            case 'FirewallRules':
                $link = $url->get('firewall/modify/'
                    . $this->NetworkFilters->id);
                $name = $this->category;
                break;
            case 'Iax':
                $link = $url->get('providers/modifyiax/'
                    . $this->Providers->id);

                if ($this->disabled > 0) {
                    $name = "<i class='server icon'></i> {$this->description} ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name = '<i class="server icon"></i> ' . $this->description;
                }
                break;
            case 'IvrMenu':
                $link = $url->get('ivr-menu/modify/' . $this->uniqid);
                $name = '<i class="sitemap icon"></i> '
                    . $this->t('mo_IVRMenuShort4Dropdown') . ': '
                    . $this->name;
                break;
            case 'IvrMenuActions':
                $link = $url->get('ivr-menu/modify/'
                    . $this->IvrMenu->uniqid);
                $name = $this->IvrMenu->name;
                break;
            case 'Codecs':
                $name = $this->name;
                break;
            case 'IaxCodecs':
                $name = $this->codec;
                break;
            case 'IncomingRoutingTable':
                $link = $url->get('incoming-routes/modify/' . $this->id);
                $name = $this->t('mo_RightNumber', ['id' => $this->id]);
                break;
            case 'LanInterfaces':
                $link = $url->get('network/index/');
                $name = $this->name;
                break;
            case 'NetworkFilters':
                $link = $url->get('firewall/modify/' . $this->id);
                $name = $this->description . '('
                    . $this->t('fw_PermitNetwork') . ": " . $this->permit
                    . ')';
                break;
            case 'OutgoingRoutingTable':
                $link = $url->get('outbound-routes/modify/' . $this->id);
                $name = $this->rulename;
                break;
            case 'OutWorkTimes':
                $link = $url->get('out-off-work-time/modify/' . $this->id);
                $name = $this->description;
                break;
            case 'Providers':
                if ($this->type === "IAX") {
                    $link = $url->get('providers/modifyiax/' . $this->uniqid);
                    $name = $this->Iax->getRepresent();
                } else {
                    $link = $url->get('providers/modifysip/' . $this->uniqid);
                    $name = $this->Sip->getRepresent();
                }
                break;
            case 'PbxSettings':
                $link = $url->get('general-settings/index');
                $name = $this->key;
                break;
            case 'Sip':
                if ($this->Extensions) { // Это внутренний номер?
                    if ($this->Extensions->is_general_user_number === 1) {
                        $link = $url->get('extensions/modify/'
                            . $this->Extensions->id);
                    } else {
                        $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                    }
                    $name = $this->Extensions->getRepresent();
                } elseif ($this->Providers) { // Это провайдер
                    $link = $url->get('providers/modifysip/'
                        . $this->Providers->id);
                    if ($this->disabled > 0) {
                        $name = "<i class='server icon'></i> {$this->description} ({$this->t( 'mo_Disabled' )})";
                    } else {
                        $name = '<i class="server icon"></i> '
                            . $this->description;
                    }
                } else { // Что это?
                    $name = $this->description;
                }
                break;
            case 'SipCodecs':
                $name = $this->codec;
                break;
            case 'Users':
                $name = '<i class="user outline icon"></i> ' . $this->username;
                break;
            case 'SoundFiles':
                $link = $url->get('sound-files/modify/' . $this->id);
                $name = '<i class="file audio outline icon"></i> '
                    . $this->name;
                break;
            default:
                $name = 'Unknown';
        }

        if ($needLink) {
            if (empty($name)) {
                $name = $this->t('repLink');
            }
            $result = $this->t('rep' . $category,
                [
                    'represent' => "<a href='{$link}'>{$name}</a>",
                ]);
        } else {
            $result = $name;
        }

        return $result;
    }

    /**
     * Укорачивает длинные имена
     *
     * @param $s
     *
     * @return string
     */
    private function trimName($s): string
    {
        $max_length = 64;

        if (strlen($s) > $max_length) {
            $offset = ($max_length - 3) - strlen($s);
            $s      = substr($s, 0, strrpos($s, ' ', $offset)) . '...';
        }

        return $s;
    }


}