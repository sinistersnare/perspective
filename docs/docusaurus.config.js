// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ ██████ ██████ ██████       █      █      █      █      █ █▄  ▀███ █       ┃
// ┃ ▄▄▄▄▄█ █▄▄▄▄▄ ▄▄▄▄▄█  ▀▀▀▀▀█▀▀▀▀▀ █ ▀▀▀▀▀█ ████████▌▐███ ███▄  ▀█ █ ▀▀▀▀▀ ┃
// ┃ █▀▀▀▀▀ █▀▀▀▀▀ █▀██▀▀ ▄▄▄▄▄ █ ▄▄▄▄▄█ ▄▄▄▄▄█ ████████▌▐███ █████▄   █ ▄▄▄▄▄ ┃
// ┃ █      ██████ █  ▀█▄       █ ██████      █      ███▌▐███ ███████▄ █       ┃
// ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ ┃
// ┃ This file is part of the Perspective library, distributed under the terms ┃
// ┃ of the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const fs = require("fs");

const examples = fs.readdirSync("static/blocks").map((ex) => {
    const files = fs
        .readdirSync(`static/blocks/${ex}`)
        .filter(
            (x) =>
                !x.startsWith(".") &&
                !x.endsWith(".png") &&
                !x.endsWith(".arrow"),
        )
        .map((x) => {
            return {
                name: x,
                contents: fs
                    .readFileSync(`static/blocks/${ex}/${x}`)
                    .toString(),
            };
        });

    return {
        name: ex,
        files,
    };
});

function link(title, path) {
    return `<a class="dropdown__link" href="${path}">    ${title}</a>`;
}

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Perspective",
    // tagline: "Dinosaurs are cool",
    url: "https://perspective-dev.github.io",
    baseUrl: "/",
    onBrokenLinks: "warn",
    onBrokenMarkdownLinks: "warn",
    favicon: "https://openjsf.org/favicon.ico",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "perspective-dev", // Usually your GitHub org/user name.
    projectName: "perspective-dev.github.io", // Usually your repo name.
    deploymentBranch: "main",
    trailingSlash: true,

    customFields: {
        examples,
    },
    // markdown: {
    //     format: "md",
    // },

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },
    plugins: ["./plugins/perspective-loader"],
    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: false,
                theme: {
                    customCss: require.resolve("./src/css/custom.css"),
                },
            }),
        ],
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            colorMode: {
                defaultMode: "dark",
            },
            navbar: {
                logo: {
                    alt: "Perspective",
                    src: "svg/perspective-logo-light.svg",
                },
                items: [
                    {
                        type: "html",
                        value: `<a class="navbar__item navbar__link" href="/guide/">Docs</a>`,
                        position: "right",
                    },
                    {
                        to: "/examples",
                        position: "right",
                        label: "Examples",
                    },
                    {
                        href: "https://github.com/perspective-dev/perspective",
                        label: "GitHub",
                        position: "right",
                    },
                ],
            },
            footer: {
                links: [],
                logo: {
                    alt: "OpenJS Foundation Logo",
                    src: "img/openjs_foundation-logo-horizontal-black.png",
                    srcDark: "img/openjs_foundation-logo-horizontal-white.png",
                    href: "ttps://openjsf.org/",
                    width: 160,
                    height: 51,
                },

                copyright: `<br/><br/>Copyright © 2017 OpenJS Foundation and Perspective contributors.<br/><br/> All rights reserved. The OpenJS Foundation has registered trademarks and uses trademarks. For a list of trademarks of the OpenJS Foundation, please see our Trademark Policy and Trademark List. Trademarks and logos not indicated on the list of OpenJS Foundation trademarks are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.<br/><br/><p><a href="https://openjsf.org">The OpenJS Foundation</a> | <a href="https://terms-of-use.openjsf.org">Terms of Use</a> | <a href="https://privacy-policy.openjsf.org">Privacy Policy</a> | <a href="https://bylaws.openjsf.org">Bylaws</a> | <a href="https://code-of-conduct.openjsf.org">Code of Conduct</a> | <a href="https://trademark-policy.openjsf.org">Trademark Policy</a> | <a href="https://trademark-list.openjsf.org">Trademark List</a> | <a href="https://www.linuxfoundation.org/cookies">Cookie Policy</a></p>`,
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme,
            },
        }),
};

module.exports = config;
