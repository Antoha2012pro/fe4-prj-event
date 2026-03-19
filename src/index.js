import { initEvents, initPageSizes, initBottomPagination, renderCountriesList } from "./shared/ui.js";
import { state } from "./shared/constants.js";

const initApp = () => {
    renderCountriesList(state.countriesCache);
    initPageSizes();
    initBottomPagination();
    initEvents();
};

initApp();