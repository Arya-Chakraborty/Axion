const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path =  require('path');

const app = express();
const funds_dashboard_routes = require("./routes/funds_dashboard");
app.use(cors());
app.use(express.json());

const _dirname = path.resolve();

app.use("/api/v1", funds_dashboard_routes);

// app.use(express.static(path.join(_dirname, "/frontend/build")));

// app.get('*', (_, res) => {
//    res.sendFile(path.resolve(_dirname, "frontend", "build", "index.html")); 
// });

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../frontend/build/index.html'));
    });
  }

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));

const connectToDB = require("./config/database");
connectToDB();

module.exports = app;