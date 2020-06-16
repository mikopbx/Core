<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

use MikoPBX\Core\System\Util;
use Phalcon\Db\Adapter\AdapterInterface;
use Phalcon\Db\RawValue;
use Phalcon\Messages\Message;
use Phalcon\Messages\MessageInterface;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\Resultset;
use Phalcon\Mvc\Model\Resultset\Simple;
use Phalcon\Mvc\Model\ResultsetInterface;
use Phalcon\Text;

/**
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
 */
abstract class ModelsBase extends Model
{

    public function initialize(): void
    {
        self::setup(['orm.events' => true]);
        $this->keepSnapshots(true);

        // Пройдемся по модулям и подключим их отношения к текущей модели, если они описаны
        $cacheKey   = explode('\\', static::class)[3];
        $modulesDir = $this->di->getConfig()->core->modulesDir;
        $parameters = [
            'conditions' => 'disabled=0',
            'cache'      => [
                'key'      => $cacheKey,
                'lifetime' => 5, //seconds
            ],
        ];

        $modules = PbxExtensionModules::find($parameters);
        foreach ($modules as $module) {
            $moduleModelsDir = $modulesDir . '/' . $module->uniqid . '/Models';
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
        if (php_sapi_name() === 'cli') {
            Util::sysLogMsg(__CLASS__, implode(' ', $errorMessages));

            return;
        }
        foreach ($errorMessages as $errorMessage) {
            switch ($errorMessage->getType()) {
                case 'ConstraintViolation':
                    $arrMessageParts = explode('Common\\Models\\', $errorMessage->getMessage());
                    if (count($arrMessageParts) === 2) {
                        $relatedModel = $arrMessageParts[1];
                    } else {
                        $relatedModel = $errorMessage->getMessage();
                    }
                    $relatedRecords  = $this->getRelated($relatedModel);
                    $newErrorMessage = $this->t('ConstraintViolation');
                    $newErrorMessage .= "<ul class='list'>";
                    if ($relatedRecords === false) {
                        throw new Model\Exception('Error on models relationship ' . $errorMessage);
                    }
                    if ($relatedRecords instanceof Resultset) {
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
        return $this->getDI()->getTranslation()->t($message, $parameters);
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
        return $this->checkRelationsSatisfaction($this, $this);
    }

    /**
     *  Check whether this object has unsatisfied relations or not
     *
     * @param $theFirstDeleteRecord
     * @param $currentDeleteRecord
     *
     * @return bool
     */
    private function checkRelationsSatisfaction($theFirstDeleteRecord, $currentDeleteRecord): bool
    {
        $result = true;
        $relations
                = $currentDeleteRecord->_modelsManager->getRelations(get_class($currentDeleteRecord));
        foreach ($relations as $relation) {
            $foreignKey = $relation->getOption('foreignKey');
            if ( ! array_key_exists('action', $foreignKey)) {
                continue;
            }
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
                $parameters['bind']['field' . $index] = $currentDeleteRecord->$bindField;
            }
            $relatedRecords = $relatedModel::find($parameters);
            switch ($foreignKey['action']) {
                case Relation::ACTION_RESTRICT: // Запретим удаление и выведем информацию о том какие записи запретили удалять этот элемент
                    foreach ($relatedRecords as $relatedRecord) {
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
                case Relation::ACTION_CASCADE: // Удалим все зависимые записи
                    foreach ($relatedRecords as $record) {
                        $result = $result && $record->checkRelationsSatisfaction($theFirstDeleteRecord, $record);
                        if ($result) {
                            $result = $record->delete();
                        }
                    }
                    break;
                case Relation::NO_ACTION: // Очистим ссылки на записи в таблицах зависимых
                    break;
                default:
                    break;
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
            } // nothing changed

            $changedFields = $this->getUpdatedFields();
            if (empty($changedFields) && $action === 'afterSave') {
                return;
            }

            // Add changed fields set to benstalk queue
            $queue = $this->getDI()->getShared('beanstalkConnection');

            if ($this instanceof PbxSettings) {
                $id = $this->key;
            } else {
                $id = $this->id;
            }
            $jobData = json_encode(
                [
                    'model'         => get_class($this),
                    'recordId'      => $id,
                    'action'        => $action,
                    'changedFields' => $changedFields,
                ]
            );
            $queue->publish($jobData);
        }
    }

    /**
     * Очистка кешей при сохранении данных в базу
     *
     * @param $calledClass string модель, с чей кеш будем чистить в полном формате
     */
    public function clearCache($calledClass): void
    {
        $managedCache = $this->getDI()->getManagedCache();
        $category     = explode('\\', $calledClass)[3];
        $keys         = $managedCache->getAdapter()->getKeys($category);
        if (count($keys) > 0) {
            $managedCache->deleteMultiple($keys);
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
        switch (static::class) {
            case AsteriskManagerUsers::class:
                $name = '<i class="asterisk icon"></i> ' . $this->username;
                break;
            case CallQueueMembers::class:
                $name = $this->Extensions->getRepresent();
                break;
            case CallQueues::class:
                $name = '<i class="users icon"></i> '
                    . $this->t('mo_CallQueueShort4Dropdown') . ': '
                    . $this->name;
                break;
            case ConferenceRooms::class:
                $name = '<i class="phone volume icon"></i> '
                    . $this->t('mo_ConferenceRoomsShort4Dropdown') . ': '
                    . $this->name;
                break;
            case CustomFiles::class:
                $name = "<i class='file icon'></i> {$this->filepath}";
                break;
            case DialplanApplications::class:
                $name = '<i class="php icon"></i> '
                    . $this->t('mo_ApplicationShort4Dropdown') . ': '
                    . $this->name;
                break;
            case ExtensionForwardingRights::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Extensions::class:
                // Для внутреннего номера бывают разные представления
                if ($this->userid > 0) {
                    if ($this->type === 'EXTERNAL') {
                        $icon = '<i class="icons"><i class="user outline icon"></i><i class="top right corner alternate mobile icon"></i></i>';
                    } else {
                        $icon = '<i class="icons"><i class="user outline icon"></i></i>';
                    }
                    $name = '';
                    if (isset($this->Users->username)) {
                        $name = $this->trimName($this->Users->username);
                    }

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
            case ExternalPhones::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Fail2BanRules::class:
                $name = '';
                break;
            case FirewallRules::class:
                $name = $this->category;
                break;
            case Iax::class:
                if ($this->disabled > 0) {
                    $name = "<i class='server icon'></i> {$this->description} ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name = '<i class="server icon"></i> ' . $this->description;
                }
                break;
            case IvrMenu::class:
                $name = '<i class="sitemap icon"></i> '
                    . $this->t('mo_IVRMenuShort4Dropdown') . ': '
                    . $this->name;
                break;
            case IvrMenuActions::class:
                $name = $this->IvrMenu->name;
                break;
            case Codecs::class:
                $name = $this->name;
                break;
            case IaxCodecs::class:
                $name = $this->codec;
                break;
            case IncomingRoutingTable::class:
                $name = $this->t('mo_RightNumber', ['id' => $this->id]);
                break;
            case LanInterfaces::class:
                $name = $this->name;
                break;
            case NetworkFilters::class:
                $name = '<i class="globe icon"></i> ' . $this->description . '('
                    . $this->t('fw_PermitNetwork') . ': ' . $this->permit
                    . ')';
                break;
            case OutgoingRoutingTable::class:
                $name = $this->rulename;
                break;
            case OutWorkTimes::class:
                $name = '<i class="time icon"></i> ';
                if ( ! empty($this->description)) {
                    $name .= $this->description;
                } else {
                    $represent = '';
                    if (is_numeric($this->date_from)) {
                        $represent .= date("d/m/Y", $this->date_from) . '-';
                    }
                    if (is_numeric($this->date_to)) {
                        $represent .= date("d/m/Y", $this->date_to) . ' ';
                    }
                    if (isset($this->weekday_from)) {
                        $represent .= $this->t(date('D', strtotime("Sunday +{$this->weekday_from} days"))) . '-';
                    }
                    if (isset($this->weekday_to)) {
                        $represent .= $this->t(date('D', strtotime("Sunday +{$this->weekday_to} days"))) . ' ';
                    }
                    if (isset($this->time_from) || isset($this->time_to)) {
                        $represent .= $this->time_from . ' - ' . $this->time_to . ' ';
                    }
                    $name .= $this->t('repOutWorkTimes', ['represent' => $represent]);
                }
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $name = $this->Iax->getRepresent();
                } else {
                    $name = $this->Sip->getRepresent();
                }
                break;
            case PbxSettings::class:
                $name = $this->key;
                break;
            case PbxExtensionModules::class:
                $name = '<i class="puzzle piece icon"></i> '
                    . $this->t('mo_ModuleShort4Dropdown') . ': '
                    . $this->name;
                break;
            case Sip::class:
                if ($this->Extensions) { // Это внутренний номер?
                    $name = $this->Extensions->getRepresent();
                } elseif ($this->Providers) { // Это провайдер
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
            case SipCodecs::class:
                $name = $this->codec;
                break;
            case Users::class:
                $name = '<i class="user outline icon"></i> ' . $this->username;
                break;
            case SoundFiles::class:
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
            $link     = $this->getWebInterfaceLink();
            $category = explode('\\', static::class)[3];
            $result   = $this->t(
                'rep' . $category,
                [
                    'represent' => "<a href='{$link}'>{$name}</a>",
                ]
            );
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

    /**
     * Return link on database record in web interface
     *
     * @return string
     */
    public function getWebInterfaceLink(): string
    {
        $url  = $this->getDI()->getUrl();
        $link = '#';
        switch (static::class) {
            case AsteriskManagerUsers::class:
                $link = $url->get('asterisk-managers/modify/' . $this->id);
                break;
            case CallQueueMembers::class:
                $link = $url->get('call-queues/modify/' . $this->CallQueues->uniqid);
                break;
            case CallQueues::class:
                $link = $url->get('call-queues/modify/' . $this->uniqid);
                break;
            case ConferenceRooms::class:
                $link = $url->get('conference-rooms/modify/' . $this->uniqid);
                break;
            case CustomFiles::class:
                $link = $url->get('custom-files/modify/' . $this->id);
                break;
            case DialplanApplications::class:
                $link = $url->get('dialplan-applications/modify/' . $this->uniqid);
                break;
            case ExtensionForwardingRights::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Extensions::class:
                $link = $url->get('extensions/modify/' . $this->id);
                break;
            case ExternalPhones::class:
                if ($this->Extensions->is_general_user_number == 1) {
                    $parameters    = [
                        'conditions' => 'is_general_user_number=1 AND type="EXTERNAL" AND userid=:userid:',
                        'bind'       => [
                            'userid' => $this->Extensions->userid,
                        ],
                    ];
                    $needExtension = Extensions::findFirst($parameters);
                    $link          = $url->get('extensions/modify/' . $needExtension->id);
                } else {
                    $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                }
                break;
            case Fail2BanRules::class:
                $link = '#';//TODO сделать если будет fail2ban
                break;
            case FirewallRules::class:
                $link = $url->get('firewall/modify/' . $this->NetworkFilters->id);
                break;
            case Iax::class:
                $link = $url->get('providers/modifyiax/' . $this->Providers->id);
                break;
            case IvrMenu::class:
                $link = $url->get('ivr-menu/modify/' . $this->uniqid);
                break;
            case IvrMenuActions::class:
                $link = $url->get('ivr-menu/modify/' . $this->IvrMenu->uniqid);
                break;
            case Codecs::class:
                break;
            case IaxCodecs::class:
                break;
            case IncomingRoutingTable::class:
                $link = $url->get('incoming-routes/modify/' . $this->id);
                break;
            case LanInterfaces::class:
                $link = $url->get('network/index/');
                break;
            case NetworkFilters::class:
                $link = $url->get('firewall/modify/' . $this->id);
                break;
            case OutgoingRoutingTable::class:
                $link = $url->get('outbound-routes/modify/' . $this->id);
                break;
            case OutWorkTimes::class:
                $link = $url->get('out-off-work-time/modify/' . $this->id);
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $link = $url->get('providers/modifyiax/' . $this->uniqid);
                } else {
                    $link = $url->get('providers/modifysip/' . $this->uniqid);
                }
                break;
            case PbxSettings::class:
                $link = $url->get('general-settings/index');
                break;
            case PbxExtensionModules::class:
                $link = $url->get(Text::uncamelize($this->uniqid));
                break;
            case Sip::class:
                if ($this->Extensions) { // Это внутренний номер?
                    if ($this->Extensions->is_general_user_number === 1) {
                        $link = $url->get('extensions/modify/' . $this->Extensions->id);
                    } else {
                        $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                    }
                } elseif ($this->Providers) { // Это провайдер
                    $link = $url->get('providers/modifysip/' . $this->Providers->id);
                }
                break;
            case SipCodecs::class:
                break;
            case Users::class:
                $parameters    = [
                    'conditions' => 'userid=:userid:',
                    'bind'       => [
                        'userid' => $this->id,
                    ],
                ];
                $needExtension = Extensions::findFirst($parameters);
                $link          = $url->get('extensions/modify/' . $needExtension->id);
                break;
            case SoundFiles::class:
                $link = $url->get('sound-files/modify/' . $this->id);
                break;
            default:
        }

        return $link;
    }

    /**
     * Возвращает массив полей, по которым следует добавить индекс в DB.
     * @return array
     */
    public function getIndexColumn():array {
        return array();
    }
}