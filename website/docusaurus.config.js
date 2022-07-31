const NAME = "fielded";
const GH_ORG = "gustavohenke";
const GH_REPO = "fielded";

const IS_DEV = process.env.NODE_ENV !== "production";

/** @type {import('@docusaurus/types').Config} */
const config = {
  url: `https://${GH_ORG}.github.io/`,
  baseUrl: IS_DEV ? "/" : `/${GH_REPO}/`,
  title: NAME,
  organizationName: GH_ORG,
  projectName: GH_REPO,

  presets: [
    [
      "@docusaurus/preset-classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars"),
          path: "../docs",
        },
        blog: false,
      }),
    ],
  ],
  themeConfig: /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
    navbar: {
      title: NAME,
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/",
            },
            { label: "API Reference", to: "/api/field" },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: `https://github.com/${GH_ORG}/${GH_REPO}`,
            },
          ],
        },
      ],
    },
  }),
};

module.exports = config;
