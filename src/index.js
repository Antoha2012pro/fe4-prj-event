import debounce from "lodash/debounce";
import { COUNTRIES } from "./shared/countries.js";
import cardTpl from "./templates/card.hbs";
import skeletonTpl from "./templates/skeleton.hbs";
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
    }
};

// ------------------
// ChatGPT:

const modalEl = document.querySelector(".js-modal");
const modalBodyEl = document.querySelector(".js-modal-body");

const openModal = () => modalEl.classList.add("is-open");
const closeModal = () => {
  modalEl.classList.remove("is-open");
  modalBodyEl.innerHTML = ""; // очищаем
};

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

modalEl.addEventListener("click", (e) => {
  if (e.target.closest(".js-modal-close")) closeModal();
  if (e.target.classList.contains("js-modal-overlay")) closeModal();
});

els.notRender.cardsItems.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-event-id]");
  if (!target) return;

  const id = target.dataset.eventId;
  if (!id) return;

  openModal();
  modalBodyEl.innerHTML = "<p>Loading...</p>";

  try {
    const data = await fetchEventById(id);

    // вытащим нужное (безопасно)
    const name = data.name ?? "—";
    const date = data.dates?.start?.localDate ?? "—";
    const time = data.dates?.start?.localTime ?? "";
    const venue = data._embedded?.venues?.[0]?.name ?? "—";
    const city = data._embedded?.venues?.[0]?.city?.name ?? "";
    const country = data._embedded?.venues?.[0]?.country?.name ?? "";
    const info = data.info ?? data.pleaseNote ?? "—";
    const img = data.images?.[0]?.url ?? "";

    modalBodyEl.innerHTML = `
      <div class="event-modal">
        ${img ? `<img class="event-modal__img" src="${img}" alt="${name}">` : ""}
        <h2 class="event-modal__title">${name}</h2>
        <p class="event-modal__meta">${date} ${time}</p>
        <p class="event-modal__meta">${venue} ${city ? `• ${city}` : ""} ${country ? `• ${country}` : ""}</p>
        <p class="event-modal__text">${info}</p>
        ${data.url ? `<a class="event-modal__link" href="${data.url}" target="_blank" rel="noreferrer">Open on Ticketmaster</a>` : ""}
      </div>
    `;
  } catch (err) {
    console.error(err);
    modalBodyEl.innerHTML = "<p>Не удалось загрузить детали 😢</p>";
  }
});

// ------------------

const openCountriesList = () => els.notRender.heroInpsBoxItems.classList.remove("hero__inps-box-items--hidden");;
const closeCountriesList = () => els.notRender.heroInpsBoxItems.classList.add("hero__inps-box-items--hidden");


const renderSkeletons = (count = 20) => {
    els.notRender.cardsItems.innerHTML = skeletonTpl().repeat(count);
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
  return res.json();
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

    notRender.cardsItems.innerHTML = view.map(cardTpl).join("");
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
        els.notRender.heroInpsBoxInputCountry.value = el.dataset.name || el.textContent.trim();

        closeCountriesList();

        runSearch();
    });
}

const runSearch = () => {
    const search = els.notRender.heroInpsBoxInputSearch.value.trim();
    const typedCountry = els.notRender.heroInpsBoxInputCountry.value;

    const countryCode = selectedCountryCode || resolveCountryCode(typedCountry);

    if (search.length > 2) {
        fetchData(search, countryCode || null);
    }
};

initCountries();
inputsRender();
