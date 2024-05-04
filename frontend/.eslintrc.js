module.exports = {
    extends: [
        "eslint:recommended",
    ],
    env: {
        "es2021": true,
        "browser": true,
        "node": true
    },
    ignorePatterns: [
        "ftx-link-maintenance-tools/",
        "node_modules/",
        "dist/",
        "lib/",
        "mock-data.ts",
        ".eslintrc.js",
        "karma.conf.js",
        "e2e/",
        "nginx-config"
    ],
    plugins: [
        "eslint-plugin-import",
        "@typescript-eslint",
        "import"
    ],
    rules: {
        "arrow-body-style": "error",
        "brace-style": [
            "error",
            "1tbs"
        ],
        "constructor-super": "error",
        "curly": "error",
        "dot-notation": "off",
        "eol-last": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "guard-for-in": "error",
        "id-denylist": "off",
        "id-match": "off",
        "import/no-deprecated": "warn",
        "indent": ["error", 4],
        "max-len": [
            "warn",
            {
                "code": 140
            }
        ],
        "no-bitwise": "error",
        "no-caller": "error",
        "no-console": [
            "error",
            {
                "allow": [
                    "log",
                    "warn",
                    "dir",
                    "timeLog",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupEnd",
                    "table",
                    "dirxml",
                    "error",
                    "groupCollapsed",
                    "Console",
                    "profile",
                    "profileEnd",
                    "timeStamp",
                    "context"
                ]
            }
        ],
        "no-debugger": "error",
        "no-empty": "off",
        "no-empty-function": "off",
        "no-eval": "error",
        "no-fallthrough": "error",
        "no-new-wrappers": "error",
        "no-restricted-imports": [
            "error",
            "rxjs/Rx"
        ],
        "no-shadow": "warn",
        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-undef-init": "error",
        "no-underscore-dangle": "off",
        "comma-dangle": "error",
        "no-self-assign": "warn",
        "no-unused-expressions": "off",
        "no-unused-labels": "error",
        "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "no-var": "error",
        "prefer-const": "error",
        "quotes": "off",
        "radix": "error",
        "semi": "error",
        "spaced-comment": [
            "error",
            "always",
            {
                "markers": [
                    "/"
                ]
            }
        ],
        "space-before-function-paren": ["error", {
            "anonymous": "always",
            "named": "never",
            "asyncArrow": "always"
        }],
        "object-curly-spacing": ["error", "always"],
        "import/no-commonjs": "off",
        "import/order": [
            "error",
            {
                "groups": [
                    "builtin",
                    "external",
                    "unknown",
                    "internal",
                    "parent",
                    "sibling",
                    "index"
                ],
                "pathGroups": [
                    {
                        "pattern": "ftx-link-*/**",
                        "group": "unknown",
                        "patternOptions": { "partial": true }
                    }
                ],
                "pathGroupsExcludedImportTypes": ["builtin"],
                "newlines-between": "never"
            }
        ],
        "import/newline-after-import": "error",
        "import/no-unresolved": "off",
        "import/no-default-export": "off",
        "import/no-named-export": "off",
        "import/no-cycle": "error",
        "import/no-self-import": "error"
    },
    "overrides": [
        {
            files: ["*.ts"],
            parser: "@typescript-eslint/parser",
            extends: [
                "plugin:@typescript-eslint/eslint-recommended", // removes redundant errors between TS and ESLint
                "plugin:@typescript-eslint/recommended"
            ],
            rules: {
                "@typescript-eslint/no-var-requires": "off",
                "@typescript-eslint/dot-notation": "off",
                "@typescript-eslint/explicit-member-accessibility": [
                    "off",
                    {
                        "accessibility": "explicit"
                    }
                ],
                "@typescript-eslint/indent": ["error", 4],
                "@typescript-eslint/member-delimiter-style": [
                    "error",
                    {
                        "multiline": {
                            "delimiter": "semi",
                            "requireLast": true
                        },
                        "singleline": {
                            "delimiter": "semi",
                            "requireLast": false
                        }
                    }
                ],
                "@typescript-eslint/member-ordering": "error",
                "@typescript-eslint/no-unused-vars": ["warn", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
                "@typescript-eslint/no-empty-function": "warn",
                "@typescript-eslint/no-empty-interface": "error",
                "@typescript-eslint/no-inferrable-types": [
                    "error",
                    {
                        "ignoreParameters": true
                    }
                ],
                "@typescript-eslint/no-misused-new": "error",
                "@typescript-eslint/no-explicit-any": "warn",
                "@typescript-eslint/no-non-null-assertion": "warn",
                "@typescript-eslint/ban-types": "warn",
                "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
                "@typescript-eslint/no-namespace": "off",
                "@typescript-eslint/no-shadow": [
                    "error",
                    {
                        "hoist": "all"
                    }
                ],
                "@typescript-eslint/no-unused-expressions": "error",
                "@typescript-eslint/prefer-function-type": "error",
                "@typescript-eslint/quotes": [
                    "error",
                    "single"
                ],
                "@typescript-eslint/semi": [
                    "error",
                    "always"
                ],
                "@typescript-eslint/type-annotation-spacing": "error",
                "@typescript-eslint/unified-signatures": "error",
                "no-shadow": "off" // In typescript files we never want no-shadow rule, would give false positives.
            }
        },
        {
            files: ["*.test.ts"],
            rules: {
                "@typescript-eslint/no-unused-expressions": "off",
                "@typescript-eslint/no-shadow": "off"
            }
        },
        {
            files: ["karma.conf.js"],
            rules: {
                "@typescript-eslint/no-var-requires": "off"
            }
        },
        {
            files: ["*.js"],
            parser: "espree",
            parserOptions: {
                "node": true
            }
        }
    ]
};
