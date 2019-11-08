import {Parser} from 'webpack';

export class FindI18nImportPlugin {
  apply(parser: Parser) {
    parser.hooks.importSpecifier.tap(
      'FindI18nImportPlugin',
      (_statement, _source, exportName: string, identifierName: string) => {
        if (exportName !== 'useI18n' && exportName !== 'withI18n') {
          return;
        }

        const componentPath = parser.state.module.resource;

        if (!parser.state.i18nImports)
          parser.state.i18nImports = new Map<string, string>();

        let exitingImportMap = parser.state.i18nImports.get(componentPath);
        if (!exitingImportMap) {
          exitingImportMap = new Map();
        }

        exitingImportMap.set(exportName, identifierName);
        parser.state.i18nImports.set(componentPath, exitingImportMap);
      },
    );
  }
}
