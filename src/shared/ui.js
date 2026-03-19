
import debounce from "lodash/debounce";


import cardCardTpl from "../templates/card/card.hbs";
import cardSkeletonTpl from "../templates/card/skeleton.hbs";

import modalModalTpl from "../templates/modal/modal.hbs";
import modalSkeletonTpl from "../templates/modal/skeleton.hbs";

import countryTpl from "../templates/country.hbs";

import paginationItemTpl from "../templates/pagination/item.hbs";
import paginationListTpl from "../templates/pagination/list.hbs";

import { state, els } from "./constants.js";
import { fetchData, fetchEventById } from "../api/api.js";

export const getImageUrl = (images = []) => {
    const image = images.find(img => img.ratio === "16_9");
    return image?.url || images[0]?.url || "";
};

export const renderItems = (data) => {
    const { notRender } = els;


    const events = data?._embedded?.events;

    if (!events) {
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
        imgUrl: getImageUrl(item.images),
    }));

    notRender.cardsItems.innerHTML = view.map(cardCardTpl).join("");
};

export const renderCountriesList = (list) => {
    els.notRender.heroInpsBoxItems.innerHTML = list.map(countryTpl).join("");
};

export const renderCountries = (events) => {
    const seen = new Set();
    const countries = [];

    for (const e of events) {
        const country = e._embedded?.venues?.[0]?.country;
        if (!country) continue;

        const code = country.countryCode;
        const name = country.name;

        if (!code || seen.has(code)) continue;

        seen.add(code);
        countries.push({ code, name });
    }

    state.countriesCache = countries;
    renderCountriesList(countries);
};

export const renderSkeletons = (count = 20) => {
    els.notRender.cardsItems.innerHTML = cardSkeletonTpl().repeat(count);
}

export const renderPagination = (data) => {
    const pageInfo = data?.page;
    if (!pageInfo) return;

    const totalPages = Number(pageInfo.totalPages ?? 1);
    const activePage = Number(pageInfo.number ?? 0);
    state.page = activePage;

    if (totalPages <= 1) {
        els.notRender.paginationEl.innerHTML = "";
        return;
    }

    const pages = buildPages(totalPages, activePage);

    const view = pages.map((p) => {
        if (p === "dots") {
            return { isDots: true };
        }

        return {
            isDots: false,
            page: p,
            num: p + 1,
            isActive: p === activePage,
        };
    });

    els.notRender.paginationEl.innerHTML = view
        .map((item) => paginationItemTpl(item))
        .join("");
};

