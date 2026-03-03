async function run() {
    try {
        console.log("Sending Mission to Jarvis...");
        const res = await fetch('http://localhost:3000/api/mission/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Read the file at c:/Users/ppetr/OneDrive/Desktop/Jarvis-Platform/packages/jarvis-backend/data/test_mission.txt and summarize its contents.",
                channel: "CLI_TEST"
            })
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
