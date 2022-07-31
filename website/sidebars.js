/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  sidebar: [
    "index",
    {
      type: "category",
      label: "API",
      items: ["api/field", "api/form", "api/form-array"],
    },
  ],
};

module.exports = sidebars;
