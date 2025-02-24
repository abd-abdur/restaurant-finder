import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.SERPAPI_KEY;
const MIN_RATING = 4.0; // Minimum rating
const MIN_REVIEWS = 100; // Minimum number of reviews required
const RESULTS_PER_PAGE = 20; // Number of results per page (default for Google Maps API)

async function getRestaurants(location) {
  console.log(`🔍 Searching for restaurants in: ${location}...`);

  // Modify the search query to explicitly look for restaurants
  let url = `https://serpapi.com/search?engine=google_maps&q=restaurants+in+${encodeURIComponent(location)}&type=search&api_key=${API_KEY}`;
  console.log(`📡 Fetching URL: ${url}`);

  try {
      const response = await fetch(url);
      const data = await response.json();

      console.log("📜 API Response:", JSON.stringify(data, null, 2));

      if (data.error) {
          console.error("🔴 SerpApi Error:", data.error);
          return { restaurants: [], ll: null };
      }

      const restaurants = data.local_results || [];

      if (restaurants.length === 0) {
          console.warn("⚠️ No restaurants found in API response.");
          return { restaurants: [], ll: null };
      }

      console.log(`✅ Found ${restaurants.length} restaurants.`);

      // Extract `ll` from the first restaurant's GPS coordinates
      const firstRestaurant = restaurants[0];
      if (!firstRestaurant.gps_coordinates) {
          console.warn("⚠️ No GPS coordinates found for the first restaurant.");
          return { restaurants, ll: null };
      }

      const { latitude, longitude } = firstRestaurant.gps_coordinates;
      const ll = `@${latitude},${longitude},14z`;

      console.log(`✅ Extracted 'll' parameter: ${ll}`);
      return { restaurants, ll };
  } catch (error) {
      console.error("❌ Error fetching restaurants:", error);
      return { restaurants: [], ll: null };
  }
}


// Function to fetch paginated results
async function fetchAllRestaurants(location) {
    let { restaurants, ll } = await getRestaurants(location);
    
    if (!ll) {
        console.warn("⚠️ No 'll' parameter found. Cannot proceed with pagination.");
        return [];
    }

    console.log(`📌 Initial batch contains ${restaurants.length} restaurants.`);

    let allRestaurants = [...restaurants];
    let start = RESULTS_PER_PAGE;

    while (true) {
        console.log(`📄 Fetching more results (start=${start})...`);

        // let url = `https://serpapi.com/search?engine=google_maps&q=${encodeURIComponent(location)}&ll=${ll}&type=search&start=${start}&api_key=${API_KEY}`;
        let url = `https://serpapi.com/search?engine=google_maps&q=restaurants+in+${encodeURIComponent(location)}&ll=${ll}&type=search&start=${start}&api_key=${API_KEY}`;
        console.log(`📡 Pagination URL: ${url}`);

        try {
            const response = await fetch(url);
            const data = await response.json();

            console.log("📜 API Pagination Response:", JSON.stringify(data, null, 2));

            if (data.error) {
                console.warn("🔴 No more pages or API limit reached:", data.error);
                break; // Stop fetching
            }

            const newResults = data.local_results || [];
            console.log(`📌 Retrieved ${newResults.length} additional restaurants.`);

            if (newResults.length === 0) break; // No more results

            allRestaurants.push(...newResults);
            start += RESULTS_PER_PAGE; // Move to the next page
        } catch (error) {
            console.error("❌ Error during pagination:", error);
            break;
        }
    }

    console.log(`✅ Final total restaurants collected: ${allRestaurants.length}`);
    return allRestaurants;
}

// Home route to show search form
app.get("/", (req, res) => {
  res.send(`
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 text-center p-10">
          <h1 class="text-3xl font-bold text-blue-600">🍽️ Restaurant Finder</h1>
          <p class="mt-4 text-lg">Find top-rated restaurants in your desired location!</p>
          <form action="/restaurants" method="GET" class="mt-5">
              <input type="text" name="q" placeholder="Enter location" class="p-2 border rounded" required>
              <button type="submit" class="ml-2 bg-blue-600 text-white p-2 rounded">🔍 Search</button>
          </form>
        </body>
      </html>
  `);
});

// Route to fetch top-rated restaurants
app.get("/restaurants", async (req, res) => {
    const location = req.query.q;
    if (!location) {
        return res.status(400).send("❌ Missing 'q' parameter. Example: /restaurants?q=Saadiyat Island");
    }

    const restaurants = await fetchAllRestaurants(location);
    console.log(`✅ Total restaurants found: ${restaurants.length}`);

    // Filter restaurants with high ratings & reviews
    const filteredRestaurants = restaurants.filter(r => (r.rating || 0) >= MIN_RATING && (r.reviews || 0) >= MIN_REVIEWS);

    console.log(`✅ After filtering: ${filteredRestaurants.length} top-rated restaurants remain.`);

    if (filteredRestaurants.length === 0) {
        return res.send("<h3>No high-rated restaurants found.</h3>");
    }

    // Generate HTML response
    let resultHTML = `
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-blue-600 text-white flex flex-col items-center py-10">
        <h2 class="text-4xl font-bold">Top Restaurants in ${location}</h2>
        <ul class="bg-white text-black w-2/3 mt-6 p-6 rounded shadow-md">`;

    filteredRestaurants.forEach(restaurant => {
        resultHTML += `
        <li class="border-b py-3">
          <strong>${restaurant.title}</strong> ⭐ ${restaurant.rating} (${restaurant.reviews} reviews)<br>
          📍 <a href="https://www.google.com/maps/search/?api=1&query=${restaurant.gps_coordinates.latitude},${restaurant.gps_coordinates.longitude}" target="_blank" class="text-blue-500">View on Map</a>
        </li>`;
    });

    resultHTML += `</ul><br><a href="/" class="bg-yellow-400 text-black px-6 py-2 rounded font-bold">🔙 Back</a></body></html>`;

    res.send(resultHTML);
});

// Start the server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
