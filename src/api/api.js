import { state, els, API_URL, API_KEY} from "../shared/constants.js";
import { renderItems, renderCountries, renderPagination, renderSkeletons, renderPageSizes, renderCountriesList, buildPages} from "../shared/ui.js";

export const fetchData = async (search, countryCode) => {
    renderSkeletons(state.size);

    try {
        const params = new URLSearchParams({
            apikey: API_KEY,
            keyword: search,
            page: String(state.page),
            size: String(state.size),
        });

        if (countryCode) {
            params.append("countryCode", countryCode);
        }

        const url = `${API_URL}/events.json?${params}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Помилка");
        const data = await response.json();

        renderItems(data);
    } catch (error) {
        console.error(error);
        renderSkeletons();
        els.notRender.cardsItems.innerHTML = `
        <li class="cards__item-error">
            <p>Error loading data</p>
        </li>`;
    }
};

export const fetchEventById = async (id) => {
    const params = new URLSearchParams({ apikey: API_KEY });
    const url = `${API_URL}/events/${id}.json?${params}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Error qwerty");
    return await res.json();
};