const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
// middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ai7fd2k.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  console.log("token", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized access..");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "Forbidden access..." });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productsCollection = client.db("motoland").collection("products");
    const usersCollection = client.db("motoland").collection("users");
    const reportedCollection = client.db("motoland").collection("reported");
    const paymentsCollection = client.db("motoland").collection("payments");
    const categoriesCollection = client.db("motoland").collection("categories");

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });

        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    app.get("/users", verifyJWT, async (req, res) => {
      let query = {};
      if (req.query.role) {
        query = {
          role: req.query.role,
        };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      let query = {};

      if (req.query.type) {
        query = {
          type: req.query.type,
        };
      }
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      if (req.query.buyerEmail) {
        query = {
          buyerEmail: req.query.buyerEmail,
        };
      }
      if (req.query.isAdvertised) {
        query = {
          isAdvertised: req.query.isAdvertised,
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

    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const order = req.body;
      // console.log(order);
      const price = order.resalePrice;
      const amount = price / 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      // console.log(paymentIntent);

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const data = req.body;
      const result = await paymentsCollection.insertOne(data);
      const id = data.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          email: data.email,
          paid: true,
          transactionId: data.transactionId,
          isAdvertised: "",
          buyerEmail: data.buyerEmail,
        },
      };
      const updatedResult = await productsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/reported", async (req, res) => {
      const query = {};
      const result = await reportedCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/reported", async (req, res) => {
      const reportedProduct = req.body;
      const result = await reportedCollection.insertOne(reportedProduct);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const createdProduct = req.body;
      const result = await productsCollection.insertOne(createdProduct);
      res.send(result);
    });
    app.put("/products/advertise/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isAdvertised: "advertised",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.put("/products/verify/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isVerified: "Verified",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isVerified: "Verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const buyerEmail = req.body.buyerEmail;
      const meetingLocation = req.body.meetingLocation;
      const buyerName = req.body.buyerName;
      const email = req.body.email;
      const phoneNumber = req.body.phoneNumber;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const addedDoc = {
        $set: {
          email: email,
          meetingLocation: meetingLocation,
          phoneNumber: phoneNumber,
          buyerEmail: buyerEmail,
          buyerName: buyerName,
        },
      };
      const result = await productsCollection.updateOne(
        query,
        addedDoc,
        options
      );
      res.send(result);
    });
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.body.email;
      const meetingLocation = req.body.meetingLocation;
      const buyerName = req.body.buyerName;
      const phoneNumber = req.body.phoneNumber;
      const query = { _id: ObjectId(id) };
      const deletedDoc = {
        $set: {
          meetingLocation: meetingLocation,
          phoneNumber: phoneNumber,
          email: email,
          buyerName: buyerName,
        },
      };
      const result = await productsCollection.updateOne(query, deletedDoc);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
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
