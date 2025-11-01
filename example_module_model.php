<?php
/**
 * EXAMPLE: Модель для хранения кастомных данных employee
 * Файл: Models/YourModuleModel.php
 */

namespace Modules\YourModule\Models;

use MikoPBX\Common\Models\ModelsBase;

/**
 * Модель для хранения дополнительных данных employees
 *
 * @Table(name="m_YourModule_employee_data")
 * @Indexes(
 *     @Index(columns={"employee_id"}, name="employee_id_idx", type="UNIQUE"),
 *     @Index(columns={"extension_number"}, name="extension_number_idx"),
 *     @Index(columns={"data_source"}, name="data_source_idx")
 * )
 */
class YourModuleModel extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public ?int $id = null;

    /**
     * ID employee (Users.id)
     * @Column(type="string", nullable=false)
     */
    public string $employee_id = '';

    /**
     * Номер внутреннего телефона (Extensions.number)
     * @Column(type="string", nullable=true)
     */
    public ?string $extension_number = null;

    /**
     * Имя пользователя (Users.username)
     * @Column(type="string", nullable=true)
     */
    public ?string $username = null;

    /**
     * Email (Users.email)
     * @Column(type="string", nullable=true)
     */
    public ?string $email = null;

    /**
     * Мобильный телефон
     * @Column(type="string", nullable=true)
     */
    public ?string $mobile = null;

    /**
     * Ваше кастомное поле
     * @Column(type="string", nullable=true)
     */
    public ?string $custom_field = null;

    /**
     * Источник данных (rest_api_v3, old_api_v2, manual)
     * @Column(type="string", nullable=true)
     */
    public ?string $data_source = null;

    /**
     * Дата создания записи
     * @Column(type="string", nullable=true)
     */
    public ?string $created_at = null;

    /**
     * Дата последнего обновления
     * @Column(type="string", nullable=true)
     */
    public ?string $updated_at = null;

    /**
     * Дополнительные данные в JSON формате
     * @Column(type="text", nullable=true)
     */
    public ?string $metadata = null;

    /**
     * Инициализация модели
     */
    public function initialize(): void
    {
        $this->setSource('m_YourModule_employee_data');
        parent::initialize();

        // Связь с моделью Users (если нужна)
        $this->belongsTo(
            'employee_id',
            'MikoPBX\Common\Models\Users',
            'id',
            [
                'alias' => 'User',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'User not found'
                ]
            ]
        );

        // Связь с моделью Extensions (если нужна)
        $this->belongsTo(
            'extension_number',
            'MikoPBX\Common\Models\Extensions',
            'number',
            [
                'alias' => 'Extension',
                'foreignKey' => [
                    'allowNulls' => true
                ]
            ]
        );
    }

    /**
     * Выполняется перед валидацией при создании
     */
    public function beforeValidationOnCreate(): void
    {
        if (empty($this->created_at)) {
            $this->created_at = date('Y-m-d H:i:s');
        }
        if (empty($this->updated_at)) {
            $this->updated_at = date('Y-m-d H:i:s');
        }
    }

    /**
     * Выполняется перед валидацией при обновлении
     */
    public function beforeValidationOnUpdate(): void
    {
        $this->updated_at = date('Y-m-d H:i:s');
    }

    /**
     * Валидация модели
     */
    public function validation(): bool
    {
        // Добавьте свою валидацию
        if (empty($this->employee_id)) {
            $this->appendMessage(
                new \Phalcon\Messages\Message(
                    'Employee ID is required',
                    'employee_id'
                )
            );
            return false;
        }

        return true;
    }

    /**
     * Получить метаданные в виде массива
     *
     * @return array
     */
    public function getMetadataArray(): array
    {
        if (empty($this->metadata)) {
            return [];
        }

        $decoded = json_decode($this->metadata, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Установить метаданные из массива
     *
     * @param array $data
     * @return void
     */
    public function setMetadataArray(array $data): void
    {
        $this->metadata = json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    /**
     * Найти запись по ID employee
     *
     * @param string $employeeId
     * @return YourModuleModel|null
     */
    public static function findByEmployeeId(string $employeeId): ?YourModuleModel
    {
        return self::findFirst([
            'conditions' => 'employee_id = :id:',
            'bind' => ['id' => $employeeId]
        ]);
    }

    /**
     * Найти запись по номеру extension
     *
     * @param string $extensionNumber
     * @return YourModuleModel|null
     */
    public static function findByExtension(string $extensionNumber): ?YourModuleModel
    {
        return self::findFirst([
            'conditions' => 'extension_number = :number:',
            'bind' => ['number' => $extensionNumber]
        ]);
    }

    /**
     * Получить все записи для определенного источника данных
     *
     * @param string $source
     * @return \Phalcon\Mvc\Model\ResultsetInterface
     */
    public static function findBySource(string $source)
    {
        return self::find([
            'conditions' => 'data_source = :source:',
            'bind' => ['source' => $source],
            'order' => 'created_at DESC'
        ]);
    }

    /**
     * Статистика по источникам данных
     *
     * @return array
     */
    public static function getSourceStatistics(): array
    {
        $result = self::find([
            'columns' => 'data_source, COUNT(*) as count',
            'group' => 'data_source'
        ]);

        $stats = [];
        foreach ($result as $row) {
            $stats[$row->data_source] = (int)$row->count;
        }

        return $stats;
    }
}
