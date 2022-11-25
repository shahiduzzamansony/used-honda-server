const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ai7fd2k.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCollection = client.db("motoland").collection("products");
    const usersCollection = client.db("motoland").collection("users");

    app.get("/products", async (req, res) => {
      let query = {};
      if (req.query.type) {
        query = {
          type: req.query.type,
        };
      }
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("motoland running");
});
app.listen(port, () => console.log(`port is runnin on ${port}`));
