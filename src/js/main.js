const appContainer = document.getElementById("app");
const inputTerm = document.querySelector(".search__term");
const formSubmit = document.querySelector(".search__submit");
const countryListContainer = document.querySelector(".countries__list");
const countryContainer = document.querySelector(".country__container--section");
const neighborsTitle = document.querySelector(".neighbors__list--title");
const neighborsContainer = document.querySelector(".neighbors__list");
const yearContainer = document.querySelector(".current__year");

class App {
  map = L.map("map");
  currentYear = new Date().getFullYear();
  constructor() {
    this.state = { countries: [], neighbors: [] };
    this.loadMap([32, 53], 1648195);
    this.fetchAllCountries();
    yearContainer.innerHTML = this.currentYear;
    formSubmit.addEventListener("click", this.searchCountry.bind(this));
    countryListContainer.addEventListener(
      "click",
      this.controlSelectedCountry.bind(this)
    );
    neighborsContainer.addEventListener(
      "click",
      this.controlSelectedCountry.bind(this)
    );
  }

  renderSpinner(parentElement) {
    document.querySelector(parentElement).innerHTML = "";
    const generateMarkup = `
        <div class="loading__spinner">
          <div class="loader"></div>
        </div>
      `;
    document.querySelector(parentElement).innerHTML = generateMarkup;
  }

  renderError(parentElement, error) {
    document.querySelector(parentElement).innerHTML = "";
    const generateMarkup = `
      <h3 class="error__container">${error}</h3>
    `;
    document.querySelector(parentElement).innerHTML = generateMarkup;
  }

  clear(parentElements) {
    parentElements.forEach(
      (parentElement) => (document.querySelector(parentElement).innerHTML = "")
    );
  }

  reveal(hide, unhide) {
    document.querySelector(hide).classList.add("hidden");
    document.querySelector(unhide).classList.remove("hidden");
  }

