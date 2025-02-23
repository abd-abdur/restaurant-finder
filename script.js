async function fetchRestaurants() {
    const region = document.getElementById("region").value;
    if (!region) {
        alert("Please enter a region.");
        return;
    }

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<p>Loading...</p>";

    try {
        // Connect frontend to your local backend
        const backendUrl = "http://127.0.0.1:6000/fetch_restaurants";
        const response = await fetch(`${backendUrl}?region=${encodeURIComponent(region)}`);
        const data = await response.json();

        if (!data.length) {
            resultsDiv.innerHTML = "<p>No restaurants found.</p>";
            return;
        }

        resultsDiv.innerHTML = data.map(r => `
            <div class="card">
                <h3>${r.name} ⭐${r.rating}</h3>
                <p>${r.address}</p>
                <p><b>Reviews:</b> ${r.reviews}</p>
                <p><b>Phone:</b> ${r.phone || "N/A"}</p>
                <a href="${r.maps_link}" target="_blank">View on Google Maps</a>
            </div>
        `).join("");
    } catch (error) {
        resultsDiv.innerHTML = "<p>Error fetching data.</p>";
        console.error("Error:", error);
    }
}
