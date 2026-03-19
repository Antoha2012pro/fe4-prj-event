import { state, API_URL, API_KEY } from "../shared/constants.js";

export const fetchData = async (search, countryCode) => {
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

    if (!response.ok) {
        throw new Error("Помилка");
    }

    return await response.json();
};

export const fetchEventById = async (id) => {
    const params = new URLSearchParams({ apikey: API_KEY });
    const url = `${API_URL}/events/${id}.json?${params}`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error("Помилка загрузки деталей");
    }

    return await res.json();
};