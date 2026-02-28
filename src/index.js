import debounce from "lodash/debounce";
import { COUNTRIES } from "./shared/countries.js";
import cardCardTpl from "./templates/card/card.hbs";
import cardSkeletonTpl from "./templates/card/skeleton.hbs";
import modalModalTpl from "./templates/modal/modal.hbs";
import modalSkeletonTpl from "./templates/modal/skeleton.hbs";
import countryTpl from "./templates/country.hbs";

const API_URL = "https://app.ticketmaster.com/discovery/v2";
const API_KEY = "6C50WXaQQUp17M9iU5gNHG6hsUzxmK7r";

let currentPage = 20;
let selectedCountryCode = "";
let countriesCache = COUNTRIES;

const els = {
    forRender: {
        heroInpsBoxItems: document.querySelector(".hero__inps-box-items"),
    },
    notRender: {
        cardsItems: document.querySelector('.cards__items'),
        heroInpsBoxInputSearch: document.querySelector("#heroSearchBtn"),
        heroInpsBoxItems: document.querySelector(".hero__inps-box-items"),
        heroInpsBoxBtnSearch: document.querySelector("#heroInpsBoxBtnSearch"),
        heroInpsBoxBtnCountry: document.querySelector("#heroInpsBoxBtnCountry"), // document.querySelector(".hero__inps-box-btn"),
        heroInpsBoxInputCountry: document.querySelector("#heroCountryBtn"),
        modalEl: document.querySelector("#cardsModal"),
        modalBodyEl: document.querySelector("#cardsModalContentBody"),
    }
};

// ------------------
// ChatGPT:

const setModalLoading = () => {
    els.notRender.modalBodyEl.innerHTML = modalSkeletonTpl();
};



const buildModalView = (event) => {
    const venueObj = event._embedded.venues[0];

    return {
        id: event.id,
        name: event.name || "—",
        info: event.info || "—",
        date: event.dates.start.localDate || "—",
        time: event.dates.start.localTime || "",
        venue: venueObj.name || "—",
        city: venueObj.city.name || "",
        country: venueObj.country.name || "",
        imgUrl: event.images.find((img) => img.ratio === "16_9").url || event.images[0].url || "",
        url: event.url || "",
    };
};

const showEventDetails = async (id) => {
    openModal();
    setModalLoading();

    try {
        const event = await fetchEventById(id);
        const view = buildModalView(event);

        els.notRender.modalBodyEl.innerHTML = modalModalTpl(view);
    } catch (err) {
        console.error(err);
        els.notRender.modalBodyEl.innerHTML = "<p>Не удалось загрузить детали 😢</p>";
    }
};

// ------------------

const openCountriesList = () => els.notRender.heroInpsBoxItems.classList.remove("hero__inps-box-items--hidden");;
const closeCountriesList = () => els.notRender.heroInpsBoxItems.classList.add("hero__inps-box-items--hidden");


const renderSkeletons = (count = 20) => {
    els.notRender.cardsItems.innerHTML = cardSkeletonTpl().repeat(count);
}

const initCountries = () => {
    els.notRender.heroInpsBoxItems.innerHTML = countriesCache.map(countryTpl).join("");
};

const filterCountriesList = (query) => {
    const formattedQuery = query.trim().toLowerCase();
    const items = els.notRender.heroInpsBoxItems.querySelectorAll("[data-code]");

    if (!formattedQuery) {
        items.forEach(el => el.closest("li")?.classList.remove("is-hidden"));
        return;
    }

    items.forEach(el => {
        const name = (el.dataset.name || el.textContent || "").toLowerCase();
        const code = (el.dataset.code || "").toLowerCase();
        const match = name.includes(formattedQuery) || code.includes(formattedQuery);
        el.closest("li")?.classList.toggle("is-hidden", !match);
    });
};


const resolveCountryCode = (raw) => {
    const value = raw.trim();
    if (!value) return "";

    if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();

    const lower = value.toLowerCase();
    const exact = countriesCache.find(c => (c.name || "").toLowerCase() === lower);
    if (exact) return exact.code;

    const partial = countriesCache.find(c => (c.name || "").toLowerCase().includes(lower));
    return partial ? partial.code : "";
};


