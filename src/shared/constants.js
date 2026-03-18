

export const API_URL = "https://app.ticketmaster.com/discovery/v2";
export const API_KEY = "6C50WXaQQUp17M9iU5gNHG6hsUzxmK7r";

export const countries = [
    { code: "DE", name: "Germany" },
    { code: "UA", name: "Ukraine" },
    { code: "PL", name: "Poland" },
    { code: "FR", name: "France" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "GB", name: "United Kingdom" },
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
];

export const state = {
    page: 0,
    size: 20,
    allCountries: countries,
    countriesCache: countries,
    selectedCountryCode: "",
    pageSizes: [10, 20, 50],
};

export const els = {
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