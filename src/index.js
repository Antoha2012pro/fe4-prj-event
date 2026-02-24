const API_URL = "https://app.ticketmaster.com/discovery/v2";
const API_KEY = "6C50WXaQQUp17M9iU5gNHG6hsUzxmK7r";

let currentPage = 20;

const els = {
    forRender: {
        heroInpsBoxItems: document.querySelector(".hero__inps-box-items"),
    },
    notRender: {
        cardsItems: document.querySelector('.cards__items'),
    }
};


const fetchData = async () => {
    try {
        const response = await fetch(`${API_URL}/events.json?apikey=${API_KEY}`);
        if (!response.ok) throw new Error("Помилка");
        const data = await response.json();

        renderItems(data);
    } catch (error) {
        console.error(error);
    }
}

const renderItems = (data) => {
    const { forRender, notRender } = els;

    // if (ui.weatherLocation) ui.weatherLocation.style.cursor = "help";
    // if (ui.weatherLocationImg) ui.weatherLocationImg.style.display = "block";

    data._embedded.events.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("cards__item")
        const firstImage = item.images?.[0]?.url || "";
        li.innerHTML = `
                        <img src="${item.images[0].url || ""}" alt="#" class="cards__item-img">
                        <h2 class="cards__item-title">${item.name || ""}</h2>
                        <p class="cards__item-time">${item.dates.start.localDate || ""}</p>
                        <div class="cards__item-loc">
                            <svg class="cards__item-loc-img">
                                <use href="#"></use>
                            </svg>
                            <p class="cards__item-loc-text">dsa</p>
                        </div>
                        `;
        notRender.cardsItems.appendChild(li);
    });
};

setTimeout(() => {
    fetchData();
}, 50);