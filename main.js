const { program } = require('commander');
const fs = require('fs'); 
const http = require('http'); 


program
    .option('-h, --host <type>', 'адреса сервера', 'localhost') 
    .option('-p, --port <type>', 'порт сервера', '3000') 
    .option('-c, --cache <type>', 'шлях до директорії кешу', './cache') 
    .parse(process.argv);

const options = program.opts();


if (!options.host || !options.port || !options.cache) {
    console.error('Помилка: не задано всі обов\'язкові параметри (-h, -p, -c)');
    process.exit(1); 
 }

const host = options.host;
const port = options.port;
const cacheDir = options.cache;


if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log(`Створено директорію кешу: ${cacheDir}`);
} else {
    console.log(`Використання директорії кешу: ${cacheDir}`);
}

 
const server = http.createServer((req, res) => {
   
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер інвентаризації працює!');
});


server.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
});