const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const amqp = require("amqplib");
var order;

var channel, connection;

app.use(express.json());
mongoose.connect(
    "mongodb://localhost:27017/product-service",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    () => {
        console.log(`Product-Service DB Connected`);
    }
);

async function connect() {
   try {
    const amqpServer = "amqp://rabbitmq:5672"
    connection = await amqp.connect(amqpServer).then(console.log('hi'));
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
   } catch (error) {
       console.log(error)
   }
}
connect();

// app.get('/buy', (req, res)=>{
//     res.send('this is working')
// })

app.post("/buy", async (req, res) => {
    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } });
    channel.sendToQueue(
        "ORDER",
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    );
    channel.consume("PRODUCT", (data) => {
        console.log('Consuming PRODUCT service')
        order = JSON.parse(data.content);
        channel.ack(data)
        return res.json(order);

    });
});

app.post("/create", async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});


app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});
