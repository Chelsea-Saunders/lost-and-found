const session = require("express-session");
const MongoStore = require("connect-mongo");
const storeClass = MongoStore.default || MongoStore;

const sessionConfig = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  store: storeClass.create({
    mongoUrl: process.env.MONGODB_URI,
  }),

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});

module.exports = sessionConfig;
