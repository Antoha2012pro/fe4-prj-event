import debounce from "lodash/debounce";

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
        heroInpsBoxBtn: document.querySelector(".hero__inps-box-btn"),
        heroInpsBoxInputCountry: document.querySelector("#heroCountryBtn"),
    }
};


const fetchData = async (search, countryCode) => {
    try {
        const response = await fetch(`${API_URL}/events.json?apikey=${API_KEY}&keyword=${search}${countryCode !== "" ? `&countryCode=${countryCode}` : ""}`);
        if (!response.ok) throw new Error("Помилка");
        const data = await response.json();

        renderItems(data);
    } catch (error) {
        console.error(error);
    }
}

const renderItems = (data) => {
    const { forRender, notRender } = els;
    notRender.cardsItems.innerHTML = "";
    notRender.heroInpsBoxItems.innerHTML = "";

    // if (ui.weatherLocation) ui.weatherLocation.style.cursor = "help";
    // if (ui.weatherLocationImg) ui.weatherLocationImg.style.display = "block";

    data._embedded.events.forEach(item => {
        console.log(item._embedded.venues[0].country.name);
        console.log(notRender.heroInpsBoxItems);
        const liItems = document.createElement("li");
        liItems.classList.add("hero__inps-box-item");
        liItems.dataset.value = item._embedded.venues[0].country.name;
        liItems.textContent = liItems.dataset.value;
        const li = document.createElement("li");
        li.classList.add("cards__item")
        const imgUrl =
            item.images?.find(img => img.ratio === "16_9")?.url ||
            item.images?.[0]?.url || "";
        li.innerHTML = `
                        <img src="${imgUrl}" alt="#" class="cards__item-img">
                        <h2 class="cards__item-title">${item.name || ""}</h2>
                        <p class="cards__item-time">${item.dates.start.localDate || ""}</p>
                        <div class="cards__item-loc">
                            <svg class="cards__item-loc-img">
                                <use href="#"></use>
                            </svg>
                            <p class="cards__item-loc-text">${item.dates.timezone || ""}</p>
                        </div>
                        `;
        notRender.cardsItems.appendChild(li);
        notRender.heroInpsBoxItems.appendChild(liItems);
        console.log(item._embedded.venues[0].country.countryCode);
        
    });
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

chooseCountryLocation(els.notRender.heroInpsBoxItems, els.notRender.heroInpsBoxBtn, true, false);

const inputsRender = () => {
    els.notRender.heroInpsBoxInputCountry.addEventListener("input", debounce((event) => {
        const query = event.target.value.trim();
        if (query.length > 2) {
            chooseCountryLocation(els.notRender.heroInpsBoxItems, els.notRender.heroInpsBoxBtn, true, true);
        };
        runSearch();
    }, 500));
    els.notRender.heroInpsBoxInputSearch.addEventListener("input", debounce(runSearch, 500));
}

const runSearch = () => {
  const search = els.notRender.heroInpsBoxInputSearch.value.trim();
  const countryCode = els.notRender.heroInpsBoxInputCountry.value.trim();

  if (search.length > 2) {
    fetchData(search, countryCode);
  }
};

inputsRender();