  loadMap(latlng, area) {
    let zoom;
    if (area < 1_000) {
      zoom = 9;
    } else if (area < 10_000) {
      zoom = 8;
    } else if (area < 100_000) {
      zoom = 7;
    } else if (area < 1_000_000) {
      zoom = 6;
    } else if (area < 10_000_000) {
      zoom = 5;
    } else if (area < 100_000_000) {
      zoom = 4;
    } else {
      zoom = 3;
    }
    this.map.setView(latlng, zoom);
    this.map.createPane("labels");
    this.map.getPane("labels").style.zIndex = 200;
    this.map.getPane("labels").style.pointerEvents = "none";

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
      {
        attribution: "©OpenStreetMap, ©CartoDB",
      }
    ).addTo(this.map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
      {
        attribution: "©OpenStreetMap, ©CartoDB",
        pane: "labels",
      }
    ).addTo(this.map);
  }

  // Fetch All Countries
  async fetchAllCountries() {
    const parentElement = ".countries__list";
    try {
      this.renderSpinner(parentElement);
      const response = await fetch("https://restcountries.com/v3.1/all");
      this.clear([parentElement]);
      if (!response.ok) throw new Error("data could not be fetched");
      const data = await response.json();
      this.state.countries = data;
      this.state.countries.sort(function compareFn(a, b) {
        if (a.name.common < b.name.common) {
          return -1;
        }
        if (a.name.common > b.name.common) {
          return 1;
        }
        return 0;
      });
      this.state.countries.map((element) =>
        this.countryGlanceView.render(element)
      );
    } catch (error) {
      this.renderError(parentElement, `something went wrong! ${error.message}`);
    }
  }

  // Search For Countries
  searchCountry(e) {
    e.preventDefault();
    const searchTerm = inputTerm.value;
    this.reveal(".countries__list--section", ".country__container--section");
    this.fetchCountry(searchTerm);
    inputTerm.value = "";
  }

  // Fetch Country
  async fetchCountry(country) {
    const parentElement = ".country__container--section";
    try {
      this.renderSpinner(parentElement);
      const response = await fetch(
        `https://restcountries.com/v3.1/name/${country}`
      );
      if (!response.ok) {
        throw new Error("Country not found");
      }
      this.clear([parentElement, ".neighbors__list"]);
      const data = await response.json();
      const result = data.filter(
        (element) => element.name.common.toLowerCase() === country.toLowerCase()
      );
      if (result[0] === undefined) {
        throw new Error("you should search for a common country name");
      }
      this.controlCountryAndNeighbor(result[0]);
    } catch (error) {
      console.error(error.message);
      this.renderError(parentElement, `something went wrong! ${error.message}`);
    }
  }

  // Fetch Neighbor
  async fetchNeighbor(neighbor) {
    const parentElement = ".neighbors__list";
    try {
      const response = await fetch(
        `https://restcountries.com/v3.1/alpha/${neighbor}`
      );
      if (!response.ok) {
        throw new Error("Country not found");
      }
      const data = await response.json();
      this.neighborView.render(data[0]);
    } catch (error) {
      this.renderError(parentElement, `something went wrong! ${error.message}`);
    }
  }

  // Control Country And Neighbor
  controlCountryAndNeighbor(country) {
    try {
      const { latlng } = country;
      this.loadMap(latlng, country.area);
      this.countryDetailView.render(country);
      if (!country.borders) {
        neighborsTitle.classList.add("hidden");
        throw new Error("this country has no neighbors");
      }
      neighborsTitle.classList.remove("hidden");
      this.state.neighbors = country.borders;
      this.state.neighbors.map((neighbor) => this.fetchNeighbor(neighbor));
    } catch (error) {
      this.renderError(".neighbors__list", error.message);
    }
  }

  // Control Selected Country
  controlSelectedCountry(e) {
    const card = e.target.closest(".card__glance");
    if (!card) return;
    const country = this.state.countries.find(
      (element) =>
        element.name.common === card.dataset.name.replaceAll("_", " ")
    );
    this.reveal(".countries__list--section", ".country__container--section");
    this.clear([".neighbors__list"]);
    this.controlCountryAndNeighbor(country);
  }

  // Country Glance View
  countryGlanceView = {
    generateMarkup(country) {
      return `
    <li class="card__glance country__card--glance" data-name=${country.name.common.replaceAll(
      " ",
      "_"
    )}>
      <img
        src=${country.flags.svg}
        alt=${country.flags.alt}
        class="country__glance--flag"
      />
      <div class="country__glance--data">
        <h2 class="country__glance--name">${country.name.common}</h2>
        <h3 class="country__glance--capital">${
          country.capital ?? "No Data"
        }</h3>
      </div>
    </li>
    `;
    },
    render(country) {
      countryListContainer.insertAdjacentHTML(
        "beforeend",
        this.generateMarkup(country)
      );
    },
  };

  // Country Detail View
  countryDetailView = {
    generateMarkup(country) {
      return `
      <div class="country__card">
        <img
          src=${country.flags.svg}
          alt=${country.flags.alt}
          class="country__card--flag" />
        <div class="country__data">
          <div class="data__section">
            <h2 class="country__name">${country.name.official}</h2>
            <h3 class="country__capital">${country.capital ?? "No Data"} - ${
        country.region
      }</h3>
          </div>
          <ul class="data__section">
            ${
              country.languages
                ? Object.values(country.languages)
                    .map((language) => {
                      return `
            <li>🗣️${language}</li>
            `;
                    })
                    .join("")
                : "No Language Data Found!"
            }
          </ul>
          <ul class="data__section">
            ${
              country.currencies
                ? Object.values(country.currencies)
                    .map((currency) => {
                      return `
            <li>🪙${currency.name} - ${currency.symbol}</li>
            `;
                    })
                    .join("")
                : "No Currency Data Found!"
            }
          </ul>
          <ul class="data__section">
            <li>👨🏼‍🤝‍🧑🏾${new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 3,
            }).format(country.population)} - 🗺️${new Intl.NumberFormat(
        "en-US",
        {
          notation: "compact",
          maximumFractionDigits: 3,
        }
      ).format(country.area)}</li>
          </ul>
        </div>
      </div>
    `;
    },
    render(country) {
      countryContainer.innerHTML = this.generateMarkup(country);
    },
  };

  // Neighbor View
  neighborView = {
    generateMarkup(neighbor) {
      return `
      <li class="card__glance neighbor__card" style="display:${
        !this.loading ? "block" : "none"
      }" data-name=${neighbor.name.common.replaceAll(" ", "_")}>
        <img
          src="${neighbor.flags.svg}"
          alt="${neighbor.flags.alt}"
          srcset=""
          height="120px"
          class="neighbor__flag"
        />
        <div class="neighbor__data">
          <h2 class="neighbor__name">${neighbor.name.common}</h2>
          <h3 class="neighbor__capital">${neighbor.capital}</h3>
        </div>
      </li>
    `;
    },
    render(neighbor) {
      neighborsContainer.insertAdjacentHTML(
        "beforeend",
        this.generateMarkup(neighbor)
      );
    },
  };
}

const app = new App();

// Clear Content if not PC
if (appContainer.clientWidth < 1000) {
  appContainer.innerHTML = "";
}
