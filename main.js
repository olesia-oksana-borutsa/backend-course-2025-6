import { Command } from "commander";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const program = new Command();

program
  .requiredOption("-h, --host <host>")
  .requiredOption("-p, --port <port>")
  .requiredOption("-c, --cache <cacheDir>");

program.parse(process.argv);

const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) fs.mkdirSync(cache, { recursive: true });

const dbPath = path.join(cache, "inventory.json");
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

const readDB = () =>
  JSON.parse(fs.readFileSync(dbPath, "utf-8"));

const writeDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, cache),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Inventory API", version: "1.0.0" },
  },
  apis: ["./main.js"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/RegisterForm.html", (_, res) =>
  res.sendFile(path.resolve("RegisterForm.html"))
);

app.get("/SearchForm.html", (_, res) =>
  res.sendFile(path.resolve("SearchForm.html"))
);

app.post("/register", upload.single("photo"), (req, res) => {
  const { inventory_name, description } = req.body;
  if (!inventory_name) return res.sendStatus(400);

  const items = readDB();

  const newItem = {
    id: Date.now().toString(),
    name: inventory_name,
    description: description || "",
    photo: req.file ? req.file.filename : null,
  };

  items.push(newItem);
  writeDB(items);

  res.status(201).json(newItem);
});

app.get("/inventory", (_, res) => {
  const items = readDB().map((i) => ({
    ...i,
    photo_url: i.photo ? `/inventory/${i.id}/photo` : null,
  }));
  res.json(items);
});

app.get("/inventory/:id", (req, res) => {
  const item = readDB().find((i) => i.id === req.params.id);
  if (!item) return res.sendStatus(404);
  res.json({
    ...item,
    photo_url: item.photo ? `/inventory/${item.id}/photo` : null,
  });
});

app.put("/inventory/:id", (req, res) => {
  const items = readDB();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.sendStatus(404);

  if (req.body.name) item.name = req.body.name;
  if (req.body.description) item.description = req.body.description;

  writeDB(items);
  res.json(item);
});

app.get("/inventory/:id/photo", (req, res) => {
  const item = readDB().find((i) => i.id === req.params.id);
  if (!item || !item.photo) return res.sendStatus(404);
  res.setHeader("Content-Type", "image/jpeg");
  res.sendFile(path.join(cache, item.photo));
});

app.put("/inventory/:id/photo", upload.single("photo"), (req, res) => {
  const items = readDB();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.sendStatus(404);

  if (item.photo) fs.unlinkSync(path.join(cache, item.photo));
  item.photo = req.file.filename;

  writeDB(items);
  res.json(item);
});

app.delete("/inventory/:id", (req, res) => {
  const items = readDB();
  const index = items.findIndex((i) => i.id === req.params.id);
  if (index === -1) return res.sendStatus(404);

  const item = items[index];
  if (item.photo) fs.unlinkSync(path.join(cache, item.photo));

  items.splice(index, 1);
  writeDB(items);

  res.sendStatus(200);
});

app.post("/search", (req, res) => {
  const { id, includePhoto } = req.body;
  const item = readDB().find((i) => i.id === id);
  if (!item) return res.sendStatus(404);

  const output = {
    id: item.id,
    name: item.name,
    description: item.description,
  };

  if (includePhoto === "on" && item.photo)
    output.photo_url = `/inventory/${item.id}/photo`;

  res.json(output);
});

app.use((_, res) => res.sendStatus(405));

app.listen(port, host, () =>
  console.log(`Server running at http://${host}:${port}`)
);
