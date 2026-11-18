const express = require("express");
const passport = require("../config/passport");
const { ensureAuth } = require("../middleware/auth");
const router = express.Router();

// GOOGLE ROUTES
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

//Google Call Back
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    res.redirect("/auth/me");
  },
);
// Authentication failure
router.get("/failure", (req, res) => {
  res.status(401).json({
    message: "OAuth authentication failed",
  });
});

// Check wheter a user is currently logged in
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  return res.status(200).json({
    message: "Authenticated",
    user: {
      id: req.user.id,
      displayName: req.user.name,
    },
  });
});

//Log out and destroy the session
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    res.clearCookie("connect.sid");
    return res.status(200).json({
      message: "Logged out successfully",
    });
  });
});
//GITHUB ROUTES
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    res.redirect("/auth/me");
  },
);
module.exports = router;
