module.exports = {
  plugins: ["@semantic-release/github", "@semantic-release/npm"],
  branches: [
    "main",
    { name: "next", prerelease: true },
    { name: "alpha", channel: "alpha", prerelease: true },
  ],
};
