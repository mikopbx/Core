<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use Facebook\WebDriver\Exception\ElementNotInteractableException;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\StaleElementReferenceException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
use Facebook\WebDriver\WebDriverExpectedCondition;
use RuntimeException;

/**
 * Trait DropdownInteractionTrait
 * Handles all dropdown-related interactions in Selenium tests
 */
trait DropdownInteractionTrait
{
    /**
     * Wait timeout for dropdown menu to become visible (in seconds)
     */
    private const int DROPDOWN_MENU_TIMEOUT = 10;

    /**
     * Additional delay after dropdown click before continuing (in milliseconds)
     */
    private const int DROPDOWN_CLICK_DELAY = 500;

    /**
     * Maximum retries for dropdown interactions
     */
    private const int DROPDOWN_MAX_RETRIES = 2;

    /**
     * Common dropdown finder XPath pattern that can be reused in all methods
     */
    private const string DROPDOWN_XPATH_PATTERN =
        '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
        '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
        '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
        '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]';

    /**
     * Находит dropdown элемент по имени
     *
     * @param string $name Название dropdown
     * @return WebDriverElement|null Найденный dropdown или null
     */
    protected function findDropdown(string $name): ?WebDriverElement
    {
        $dropdownXpath = sprintf(self::DROPDOWN_XPATH_PATTERN, $name);
        return $this->findElementSafely($dropdownXpath);
    }

    /**
     * Проверяет, открыт ли dropdown
     *
     * @param WebDriverElement $dropdown Dropdown элемент
     * @return bool True если dropdown открыт, false в противном случае
     */
    protected function isDropdownOpen(WebDriverElement $dropdown): bool
    {
        try {
            return strpos($dropdown->getAttribute('class'), 'active visible') !== false;
        } catch (\Exception $e) {
            $this->annotate("Error checking if dropdown is open: " . $e->getMessage(), 'debug');
            return false;
        }
    }

    /**
     * Ожидает открытия dropdown-меню с обработкой динамического контента
     *
     * @param \Facebook\WebDriver\WebDriverElement $dropdown Элемент dropdown
     * @param int $waitTime Максимальное время ожидания в секундах
     * @return bool true если меню открылось успешно, false в противном случае
     */
    protected function waitForDropdownToOpen(WebDriverElement $dropdown, int $waitTime = 5): bool
    {
        try {
            // Ждем, что dropdown получит класс 'visible'
            self::$driver->wait($waitTime, 100)->until(
                function () use ($dropdown) {
                    try {
                        return strpos($dropdown->getAttribute('class'), 'visible') !== false;
                    } catch (StaleElementReferenceException $e) {
                        // Элемент стал устаревшим - вероятно, DOM обновился
                        return false;
                    } catch (\Exception $e) {
                        return false;
                    }
                }
            );

            // Ждем появления меню
            self::$driver->wait($waitTime, 100)->until(
                function () use ($dropdown) {
                    try {
                        $menuXpath = './/div[contains(@class, "menu")]';
                        $menu = $dropdown->findElement(WebDriverBy::xpath($menuXpath));
                        return $menu->isDisplayed();
                    } catch (StaleElementReferenceException $e) {
                        // Элемент стал устаревшим - вероятно, DOM обновился
                        return false;
                    } catch (\Exception $e) {
                        return false;
                    }
                }
            );

            // Дополнительная пауза для завершения загрузки динамического контента
            usleep(300000); // 300ms

            return true;
        } catch (\Exception $e) {
            $this->annotate("Error waiting for dropdown to open: " . $e->getMessage(), 'warning');
            return false;
        }
    }

