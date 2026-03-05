import debounce from "lodash/debounce";
import { COUNTRIES } from "./shared/countries.js";

import cardCardTpl from "./templates/card/card.hbs";
import cardSkeletonTpl from "./templates/card/skeleton.hbs";

import modalModalTpl from "./templates/modal/modal.hbs";
import modalSkeletonTpl from "./templates/modal/skeleton.hbs";

import countryTpl from "./templates/country.hbs";

import paginationDotTpl from "./templates/pagination/dot.hbs";
import paginationButtonTpl from "./templates/pagination/button.hbs";
import paginationListTpl from "./templates/pagination/list.hbs";

const API_URL = "https://app.ticketmaster.com/discovery/v2";
const API_KEY = "6C50WXaQQUp17M9iU5gNHG6hsUzxmK7r";


const els = {
    forRender: {
        heroInpsBoxItems: document.querySelector(".hero__inps-box-items"),
    },
    notRender: {
        cardsItems: document.querySelector('.cards__items'),
        heroInpsBoxInputSearch: document.querySelector("#heroSearchBtn"),
        heroInpsBoxItems: document.querySelector(".hero__inps-box-items"),
        heroInpsBoxBtnSearch: document.querySelector("#heroInpsBoxBtnSearch"),
        heroInpsBoxBtnCountry: document.querySelector("#heroInpsBoxBtnCountry"),
        heroInpsBoxInputCountry: document.querySelector("#heroCountryBtn"),
        modalEl: document.querySelector("#cardsModal"),
        modalBodyEl: document.querySelector("#cardsModalContentBody"),
        paginationEl: document.querySelector("#pagination"),
        heroInpsBoxPaginationItems: document.querySelector(".hero__inps-box-pagination-items"),
        heroInpsBoxBtnPagination: document.querySelector("#heroInpsBoxBtnPagination"),
        heroInpsBoxInputPagination: document.querySelector("#heroPaginationBtn"),
        heroInpsBoxSearchItems: document.querySelector(".hero__inps-box-search-items"),
    }
};

let selectedCountryCode = "";
let countriesCache = COUNTRIES;


const PAGE_SIZES = [10, 20, 50];

let currentPage = 0;   // важно: 0-based
let pageSize = 10;     // сколько карточек на страницу
const state = {
    search: "",
    countryCode: "",
    page: 0,     // 0-based
    size: 20,    // pageSize
};

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
    addClassModal(els.notRender.modalEl, "is-open");
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
    renderSkeletons(pageSize);

    try {
        const params = new URLSearchParams({
            apikey: API_KEY,
            keyword: search,
            page: String(currentPage),
            size: String(pageSize),
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
    renderPagination(data);

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
    });
}

chooseCountryLocation(els.notRender.heroInpsBoxItems, els.notRender.heroInpsBoxBtnCountry, true, false);

const inputsRender = () => {
    const { notRender } = els;
    notRender.heroInpsBoxBtnSearch.disabled = true;

    notRender.heroInpsBoxInputCountry.addEventListener("input", debounce((event) => {
        const value = event.target.value;

        selectedCountryCode = "";

        removeClassModal(els.notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");
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

        addClassModal(els.notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");

        runSearch();
    });

    notRender.heroInpsBoxInputCountry.addEventListener("focus", () => {
        removeClassModal(notRender.heroInpsBoxSearchItems, "hero__inps-box-items--hidden", els.notRender.modalBodyEl.innerHTML = "");
    });
    notRender.heroInpsBoxSearchItems.addEventListener("focusout", (event) => {
        if (!notRender.heroInpsBoxSearchItems.contains(event.relatedTarget)) {
            addClassModal(notRender.heroInpsBoxSearchItems, "hero__inps-box-items--hidden");
        }
    });
    document.addEventListener("click", (e) => {
        const inside = e.target.closest(".hero__inps-box-search");
        if (!inside) addClassModal(els.notRender.heroInpsBoxSearchItems, "hero__inps-box-items--hidden");
    });
    
    notRender.modalEl.addEventListener("click", (event) => {
        if (event.target.closest(".cards__modal-content-close-btn--js")) removeClassModal(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
        if (event.target.classList.contains("cards__modal-overlay--js")) removeClassModal(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
    });
    notRender.cardsItems.addEventListener("click", (event) => {
        const target = event.target.closest("[data-event-id]");
        if (!target) return;

        const id = target.dataset.eventId;
        if (!id) return;

        showEventDetails(id);
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") removeClassModal(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
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

const addClassModal = (item, className) => item.classList.add(className);

const removeClassModal = (item, className, clearFunction) => {
    item.classList.remove(className);
    clearFunction
}

const toggleModal = (item, className) => item.classList.toggle(className);

const renderPageSizes = () => {
  els.notRender.heroInpsBoxPaginationItems.innerHTML = PAGE_SIZES
    .map((size) => paginationListTpl({ size }))
    .join("");

  if (!els.notRender.heroInpsBoxInputPagination.value) {
    els.notRender.heroInpsBoxInputPagination.value = pageSize;
  }
};

const bindPageSizeDropdown = () => {
    const { notRender } = els;

    notRender.heroInpsBoxBtnPagination.addEventListener("click", (event) => {
        event.preventDefault();
        toggleModal(els.notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
    });

    notRender.heroInpsBoxInputPagination.addEventListener("focus", () => {
        removeClassModal(els.notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
    });
    notRender.heroInpsBoxPaginationItems.addEventListener("focusout", (event) => {
        if (!notRender.heroInpsBoxPaginationItems.contains(event.relatedTarget)) {
            addClassModal(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
        }
    });


    notRender.heroInpsBoxPaginationItems.addEventListener("click", (event) => {
        const li = event.target.closest("[data-size]");
        if (!li) return;

        pageSize = Number(li.dataset.size);
        currentPage = 0;

        notRender.heroInpsBoxInputPagination.value = pageSize;
        addClassModal(els.notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");

        runSearch();
    });

    document.addEventListener("click", (e) => {
        const inside = e.target.closest(".hero__inps-box-pagination");
        if (!inside) addClassModal(els.notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
    });
};

const buildPages = (total) => {
    const last = total - 1;
    const pages = [];

    for (let i = 0; i < Math.min(5, total); i++) pages.push(i);

    if (total > 6) {
        pages.push("dots");
        pages.push(last);
    }

    return pages;
};

const renderPagination = (data) => {
    const pageInfo = data?.page;
    if (!pageInfo) return;

    const totalPages = Number(pageInfo.totalPages ?? 1);
    const activePage = Number(pageInfo.number ?? 0);
    currentPage = activePage;

    if (totalPages <= 1) {
        els.notRender.paginationEl.innerHTML = "";
        return;
    }

    const pages = buildPages(totalPages);

    const view = pages.map((p) => {
        if (p === "dots") return { isDots: true };
        return { page: p, num: p + 1, isActive: p === activePage };
    });

    els.notRender.paginationEl.innerHTML = view
        .map((item) => (item.isDots ? paginationDotTpl() : paginationButtonTpl(item)))
        .join("");
};

const bindBottomPagination = () => {
    els.notRender.paginationEl.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-page]");
        if (!btn) return;

        currentPage = Number(btn.dataset.page);
        runSearch();
    });
};

const initPaginationUI = () => {
    renderPageSizes();
    bindPageSizeDropdown();
    bindBottomPagination();
};

initCountries();
inputsRender();
initPaginationUI();