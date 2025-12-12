export default class AutocompleteInput {
    constructor({ container, apiUrl, placeholder = "Введите текст...", minLength = 2,
        extraParams = {}, primaryParam = 'full_name', customStyles = {} }) {
        this.container = container;
        this.apiUrl = apiUrl;
        this.placeholder = placeholder;
        this.minLength = minLength;
        this.extraParams = extraParams;
        this.customStyles = customStyles;  // Дополнительные стили
        this.primaryParam = primaryParam;

        if (!this.container) {
            throw new Error("Укажите контейнер для автокомплита");
        }

        this.createInput();
        document.addEventListener('click', (event) => {
            // Привязываем метод через стрелочную функцию, чтобы использовать правильный контекст
            if (!this.datalist) return; // Проверяем, что контейнер подсказок существует
            this.closeOptions(event);
        });
    }

    createInput() {
        this.input = document.createElement('input');
        this.input.id = this.container.dataset.id + "_" + Date.now();
        this.input.type = 'text';
        this.input.autocomplete = "off";
        this.input.required = true;
        this.input.placeholder = this.placeholder;
        this.input.classList.add('autocomplete-input');

        // Применяем кастомные стили (если заданы)
        if (this.customStyles.input) {
            Object.assign(this.input.style, this.customStyles.input);
        }

        const uniqueName = this.container.dataset.id + "_" + Date.now();
        this.input.name = this.container.dataset.id;
        this.input.value = this.container.dataset.value || '';

        // Динамически создаем контейнер для подсказок
        this.datalist = document.createElement('div');
        this.datalist.classList.add('autocomplete-options');
        this.datalist.style.display = 'none';
        this.input.setAttribute('aria-autocomplete', 'list');

        // Применяем кастомные стили для datalist
        if (this.customStyles.datalist) {
            Object.assign(this.datalist.style, this.customStyles.datalist);
        }

        this.container.appendChild(this.input);
        this.container.appendChild(this.datalist);

        this.attachListeners();
    }

    attachListeners() {
        this.input.addEventListener('input', () => {
            const query = this.input.value.trim();

            if (query.length < this.minLength) {
                this.clearOptions();
                return;
            }

            if (this.apiUrl === 'local_employees') {
                this.updateOptions(this.getEmployees(query)); // Локальный поиск
            } else if (this.apiUrl === 'local_departments') {
                this.updateOptions(this.getDepartment(query)); // Локальный поиск
            } else {
                this.fetchOptions(query)
                    .then((options) => this.updateOptions(options))
                    .catch((error) => console.error("Ошибка загрузки данных:", error));
            }
        });
    }

    getEmployees(query) {
        // Логика фильтрации сотрудников
        if (!this.extraParams.selectedDepartment) {
            return this.extraParams.employees.filter(emp => emp.full_name.toLowerCase().includes(query.toLowerCase()));
        } else {
            return this.extraParams.employees.filter(emp => emp.department_id === this.extraParams.selectedDepartment && emp.full_name.toLowerCase().includes(query.toLowerCase()));
        }
    }

    getDepartment(query) {
        // Логика фильтрации отделов
        return this.extraParams.departments.filter(dept => dept.name.toLowerCase().includes(query.toLowerCase()));
    }

    async fetchOptions(query) {
        const params = { query, ...this.extraParams };
        const queryString = new URLSearchParams(params).toString();

        const response = await fetch(`${this.apiUrl}?${queryString}`);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }

        return response.json();
    }

    updateOptions(options) {
        this.clearOptions();
        
        options.forEach((option, index) => {
            const opt = document.createElement('div');
            opt.classList.add('autocomplete-option');
            opt.textContent = option[this.primaryParam];
            opt.dataset.value = option.id;
            
            // Добавляем кастомную обработку события для клика
            opt.addEventListener('click', () => {
                this.input.value = option[this.primaryParam];
                this.input.dataset.selectedId = option.id;
                if (this.apiUrl === 'local_employees') {
                    this.extraParams.selectedEmployee = option.id; // Обновляем выбранного сотрудника, если нужно
                } else if (this.apiUrl === 'local_departments') {
                    this.extraParams.selectedDepartment = option.id; // Обновляем выбранный отдел, если нужно
                }
                this.clearOptions();
            });

            this.datalist.appendChild(opt);
        });
        this.datalist.style.display = 'block';
    }

    clearOptions() {
        this.datalist.innerHTML = '';
        this.datalist.style.display = 'none';
    }

    // Функция для закрытия подсказок при клике в любое место
    closeOptions(event) {
        if (!this.datalist.contains(event.target) && event.target !== this.input) {
            this.datalist.style.display = 'none';  // Прячем подсказки
        }
    }
}
