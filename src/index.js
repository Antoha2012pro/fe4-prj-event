import { DOMElsRender, initPageSizeDropdown, initBottomPagination } from "./shared/ui.js";

const initFuncs = () => {
    initPageSizeDropdown();
    initBottomPagination();
    DOMElsRender();
};

initFuncs();
 