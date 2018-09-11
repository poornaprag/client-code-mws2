import DBHelper from './dbhelper';

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker(); // Register service worker
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();

  const neighborhoodsSelect = document.getElementById('neighborhoods-select');
  neighborhoodsSelect.addEventListener('change', updateRestaurants);

  const cuisinesSelect = document.getElementById('cuisines-select');
  cuisinesSelect.addEventListener('change', updateRestaurants);
});

/**
 * Lazy load pictures and image content
 */
const lazyLoadImages = () => {
  const lazyPictures = [].slice.call(document.querySelectorAll('picture.lazy'));

  if ('IntersectionObserver' in window) {
    const lazyPictureObserver = new IntersectionObserver((pictures) => {
      pictures.forEach((picture) => {
        if (picture.isIntersecting) {
          const lazyPicture = picture.target;
          lazyPicture.childNodes[0].srcset = lazyPicture.childNodes[0].dataset.srcset;
          lazyPicture.childNodes[1].srcset = lazyPicture.childNodes[1].dataset.srcset;
          lazyPicture.childNodes[2].src = lazyPicture.childNodes[2].dataset.src;
          lazyPicture.classList.remove('lazy');
          lazyPictureObserver.unobserve(lazyPicture);
        }
      });
    });

    lazyPictures.forEach((lazyPicture) => {
      lazyPictureObserver.observe(lazyPicture);
    });
  }
};

/**
 * Register a service worker for caching static and dynamic assets.
 */
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }
  navigator.serviceWorker.register('../service-worker.js').then(() => {
    console.log('Service worker registered successfully!');
  }).catch((error) => {
    console.log('Error while registering service worker:', error);
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoicG9vcm5hcHJhZyIsImEiOiJjamo3aW96dnMwczE1M3FtbWdtbXM1ZmRoIn0.2GHabfQqWKUkt0vJ05DKBQ',
    maxZoom: 18,
    attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, +
        <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,  +
        Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
    id: 'mapbox.streets'
  }).addTo(self.newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */
/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoadImages();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const picture = document.createElement('picture');
  const webPsource = document.createElement('source');
  const jpegSource = document.createElement('source');

  picture.className = 'lazy';
  webPsource.dataset.srcset = DBHelper.webPImageUrlForRestaurant(restaurant);
  webPsource.type = 'image/webp';

  jpegSource.dataset.srcset = DBHelper.jpegImageUrlForRestaurant(restaurant);
  jpegSource.type = 'image/jpeg';

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.dataset.src = DBHelper.jpegImageUrlForRestaurant(restaurant);
 // Adding alt-text here if img fails
  image.alt = `Name of the restaurant: ${restaurant.name}`;

  picture.appendChild(webPsource);
  picture.appendChild(jpegSource);
  picture.appendChild(image);
  li.append(picture);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  // Adding a11y / ARIA by converting to buttons
  more.setAttribute('role', 'button');
  more.setAttribute('aria-label', 'view details of ' + restaurant.name + ' restaurant');
  li.append(more);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);

    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}