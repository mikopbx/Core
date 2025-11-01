<?php
/**
 * EXAMPLE: API контроллер модуля
 *
 * Файл: App/Controllers/ApiController.php
 */

namespace Modules\YourModule\App\Controllers;

use MikoPBX\AdminCabinet\Controllers\BaseController;
use Modules\YourModule\Models\YourModuleModel;
use Phalcon\Di\Di;

/**
 * API контроллер для обработки AJAX запросов модуля
 */
class ApiController extends BaseController
{
    /**
     * Временное сохранение кастомного поля в сессию
     * Используется для старого API
     *
     * Endpoint: POST /your-module/save-temp-field
     *
     * @return void
     */
    public function saveTempFieldAction(): void
    {
        $this->view->disable();

        $response = [
            'success' => false,
            'message' => ''
        ];

        try {
            // Получаем значение из POST
            $customField = $this->request->getPost('custom_field', 'string');

            if (empty($customField)) {
                $response['message'] = 'Empty custom field value';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            // Сохраняем в сессию
            $session = $this->session;
            $session->set('temp_custom_field', $customField);

            $response['success'] = true;
            $response['message'] = 'Field saved to session';

        } catch (\Exception $e) {
            $response['message'] = $e->getMessage();
        }

        $this->response->setJsonContent($response);
        $this->response->send();
    }

    /**
     * Получение данных модуля для employee
     *
     * Endpoint: GET /your-module/employee-data/{id}
     *
     * @param string $id Employee ID
     * @return void
     */
    public function getEmployeeDataAction(string $id): void
    {
        $this->view->disable();

        $response = [
            'success' => false,
            'data' => null,
            'message' => ''
        ];

        try {
            // Валидация ID
            if (empty($id)) {
                $response['message'] = 'Employee ID is required';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            // Поиск данных в таблице модуля
            $moduleData = YourModuleModel::findByEmployeeId($id);

            if ($moduleData === null) {
                $response['message'] = 'Data not found';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            // Формируем ответ
            $response['success'] = true;
            $response['data'] = [
                'id' => $moduleData->id,
                'employee_id' => $moduleData->employee_id,
                'extension_number' => $moduleData->extension_number,
                'username' => $moduleData->username,
                'email' => $moduleData->email,
                'mobile' => $moduleData->mobile,
                'custom_field' => $moduleData->custom_field,
                'data_source' => $moduleData->data_source,
                'created_at' => $moduleData->created_at,
                'updated_at' => $moduleData->updated_at,
                'metadata' => $moduleData->getMetadataArray()
            ];

        } catch (\Exception $e) {
            $response['message'] = $e->getMessage();
        }

        $this->response->setJsonContent($response);
        $this->response->send();
    }

    /**
     * Массовое обновление данных
     *
     * Endpoint: POST /your-module/batch-update
     *
     * @return void
     */
    public function batchUpdateAction(): void
    {
        $this->view->disable();

        $response = [
            'success' => false,
            'processed' => 0,
            'errors' => [],
            'message' => ''
        ];

        try {
            // Получаем данные из POST
            $items = $this->request->getJsonRawBody(true)['items'] ?? [];

            if (empty($items) || !is_array($items)) {
                $response['message'] = 'No items to process';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            $processed = 0;
            $errors = [];

            // Обрабатываем каждый элемент
            foreach ($items as $index => $item) {
                try {
                    $employeeId = $item['employee_id'] ?? null;
                    $customField = $item['custom_field'] ?? null;

                    if (empty($employeeId)) {
                        $errors[] = "Item #{$index}: employee_id is required";
                        continue;
                    }

                    // Ищем или создаем запись
                    $record = YourModuleModel::findByEmployeeId($employeeId);

                    if ($record === null) {
                        $record = new YourModuleModel();
                        $record->employee_id = $employeeId;
                    }

                    // Обновляем поле
                    $record->custom_field = $customField;
                    $record->data_source = 'batch_update';

                    if ($record->save()) {
                        $processed++;
                    } else {
                        $errors[] = "Item #{$index}: " . implode(', ', $record->getMessages());
                    }

                } catch (\Exception $e) {
                    $errors[] = "Item #{$index}: " . $e->getMessage();
                }
            }

            $response['success'] = ($processed > 0);
            $response['processed'] = $processed;
            $response['errors'] = $errors;
            $response['message'] = "Processed {$processed} items";

        } catch (\Exception $e) {
            $response['message'] = $e->getMessage();
        }

        $this->response->setJsonContent($response);
        $this->response->send();
    }

    /**
     * Экспорт данных модуля в CSV
     *
     * Endpoint: GET /your-module/export
     *
     * @return void
     */
    public function exportAction(): void
    {
        $this->view->disable();

        try {
            // Получаем все записи
            $records = YourModuleModel::find([
                'order' => 'created_at DESC'
            ]);

            // Формируем CSV
            $csv = [];
            $csv[] = [
                'Employee ID',
                'Extension',
                'Username',
                'Email',
                'Mobile',
                'Custom Field',
                'Data Source',
                'Created At',
                'Updated At'
            ];

            foreach ($records as $record) {
                $csv[] = [
                    $record->employee_id,
                    $record->extension_number,
                    $record->username,
                    $record->email,
                    $record->mobile,
                    $record->custom_field,
                    $record->data_source,
                    $record->created_at,
                    $record->updated_at
                ];
            }

            // Генерируем CSV файл
            $filename = 'yourmodule_export_' . date('Y-m-d_His') . '.csv';

            $this->response->setHeader('Content-Type', 'text/csv; charset=utf-8');
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');

            $output = fopen('php://output', 'w');

            // UTF-8 BOM для корректного отображения в Excel
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            foreach ($csv as $row) {
                fputcsv($output, $row, ';');
            }

            fclose($output);

            $this->response->send();

        } catch (\Exception $e) {
            $this->response->setJsonContent([
                'success' => false,
                'message' => $e->getMessage()
            ]);
            $this->response->send();
        }
    }

    /**
     * Получение статистики по источникам данных
     *
     * Endpoint: GET /your-module/statistics
     *
     * @return void
     */
    public function statisticsAction(): void
    {
        $this->view->disable();

        $response = [
            'success' => false,
            'data' => null,
            'message' => ''
        ];

        try {
            // Получаем общую статистику
            $totalRecords = YourModuleModel::count();

            // Статистика по источникам
            $sourceStats = YourModuleModel::getSourceStatistics();

            // Последние обновления
            $recentUpdates = YourModuleModel::find([
                'order' => 'updated_at DESC',
                'limit' => 10
            ]);

            $recentList = [];
            foreach ($recentUpdates as $record) {
                $recentList[] = [
                    'employee_id' => $record->employee_id,
                    'extension' => $record->extension_number,
                    'username' => $record->username,
                    'source' => $record->data_source,
                    'updated_at' => $record->updated_at
                ];
            }

            $response['success'] = true;
            $response['data'] = [
                'total_records' => $totalRecords,
                'source_statistics' => $sourceStats,
                'recent_updates' => $recentList
            ];

        } catch (\Exception $e) {
            $response['message'] = $e->getMessage();
        }

        $this->response->setJsonContent($response);
        $this->response->send();
    }

    /**
     * Удаление данных для employee
     *
     * Endpoint: DELETE /your-module/employee-data/{id}
     *
     * @param string $id Employee ID
     * @return void
     */
    public function deleteEmployeeDataAction(string $id): void
    {
        $this->view->disable();

        $response = [
            'success' => false,
            'message' => ''
        ];

        try {
            if (empty($id)) {
                $response['message'] = 'Employee ID is required';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            $record = YourModuleModel::findByEmployeeId($id);

            if ($record === null) {
                $response['message'] = 'Data not found';
                $this->response->setJsonContent($response);
                $this->response->send();
                return;
            }

            if ($record->delete()) {
                $response['success'] = true;
                $response['message'] = 'Data deleted successfully';
            } else {
                $response['message'] = implode(', ', $record->getMessages());
            }

        } catch (\Exception $e) {
            $response['message'] = $e->getMessage();
        }

        $this->response->setJsonContent($response);
        $this->response->send();
    }
}
