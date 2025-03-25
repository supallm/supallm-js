module.exports = {
  plugins: ["@semantic-release/github", "@semantic-release/npm"],
  branches: ["main", { name: "next", channel: "alpha", prerelease: true }],
};