const fetchData = async (search, countryCode) => {
    renderSkeletons();
    try {
        const params = new URLSearchParams({
            apikey: API_KEY,
            keyword: search
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
        // els.notRender.cardsItems.innerHTML = "<p>Error loading data</p>";
    }
};

const fetchEventById = async (id) => {
    const params = new URLSearchParams({ apikey: API_KEY });
    const url = `${API_URL}/events/${id}.json?${params}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка загрузки деталей");
    return await res.json();
};

const renderItems = (data) => {
    const { notRender } = els;


    const events = data._embedded.events;

    if (!events.length) {
        notRender.cardsItems.innerHTML = "<p>No results</p>";
        return;
    }

    renderCountries(events);

    const view = events.map(item => ({
        id: item.id,
        name: item.name || "",
        date: item.dates.start.localDate || "",
        timezone: item.dates.timezone || "",
        imgUrl:
            item.images.find(img => img.ratio === "16_9").url ||
            item.images[0].url || ""
    }));

    notRender.cardsItems.innerHTML = view.map(cardCardTpl).join("");
};

const renderCountries = (events) => {
    const seen = new Set();
    const view = [];

    for (const e of events) {
        const country = e._embedded?.venues?.[0]?.country;
        if (!country) continue;

        const code = country.countryCode;
        const name = country.name;

        if (!code || seen.has(code)) continue;
        seen.add(code);

        view.push({ code, name });
    }

    countriesCache = view;
    els.notRender.heroInpsBoxItems.innerHTML = view.map(countryTpl).join("");
};

const chooseCountryLocation = (items, btn, isHiddenDef, isHiddenList) => {
    if (isHiddenList === true) {
        items.classList.remove("hero__inps-box-items--hidden");
        return;
    }
    if (!isHiddenDef) return;
    btn.addEventListener("click", (event) => {
        items.classList.toggle("hero__inps-box-items--hidden");
        // console.log(event.target);
    });
}

chooseCountryLocation(els.notRender.heroInpsBoxItems, els.notRender.heroInpsBoxBtnCountry, true, false);

const inputsRender = () => {
    const { notRender } = els;
    notRender.heroInpsBoxBtnSearch.disabled = true;

    notRender.heroInpsBoxInputCountry.addEventListener("input", debounce((event) => {
        const value = event.target.value;

        selectedCountryCode = "";

        openCountriesList();
        filterCountriesList(value);
    }, 150));
    notRender.heroInpsBoxInputSearch.addEventListener("input", debounce((event) => {
        const isActive = event.target.value.trim().length > 2;

        notRender.heroInpsBoxBtnSearch.classList.toggle("hero__inps-box-btn--active", isActive);

        notRender.heroInpsBoxBtnSearch.disabled = !isActive;
    }, 500));
    notRender.heroInpsBoxBtnSearch.addEventListener("click", () => {
        if (notRender.heroInpsBoxBtnSearch.disabled) return;
        runSearch();
    });
    notRender.heroInpsBoxItems.addEventListener("click", (event) => {
        const el = event.target.closest("[data-code]");
        if (!el) return;

        selectedCountryCode = el.dataset.code;
        notRender.heroInpsBoxInputCountry.value = el.dataset.name || el.textContent.trim();

        closeCountriesList();

        runSearch();
    });
    notRender.modalEl.addEventListener("click", (event) => {
        if (event.target.closest(".cards__modal-content-close-btn--js")) closeModal();
        if (event.target.classList.contains("cards__modal-overlay--js")) closeModal();
    });
    notRender.cardsItems.addEventListener("click", (event) => {
        const target = event.target.closest("[data-event-id]");
        if (!target) return;

        const id = target.dataset.eventId;
        if (!id) return;

        showEventDetails(id);
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeModal();
    });
}

const runSearch = () => {
    const { notRender } = els;
    const search = notRender.heroInpsBoxInputSearch.value.trim();
    const typedCountry = notRender.heroInpsBoxInputCountry.value;

    const countryCode = selectedCountryCode || resolveCountryCode(typedCountry);

    if (search.length > 2) {
        fetchData(search, countryCode || null);
    }
};

const openModal = () => els.notRender.modalEl.classList.add("is-open");
const closeModal = () => {
    els.notRender.modalEl.classList.remove("is-open");
    els.notRender.modalBodyEl.innerHTML = "";
};

initCountries();
inputsRender();
