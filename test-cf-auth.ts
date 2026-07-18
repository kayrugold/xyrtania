async function run() {
    const res = await fetch('https://xyrtania.andy-596.workers.dev/api/terrain/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: 'dev-secret',
            regionId: 'test_auth',
            data: ''
        })
    });
    console.log(res.status, await res.text());
}
run();