    /**
     * Получает текущее выбранное значение из dropdown
     *
     * @param string $name Имя dropdown
     * @return string|null Выбранное значение или null, если ничего не выбрано
     */
    protected function getDropdownSelectedValue(string $name): ?string
    {
        try {
            $dropdown = $this->findDropdown($name);

            if (!$dropdown) {
                return null;
            }

            // Проверяем hidden input
            $inputXpath = sprintf('.//input[@name="%s" and @type="hidden"]', $name);
            $input = $this->findElementSafely($inputXpath, $dropdown);
            if ($input) {
                $inputValue = $input->getAttribute('value');
                if ($inputValue !== null && $inputValue !== '') {
                    return $inputValue;
                }
            }

            // Проверяем select
            $selectXpath = sprintf('.//select[@name="%s"]', $name);
            $select = $this->findElementSafely($selectXpath, $dropdown);
            if ($select) {
                $selectedOption = $this->findElementSafely('.//option[@selected="selected"]', $select);
                if ($selectedOption) {
                    $selectValue = $selectedOption->getAttribute('value');
                    if ($selectValue !== null && $selectValue !== '') {
                        return $selectValue;
                    }
                    return $selectedOption->getText();
                }
            }

            // Проверяем выбранный элемент в меню
            $selectedItemXpath = './/div[contains(@class, "item") and contains(@class, "active") and contains(@class, "selected")]';
            $selectedItem = $this->findElementSafely($selectedItemXpath, $dropdown);

            if ($selectedItem) {
                // Предпочитаем data-value, затем текст
                $dataValue = $selectedItem->getAttribute('data-value');
                if ($dataValue !== null && $dataValue !== '') {
                    return $dataValue;
                }
                return $selectedItem->getText();
            }

            // Проверяем текст в элементе с классом "text"
            $textElement = $this->findElementSafely('.//div[contains(@class, "text")]', $dropdown);
            if ($textElement) {
                $text = $textElement->getText();
                if ($text !== null && $text !== '') {
                    return $text;
                }
            }

            return null;
        } catch (\Exception $e) {
            $this->annotate("Error getting dropdown value: " . $e->getMessage(), 'warning');
            return null;
        }
    }

    /**
     * Открывает dropdown, если он не открыт
     *
     * @param WebDriverElement $dropdown Dropdown элемент
     * @param int $waitTime Время ожидания открытия
     * @return bool True если dropdown успешно открыт, false в противном случае
     */
    protected function openDropdownIfClosed(WebDriverElement $dropdown, int $waitTime = 2): bool
    {
        if ($this->isDropdownOpen($dropdown)) {
            return true;
        }

        try {
            $this->scrollIntoView($dropdown);
            $dropdown->click();
            return $this->waitForDropdownToOpen($dropdown, $waitTime);
        } catch (\Exception $e) {
            $this->annotate("Error opening dropdown: " . $e->getMessage(), 'warning');
            return false;
        }
    }

    /**
     * Закрывает dropdown, если он открыт
     *
     * @param WebDriverElement $dropdown Dropdown элемент
     * @return bool True если dropdown успешно закрыт или уже был закрыт, false при ошибке
     */
    protected function closeDropdownIfOpen(WebDriverElement $dropdown): bool
    {
        if (!$this->isDropdownOpen($dropdown)) {
            return true;
        }

        try {
            $dropdown->click();
            // Короткая пауза для завершения анимации закрытия
            usleep(100000); // 100ms
            return true;
        } catch (\Exception $e) {
            $this->annotate("Error closing dropdown: " . $e->getMessage(), 'debug');
            return false;
        }
    }

