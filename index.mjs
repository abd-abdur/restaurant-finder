import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.SERPAPI_KEY || "33cb5d0b9d8d953d6ff3a927101e241cf0346278de7dc7eab02cda663f9e15a3";

const MIN_RATING = 4.0; // Minimum rating threshold
const MIN_REVIEWS = 100; // Minimum number of reviews required

// Function to fetch restaurants in a given location
async function fetchRestaurants(locationQuery) {
    console.log(`🔍 Searching for restaurants in: ${locationQuery}...`);

    const url = `https://serpapi.com/search.json?engine=google_maps&q=restaurants+in+${encodeURIComponent(locationQuery)}&type=search&api_key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("🔴 SerpApi Error:", data.error);
            return [];
        }

        const restaurants = data.local_results || [];

        // Filter based on rating and number of reviews
        const filteredRestaurants = restaurants.filter(r => 
            r.rating && r.rating >= MIN_RATING && r.reviews && r.reviews >= MIN_REVIEWS
        );

        console.log(`✅ Found ${filteredRestaurants.length} restaurants meeting the criteria.`);

        return filteredRestaurants;
    } catch (error) {
        console.error("❌ Error fetching restaurants:", error);
        return [];
    }
}

// Home page with search form
app.get("/", (req, res) => {
    res.send(`
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100 text-center p-10">
            <h1 class="text-3xl font-bold text-blue-600">🍽️ Restaurant Finder</h1>
            <p class="mt-4 text-lg">Find top-rated restaurants in any location!</p>
            <form action="/restaurants" method="GET" class="mt-5">
                <input type="text" name="location" placeholder="Enter city or address" class="p-2 border rounded" required>
                <button type="submit" class="ml-2 bg-blue-600 text-white p-2 rounded">🔍 Search</button>
            </form>
          </body>
        </html>
    `);
});

// Route to fetch restaurants in a given location
app.get("/restaurants", async (req, res) => {
    const locationQuery = req.query.location;
    if (!locationQuery) {
        console.error("❌ Missing `location` parameter.");
        return res.status(400).send("❌ Missing `location` parameter. Example: /restaurants?location=New York");
    }

    console.log(`🔍 Searching for restaurants in: ${locationQuery}`);

    try {
        const restaurants = await fetchRestaurants(locationQuery);

        if (!restaurants.length) {
            console.warn("⚠️ No top-rated restaurants found.");
            return res.send("<h3>No highly-rated restaurants found in this location.</h3>");
        }

        // Generate HTML response
        let resultHTML = `
        <html>
          <head><script src="https://cdn.tailwindcss.com"></script></head>
          <body class="bg-blue-600 text-white flex flex-col items-center py-10">
            <h2 class="text-4xl font-bold">Top Restaurants in ${locationQuery}</h2>
            <ul class="bg-white text-black w-2/3 mt-6 p-6 rounded shadow-md">`;

        restaurants.forEach(restaurant => {
            resultHTML += `
            <li class="border-b py-3">
              <strong>${restaurant.title || "Unknown"}</strong> ⭐ ${restaurant.rating} (${restaurant.reviews} reviews)<br>
              📍 Address: ${restaurant.address || "N/A"} <br>
              <a href="${restaurant.google_maps_url}" target="_blank" class="text-blue-500">📍 View on Map</a>
            </li>`;
        });

        resultHTML += `</ul><br><a href="/" class="bg-yellow-400 text-black px-6 py-2 rounded font-bold">🔙 Back</a></body></html>`;

        res.send(resultHTML);
    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).send("❌ Error fetching data: " + error);
    }
});

// Start the server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
