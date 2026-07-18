const arr = new Float32Array(4);
arr[0] = 12.5;
arr[1] = -40.2;
arr[2] = 100.1;
arr[3] = 0xffffff;
console.log(arr[3] === 0xffffff); // Should be true, float32 has 24 bit precision