    /**
     * Улучшенная версия findDropdownMenuItem с учетом специфической структуры
     *
     * @param WebDriverElement $dropdown Элемент dropdown
     * @param string $value Искомое значение
     * @return WebDriverElement|null Найденный элемент или null
     */
    protected function findDropdownMenuItem(WebDriverElement $dropdown, string $value): ?WebDriverElement
    {
        try {
            // 1. Сначала найдем элемент .menu внутри dropdown
            $menuElements = $dropdown->findElements(WebDriverBy::cssSelector('div.menu'));
            if (empty($menuElements)) {
                $this->annotate("Menu container not found in dropdown", 'warning');
                return null;
            }

            $menu = $menuElements[0];

            // 2. Теперь ищем элемент item внутри .menu с data-value="202"
            $cssSelector = "div.item[data-value='$value']";
            $items = $menu->findElements(WebDriverBy::cssSelector($cssSelector));

            if (!empty($items)) {
                return $items[0];
            }

            // 3. Проверяем альтернативные селекторы
            $alternativeSelectors = [
                // CSS селекторы
                "div.item[data-value=\"$value\"]",

                // XPath селекторы (используя findElements с WebDriverBy::xpath)
                ".//div[contains(@class, 'item') and @data-value='$value']",
                ".//div[contains(@class, 'item') and contains(text(), '$value')]"
            ];

            foreach ($alternativeSelectors as $selector) {
                if (strpos($selector, "//") === 0 || strpos($selector, ".//") === 0) {
                    // Это XPath
                    $items = $menu->findElements(WebDriverBy::xpath($selector));
                } else {
                    // Это CSS
                    $items = $menu->findElements(WebDriverBy::cssSelector($selector));
                }

                if (!empty($items)) {
                    return $items[0];
                }
            }

            // 4. Последняя попытка - ищем по любому элементу в dropdown с нужным текстом
            $jsCode = "
            var menuElement = arguments[0];
            var targetValue = arguments[1];
            
            // Находим все элементы .item в меню
            var items = menuElement.querySelectorAll('.item');
            
            // Ищем элемент с нужным data-value или текстом
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.getAttribute('data-value') === targetValue || 
                    item.textContent.trim() === targetValue || 
                    item.textContent.includes(targetValue)) {
                    return item;
                }
            }
            
            return null;
        ";

            $result = self::$driver->executeScript($jsCode, [$menu, $value]);
            if ($result) {
                return $result;
            }

