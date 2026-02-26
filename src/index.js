import debounce from "lodash/debounce";
import cardTpl from "./templates/card.hbs";
import skeletonTpl from "./templates/skeleton.hbs";
import countryTpl from "./templates/country.hbs";

const API_URL = "https://app.ticketmaster.com/discovery/v2";
const API_KEY = "6C50WXaQQUp17M9iU5gNHG6hsUzxmK7r";

let currentPage = 20;

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
}

const renderItems = (data) => {
    const { notRender } = els;

    // notRender.heroInpsBoxItems.innerHTML = "";

    // const fragment = document.createDocumentFragment();

    // data._embedded.events.forEach(item => {
    //     //  console.log(item._embedded.venues[0].country.name);
    //     //  console.log(notRender.heroInpsBoxItems);
    //     const liItems = document.createElement("li");
    //     liItems.classList.add("hero__inps-box-item");
    //     liItems.dataset.value = item._embedded.venues[0].country.name;
    //     liItems.innerHTML = `<button class="hero__inps-box-item-btn">${liItems.dataset.value}</button>`;
    //     fragment.appendChild(liItems);
    //     // console.log(item._embedded.venues[0].country.countryCode);
    // });

    // notRender.heroInpsBoxItems.appendChild(fragment);


    const events = data._embedded.events;

    if (!events.length) {
        notRender.cardsItems.innerHTML = "<p>No results</p>";
        return;
    }

    renderCountries(events);

    const view = events.map(item => ({
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
        const country = e._embedded.venues[0].country;
        if (!country) continue;

        const code = country.countryCode;
        const name = country.name;

        if (seen.has(code)) continue;
        seen.add(code);

        view.push({ code, name });
    }

    els.notRender.heroInpsBoxItems.innerHTML = view.map(countryTpl).join("");
};

function renderSkeletons(count = 20) {
    els.notRender.cardsItems.innerHTML = skeletonTpl().repeat(count);
}

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
    els.notRender.heroInpsBoxBtnSearch.disabled = true;

    els.notRender.heroInpsBoxInputCountry.addEventListener("input", debounce((event) => {
        const isActive = event.target.value.trim().length > 2;

        if (!isActive) return;
        chooseCountryLocation(els.notRender.heroInpsBoxItems, els.notRender.heroInpsBoxBtnCountry, true, true);
        runSearch();
    }, 500));
    els.notRender.heroInpsBoxInputSearch.addEventListener("input", debounce((event) => {
        const isActive = event.target.value.trim().length > 2;

        els.notRender.heroInpsBoxBtnSearch.classList.toggle("hero__inps-box-btn--active", isActive);

        els.notRender.heroInpsBoxBtnSearch.disabled = !isActive;
    }, 500));
    els.notRender.heroInpsBoxBtnSearch.addEventListener("click", () => {
        if (els.notRender.heroInpsBoxBtnSearch.disabled) return;
        runSearch();
    });
}

const runSearch = () => {
    const search = els.notRender.heroInpsBoxInputSearch.value.trim();
    const countryCode = els.notRender.heroInpsBoxInputCountry.value.trim();

    if (search.length > 2) {
        fetchData(search, countryCode);
    }
};

inputsRender();
