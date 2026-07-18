async function run() {
    const res = await fetch('https://xyrtania.andy-596.workers.dev/api/terrain/load');
    const json = await res.json();
    console.log("Regions:", json.regions?.map(r => r.regionId));
}
run();