            $this->annotate("Item with value $value not found in dropdown menu", 'warning');
            return null;
        } catch (\Exception $e) {
            $this->annotate("Error finding dropdown menu item: " . $e->getMessage(), 'error');
            return null;
        }
    }
    /**
     * Проверяет наличие элемента в dropdown-меню с поддержкой динамической загрузки
     *
     * @param string $name Название dropdown
     * @param string $value Искомое значение
     * @param int $waitTimeForDynamicContent Время ожидания загрузки динамического контента (в секундах)
     * @return bool true если элемент существует, false в противном случае
     */
    protected function checkIfElementExistOnDropdownMenu(string $name, string $value, int $waitTimeForDynamicContent = 2): bool
    {
        $this->logTestAction("Check dropdown element", ['name' => $name, 'value' => $value]);

        // Пробуем выполнить действие с несколькими попытками
        for ($attempt = 0; $attempt < self::DROPDOWN_MAX_RETRIES; $attempt++) {
            try {
                // Если не первая попытка, делаем небольшую паузу перед повторением
                if ($attempt > 0) {
                    $this->annotate("Retrying dropdown element check (attempt " . ($attempt + 1) . ")", 'info');
                    usleep(500000); // 500ms пауза между попытками
                }

                $dropdown = $this->findDropdown($name);

                if (!$dropdown) {
                    $this->annotate("Dropdown '{$name}' not found, assuming element '{$value}' doesn't exist", 'info');
                    return false;
                }

                // Проверяем, выбран ли уже нужный элемент
                try {
                    $selectedItemXpath = './/div[contains(@class, "item") and contains(@class, "active") and contains(@class, "selected")]';
                    $selectedItem = $this->findElementSafely($selectedItemXpath, $dropdown);

                    if ($selectedItem) {
                        $currentValue = $selectedItem->getAttribute('data-value');
                        $currentText = $selectedItem->getText();

                        // Если текущее значение или текст совпадает с искомым, возвращаем true
                        if ($currentValue === $value || $currentText === $value ||
                            (is_string($currentText) && is_string($value) && stripos($currentText, $value) !== false)) {
                            return true;
                        }
                    }

                    // Проверяем текст в видимой части dropdown
                    $dropdownTextXpath = './/div[contains(@class, "text")]';
                    $dropdownText = $this->findElementSafely($dropdownTextXpath, $dropdown);
                    if ($dropdownText) {
                        $text = $dropdownText->getText();
                        if ($text === $value || (is_string($text) && is_string($value) && stripos($text, $value) !== false)) {
                            return true;
                        }
                    }

                    // Проверяем также любые другие места, где значение может быть отображено
                    $visibleTextXpath = sprintf('.//*[contains(text(), "%s")]', $value);
                    $visibleElement = $this->findElementSafely($visibleTextXpath, $dropdown);
                    if ($visibleElement && $visibleElement->isDisplayed()) {
                        return true;
                    }
                } catch (\Exception $e) {
                    // Игнорируем ошибки при проверке текущего выбранного элемента
                    $this->annotate("Error checking selected item: " . $e->getMessage(), 'debug');
                }

                // Запоминаем, был ли dropdown открыт изначально
                $wasDropdownVisible = $this->isDropdownOpen($dropdown);

                // Открываем dropdown, если он еще не открыт
                if (!$wasDropdownVisible) {
                    if (!$this->openDropdownIfClosed($dropdown, $waitTimeForDynamicContent)) {
                        // Если не последняя попытка, продолжаем цикл
                        if ($attempt < self::DROPDOWN_MAX_RETRIES - 1) {
                            continue;
                        }

                        $this->annotate("Failed to open dropdown '{$name}', assuming element '{$value}' doesn't exist", 'info');
                        return false;
                    }
                }

                // Заполняем поле поиска, если dropdown поддерживает поиск
                try {
                    if (strpos($dropdown->getAttribute('class'), 'search') !== false) {
                        $this->fillDropdownSearch($name, $value);
                        // Дополнительная пауза для фильтрации
                        usleep(500000); // 500ms
                    }
                } catch (\Exception $e) {
                    // Игнорируем ошибки поиска
                    $this->annotate("Error using search in dropdown: " . $e->getMessage(), 'debug');
                }

                // Проверка наличия элемента в dropdown-меню
                $menuItem = $this->findDropdownMenuItem($dropdown, $value);
                $itemExists = ($menuItem !== null);

                // Закрываем dropdown, если он был изначально закрыт
                if (!$wasDropdownVisible) {
                    $this->closeDropdownIfOpen($dropdown);
                }

                return $itemExists;

            } catch (StaleElementReferenceException $e) {
                // Элемент стал устаревшим (DOM обновился) - продолжаем с новой попыткой
                $this->annotate("Stale element reference during dropdown check - retrying", 'info');

                // Если последняя попытка, возвращаем false
                if ($attempt == self::DROPDOWN_MAX_RETRIES - 1) {
                    return false;
                }

                // Небольшая пауза перед повторной попыткой
                usleep(300000); // 300ms
            } catch (\Exception $e) {
                $this->handleActionError('check dropdown element', "{$name} with value {$value}", $e);
                return false;
            }
        }

        // Если исчерпаны все попытки
        return false;
    }

    /**
     * Проверяет отсутствие элемента в dropdown-меню с поддержкой динамической загрузки
     *
     * @param string $name Название dropdown
     * @param string $value Значение, которое должно отсутствовать
     * @param int $waitTimeForDynamicContent Время ожидания загрузки динамического контента (в секундах)
     * @return bool true если элемент отсутствует, false если элемент найден
     */
    protected function checkIfElementNotExistOnDropdownMenu(string $name, string $value, int $waitTimeForDynamicContent = 2): bool
    {
        return !$this->checkIfElementExistOnDropdownMenu($name, $value, $waitTimeForDynamicContent);
    }

    /**
     * Заполняет поле поиска в dropdown с улучшенной обработкой ошибок
     *
     * @param string $name Название dropdown
     * @param string $value Искомое значение
     */
    private function fillDropdownSearch(string $name, string $value): void
    {
        try {
            // Проверяем, имеет ли dropdown класс "search"
            $dropdownXpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown") and contains(@class, "search")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown") and contains(@class, "search")] | ' .
                '//div[contains(@class, "dropdown") and contains(@class, "search")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown") and contains(@class, "search")][.//select[@name="%1$s"]]',
                $name
            );

            $searchableDropdown = $this->findElementSafely($dropdownXpath);

            // Если dropdown не имеет класса "search", просто выходим
            if (!$searchableDropdown) {
                return;
            }

            // Попробуем несколько стратегий поиска поля ввода
            $searchInputXpaths = [
                './/input[contains(@class,"search")]',
                './/*[contains(@class,"search")]/input',
                './/div[contains(@class,"search")]/input',
                './/input[@type="text"]'
            ];

            $searchInput = null;
            foreach ($searchInputXpaths as $xpath) {
                $searchInput = $this->findElementSafely($xpath, $searchableDropdown);
                if ($searchInput) {
                    break;
                }
            }

            if ($searchInput) {
                // Очищаем поле и вводим текст
                $this->scrollIntoView($searchInput);

                // Сначала кликаем, чтобы сфокусировать поле
                $searchInput->click();

                // Очищаем текущее значение
                $searchInput->clear();

                // Вводим новое значение
                if ($value) { // Проверяем, что значение не пустое
                    $searchInput->sendKeys($value);
                }

                // Небольшая задержка для фильтрации
                usleep(300000); // 300ms
            } else {
                $this->annotate("Search input not found in dropdown '{$name}' after trying multiple strategies", 'warning');
            }
        } catch (\Exception $e) {
            // Логируем ошибку, но не прерываем процесс
            $this->annotate("Error filling dropdown search: " . $e->getMessage(), 'warning');
        }
    }

    /**
     * Выбирает элемент из dropdown
     *
     * @param string $name Имя dropdown
     * @param string $value Значение для выбора (data-value)
     * @param bool $skipIfNotExist Пропустить, если элемент не существует
     * @return string|null Выбранное значение или null
     */
    protected function selectDropdownItem(string $name, string $value, bool $skipIfNotExist = false): ?string
    {
        $this->logTestAction("Select dropdown", ['name' => $name, 'value' => $value]);

        try {
            // 1. Находим dropdown
            $dropdownXpath = sprintf(
                '//select[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//input[@name="%1$s"]/ancestor::div[contains(@class, "dropdown")] | ' .
                '//div[contains(@class, "dropdown")][@id="%1$s"] | ' .
                '//div[contains(@class, "dropdown")][.//select[@name="%1$s"]]',
                $name
            );

            $elements = self::$driver->findElements(WebDriverBy::xpath($dropdownXpath));
            if (empty($elements)) {
                if ($skipIfNotExist) {
                    return null;
                }
                throw new RuntimeException("Dropdown '{$name}' not found");
            }

            $dropdown = $elements[0];

            // 2. Проверяем, открыт ли dropdown
            $isOpen = strpos($dropdown->getAttribute('class'), 'active visible') !== false;

            // 3. Открываем dropdown, если он закрыт
            if (!$isOpen) {
                $this->scrollIntoView($dropdown);
                $dropdown->click();

                // Ждем небольшую паузу для открытия меню
                usleep(500000); // 500ms
            }

            // 4. Ищем элемент в меню с нужным значением
            $menuItemXpath = ".//div[contains(@class, 'menu')]//div[contains(@class, 'item') and @data-value='{$value}']";
            $menuItems = $dropdown->findElements(WebDriverBy::xpath($menuItemXpath));

            // Если не нашли по data-value, пробуем найти по тексту
            if (empty($menuItems)) {
                $menuItemXpath = ".//div[contains(@class, 'menu')]//div[contains(@class, 'item') and contains(text(), '{$value}')]";
                $menuItems = $dropdown->findElements(WebDriverBy::xpath($menuItemXpath));
            }

            if (empty($menuItems)) {
                // Закрываем dropdown, если он был изначально закрыт
                if (!$isOpen) {
                    $dropdown->click();
                }

                if ($skipIfNotExist) {
                    return null;
                }
                throw new RuntimeException("Menu item '{$value}' not found in dropdown '{$name}'");
            }

            $menuItem = $menuItems[0];

            // 5. Прокручиваем к элементу и кликаем
            $this->scrollIntoView($menuItem);
            $menuItem->click();

            // 6. Небольшая пауза после клика
            usleep(300000); // 300ms

            // 7. Возвращаем выбранное значение
            return $value;
        } catch (\Exception $e) {
            if ($skipIfNotExist) {
                $this->annotate("Error selecting dropdown item: " . $e->getMessage(), 'warning');
                return null;
            }
            throw $e;
        }
    }

}