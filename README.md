# 🚀 Axion: Next-Gen Funds Management & AI Analytics

Welcome to **Axion**, a futuristic fund management platform supercharged with **AI analytics** 🔍, real-time dashboards 📊, and a beautiful, intuitive UI. Built with a modern tech stack and aimed at making finance smarter, faster, and more accessible 💰⚡.

🌐 **Live Demo**: [axionanalytics.onrender.com](https://axionanalytics.onrender.com)

---

## 🧰 Tech Stack

- **Frontend**: React.js ⚛️ + Tailwind CSS ✨
- **Backend**: Node.js + Express.js 🧠
- **Database**: MongoDB 🍃
- **Deployment**: Render 🚀

---

## ✨ Features

### 📊 AI-Enhanced Dashboard
- Interactive dashboard with real-time data
- Monthly insights, fund breakdowns, and visual graphs
- Gen-AI portfolio insights and recommendations

### 💼 Portfolio Creation and Manintenance
- Add Stocks/funds  easily
- View Expenses and Profit/Loss breakdown
- Delete/edit entries with one click

### 🛡️ Authentication System
- Secure login & signup with Clerk
- Protected routes for authenticated users only

### 📈 Visual Insights
- Pie charts and graphs for quick understanding
- Breakdown by categories and time periods
- Extensive risk assessment and historical analysis
- Comparison of portfolio with market standard indicators

---

## 🗂️ Folder Structure

```
Axion/
├── backend/               # Express + MongoDB backend
│   ├── models/            # Mongoose Schemas
│   ├── routes/            # API Routes (e.g. /api/users, /api/funds)
│   ├── controllers/       # Logic behind the routes
│   └── server.js          # App entry point
├── frontend/              # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   └── App.js         # Main app logic
├── .env                   # Environment variables
├── .gitignore             # Git exclusions
├── package.json           # NPM configs
└── vercel.json            # Deployment config
```

---

## 🚀 Installation & Setup

### 📦 Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory and add:

```env
MONGO_URI=your_mongodb_uri
PORT=5000
```

Then run:

```bash
npm start
```

### 💻 Frontend

```bash
cd frontend
npm install
npm start
```

The app should now be running at `http://localhost:3000` 🎉

---

## 💡 Usage Guide

1. 🧑‍💼 Register or Login
2. ➕ Add Stocks and Funds to Portfolio
3. 📊 View detailed analytics and insights
4. 🔄 Edit or delete any transactions (Buy/Sell)
5. 👀 Monitor your spending and earnings visually

---

## 📬 Contributing

We love collaboration! 💖

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Added new feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Submit a pull request ✅

---

## 📝 License

Licensed under the **MIT License**.

---

## ✨ Creator

Built with ❤️ by **Arya Chakraborty**  
🔗 [GitHub](https://github.com/Arya-Chakraborty)

---

> "Empowering personal finance through smart design and AI insights."
