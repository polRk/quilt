const PLUGIN_NAME = 'FindI18nImportPlugin';

export class FindI18nImportPlugin {
  apply(parser: any) {
    parser.hooks.importSpecifier.tap(
      PLUGIN_NAME,
      (
        _statement: string,
        source: string,
        exportName: string,
        identifierName: string,
      ) => {
        if (
          source !== '@shopify/react-i18n' &&
          exportName !== 'useI18n' &&
          exportName !== 'withI18n'
        ) {
          return;
        }

        const componentPath = parser.state.module.resource;
        if (!parser.state.i18nImports)
          parser.state.i18nImports = new Map<string, string>();
        parser.state.i18nImports.set(componentPath, identifierName);
      },
    );
  }
}