export const initPageSizes = () => {
    const { notRender } = els;

    notRender.heroInpsBoxPaginationItems.innerHTML = state.pageSizes
        .map(size => paginationListTpl({ size }))
        .join("");

    notRender.heroInpsBoxInputPagination.value = state.size;

    notRender.heroInpsBoxBtnPagination.addEventListener("click", (event) => {
        event.preventDefault();
        toggleClass(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
    });

    notRender.heroInpsBoxInputPagination.addEventListener("focus", () => {
        removeClass(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
    });

    notRender.heroInpsBoxPaginationItems.addEventListener("focusout", (event) => {
        if (!notRender.heroInpsBoxPaginationItems.contains(event.relatedTarget)) {
            addClass(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
        }
    });

    notRender.heroInpsBoxPaginationItems.addEventListener("click", (event) => {
        const li = event.target.closest("[data-size]");
        if (!li) return;

        state.size = Number(li.dataset.size);
        state.page = 0;
        notRender.heroInpsBoxInputPagination.value = state.size;

        addClass(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
        runSearch();
    });

    notRender.heroInpsBoxInputPagination.addEventListener("input", (event) => {
        const value = event.target.valueAsNumber;

        if (Number.isNaN(value)) return;

        state.size = value;
    });

    document.addEventListener("click", (event) => {
        const inside = event.target.closest(".hero__inps-box-pagination");
        if (!inside) {
            addClass(notRender.heroInpsBoxPaginationItems, "hero__inps-box-items--hidden");
        }
    });
};

export const buildPages = (totalPages, currentPage) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i);
    }

    const firstPage = 0;
    const lastPage = totalPages - 1;
    const range = 2;
    const pages = [firstPage];

    let start = currentPage - range;
    let end = currentPage + range;

    if (start < 1) {
        start = 1;
        end = 5;
    }

    if (end > lastPage - 1) {
        end = lastPage - 1;
        start = lastPage - 4;
    }

    if (start > 1) {
        pages.push("dots");
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (end < lastPage - 1) {
        pages.push("dots");
    }

    pages.push(lastPage);

    return pages;
};

export const setModalLoading = () => {
    els.notRender.modalBodyEl.innerHTML = modalSkeletonTpl();
};

export const showEventDetails = async (id) => {
    addClass(els.notRender.modalEl, "is-open");
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

export const initEvents = () => {
    const { notRender } = els;
    notRender.heroInpsBoxBtnSearch.disabled = true;

    notRender.heroInpsBoxInputCountry.addEventListener("input", debounce((event) => {
        const value = event.target.value;

        state.selectedCountryCode = "";

        removeClass(els.notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");
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

        state.selectedCountryCode = el.dataset.code;
        notRender.heroInpsBoxInputCountry.value = el.dataset.name || el.textContent.trim();

        addClass(els.notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");

        runSearch();
    });

    notRender.heroInpsBoxInputCountry.addEventListener("focus", () => {
        removeClass(notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");
    });
    notRender.heroInpsBoxSearchItems.addEventListener("focusout", (event) => {
        if (!notRender.heroInpsBoxSearchItems.contains(event.relatedTarget)) {
            addClass(notRender.heroInpsBoxSearchItems, "hero__inps-box-items--hidden");
        }
    });
    document.addEventListener("click", (e) => {
        const inside = e.target.closest(".hero__inps-box-search");
        if (!inside) addClass(els.notRender.heroInpsBoxSearchItems, "hero__inps-box-items--hidden");
    });

    notRender.modalEl.addEventListener("click", (event) => {
        if (event.target.closest(".cards__modal-content-close-btn--js")) removeClass(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
        if (event.target.classList.contains("cards__modal-overlay--js")) removeClass(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
    });
    notRender.cardsItems.addEventListener("click", (event) => {
        const target = event.target.closest("[data-event-id]");
        if (!target) return;

        const id = target.dataset.eventId;
        if (!id) return;

        showEventDetails(id);
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") removeClass(els.notRender.modalEl, "is-open", els.notRender.modalBodyEl.innerHTML = "");
    });
    notRender.heroInpsBoxBtnCountry.addEventListener("click", () => {
        toggleClass(els.notRender.heroInpsBoxItems, "hero__inps-box-items--hidden");
    });
};

export const addClass = (el, className) => el.classList.add(className);
export const removeClass = (el, className) => el.classList.remove(className);
export const toggleClass = (el, className) => el.classList.toggle(className);

export const runSearch = async () => {
    const { notRender } = els;
    const search = notRender.heroInpsBoxInputSearch.value.trim();
    const typedCountry = notRender.heroInpsBoxInputCountry.value;

    const countryCode = state.selectedCountryCode || resolveCountryCode(typedCountry);

    if (search.length <= 2) return;

    renderSkeletons(state.size);

    try {
        const data = await fetchData(search, countryCode || null);
        renderItems(data);
    } catch (error) {
        console.error(error);
        els.notRender.cardsItems.innerHTML = `
            <li class="cards__item-error">
                <p>Error loading data</p>
            </li>
        `;
    }
};

export const resolveCountryCode = (raw) => {
    const value = raw.trim();
    if (!value) return "";

    if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();

    const lower = value.toLowerCase();
    const exact = state.countriesCache.find(c => (c.name || "").toLowerCase() === lower);
    if (exact) return exact.code;

    const partial = state.countriesCache.find(c => (c.name || "").toLowerCase().includes(lower));
    return partial ? partial.code : "";
};

export const buildModalView = (event) => {
    const venueObj = event._embedded?.venues?.[0] || {};

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

export const filterCountriesList = (query) => {
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

export const initBottomPagination = () => {
    els.notRender.paginationEl.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-page]");
        if (!btn) return;

        state.page = Number(btn.dataset.page);
        runSearch();
    });
};