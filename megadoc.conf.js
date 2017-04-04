const path = require('path');

module.exports = {
  outputDir: path.resolve(__dirname, 'doc/cocache-megadoc'),
  sources: [
    {
      id: 'articles',
      test: /\.md$/,
      include: [
        path.resolve(__dirname, 'packages/cocache/README.md'),
        path.resolve(__dirname, 'packages/cocache-schema/README.md'),
      ],

      processor: [ 'megadoc-plugin-markdown', {
        id: 'articles'
      }]
    },
    {
      id: 'api',
      test: /\.js$/,
      include: [
        path.resolve(__dirname, 'packages/cocache/src/**/*'),
        path.resolve(__dirname, 'packages/cocache-schema/src/**/*'),
      ],

      exclude: [
        path.resolve(__dirname, 'packages/cocache*/src/__tests__')
      ],

      processor: [ 'megadoc-plugin-js', {
        id: 'api'
      }]
    },
  ],

  serializer: ['megadoc-html-serializer', {
    styleSheet: path.resolve(__dirname, 'doc/style.less'),
    styleOverrides: {
      'banner-height': '0',
      'accent': "#586e75",
    },

    tooltipPreviews: false,

    resizableSidebar: false,
    runtimeOutputPath: 'megadoc',

    footer: 'Made with ♥ by <a href="https://instructure.com" target="_blank">Instructure</a>.',

    theme: ['megadoc-theme-qt', {
      invertedSidebar: true
    }],

    redirect: {
      '/index.html': '/articles/packages-cocache-readme.html',
      '/articles/index.html': '/articles/packages-cocache-readme.html',
      '/api/index.html': '/api/Cocache.html',
    },

    layoutOptions: {
      customLayouts: [
        {
          match: { by: 'url', on: '*' },
          regions: [
            {
              name: 'Layout::Content',
              options: { framed: true },
              outlets: [
                {
                  name: 'Markdown::Document',
                  using: 'articles',
                  match: {
                    by: 'namespace',
                    on: 'articles'
                  }
                },
                {
                  name: 'CJS::Module',
                  match: {
                    by: 'namespace',
                    on: 'api'
                  }
                },
              ]
            },

            {
              name: 'Layout::Sidebar',
              outlets: [
                {
                  name: 'Text',
                  options: {
                    tagName: 'header',
                    text: 'Cocache',
                    className: 'sidebar__title'
                  }
                },
                {
                  name: 'Markdown::Browser',
                  using: 'articles',
                },
                {
                  name: 'Layout::SidebarHeader',
                  options: {
                    text: 'API'
                  }
                },
                {
                  name: 'CJS::ClassBrowser',
                  using: 'api',
                }
              ]
            },
          ]
        },
      ]
    }
  }],
}