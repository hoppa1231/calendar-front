export const cards = {
    load: `
        <form id="date-range-form" class="form-grid">
            <label>
            <span>Начало</span>
            <input type="date" id="start-date" required>
            </label>
            <label>
            <span>Окончание</span>
            <input type="date" id="end-date" required>
            </label>
            <label>
            <span>Типы</span>
            <div class="checkbox-row">
                <label><input type="checkbox" value="vacation" class="checkbox" checked> Отпуска</label>
                <label><input type="checkbox" value="business_trip" class="checkbox" checked> Командировки</label>
            </div>
            </label>
        </form>
        <div class="quick-ranges fl-col">
            <span>Быстрый выбор</span>
            <div class="chip-container"> 
            <button class="chip" data-range="14">2 недели</button>
            <button class="chip" data-range="30">Месяц</button>
            <button class="chip" data-range="90">Квартал</button>
            <button class="chip" data-range="365">Год</button>
            </div>
        </div>
        <div class="legend">
            <span class="legend-item"><span class="dot vacation"></span> Отпуск</span>
            <span class="legend-item"><span class="dot trip"></span> Командировка</span>
        </div>`,
    
    filter: `

    `,
    
}

export const cardsQuery = {
    "Загрузить": cards.load,
    "Фильтровать": cards.filter,
}