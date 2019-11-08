import path from 'path';

import webpack from 'webpack';
import {camelCase} from 'change-case';
import VirtualModulesPlugin from 'webpack-virtual-modules';
import ParserHelpers from 'webpack/lib/ParserHelpers';
import {CallExpression} from 'estree';

import {FindI18nImportPlugin} from './find-i18n-imports-plugin';
import {generateID} from './utilities';

const PLUGIN_NAME = 'ReactI18nPlugin';
const TRANSLATION_DIRECTORY_NAME = 'translations';

export interface Options {
  fallbackLocale: string;
}

export class ReactI18nPlugin {
  private options: Options;

  private defaultOptions: Options = {
    fallbackLocale: 'en',
  };

  private virtualModules = new VirtualModulesPlugin();

  constructor(options: Partial<Options> = {}) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    };
  }

  apply(compiler: webpack.Compiler) {
    this.virtualModules.apply(compiler);

    compiler.hooks.normalModuleFactory.tap(
      PLUGIN_NAME,
      (normalModuleFactory: webpack.compilation.NormalModuleFactory) => {
        const handler = (parser: any) => {
          new FindI18nImportPlugin().apply(parser);

          // replace useI18n & withI18n call arguments
          parser.hooks.evaluate
            .for('CallExpression')
            .tap(PLUGIN_NAME, (originalExpression: CallExpression) => {
              if (
                parser.state.module.resource.indexOf('node_modules') !== -1 ||
                !parser.state.i18nImports
              ) {
                return;
              }

              const componentPath = parser.state.module.resource;
              const componentDir = parser.state.module.context;
              const importMap = parser.state.i18nImports.get(componentPath);

              if (
                !importMap ||
                originalExpression.callee.type !== 'Identifier'
              ) {
                return;
              }

              const expressions: CallExpression[] = [];

              if (
                originalExpression.callee.name ===
                  importMap.get(originalExpression.callee.name) &&
                originalExpression.arguments.length === 0
              ) {
                expressions.push(originalExpression);
              } else if (originalExpression.callee.name === 'compose') {
                originalExpression.arguments.map(node => {
                  if (
                    node.type === 'CallExpression' &&
                    node.callee.type === 'Identifier'
                  ) {
                    const identifierName = importMap.get(node.callee.name);

                    if (identifierName && node.arguments.length === 0) {
                      expressions.push(node);
                    }
                  }
                });
              }

              // skip calls where consumer manually added arguments
              if (expressions.length === 0) {
                return;
              }

              const translationFiles = getTranslationFiles(parser);
              if (translationFiles.length === 0) {
                return;
              }
              const fallBackExist = translationFiles.includes(
                `${this.options.fallbackLocale}.json`,
              );

              let fallbackLocaleID;
              if (fallBackExist) {
                // Add a top-level fallbackLocale import
                fallbackLocaleID = `__webpack__i18n__${generateID(
                  camelCase(this.options.fallbackLocale),
                )}`;

                const fallBackFileRelativePath = path.join(
                  './',
                  TRANSLATION_DIRECTORY_NAME,
                  `${this.options.fallbackLocale}.json`,
                );

                const fallbackFileExpression = ParserHelpers.requireFileAsExpression(
                  componentDir,
                  path.join(componentDir, fallBackFileRelativePath),
                );
                ParserHelpers.addParsedVariableToModule(
                  parser,
                  fallbackLocaleID,
                  fallbackFileExpression,
                );
              }

              // add translation factory import
              const componentFileName = componentPath
                .split('/')
                .pop()!
                .split('.')[0];
              const id = generateID(componentFileName);
              const translationFactoryName = `__webpack__i18n__${generateID(
                'translationFactory',
              )}`;

              const factoryPath = path.join(
                componentDir,
                TRANSLATION_DIRECTORY_NAME,
                'translationFactory.js',
              );
              const factorySource = buildFactorySource(`${id}-i18n`);
              this.virtualModules.writeModule(factoryPath, factorySource);

              const asyncTranslationFactoryExpression = ParserHelpers.requireFileAsExpression(
                parser.state.module.context,
                factoryPath,
              );
              ParserHelpers.addParsedVariableToModule(
                parser,
                translationFactoryName,
                asyncTranslationFactoryExpression,
              );

              // Replace i18n call arguments
              expressions.map(expression => {
                ParserHelpers.toConstantDependency(
                  parser,
                  i18nCallArguments({
                    id,
                    translationFactoryName,
                    fallbackLocale: this.options.fallbackLocale,
                    fallbackLocaleID,
                    translationFiles,
                  }),
                )(expression);
              });
            });
        };

        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('HarmonyModulesPlugin', handler);

        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('HarmonyModulesPlugin', handler);

        normalModuleFactory.hooks.parser
          .for('javascript/dynamic')
          .tap('HarmonyModulesPlugin', handler);
      },
    );
  }
}

// Return a list of translationFiles name
function getTranslationFiles(parser: any): string[] {
  const componentDirectory = parser.state.module.context;
  const translationsDirectoryPath = `${componentDirectory}/${TRANSLATION_DIRECTORY_NAME}`;

  try {
    return parser.state.compilation.compiler.inputFileSystem.readdirSync(
      translationsDirectoryPath,
    );
  } catch (error) {
    // do nothing if the directory does not exist
  }

  return [];
}

function i18nCallArguments({
  id,
  translationFactoryName,
  fallbackLocale,
  fallbackLocaleID,
  translationFiles,
}: {
  id: string;
  translationFactoryName: string;
  fallbackLocale: string;
  fallbackLocaleID?: string;
  translationFiles: string[];
}): string {
  const translations = translationFiles
    .filter(
      translationFile => !translationFile.endsWith(`${fallbackLocale}.json`),
    )
    .map(translationFile =>
      JSON.stringify(
        path.basename(translationFile, path.extname(translationFile)),
      ),
    )
    .sort()
    .join(', ');

  return `({
    id: '${id}',
    ${fallbackLocaleID ? `fallback: ${fallbackLocaleID},` : ''}
    async translations(locale) {
      const translations = [${translations}];
      if (translations.indexOf(locale) < 0) {
        return;
      }
      return await ${translationFactoryName}(locale);
    },
  })`;
}

function buildFactorySource(chunkName: string) {
  return `
    export default async function translationFactory(locale) {
      const dictionary = await import(
        /* webpackChunkName: "${chunkName}", webpackMode: "lazy-once" */
        \`./$\{locale}.json\`
      );
      return dictionary && dictionary.default;
    }`;
}
