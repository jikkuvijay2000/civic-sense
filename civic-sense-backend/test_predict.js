const axios = require('axios');
require('dotenv').config();

async function test() {
    const aiUrl = process.env.TEXT_AI_URL || 'http://localhost:5001';
    console.log(`Using AI URL: ${aiUrl}`);

    try {
        console.log("Testing Pothole...");
        const res1 = await axios.post(`${aiUrl}/predict`, { text: "Huge pothole on the main road" });
        console.log("Pothole:", res1.data);

        console.log("Testing Garbage...");
        const res2 = await axios.post(`${aiUrl}/predict`, { text: "Garbage has not been collected for days" });
        console.log("Garbage:", res2.data);

        console.log("Testing Streetlight...");
        const res3 = await axios.post(`${aiUrl}/predict`, { text: "Streetlight is broken" });
        console.log("Streetlight:", res3.data);

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Data:", e.response.data);
    }
}

test();
